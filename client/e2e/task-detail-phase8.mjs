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

  if (!page.url().includes('/login')) {
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

  await projectLink.click({ noWaitAfter: true });
  await page.getByTestId('project-detail-tasks').waitFor({ state: 'visible', timeout: 30000 });
  await page
    .locator('.project-detail-task-skeleton-list')
    .waitFor({ state: 'hidden', timeout: 15000 })
    .catch(() => {});

  return { projectHref, projectId: projectHref.split('/').pop() };
}

async function createTaskAndOpenDetail(page, taskTitle) {
  await page.getByTestId('project-detail-create-task').click({ noWaitAfter: true });
  await page.waitForURL('**/tasks/new', { timeout: 15000 });
  await page.getByTestId('task-form-title').fill(taskTitle);
  await page.getByTestId('task-form-description').fill('Phase 8 Playwright coverage task.');
  await page.getByTestId('task-form-submit').click();
  await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 30000 });
  await page.getByText(taskTitle).waitFor({ state: 'visible', timeout: 15000 });

  await page.getByText(taskTitle, { exact: true }).click({ noWaitAfter: true });
  await page.waitForURL('**/tasks/**', { timeout: 15000 });
  await page.getByTestId('task-detail-overview').waitFor({ state: 'visible', timeout: 15000 });
}

async function waitForActivityEntry(page, text) {
  await page.getByTestId('task-detail-activity').getByText(text).waitFor({
    state: 'visible',
    timeout: 15000,
  });
}

async function main() {
  const runId = Date.now();
  const taskTitle = `[PW Phase8 ${runId}] Task detail flow`;
  const subtaskOne = 'Draft wireframes';
  const subtaskTwo = 'Review copy';
  const mentionComment = 'Looks good — please loop in @manager for review.';
  const updatedComment = 'Updated: @manager please review mobile breakpoints.';

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const health = await page.request.get(`${API}/health`).catch(() => null);
    log('api health', health?.ok() === true, health?.status()?.toString() ?? 'unreachable');

    await loginAsAdmin(page);
    const { projectHref } = await openFirstProject(page);
    log('open project', true, projectHref);

    await createTaskAndOpenDetail(page, taskTitle);
    log('open task detail', page.url().includes('/tasks/'), taskTitle);

    const overview = page.getByTestId('task-detail-overview');
    log('overview visible', await overview.isVisible());
    log(
      'overview description',
      (await overview.textContent())?.includes('Phase 8 Playwright coverage task') === true,
    );

    await page.getByTestId('task-detail-subtask-input').fill(subtaskOne);
    await page.getByTestId('task-detail-subtask-add').click();
    await page.getByTestId('task-detail-subtasks').getByText(subtaskOne).waitFor({
      state: 'visible',
      timeout: 15000,
    });
    log('add subtask 1', true, subtaskOne);

    await page.getByTestId('task-detail-subtask-input').fill(subtaskTwo);
    await page.getByTestId('task-detail-subtask-add').click();
    await page.getByTestId('task-detail-subtasks').getByText(subtaskTwo).waitFor({
      state: 'visible',
      timeout: 15000,
    });
    log('add subtask 2', true, subtaskTwo);

    log(
      'subtask progress 0/2',
      (await page.getByTestId('task-detail-subtasks').textContent())?.includes(
        '0 / 2 subtasks completed',
      ) === true,
    );

    const firstCheckbox = page
      .getByTestId('task-detail-subtasks')
      .locator('input[type="checkbox"]')
      .first();
    await firstCheckbox.check();
    await page.getByTestId('task-detail-subtasks').getByText('1 / 2 subtasks completed').waitFor({
      state: 'visible',
      timeout: 15000,
    });
    log('toggle subtask complete', true, '1 / 2 subtasks completed');

    await waitForActivityEntry(page, 'completed subtask');
    log('activity subtask completed', true);

    await page.getByTestId('task-detail-comment-input').fill(mentionComment);
    await page.getByTestId('task-detail-comment-submit').click();
    await page.getByTestId('task-detail-comments').getByText(mentionComment).waitFor({
      state: 'visible',
      timeout: 15000,
    });
    log('post comment with @mention', true, mentionComment);

    await waitForActivityEntry(page, 'added a comment');
    log('activity comment added', true);

    const commentItem = page.getByTestId('task-detail-comments').locator('li').first();
    await commentItem.getByRole('button', { name: 'Edit' }).click();
    await commentItem.locator('textarea').fill(updatedComment);
    await commentItem.getByRole('button', { name: 'Save' }).click();
    await page.getByTestId('task-detail-comments').getByText(updatedComment).waitFor({
      state: 'visible',
      timeout: 15000,
    });
    log('edit own comment', true, updatedComment);

    log(
      'mention preserved in body',
      (await page.getByTestId('task-detail-comments').textContent())?.includes('@manager') ===
        true,
    );

    await page.getByTestId('task-detail-edit').click({ noWaitAfter: true });
    await page.waitForURL('**/edit', { timeout: 15000 });
    const editedTitle = `${taskTitle} (edited)`;
    await page.getByTestId('task-form-title').fill(editedTitle);
    await page.getByTestId('task-form-status').selectOption('IN_PROGRESS');
    await page.getByTestId('task-form-submit').click();
    await page.waitForURL(/\/tasks\/[^/]+$/, { timeout: 30000 });
    await page.getByTestId('task-detail-overview').waitFor({ state: 'visible', timeout: 15000 });
    log('edit task from detail', true, 'returns to task detail');

    await waitForActivityEntry(page, 'moved this task');
    log('activity status change', true);

    await page.getByTestId('task-detail-back').click({ noWaitAfter: true });
    await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 15000 });
    await page.getByText(editedTitle).waitFor({ state: 'visible', timeout: 15000 });
    log('back to project list', true, editedTitle);

    await page.getByTestId('project-detail-view-board').click({ noWaitAfter: true });
    await page.waitForURL('**/board', { timeout: 15000 });
    await page.getByTestId('kanban-board').waitFor({ state: 'visible', timeout: 15000 });
    const kanbanLink = page.locator(`[data-testid^="kanban-task-link-"]`).filter({
      hasText: editedTitle,
    });
    log('kanban shows task', (await kanbanLink.count()) > 0, editedTitle);

    await kanbanLink.first().click({ noWaitAfter: true });
    await page.getByTestId('task-detail-overview').waitFor({ state: 'visible', timeout: 15000 });
    log('open task detail from kanban', true);

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
