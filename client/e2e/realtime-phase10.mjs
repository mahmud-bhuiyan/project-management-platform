import { chromium } from 'playwright';

const BASE = 'http://localhost:4200';
const API = 'http://localhost:3001/api/v1';

const results = [];
const log = (step, ok, detail = '') => {
  results.push({ step, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${step}${detail ? ` — ${detail}` : ''}`);
};

async function waitForWorkspaceReady(page) {
  await page.getByTestId('app-shell-bootstrap').waitFor({ state: 'hidden', timeout: 60000 });
}

async function loginAsAdmin(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(500);

  if (!page.url().includes('/login')) {
    await waitForWorkspaceReady(page);
    log('login', true, 'already authenticated');
    return;
  }

  await page.getByText('Try a demo persona').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('admin@acme.dev').click();
  await page.getByRole('button', { name: /Sign in/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  await waitForWorkspaceReady(page);
  log('login', true, 'admin@acme.dev demo persona');
}

async function getDemoAccessToken(page, email) {
  const response = await page.request.post(`${API}/auth/demo-login`, {
    data: { email },
  });

  if (!response.ok()) {
    throw new Error(`Demo login failed for ${email}: ${response.status()}`);
  }

  const json = await response.json();
  return json.data.accessToken;
}

async function resolveProjectContext(page) {
  await page.goto(`${BASE}/projects`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForWorkspaceReady(page);
  await page.getByTestId('projects-grid').waitFor({ state: 'visible', timeout: 30000 });

  const projectLink = page.locator('[data-testid^="project-card-link-"]').first();
  await projectLink.waitFor({ state: 'visible', timeout: 15000 });
  const projectHref = await projectLink.getAttribute('href');
  if (!projectHref) {
    throw new Error('Project link href not found');
  }

  const projectId = projectHref.split('/').pop();
  const token = await getDemoAccessToken(page, 'admin@acme.dev');
  const orgResponse = await page.request.get(`${API}/organizations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const organizations = (await orgResponse.json()).data.organizations;
  const organizationId = organizations[0]?.id;

  if (!organizationId || !projectId) {
    throw new Error('Could not resolve organization or project id');
  }

  return { organizationId, projectId, token };
}

async function createTaskViaApi(page, organizationId, projectId, token, title) {
  const response = await page.request.post(
    `${API}/organizations/${organizationId}/projects/${projectId}/tasks`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title,
        description: 'Phase 10 Playwright realtime coverage.',
        status: 'BACKLOG',
      },
    },
  );

  if (!response.ok()) {
    throw new Error(`Create task failed: ${response.status()}`);
  }

  return (await response.json()).data.task;
}

async function openProjectBoard(page, projectId) {
  await page.goto(`${BASE}/projects/${projectId}/board`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await waitForWorkspaceReady(page);
  await page.getByTestId('kanban-board').waitFor({ state: 'visible', timeout: 30000 });
  await page
    .locator('.kanban-skeleton-board')
    .waitFor({ state: 'hidden', timeout: 15000 })
    .catch(() => {});
  await page.waitForTimeout(2000);
}

async function reorderTaskViaApi(page, organizationId, projectId, taskId, token, status) {
  const response = await page.request.patch(
    `${API}/organizations/${organizationId}/projects/${projectId}/tasks/reorder`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        items: [{ taskId, status, position: 0 }],
      },
    },
  );

  if (!response.ok()) {
    throw new Error(`Reorder task failed: ${response.status()}`);
  }
}

async function postCommentViaApi(page, organizationId, projectId, taskId, token, body) {
  const response = await page.request.post(
    `${API}/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/comments`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: { body },
    },
  );

  if (!response.ok()) {
    throw new Error(`Create comment failed: ${response.status()}`);
  }
}

async function main() {
  const runId = Date.now();
  const taskTitle = `[PW Phase10 ${runId}] Realtime sync`;
  const commentText = `[PW Phase10 ${runId}] Cross-tab comment sync`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const pageA = await context.newPage();
  const pageB = await context.newPage();

  try {
    const health = await pageA.request.get(`${API}/health`).catch(() => null);
    log('api health', health?.ok() === true, health?.status()?.toString() ?? 'unreachable');

    await loginAsAdmin(pageA);
    const { organizationId, projectId, token } = await resolveProjectContext(pageA);
    log('resolve project context', true, projectId);

    const task = await createTaskViaApi(
      pageA,
      organizationId,
      projectId,
      token,
      taskTitle,
    );
    log('create task via API', !!task?.id, taskTitle);

    await openProjectBoard(pageA, projectId);
    await openProjectBoard(pageB, projectId);
    log('open board in two tabs', true, `/projects/${projectId}/board`);

    const observerBacklogCard = pageB.locator(
      `[data-testid="kanban-column-BACKLOG"] [data-testid="kanban-card-${task.id}"]`,
    );
    await observerBacklogCard.waitFor({ state: 'visible', timeout: 30000 });
    log('observer tab sees new task card in BACKLOG', true, taskTitle);

    await reorderTaskViaApi(pageA, organizationId, projectId, task.id, token, 'TODO');
    log('reorder task to TODO (actor tab API)', true, task.id);

    const observerTodoCard = pageB.locator(
      `[data-testid="kanban-column-TODO"] [data-testid="kanban-card-${task.id}"]`,
    );

    await observerTodoCard.waitFor({ state: 'visible', timeout: 45000 });
    log('observer tab sees moved task in TODO', true, 'realtime Kanban sync');

    const taskDetailUrl = `${BASE}/projects/${projectId}/tasks/${task.id}`;
    await pageB.goto(taskDetailUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForWorkspaceReady(pageB);
    await pageB.getByTestId('task-detail-overview').waitFor({ state: 'visible', timeout: 15000 });
    await pageB.waitForTimeout(2000);
    log('observer tab on task detail', true, taskDetailUrl);

    await postCommentViaApi(
      pageA,
      organizationId,
      projectId,
      task.id,
      token,
      commentText,
    );
    log('actor tab posts comment via API', true, commentText);

    await pageB.getByTestId('task-detail-comments').getByText(commentText).waitFor({
      state: 'visible',
      timeout: 30000,
    });
    log('observer tab sees realtime comment', true, commentText);

    const failed = results.filter((entry) => !entry.ok);
    console.log('\n--- Summary ---');
    console.log(`Passed: ${results.filter((entry) => entry.ok).length}/${results.length}`);
    if (failed.length > 0) {
      console.log('Failed steps:', failed.map((entry) => entry.step).join(', '));
      process.exitCode = 1;
    }
  } catch (error) {
    log('unexpected error', false, String(error));
    process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
  }
}

main();
