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

async function loginAsDemoPersona(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  if (!page.url().includes('/login')) {
    await page.getByTestId('app-shell-sign-out').click({ noWaitAfter: true });
    await page.waitForURL('**/login', { timeout: 30000 });
  }

  await page.getByText('Try a demo persona').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText(email, { exact: true }).click();
  await page.getByRole('button', { name: /Sign in/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  await waitForWorkspaceReady(page);
  log(`login ${email}`, true);
}

async function signOut(page) {
  await page.getByTestId('app-shell-sign-out').click({ noWaitAfter: true });
  await page.waitForURL('**/login', { timeout: 30000 });
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

async function ensureProjectMember(page, organizationId, projectId, email) {
  const token = await getDemoAccessToken(page, 'admin@acme.dev');
  const headers = { Authorization: `Bearer ${token}` };

  const membersResponse = await page.request.get(
    `${API}/organizations/${organizationId}/projects/${projectId}/members`,
    { headers },
  );

  if (!membersResponse.ok()) {
    throw new Error(`Could not list project members: ${membersResponse.status()}`);
  }

  const members = (await membersResponse.json()).data.members;
  if (members.some((member) => member.user.email === email)) {
    return;
  }

  const addResponse = await page.request.post(
    `${API}/organizations/${organizationId}/projects/${projectId}/members`,
    {
      headers,
      data: { email },
    },
  );

  if (!addResponse.ok()) {
    throw new Error(`Could not add ${email} to project: ${addResponse.status()}`);
  }
}

async function openFirstProject(page) {
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

  await ensureProjectMember(page, organizationId, projectId, 'manager@acme.dev');

  await projectLink.click({ noWaitAfter: true });
  await page.getByTestId('project-detail-tasks').waitFor({ state: 'visible', timeout: 30000 });
  await page
    .locator('.project-detail-task-skeleton-list')
    .waitFor({ state: 'hidden', timeout: 15000 })
    .catch(() => {});

  return { projectHref, projectId, organizationId };
}

async function selectAssigneeByLabel(page, label) {
  const assignee = page.getByTestId('task-form-assignee');
  await assignee
    .locator('option', { hasText: label })
    .waitFor({ state: 'attached', timeout: 15000 });
  await assignee.selectOption({ label });
  const selectedLabel = await assignee.locator('option:checked').textContent();
  return selectedLabel?.trim() === label;
}

async function openNotificationBell(page) {
  await page.getByTestId('notification-bell-trigger').click();
  await page.getByTestId('notification-bell-panel').waitFor({ state: 'visible', timeout: 15000 });
}

async function main() {
  const runId = Date.now();
  const taskTitle = `[PW Phase9 ${runId}] Notification triggers`;
  const mentionComment = 'Please review — @manager needs to sign off.';

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const health = await page.request.get(`${API}/health`).catch(() => null);
    log('api health', health?.ok() === true, health?.status()?.toString() ?? 'unreachable');

    await loginAsDemoPersona(page, 'admin@acme.dev');

    log('bell trigger visible', await page.getByTestId('notification-bell-trigger').isVisible());

    await openNotificationBell(page);
    log('bell panel opens', await page.getByTestId('notification-bell-panel').isVisible());

    const markAllButton = page.getByTestId('notification-bell-mark-all');
    if (await markAllButton.isEnabled()) {
      await markAllButton.click();
      await page.waitForTimeout(500);
    }
    log('mark all read (admin cleanup)', true);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const { projectHref } = await openFirstProject(page);
    log('open project', true, projectHref);

    await page.getByTestId('project-detail-create-task').click({ noWaitAfter: true });
    await page.waitForURL('**/tasks/new', { timeout: 15000 });
    await page.getByTestId('task-form-title').fill(taskTitle);
    await page.getByTestId('task-form-description').fill('Phase 9 Playwright notification coverage.');
    const assigneeSelected = await selectAssigneeByLabel(page, 'Project Manager');
    log('assign manager on create', assigneeSelected, 'Project Manager');
    if (!assigneeSelected) {
      throw new Error('Could not assign task to Project Manager');
    }
    await page.getByTestId('task-form-submit').click();
    await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 30000 });
    await page.getByText(taskTitle, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    log('create assigned task', true, taskTitle);

    await page.getByText(taskTitle, { exact: true }).click({ noWaitAfter: true });
    await page.waitForURL('**/tasks/**', { timeout: 15000 });
    await page.getByTestId('task-detail-overview').waitFor({ state: 'visible', timeout: 15000 });
    const taskDetailUrl = page.url();
    log('open task detail (admin)', true, taskDetailUrl);

    await signOut(page);

    await loginAsDemoPersona(page, 'manager@acme.dev');

    await page.getByTestId('notification-bell-badge').waitFor({ state: 'visible', timeout: 20000 });
    log('manager unread badge', true);

    await openNotificationBell(page);
    await page
      .getByTestId('notification-bell-panel')
      .getByText('Task assigned to you')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 });
    log('manager sees assignment notification', true);

    await page
      .getByTestId('notification-bell-panel')
      .getByRole('button', { name: /Task assigned to you/i })
      .first()
      .click();
    await page.getByTestId('task-detail-overview').waitFor({ state: 'visible', timeout: 15000 });
    log(
      'notification opens task detail',
      page.url().includes('/tasks/') &&
        (await page.locator('app-page-hero').textContent())?.includes(taskTitle) === true,
      taskTitle,
    );

    await signOut(page);

    await loginAsDemoPersona(page, 'admin@acme.dev');
    await page.goto(taskDetailUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForWorkspaceReady(page);
    await page.getByTestId('task-detail-overview').waitFor({ state: 'visible', timeout: 15000 });

    await page.getByTestId('task-detail-comment-input').fill(mentionComment);
    await page.getByTestId('task-detail-comment-submit').click();
    await page.getByTestId('task-detail-comments').getByText(mentionComment).waitFor({
      state: 'visible',
      timeout: 15000,
    });
    log('admin posts @manager comment', true, mentionComment);

    await signOut(page);

    await loginAsDemoPersona(page, 'manager@acme.dev');

    await page.getByTestId('notification-bell-badge').waitFor({ state: 'visible', timeout: 20000 });
    await openNotificationBell(page);
    await page
      .getByTestId('notification-bell-panel')
      .getByText('You were mentioned')
      .first()
      .waitFor({ state: 'visible', timeout: 15000 });
    log('manager sees mention notification', true);

    await page.getByTestId('notification-bell-mark-all').click();
    await page.waitForTimeout(800);
    log(
      'badge cleared after mark all',
      !(await page.getByTestId('notification-bell-badge').isVisible()),
    );

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
    await browser.close();
  }
}

main();
