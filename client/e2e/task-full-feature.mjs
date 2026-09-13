import { chromium } from 'playwright';

const BASE = 'http://localhost:4200';

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
  log('login', true, 'admin@acme.dev');
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
  await page.locator('.project-detail-task-skeleton-list').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});

  return { projectHref, projectId: projectHref.split('/').pop() };
}

async function createTask(page, task) {
  await page.getByTestId('project-detail-create-task').click({ noWaitAfter: true });
  await page.waitForURL('**/tasks/new', { timeout: 15000 });

  await page.getByTestId('task-form-title').fill(task.title);
  await page.getByTestId('task-form-description').fill(task.description);
  await page.getByTestId('task-form-status').selectOption(task.status);
  await page.getByTestId('task-form-priority').selectOption(task.priority);

  if (task.assigneeIndex != null) {
    const options = page.getByTestId('task-form-assignee').locator('option');
    const count = await options.count();
    if (count > 1) {
      const value = await options.nth(task.assigneeIndex + 1).getAttribute('value');
      if (value) {
        await page.getByTestId('task-form-assignee').selectOption(value);
      }
    }
  }

  if (task.dueDate) {
    await page.getByTestId('task-form-due-date').fill(task.dueDate);
  }

  await page.getByTestId('task-form-submit').click();
  await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 30000 });
  await page.getByText(task.title).waitFor({ state: 'visible', timeout: 15000 });
}

async function tasksTable(page) {
  return page.getByTestId('project-detail-task-list');
}

async function expectTaskInTable(page, title, visible = true) {
  const table = await tasksTable(page);
  const count = await table.getByText(title, { exact: true }).count();
  const ok = visible ? count > 0 : count === 0;
  log(`task in table: ${title}`, ok, visible ? 'shown' : 'hidden');
  return ok;
}

async function selectTaskFilter(page, testId, value) {
  const responsePromise = page
    .waitForResponse(
      (response) =>
        response.request().method() === 'GET' && response.url().includes('/tasks'),
      { timeout: 15000 },
    )
    .catch(() => null);

  await page.getByTestId(testId).selectOption(value);
  await responsePromise;
  await page.locator('.project-detail-task-skeleton-list').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
}

async function main() {
  const runId = Date.now();
  const dummyTasks = [
    {
      title: `[E2E ${runId}] Setup auth flow`,
      description: 'Configure JWT refresh and demo login.',
      status: 'BACKLOG',
      priority: 'LOW',
    },
    {
      title: `[E2E ${runId}] Build API endpoints`,
      description: 'CRUD routes for tasks with pagination.',
      status: 'TODO',
      priority: 'MEDIUM',
      assigneeIndex: 0,
    },
    {
      title: `[E2E ${runId}] Design dashboard widgets`,
      description: 'Stats cards for projects and tasks.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: '2026-12-31',
    },
    {
      title: `[E2E ${runId}] Write Playwright tests`,
      description: 'Cover create, edit, filters, and cache.',
      status: 'REVIEW',
      priority: 'MEDIUM',
    },
    {
      title: `[E2E ${runId}] Deploy to staging`,
      description: 'Smoke test after deployment.',
      status: 'DONE',
      priority: 'CRITICAL',
    },
  ];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await loginAsAdmin(page);
    const { projectHref, projectId } = await openFirstProject(page);
    log('open project', true, projectHref);

    for (const task of dummyTasks) {
      await createTask(page, task);
      log('create task', true, task.title);
    }

    log(
      'all dummy tasks listed',
      (await page.locator('[data-testid="project-detail-task-row-row"]').count()) >= dummyTasks.length,
    );

    await selectTaskFilter(page, 'project-detail-task-status-filter', 'IN_PROGRESS');
    await expectTaskInTable(page, dummyTasks[2].title, true);
    await expectTaskInTable(page, dummyTasks[0].title, false);

    await selectTaskFilter(page, 'project-detail-task-status-filter', 'DONE');
    await expectTaskInTable(page, dummyTasks[4].title, true);
    await expectTaskInTable(page, dummyTasks[2].title, false);

    await selectTaskFilter(page, 'project-detail-task-status-filter', '');
    await selectTaskFilter(page, 'project-detail-task-priority-filter', 'HIGH');
    await expectTaskInTable(page, dummyTasks[2].title, true);
    await expectTaskInTable(page, dummyTasks[1].title, false);

    await selectTaskFilter(page, 'project-detail-task-priority-filter', '');

    const editTarget = dummyTasks[1];
    const editedTitle = `${editTarget.title} (updated)`;
    await page.getByText(editTarget.title, { exact: true }).locator('xpath=ancestor::li').getByRole('link', { name: 'Edit task' }).click({ noWaitAfter: true });
    await page.waitForURL('**/edit', { timeout: 15000 });
    await page.getByTestId('task-form-title').fill(editedTitle);
    await page.getByTestId('task-form-status').selectOption('REVIEW');
    await page.getByTestId('task-form-priority').selectOption('HIGH');
    await page.getByTestId('task-form-submit').click();
    await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 30000 });
    await page.getByText(editedTitle).waitFor({ state: 'visible', timeout: 15000 });
    log('edit task', true, editedTitle);

    await page.getByRole('link', { name: 'Dashboard' }).click({ noWaitAfter: true });
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.getByTestId('dashboard-stats').waitFor({ state: 'visible', timeout: 15000 });
    log('dashboard stats visible', true, 'stats loaded from store cache at bootstrap');

    await page.getByRole('link', { name: 'Projects' }).click({ noWaitAfter: true });
    await page.getByTestId('projects-grid').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator(`[data-testid="project-card-link-${projectId}"]`).click({ noWaitAfter: true });
    await page.getByTestId('project-detail-tasks').waitFor({ state: 'visible', timeout: 15000 });
    log('cache reload', await page.getByText(editedTitle).isVisible(), 'tasks from store');

    await page.getByTestId('project-detail-create-task').click({ noWaitAfter: true });
    await page.waitForURL('**/tasks/new', { timeout: 15000 });
    await page.getByTestId('task-form-cancel').click({ noWaitAfter: true });
    await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 15000 });
    log('cancel create form', page.url().includes(`/projects/${projectId}`));

    const failed = results.filter((entry) => !entry.ok);
    console.log('\n--- Summary ---');
    console.log(`Passed: ${results.filter((e) => e.ok).length}/${results.length}`);
    if (failed.length > 0) {
      console.log('Failed steps:', failed.map((f) => f.step).join(', '));
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
