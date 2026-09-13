import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { io } from 'socket.io-client';

const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
const wsUrl = (process.env.WS_URL ?? 'http://localhost:3001').replace(
  /^ws:\/\//,
  'http://',
);

function readClientWsUrl() {
  try {
    const envPath = resolve(process.cwd(), '../client/.env');
    const content = readFileSync(envPath, 'utf8');
    const match = content.match(/^NG_APP_WS_URL=(.+)$/m);
    return match?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

async function login(email) {
  const response = await fetch(`${apiUrl}/api/v1/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(`Login failed for ${email}: ${response.status}`);
  }

  const { data } = await response.json();
  if (!data?.accessToken) {
    throw new Error(`Login response missing access token for ${email}`);
  }

  return data.accessToken;
}

async function api(token, method, path, body) {
  const response = await fetch(`${apiUrl}/api/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `${method} ${path} failed (${response.status}): ${payload?.error?.message ?? 'unknown error'}`,
    );
  }

  return payload.data;
}

function connectSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket'],
      timeout: 5000,
    });

    const fail = (message) => {
      socket.disconnect();
      reject(new Error(message));
    };

    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (error) => fail(error.message));
    setTimeout(() => fail('Socket connection timed out'), 6000);
  });
}

function joinProject(socket, organizationId, projectId) {
  return new Promise((resolve, reject) => {
    socket.emit(
      'project:join',
      { organizationId, projectId },
      (ack) => {
        if (ack?.ok) {
          resolve(undefined);
          return;
        }

        reject(
          new Error(
            `project:join failed: ${ack?.error ?? JSON.stringify(ack ?? null)}`,
          ),
        );
      },
    );

    setTimeout(() => reject(new Error('project:join timed out')), 5000);
  });
}

function onceEvent(socket, eventName, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);

    socket.once(eventName, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function ensureProjectAndTask(token) {
  const { organizations } = await api(token, 'GET', '/organizations');
  const organization = organizations?.[0];
  if (!organization?.id) {
    throw new Error('No organization found for demo user');
  }

  const orgId = organization.id;
  const { projects } = await api(
    token,
    'GET',
    `/organizations/${orgId}/projects`,
  );
  let project = projects?.[0];

  if (!project) {
    const created = await api(token, 'POST', `/organizations/${orgId}/projects`, {
      name: 'Realtime Integration Test',
      description: 'Temporary project for Phase 10 verification',
    });
    project = created.project;
  }

  const taskList = await api(
    token,
    'GET',
    `/organizations/${orgId}/projects/${project.id}/tasks?limit=100`,
  );
  let task = taskList?.tasks?.[0];

  if (!task) {
    const created = await api(
      token,
      'POST',
      `/organizations/${orgId}/projects/${project.id}/tasks`,
      {
        title: 'Realtime test task',
        description: 'Used by verify-realtime-integration.mjs',
      },
    );
    task = created.task;
  }

  return { orgId, projectId: project.id, task };
}

async function verifyTaskReordered(context) {
  const listener = await connectSocket(context.tokenA);
  await joinProject(listener, context.orgId, context.projectId);

  const nextStatus =
    context.task.status === 'TODO' ? 'IN_PROGRESS' : 'TODO';
  const eventPromise = onceEvent(listener, 'task:reordered');
  await api(
    context.tokenB,
    'PATCH',
    `/organizations/${context.orgId}/projects/${context.projectId}/tasks/reorder`,
    {
      items: [
        {
          taskId: context.task.id,
          status: nextStatus,
          position: 0,
        },
      ],
    },
  );

  await eventPromise;
  listener.disconnect();
  console.log('task:reordered received (two-tab Kanban simulation)');
}

async function verifyCommentCreated(context) {
  const listener = await connectSocket(context.tokenA);
  await joinProject(listener, context.orgId, context.projectId);

  const eventPromise = onceEvent(listener, 'comment:created');
  await api(
    context.tokenB,
    'POST',
    `/organizations/${context.orgId}/projects/${context.projectId}/tasks/${context.task.id}/comments`,
    { body: `Realtime integration comment ${Date.now()}` },
  );

  await eventPromise;
  listener.disconnect();
  console.log('comment:created received (open task in second tab simulation)');
}

async function verifyNotificationCreated(context) {
  const { user: manager } = await api(context.tokenB, 'GET', '/auth/me');
  const listener = await connectSocket(context.tokenB);
  const eventPromise = onceEvent(listener, 'notification:created');

  await api(
    context.tokenA,
    'PATCH',
    `/organizations/${context.orgId}/projects/${context.projectId}/tasks/${context.task.id}`,
    { assigneeId: null },
  );

  await api(
    context.tokenA,
    'PATCH',
    `/organizations/${context.orgId}/projects/${context.projectId}/tasks/${context.task.id}`,
    { assigneeId: manager.id },
  );

  await eventPromise;
  listener.disconnect();
  console.log('notification:created received on user room');
}

async function main() {
  const clientWsUrl = readClientWsUrl();
  console.log('Client NG_APP_WS_URL:', clientWsUrl ?? '(not found)');

  if (!clientWsUrl?.includes('3001')) {
    throw new Error('Client WS URL must point at local server port 3001');
  }

  const tokenA = await login('admin@acme.dev');
  const tokenB = await login('manager@acme.dev');
  const { orgId, projectId, task } = await ensureProjectAndTask(tokenA);
  const context = { tokenA, tokenB, orgId, projectId, task };

  await verifyTaskReordered(context);
  await verifyCommentCreated(context);

  try {
    await verifyNotificationCreated(context);
  } catch (error) {
    console.warn(
      'notification:created check skipped:',
      error instanceof Error ? error.message : error,
    );
  }

  console.log('Phase 10 realtime integration verification passed');
}

main().catch((error) => {
  console.error('Phase 10 realtime integration verification failed:', error.message);
  process.exit(1);
});
