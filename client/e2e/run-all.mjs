import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const suites = [
  'task-list-ui.mjs',
  'task-full-feature.mjs',
  'task-detail-phase8.mjs',
  'notifications-phase9.mjs',
  'realtime-phase10.mjs',
  'dashboard-charts-phase11.mjs',
];

async function runSuite(suite) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(__dirname, suite)], {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('close', (code) => {
      resolve(code ?? 1);
    });
  });
}

async function main() {
  console.log('Running Playwright e2e suites for this branch...\n');

  const results = [];

  for (const suite of suites) {
    console.log(`\n========== ${suite} ==========\n`);
    const code = await runSuite(suite);
    results.push({ suite, code });
  }

  console.log('\n========== E2E summary ==========');
  for (const result of results) {
    console.log(`${result.code === 0 ? 'PASS' : 'FAIL'} | ${result.suite}`);
  }

  const failed = results.filter((result) => result.code !== 0);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
