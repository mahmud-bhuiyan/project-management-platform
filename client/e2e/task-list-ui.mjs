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

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await loginAsAdmin(page);

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
    await page.getByTestId('project-detail-tasks').waitFor({
      state: 'visible',
      timeout: 30000,
    });
    log('open project', true, projectHref);

    const tasksSection = page.getByTestId('project-detail-tasks');
    await tasksSection.waitFor({ state: 'visible', timeout: 15000 });
    await page.getByTestId('project-detail-create-task').waitFor({
      state: 'visible',
      timeout: 15000,
    });
    await page.locator('.project-detail-task-skeleton-list').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    log('tasks section visible', true);

    const taskTitle = `PW Task ${Date.now()}`;
    await page.getByTestId('project-detail-create-task').click();
    await page.waitForURL('**/tasks/new', { timeout: 15000 });
    await page.getByTestId('task-form-title').fill(taskTitle);
    await page.getByTestId('task-form-description').fill('Created by Playwright E2E');
    await page.getByTestId('task-form-status').selectOption('IN_PROGRESS');
    await page.getByTestId('task-form-submit').click();
    await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 30000 });
    await page.getByText(taskTitle).waitFor({ state: 'visible', timeout: 15000 });
    log('create task', true, taskTitle);

    const waitForTasksResponse = () =>
      page
        .waitForResponse(
          (response) =>
            response.request().method() === 'GET' && response.url().includes('/tasks'),
          { timeout: 15000 },
        )
        .catch(() => null);

    await waitForTasksResponse();
    await page.getByTestId('project-detail-task-status-filter').selectOption('IN_PROGRESS');
    await waitForTasksResponse();
    await page.locator('.project-detail-task-skeleton-list').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    log('filter status=IN_PROGRESS', await page.getByText(taskTitle, { exact: true }).isVisible());

    await waitForTasksResponse();
    await page.getByTestId('project-detail-task-status-filter').selectOption('DONE');
    await waitForTasksResponse();
    await page.locator('.project-detail-task-skeleton-list').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    log('filter status=DONE hides task', !(await page.getByText(taskTitle, { exact: true }).isVisible()));

    await waitForTasksResponse();
    await page.getByTestId('project-detail-task-status-filter').selectOption('');
    await waitForTasksResponse();
    await page.locator('.project-detail-task-skeleton-list').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});

    await page
      .getByText(taskTitle, { exact: true })
      .locator('xpath=ancestor::li')
      .locator('[data-testid^="project-detail-task-edit-"]')
      .click();
    await page.waitForURL('**/edit', { timeout: 15000 });
    const editedTitle = `${taskTitle} (edited)`;
    await page.getByTestId('task-form-title').fill(editedTitle);
    await page.getByTestId('task-form-status').selectOption('IN_PROGRESS');
    await page.getByTestId('task-form-submit').click();
    await page.waitForURL(/\/tasks\/[^/]+$/, { timeout: 30000 });
    await page.getByTestId('task-detail-back').click({ noWaitAfter: true });
    await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 15000 });
    await page.getByText(editedTitle).waitFor({ state: 'visible', timeout: 15000 });
    log('edit task', true, editedTitle);

    const projectUrl = page.url();
    await page.getByRole('link', { name: 'Dashboard', exact: true }).click({ noWaitAfter: true });
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.getByRole('link', { name: 'Projects' }).click({ noWaitAfter: true });
    await page.getByTestId('projects-grid').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator(`[data-testid="project-card-link-${projectHref.split('/').pop()}"]`).click({
      noWaitAfter: true,
    });
    await page.getByTestId('project-detail-tasks').waitFor({ state: 'visible', timeout: 15000 });
    log('cache reload', await page.getByText(editedTitle).isVisible(), projectUrl);

    const failed = results.filter((entry) => !entry.ok);
    if (failed.length > 0) {
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
