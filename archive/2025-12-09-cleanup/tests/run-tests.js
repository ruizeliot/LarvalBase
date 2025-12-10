#!/usr/bin/env node
/**
 * run-tests.js - Test runner for Pipeline Dashboard
 *
 * Uses Node.js built-in test runner (node:test)
 *
 * Usage:
 *   node tests/run-tests.js           # Run all tests
 *   node tests/run-tests.js unit      # Run unit tests only
 *   node tests/run-tests.js integration # Run integration tests only
 *   node tests/run-tests.js mode      # Run specific test file (mode.test.js)
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const TESTS_DIR = __dirname;
const UNIT_DIR = path.join(TESTS_DIR, 'unit');
const INTEGRATION_DIR = path.join(TESTS_DIR, 'integration');
const E2E_DIR = path.join(TESTS_DIR, 'e2e');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[90m'
};

function log(msg, color = 'reset') {
  console.log(colors[color] + msg + colors.reset);
}

function getTestFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.test.js'))
    .map(f => path.join(dir, f));
}

async function runTests(testFiles, label) {
  if (testFiles.length === 0) {
    log(`  No ${label} tests found`, 'dim');
    return { passed: 0, failed: 0 };
  }

  log(`\n=== Running ${label} tests (${testFiles.length} files) ===\n`, 'cyan');

  // Run tests using node --test
  const args = ['--test', '--test-reporter', 'spec', ...testFiles];

  return new Promise((resolve) => {
    const proc = spawn('node', args, {
      stdio: 'inherit',
      cwd: TESTS_DIR
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ passed: testFiles.length, failed: 0 });
      } else {
        resolve({ passed: 0, failed: testFiles.length });
      }
    });

    proc.on('error', (err) => {
      log(`Error running tests: ${err.message}`, 'red');
      resolve({ passed: 0, failed: testFiles.length });
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const filter = args[0];

  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     Pipeline Dashboard Test Suite                          ║', 'cyan');
  log('║     Using Node.js Built-in Test Runner                     ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  let unitFiles = [];
  let integrationFiles = [];

  let e2eFiles = [];

  // Determine which tests to run
  if (!filter || filter === 'all') {
    unitFiles = getTestFiles(UNIT_DIR);
    integrationFiles = getTestFiles(INTEGRATION_DIR);
    e2eFiles = getTestFiles(E2E_DIR);
  } else if (filter === 'unit') {
    unitFiles = getTestFiles(UNIT_DIR);
  } else if (filter === 'integration') {
    integrationFiles = getTestFiles(INTEGRATION_DIR);
  } else if (filter === 'e2e') {
    e2eFiles = getTestFiles(E2E_DIR);
  } else {
    // Filter is a specific test file name (without .test.js)
    const unitMatch = path.join(UNIT_DIR, filter + '.test.js');
    const integrationMatch = path.join(INTEGRATION_DIR, filter + '.test.js');
    const e2eMatch = path.join(E2E_DIR, filter + '.test.js');

    if (fs.existsSync(unitMatch)) {
      unitFiles = [unitMatch];
    } else if (fs.existsSync(integrationMatch)) {
      integrationFiles = [integrationMatch];
    } else if (fs.existsSync(e2eMatch)) {
      e2eFiles = [e2eMatch];
    } else {
      log(`\nNo test file found for: ${filter}`, 'red');
      log(`Looking in:`, 'dim');
      log(`  - ${unitMatch}`, 'dim');
      log(`  - ${integrationMatch}`, 'dim');
      log(`  - ${e2eMatch}`, 'dim');
      process.exit(1);
    }
  }

  const startTime = Date.now();
  let totalPassed = 0;
  let totalFailed = 0;

  // Run unit tests
  if (unitFiles.length > 0) {
    const result = await runTests(unitFiles, 'Unit');
    totalPassed += result.passed;
    totalFailed += result.failed;
  }

  // Run integration tests
  if (integrationFiles.length > 0) {
    const result = await runTests(integrationFiles, 'Integration');
    totalPassed += result.passed;
    totalFailed += result.failed;
  }

  // Run E2E tests
  if (e2eFiles.length > 0) {
    const result = await runTests(e2eFiles, 'E2E');
    totalPassed += result.passed;
    totalFailed += result.failed;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  // Summary
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                    TEST SUMMARY                            ║', 'cyan');
  log('╠════════════════════════════════════════════════════════════╣', 'cyan');

  const totalFiles = unitFiles.length + integrationFiles.length + e2eFiles.length;
  log(`║  Test Files: ${totalFiles}                                            ║`, 'cyan');
  log(`║  Duration:   ${elapsed}s                                           ║`, 'cyan');

  if (totalFailed === 0) {
    log('║  Status:     ✓ ALL PASSED                                 ║', 'green');
  } else {
    log(`║  Status:     ✗ ${totalFailed} file(s) had failures                   ║`, 'red');
  }

  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  // Exit with appropriate code
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(err => {
  log(`Fatal error: ${err.message}`, 'red');
  process.exit(1);
});
