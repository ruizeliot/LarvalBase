/**
 * WebdriverIO VERBOSE Configuration for Tauri E2E Testing
 * Pipeline v9.1 - MAXIMUM VISIBILITY (debugging/monitoring)
 *
 * USAGE: Copy to your project root as wdio.conf.verbose.ts
 *
 * PURPOSE: Solves "black box" problem during E2E runs
 * - Logs every WebDriver command (click, find, type, etc.)
 * - Writes real-time progress to .pipeline/e2e-progress.json
 * - Shows selectors and values being used
 * - Captures screenshots at key moments, not just failures
 *
 * TRADE-OFF: More output = slightly slower (IO overhead)
 * Use wdio.conf.dev.ts for fast iteration, this for debugging
 */
import type { Options } from '@wdio/types';
import { spawn, ChildProcess } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

// ============================================
// CONFIGURE THIS: Your app's executable name
// ============================================
const APP_NAME = 'your-app-name.exe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Uses debug build for faster iteration
const applicationPath = resolve(__dirname, 'src-tauri/target/debug', APP_NAME);

let tauriDriver: ChildProcess | null = null;

// ============================================
// Progress Tracking State
// ============================================
interface TestProgress {
  status: 'idle' | 'running' | 'passed' | 'failed';
  startedAt: string | null;
  currentSuite: string | null;
  currentTest: string | null;
  currentStep: string | null;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  recentActions: Array<{
    timestamp: string;
    type: string;
    selector?: string;
    value?: string;
    result?: string;
  }>;
  lastError: {
    test: string;
    message: string;
    selector?: string;
    expected?: string;
    actual?: string;
    screenshot?: string;
  } | null;
}

const PROGRESS_FILE = '.pipeline/e2e-progress.json';
const SCREENSHOTS_DIR = './e2e/screenshots';

let progress: TestProgress = {
  status: 'idle',
  startedAt: null,
  currentSuite: null,
  currentTest: null,
  currentStep: null,
  testsRun: 0,
  testsPassed: 0,
  testsFailed: 0,
  recentActions: [],
  lastError: null,
};

