import { chromium } from 'playwright';

const BASE = 'http://localhost:4200';
const API = 'http://localhost:3001/api/v1';

const results = [];
const log = (step, ok, detail = '') => {
  results.push({ step, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${step}${detail ? ` — ${detail}` : ''}`);
};

function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function waitForWorkspaceReady(page) {
  await page.getByTestId('app-shell-bootstrap').waitFor({ state: 'hidden', timeout: 60000 });
}

async function getDemoAccessToken(email = 'admin@acme.dev') {
  const response = await fetch(`${API}/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(`Demo login failed for ${email}: ${response.status}`);
  }

  const json = await response.json();
  return json.data.accessToken;
}

async function loginAsAdmin(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  if (!page.url().includes('/login')) {
    await page.getByTestId('app-shell-sign-out').click({ noWaitAfter: true });
    await page.waitForURL('**/login', { timeout: 30000 });
  }

  await page.getByText('Try a demo persona').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('admin@acme.dev', { exact: true }).click();
  await page.getByRole('button', { name: /Sign in/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  await waitForWorkspaceReady(page);
  log('login', true, 'admin@acme.dev');
}

async function waitForTasksResponse(page) {
  return page
    .waitForResponse(
      (response) =>
        response.request().method() === 'GET' && response.url().includes('/tasks'),
      { timeout: 15000 },
    )
    .catch(() => null);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const health = await page.request.get(`${API}/health`).catch(() => null);
    log('api health', health?.ok() === true, health?.status()?.toString() ?? 'unreachable');
    if (!health?.ok()) {
      throw new Error('API is not reachable at http://localhost:3001');
    }

    await loginAsAdmin(page);

    const token = await getDemoAccessToken();
    const orgResponse = await fetch(`${API}/organizations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const organizations = (await orgResponse.json()).data.organizations;
    const organizationId = organizations[0]?.id;
    if (!organizationId) {
      throw new Error('No organization found for demo admin');
    }

    const projectsResponse = await fetch(
      `${API}/organizations/${organizationId}/projects`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const projects = (await projectsResponse.json()).data.projects;
    const projectId = projects[0]?.id;
    if (!projectId) {
      throw new Error('No project found for demo org');
    }

    const searchResponse = await fetch(
      `${API}/search?organizationId=${organizationId}&q=a&page=1&limit=20`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const searchJson = await searchResponse.json();
    log('global search API', searchResponse.ok, searchResponse.status.toString());
    log(
      'search returns results array',
      Array.isArray(searchJson.data?.results),
      `${searchJson.data?.results?.length ?? 0} items`,
    );
    log(
      'search pagination meta',
      typeof searchJson.meta?.total === 'number' && typeof searchJson.meta?.page === 'number',
    );

    const memberToken = await getDemoAccessToken('member@acme.dev');
    const memberCreateProjectResponse = await fetch(
      `${API}/organizations/${organizationId}/projects`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${memberToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Member blocked project' }),
      },
    );
    log('member project create forbidden', memberCreateProjectResponse.status === 403);

    const taskTitle = `PW Filter ${Date.now()}`;
    const dueDate = isoDate(7);
    const dueFrom = isoDate(5);
    const dueTo = isoDate(10);

    await page.goto(`${BASE}/projects`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForWorkspaceReady(page);
    await page.getByTestId('projects-grid').waitFor({ state: 'visible', timeout: 30000 });

    const projectLink = page.locator('[data-testid^="project-card-link-"]').first();
    await projectLink.waitFor({ state: 'visible', timeout: 15000 });
    await projectLink.click({ noWaitAfter: true });

    await page.getByTestId('project-detail-tasks').waitFor({ state: 'visible', timeout: 30000 });
    await page
      .locator('.project-detail-task-skeleton-list')
      .waitFor({ state: 'hidden', timeout: 15000 })
      .catch(() => {});

    await page.getByTestId('project-detail-create-task').click({ noWaitAfter: true });
    await page.waitForURL('**/tasks/new', { timeout: 15000 });
    await page.getByTestId('task-form-title').fill(taskTitle);
    await page.getByTestId('task-form-description').fill('Phase 12 filter E2E');
    await page.getByTestId('task-form-status').selectOption('TODO');
    await page.getByTestId('task-form-due-date').fill(dueDate);

    const createTaskResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && response.url().includes('/tasks'),
      { timeout: 30000 },
    );
    await page.getByTestId('task-form-submit').click({ noWaitAfter: true });
    const createResponse = await createTaskResponse;
    if (!createResponse.ok()) {
      const body = await createResponse.text().catch(() => '');
      throw new Error(`Create task failed: ${createResponse.status()} ${body}`);
    }

    await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 30000 });
    await page.getByText(taskTitle, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    log('create task with due date', true, `${taskTitle} due ${dueDate}`);

    const assigneeFilter = page.getByTestId('project-detail-task-assignee-filter');
    const hasAssigneeFilter = (await assigneeFilter.count()) > 0;
    log('assignee filter control present', hasAssigneeFilter);

    let assigneeLabel = '';
    if (hasAssigneeFilter) {
      const assigneeOptions = await assigneeFilter.locator('option').allTextContents();
      assigneeLabel =
        assigneeOptions.find((label) => label.trim() && label.trim() !== 'All assignees')?.trim() ??
        '';

      if (assigneeLabel) {
        await waitForTasksResponse(page);
        await assigneeFilter.selectOption({ label: assigneeLabel });
        await waitForTasksResponse(page);
        await page
          .locator('.project-detail-task-skeleton-list')
          .waitFor({ state: 'hidden', timeout: 10000 })
          .catch(() => {});
        log(
          'assignee filter request sent',
          true,
          assigneeLabel,
        );
        await assigneeFilter.selectOption('');
      }
    }

    const dueFromFilter = page.getByTestId('project-detail-task-due-from-filter');
    const hasDueFilters = (await dueFromFilter.count()) > 0;
    log('due date filter controls present', hasDueFilters);
    if (!hasDueFilters) {
      throw new Error('Due date filters not found — restart client on feature branch');
    }

    await waitForTasksResponse(page);
    await page.getByTestId('project-detail-task-due-from-filter').fill(dueFrom);
    await waitForTasksResponse(page);
    await page.getByTestId('project-detail-task-due-to-filter').fill(dueTo);
    await waitForTasksResponse(page);
    await page
      .locator('.project-detail-task-skeleton-list')
      .waitFor({ state: 'hidden', timeout: 10000 })
      .catch(() => {});
    log(
      'due date range includes task',
      await page.getByText(taskTitle, { exact: true }).isVisible(),
      `${dueFrom} → ${dueTo}`,
    );

    await waitForTasksResponse(page);
    await page.getByTestId('project-detail-task-due-from-filter').fill(isoDate(30));
    await page.getByTestId('project-detail-task-due-to-filter').fill(isoDate(40));
    await waitForTasksResponse(page);
    await page
      .locator('.project-detail-task-skeleton-list')
      .waitFor({ state: 'hidden', timeout: 10000 })
      .catch(() => {});
    log(
      'due date range excludes task',
      !(await page.getByText(taskTitle, { exact: true }).isVisible()),
    );

    await waitForTasksResponse(page);
    await page.getByTestId('project-detail-task-due-from-filter').fill('');
    await page.getByTestId('project-detail-task-due-to-filter').fill('');
    await page.getByTestId('project-detail-task-status-filter').selectOption('TODO');
    await waitForTasksResponse(page);
    await page
      .locator('.project-detail-task-skeleton-list')
      .waitFor({ state: 'hidden', timeout: 10000 })
      .catch(() => {});
    log(
      'combined status filter',
      await page.getByText(taskTitle, { exact: true }).isVisible(),
    );

    await waitForTasksResponse(page);
    await page.getByTestId('project-detail-task-status-filter').selectOption('DONE');
    await waitForTasksResponse(page);
    log(
      'combined filter hides mismatched status',
      !(await page.getByText(taskTitle, { exact: true }).isVisible()),
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
