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
    await page.getByTestId('app-shell-sign-out').click({ noWaitAfter: true });
    await page.waitForURL('**/login', { timeout: 30000 });
  }

  await page.getByText('Try a demo persona').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText('admin@acme.dev', { exact: true }).click();
  await page.getByRole('button', { name: /Sign in/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  await waitForWorkspaceReady(page);
  log('login', true, 'admin@acme.dev demo persona');
}

async function getDemoAccessToken(page, email = 'admin@acme.dev') {
  const response = await page.request.post(`${API}/auth/demo-login`, {
    data: { email },
  });

  if (!response.ok()) {
    throw new Error(`Demo login failed for ${email}: ${response.status()}`);
  }

  const json = await response.json();
  return json.data.accessToken;
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

    await page.getByTestId('dashboard-stats').waitFor({ state: 'visible', timeout: 30000 });
    log('dashboard stat cards visible', true);

    const totalProjectsText = await page
      .getByTestId('dashboard-stat-total-projects')
      .textContent();
    log(
      'total projects stat rendered',
      totalProjectsText !== null && totalProjectsText.trim().length > 0,
      totalProjectsText?.trim() ?? '',
    );

    await page.getByTestId('dashboard-charts').waitFor({ state: 'visible', timeout: 30000 });
    log('dashboard charts section visible', true);

    await page.getByText('Workspace insights').waitFor({ state: 'visible', timeout: 15000 });
    log('workspace insights heading visible', true);

    const token = await getDemoAccessToken(page);
    const orgResponse = await page.request.get(`${API}/organizations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const organizations = (await orgResponse.json()).data.organizations;
    const organizationId = organizations[0]?.id;
    if (!organizationId) {
      throw new Error('No organization found for demo admin');
    }

    const statsResponse = await page.request.get(
      `${API}/dashboard/stats?organizationId=${organizationId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    log('dashboard stats API', statsResponse.ok(), statsResponse.status().toString());

    const statsJson = await statsResponse.json();
    const charts = statsJson.data?.stats?.charts;
    log('stats include charts object', charts && typeof charts === 'object');
    log(
      'charts.tasksByStatus is array',
      Array.isArray(charts?.tasksByStatus),
      `${charts?.tasksByStatus?.length ?? 0} items`,
    );
    log(
      'charts.tasksByPriority is array',
      Array.isArray(charts?.tasksByPriority),
      `${charts?.tasksByPriority?.length ?? 0} items`,
    );
    log(
      'charts.projectProgress is array',
      Array.isArray(charts?.projectProgress),
      `${charts?.projectProgress?.length ?? 0} items`,
    );

    const hasChartData =
      charts?.tasksByStatus?.some((item) => item.count > 0) ||
      charts?.tasksByPriority?.some((item) => item.count > 0) ||
      (charts?.projectProgress?.length ?? 0) > 0;

    const chartsEmpty = page.getByTestId('dashboard-charts-empty');
    const chartCanvases = page.locator('[data-testid="dashboard-charts"] canvas');

    if (hasChartData) {
      await page.getByText('Tasks by status').waitFor({ state: 'visible', timeout: 15000 });
      await page.getByText('Tasks by priority').waitFor({ state: 'visible', timeout: 15000 });
      log('status and priority chart headings visible', true);

      const canvasCount = await chartCanvases.count();
      log('chart canvases rendered', canvasCount >= 2, `${canvasCount} canvas elements`);

      if ((charts?.projectProgress?.length ?? 0) > 0) {
        await page.getByText('Project progress').waitFor({ state: 'visible', timeout: 15000 });
        log('project progress chart visible', canvasCount >= 3, `${canvasCount} canvas elements`);
      }
    } else {
      await chartsEmpty.waitFor({ state: 'visible', timeout: 15000 });
      log('empty chart state shown when no task data', true);
    }

    await page.getByTestId('dashboard-activity').waitFor({ state: 'visible', timeout: 15000 });
    log('recent activity section still visible', true);

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
