#!/usr/bin/env node
/**
 * Flaky test detector — runs the test suite N times and reports tests that
 * pass sometimes and fail other times (the definition of flaky).
 *
 * Runs both the frontend (vitest) and Lambda (node --test) suites. A test is
 * flagged as flaky if it has at least one pass AND at least one fail across
 * the runs. Tests that consistently fail are NOT flaky (they're broken).
 *
 * Usage:
 *   node scripts/detect-flaky-tests.mjs              # 3 runs (default)
 *   node scripts/detect-flaky-tests.mjs --runs 5     # 5 runs
 *   node scripts/detect-flaky-tests.mjs --suite frontend   # frontend only
 *   node scripts/detect-flaky-tests.mjs --suite lambda     # lambda only
 *
 * Exit codes:
 *   0 — no flaky tests detected (all runs consistent)
 *   1 — flaky tests detected (review the report)
 *   2 — infrastructure error (a run crashed unexpectedly)
 *
 * In CI, this runs as a scheduled (nightly) job so flaky tests are caught
 * early without blocking PR merges.
 */
import { execSync } from 'node:child_process';

/**
 * Accepts both `--runs 5` and `--runs=5` (the header has always documented the
 * space form, but only the `=` form ever parsed, so `--runs 5` silently ran
 * with the default).
 */
function argValue(name) {
  const eq = process.argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.split('=')[1];
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const RUNS = parseInt(argValue('--runs') || '3', 10);
const SUITE_ARG = argValue('--suite');
const RUN_FRONTEND = !SUITE_ARG || SUITE_ARG === 'frontend';
const RUN_LAMBDA = !SUITE_ARG || SUITE_ARG === 'lambda';

const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function runSuite(command, suiteName) {
  const results = [];

  for (let i = 1; i <= RUNS; i++) {
    process.stdout.write(`${COLORS.cyan}[${suiteName}] Run ${i}/${RUNS}...${COLORS.reset} `);
    try {
      const output = execSync(command, {
        encoding: 'utf8',
        // The full frontend suite runs 90s+ on a warm dev machine and well past
        // that on a 2-core CI runner. The old 120s ceiling meant every CI run
        // could be killed mid-suite and recorded as a plain failure.
        timeout: 15 * 60 * 1000,
        maxBuffer: 64 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
      });
      // Two summary dialects: vitest prints "Tests  N failed | M passed (T)",
      // node --test prints "ℹ pass N" / "ℹ fail N". The old patterns knew
      // node --test and mocha only, so every vitest run parsed as 0 tests.
      const passed = output.match(/ℹ pass\s+(\d+)/)?.[1] || output.match(/Tests[^\n]*?(\d+) passed/)?.[1] || '0';
      const failed = output.match(/ℹ fail\s+(\d+)/)?.[1] || output.match(/Tests[^\n]*?(\d+) failed/)?.[1] || '0';
      const skipped = output.match(/ℹ skipped\s+(\d+)/)?.[1] || output.match(/Tests[^\n]*?(\d+) skipped/)?.[1] || '0';

      const passCount = parseInt(passed, 10);
      const failCount = parseInt(failed, 10);

      // A "passing" run that executed zero tests is a broken harness, not a
      // pass. Counting it green is exactly the failure mode this repo keeps
      // getting burned by: a gate that reports success having examined nothing.
      if (passCount === 0 && failCount === 0) {
        results.push({ run: i, passed: false, infra: true, passCount: 0, failCount: 0, output });
        console.log(`${COLORS.red}ERROR (0 tests parsed from the runner output)${COLORS.reset}`);
        continue;
      }

      results.push({
        run: i,
        passed: failCount === 0,
        passCount,
        failCount,
        skipCount: parseInt(skipped, 10),
        output,
      });

      if (failCount > 0) {
        console.log(`${COLORS.red}FAIL (${failed} failing)${COLORS.reset}`);
      } else {
        console.log(`${COLORS.green}PASS (${passed} tests)${COLORS.reset}`);
      }
    } catch (err) {
      const output = err.stdout || err.stderr || '';
      const failed = output.match(/ℹ fail\s+(\d+)/)?.[1] || output.match(/(\d+) failing/)?.[1] || '?';
      results.push({ run: i, passed: false, failCount: parseInt(failed, 10) || 0, output, error: err.message });
      console.log(`${COLORS.red}FAIL (${failed} failing)${COLORS.reset}`);
    }
  }

  return results;
}

function analyzeFlakiness(frontendResults, lambdaResults) {
  const flaky = [];

  const frontendPasses = frontendResults.filter((r) => r.passed).length;
  const frontendFails = frontendResults.filter((r) => !r.passed).length;
  if (frontendPasses > 0 && frontendFails > 0) {
    flaky.push({
      suite: 'frontend (vitest)',
      passes: frontendPasses,
      fails: frontendFails,
      runs: RUNS,
    });
  }

  const lambdaPasses = lambdaResults.filter((r) => r.passed).length;
  const lambdaFails = lambdaResults.filter((r) => !r.passed).length;
  if (lambdaPasses > 0 && lambdaFails > 0) {
    flaky.push({
      suite: 'lambda (node --test)',
      passes: lambdaPasses,
      fails: lambdaFails,
      runs: RUNS,
    });
  }

  return flaky;
}

function main() {
  console.log(`${COLORS.bold}=== Flaky Test Detection (${RUNS} runs) ===${COLORS.reset}\n`);

  const frontendResults = RUN_FRONTEND ? runSuite('npx vitest run --reporter=dot 2>&1', 'frontend') : [];
  console.log('');
  const lambdaResults = RUN_LAMBDA ? runSuite('npm run test:lambda 2>&1', 'lambda') : [];

  console.log(`\n${COLORS.bold}=== Summary ===${COLORS.reset}\n`);

  const flaky = analyzeFlakiness(frontendResults, lambdaResults);

  if (flaky.length === 0) {
    const allPass = [...frontendResults, ...lambdaResults].every((r) => r.passed);
    if (allPass) {
      console.log(`${COLORS.green}No flaky tests detected — all ${RUNS} runs passed consistently.${COLORS.reset}`);
      process.exit(0);
    }
    // Consistent failure is worse than flakiness, not better: either the suite
    // is broken or the harness is (a timeout, a 0-test parse). Exiting 0 here
    // let a nightly job go green while testing nothing.
    console.log(
      `${COLORS.red}No flakiness — but runs failed consistently (broken suite or harness). Exit 2.${COLORS.reset}`,
    );
    process.exit(2);
  } else {
    console.log(`${COLORS.red}${COLORS.bold}FLAKY TESTS DETECTED:${COLORS.reset}\n`);
    for (const f of flaky) {
      console.log(
        `  ${COLORS.red}${f.suite}${COLORS.reset}: ${f.passes}/${f.runs} passed, ${f.fails}/${f.runs} failed`,
      );
      console.log(`    A test that passes sometimes and fails other times is flaky.`);
      console.log(
        `    Investigate by running: node scripts/detect-flaky-tests.mjs --runs ${Math.max(RUNS * 2, 5)} --suite ${f.suite.includes('frontend') ? 'frontend' : 'lambda'}\n`,
      );
    }
    process.exit(1);
  }
}

main();
