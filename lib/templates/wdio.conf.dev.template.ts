/**
 * WebdriverIO DEV Configuration for Tauri E2E Testing
 * Pipeline v9.0 - FAST FEEDBACK (uses debug build)
 *
 * USAGE: Copy to your project root as wdio.conf.dev.ts
 *
 * KEY DIFFERENCE FROM RELEASE CONFIG:
 * - Uses target/debug/ instead of target/release/
 * - Saves ~18-20 seconds per build cycle
 * - Use during development, switch to release for final validation
 *
 * Build times:
 * - Dev build: ~22s
 * - Release build: ~40s (incremental), ~64s (cold)
 */
import type { Options } from '@wdio/types';
import { spawn, ChildProcess } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ============================================
// CONFIGURE THIS: Your app's executable name
// ============================================
const APP_NAME = 'your-app-name.exe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// KEY CHANGE: Uses debug build instead of release
const applicationPath = resolve(__dirname, 'src-tauri/target/debug', APP_NAME);

let tauriDriver: ChildProcess | null = null;

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
  // Timeouts - Optimized for Fast Feedback (v9.1)
  // ============================================
  waitforTimeout: 5000,           // 5s - element wait
  connectionRetryTimeout: 15000,  // 15s - reduced from 30s
  connectionRetryCount: 1,        // 1 retry - reduced from 2 (total 30s max)

  // ============================================
  // Framework & Reporters
  // ============================================
  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 15000,  // 15s per test
  },

  // 'silent' shows ONLY test results + our custom hooks (v9.1)
  // 'warn' or higher hides test progress in verbose WebDriver logs
  logLevel: 'silent',

  // ============================================
  // FAST FAIL: Stop on first failure (v9.1)
  // ============================================
  bail: 1,  // Stop immediately on first test failure

  // ============================================
  // Hooks - tauri-driver Lifecycle + Enhanced Visibility (v9.1)
  // ============================================

  onPrepare: async function () {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  E2E TESTS STARTING (DEV MODE)             ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('App path:', applicationPath);
    console.log('Build: DEBUG (fast iteration)\n');

    tauriDriver = spawn('tauri-driver', [], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    tauriDriver.stderr?.on('data', (data) => {
      console.error(`tauri-driver error: ${data}`);
    });

    tauriDriver.on('error', (err) => {
      console.error('Failed to start tauri-driver:', err);
      throw err;
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('✓ tauri-driver ready\n');
  },

  onComplete: async function () {
    if (tauriDriver) {
      tauriDriver.kill();
      tauriDriver = null;
    }
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  E2E TESTS COMPLETE                        ║');
    console.log('╚════════════════════════════════════════════╝\n');
  },

  // ============================================
  // Test Visibility Hooks (v9.1 - Issue 21 fix)
  // ============================================

  beforeTest: async function (test) {
    console.log(`\n┌─ TEST: ${test.title}`);
    console.log(`│  File: ${test.file?.split(/[\\/]/).pop() || 'unknown'}`);
  },

  afterTest: async function (test, context, result) {
    const duration = result.duration ? `${result.duration}ms` : 'N/A';

    if (result.passed) {
      console.log(`└─ ✓ PASSED (${duration})`);
    } else {
      console.log(`│`);
      console.log(`│  ✗ FAILED after ${duration}`);

      // Show error details
      if (result.error) {
        const errorMsg = result.error.message || String(result.error);
        // Truncate long messages but show the important part
        const shortMsg = errorMsg.length > 200
          ? errorMsg.substring(0, 200) + '...'
          : errorMsg;
        console.log(`│  Error: ${shortMsg}`);

        // Show expected vs received if available
        if (result.error.expected !== undefined && result.error.actual !== undefined) {
          console.log(`│  Expected: ${JSON.stringify(result.error.expected)}`);
          console.log(`│  Received: ${JSON.stringify(result.error.actual)}`);
        }
      }

      // Take screenshot
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `./e2e/screenshots/failure-${timestamp}.png`;
      try {
        await browser.saveScreenshot(filename);
        console.log(`│  Screenshot: ${filename}`);
      } catch (e) {
        console.log(`│  Screenshot: failed to capture`);
      }

      console.log(`└─────────────────────────────────────`);
    }
  },

  // Log significant actions for visibility
  afterCommand: async function (commandName, args) {
    // Only log user-facing actions, not internal queries
    const actionCommands = ['click', 'setValue', 'keys', 'selectByVisibleText', 'scrollIntoView'];
    if (actionCommands.includes(commandName)) {
      const target = args[0] ? String(args[0]).substring(0, 50) : '';
      console.log(`│  → ${commandName}${target ? `: ${target}` : ''}`);
    }
  },
};

export default config;