function saveProgress(): void {
  try {
    const dir = dirname(PROGRESS_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (e) {
    // Silently fail - don't break tests for progress tracking
  }
}

function logAction(type: string, selector?: string, value?: string, result?: string): void {
  const action = {
    timestamp: new Date().toISOString(),
    type,
    ...(selector && { selector }),
    ...(value && { value: value.substring(0, 100) }), // Truncate long values
    ...(result && { result }),
  };

  // Keep last 20 actions
  progress.recentActions.push(action);
  if (progress.recentActions.length > 20) {
    progress.recentActions.shift();
  }

  // Console output for TUI visibility
  const selectorPart = selector ? ` [${selector}]` : '';
  const valuePart = value ? ` = "${value.substring(0, 50)}"` : '';
  const resultPart = result ? ` -> ${result}` : '';
  console.log(`  >> ${type}${selectorPart}${valuePart}${resultPart}`);

  saveProgress();
}

export const config: Options.Testrunner = {
  // ============================================
  // Runner Configuration
  // ============================================
  runner: 'local',

  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      project: './tsconfig.node.json',
      transpileOnly: true,
    },
  },

  // ============================================
  // Test Files
  // ============================================
  specs: ['./e2e/specs/**/*.e2e.ts'],
  exclude: [],

  // ============================================
  // WebDriver Connection (tauri-driver)
  // ============================================
  hostname: '127.0.0.1',
  port: 4444,

  // ============================================
  // Parallelism - MUST BE 1 FOR TAURI
  // ============================================
  maxInstances: 1,

  capabilities: [{
    maxInstances: 1,
    'tauri:options': {
      application: applicationPath,
    },
  }],

  // ============================================
  // Timeouts - Same as dev config
  // ============================================
  waitforTimeout: 5000,
  connectionRetryTimeout: 15000,
  connectionRetryCount: 1,

  // ============================================
  // Framework & Reporters - VERBOSE
  // ============================================
  framework: 'mocha',

  // Spec reporter with all options enabled
  reporters: [
    ['spec', {
      addConsoleLogs: true,      // Include console.log from tests
      realtimeReporting: true,   // Don't buffer output
      showPreface: true,         // Show "Running:" prefix
    }],
  ],

  mochaOpts: {
    ui: 'bdd',
    timeout: 15000,
  },

  // ============================================
  // VERBOSE LOGGING - Show WebDriver commands
  // ============================================
  logLevel: 'info',  // 'debug' for even more detail

  // Stop on first failure for faster feedback
  bail: 1,

  // ============================================
  // Hooks - Progress Tracking & Logging
  // ============================================

  onPrepare: async function () {
    console.log('\n========================================');
    console.log('E2E VERBOSE MODE - Starting...');
    console.log('========================================');
    console.log('App path:', applicationPath);

    // Ensure screenshots directory exists
    if (!existsSync(SCREENSHOTS_DIR)) {
      mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }

    // Reset progress
    progress = {
      status: 'running',
      startedAt: new Date().toISOString(),
      currentSuite: null,
      currentTest: null,
      currentStep: null,
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      recentActions: [],
      lastError: null,
    };
    saveProgress();

    // Start tauri-driver
    tauriDriver = spawn('tauri-driver', [], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    tauriDriver.stderr?.on('data', (data) => {
      console.error(`[tauri-driver] ${data}`);
    });

    tauriDriver.on('error', (err) => {
      console.error('Failed to start tauri-driver:', err);
      throw err;
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('[tauri-driver] Ready\n');
  },

  onComplete: async function (exitCode) {
    progress.status = exitCode === 0 ? 'passed' : 'failed';
    saveProgress();

    console.log('\n========================================');
    console.log('E2E VERBOSE MODE - Complete');
    console.log('========================================');
    console.log(`Tests run: ${progress.testsRun}`);
    console.log(`Passed: ${progress.testsPassed}`);
    console.log(`Failed: ${progress.testsFailed}`);
    console.log(`Progress file: ${PROGRESS_FILE}`);
    console.log('========================================\n');

    if (tauriDriver) {
      tauriDriver.kill();
      tauriDriver = null;
    }
  },

  beforeSuite: async function (suite) {
    console.log(`\n>>> SUITE: ${suite.title}`);
    progress.currentSuite = suite.title;
    saveProgress();
  },

  beforeTest: async function (test) {
    console.log(`\n  > TEST: ${test.title}`);
    progress.currentTest = test.title;
    progress.currentStep = 'starting';
    progress.testsRun++;
    saveProgress();
  },

  afterTest: async function (test, context, result) {
    if (result.passed) {
      console.log(`  < PASS: ${test.title}`);
      progress.testsPassed++;
    } else {
      console.log(`  < FAIL: ${test.title}`);
      progress.testsFailed++;

      // Capture detailed error info
      const errorMessage = result.error?.message || 'Unknown error';

      // Try to extract selector from error message
      const selectorMatch = errorMessage.match(/selector "([^"]+)"/);
      const expectedMatch = errorMessage.match(/expected[:\s]+(.+?)(?:,|$)/i);
      const actualMatch = errorMessage.match(/received[:\s]+(.+?)(?:,|$)/i);

      // Take failure screenshot
      let screenshotPath: string | undefined;
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        screenshotPath = `${SCREENSHOTS_DIR}/fail-${timestamp}.png`;
        await browser.saveScreenshot(screenshotPath);
        console.log(`  ! Screenshot: ${screenshotPath}`);
      } catch (e) {
        // Screenshot failed
      }

      progress.lastError = {
        test: test.title,
        message: errorMessage,
        ...(selectorMatch && { selector: selectorMatch[1] }),
        ...(expectedMatch && { expected: expectedMatch[1] }),
        ...(actualMatch && { actual: actualMatch[1] }),
        ...(screenshotPath && { screenshot: screenshotPath }),
      };

      // Print detailed error context
      console.log(`\n  !! ERROR DETAILS:`);
      console.log(`     Message: ${errorMessage.substring(0, 200)}`);
      if (progress.lastError.selector) {
        console.log(`     Selector: ${progress.lastError.selector}`);
      }
      if (progress.lastError.expected) {
        console.log(`     Expected: ${progress.lastError.expected}`);
      }
      if (progress.lastError.actual) {
        console.log(`     Actual: ${progress.lastError.actual}`);
      }
      console.log(`     Last actions:`);
      progress.recentActions.slice(-5).forEach(a => {
        console.log(`       - ${a.type} ${a.selector || ''} ${a.value || ''}`);
      });
    }

    progress.currentStep = 'complete';
    saveProgress();
  },

  // ============================================
  // Command Logging - See every WebDriver action
  // ============================================

  beforeCommand: async function (commandName, args) {
    // Log commands that interact with the UI
    const interestingCommands = [
      'findElement', 'findElements', 'click', 'setValue', 'clearValue',
      'getText', 'getAttribute', 'isDisplayed', 'isEnabled', 'waitUntil',
      'execute', 'executeAsync', 'saveScreenshot',
    ];

    if (interestingCommands.some(cmd => commandName.includes(cmd))) {
      const selector = args[0]?.using && args[0]?.value
        ? `${args[0].using}=${args[0].value}`
        : args[0]?.toString?.().substring(0, 50);

      progress.currentStep = `${commandName}: ${selector || ''}`;
      logAction(commandName, selector);
    }
  },

  afterCommand: async function (commandName, args, result) {
    // Log results of element searches (found/not found)
    if (commandName === 'findElement' || commandName === 'findElements') {
      const found = Array.isArray(result) ? result.length : (result ? 1 : 0);
      if (found === 0) {
        logAction(`${commandName}:NOT_FOUND`, args[0]?.value);
      }
    }
  },
};

export default config;
