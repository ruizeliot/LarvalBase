/**
 * WebdriverIO Configuration Template for Tauri E2E Testing
 * Pipeline v9.0 - Optimized for fast feedback
 *
 * USAGE: Copy to your project root as wdio.conf.ts and update APP_NAME
 *
 * KEY SETTINGS (optimized for pipeline):
 * - maxInstances: 1 (required - Tauri apps cannot run in parallel)
 * - Test timeout: 15s (fail fast, don't wait)
 * - Wait timeout: 5s (elements should appear quickly)
 * - Connection timeout: 30s (driver startup allowance)
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
const applicationPath = resolve(__dirname, 'src-tauri/target/release', APP_NAME);

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
  // Tauri apps cannot run multiple instances simultaneously.
  // tauri-driver only handles one connection at a time.
  // DO NOT increase this value.
  maxInstances: 1,

  capabilities: [{
    maxInstances: 1,
    'tauri:options': {
      application: applicationPath,
    },
  }],

  // ============================================
  // Timeouts - Optimized for Fast Feedback
  // ============================================
  // Philosophy: Fail fast. If something takes >15s, it's broken.

  // Individual test timeout (mocha)
  // 15s is enough for any single test action
  // If your test needs more, break it into smaller tests

  // Element wait timeout
  // 5s for elements to appear - UI should be responsive
  waitforTimeout: 5000,

  // Connection to tauri-driver
  // 30s allows for driver startup, but fails reasonably fast
  connectionRetryTimeout: 30000,
  connectionRetryCount: 2,

  // ============================================
  // Framework & Reporters
  // ============================================
  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 15000,  // 15s per test - fail fast
  },

  // ============================================
  // Logging
  // ============================================
  // 'warn' reduces noise, use 'info' or 'debug' for troubleshooting
  logLevel: 'warn',

  // v9.1: Fail fast - stop on first failure for quicker feedback
  bail: 1,

  // ============================================
  // Hooks - tauri-driver Lifecycle
  // ============================================

  // Start tauri-driver before tests
  onPrepare: async function () {
    console.log('Starting tauri-driver...');
    console.log('App path:', applicationPath);

    tauriDriver = spawn('tauri-driver', [], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    tauriDriver.stdout?.on('data', (data) => {
      // Uncomment for debugging:
      // console.log(`tauri-driver: ${data}`);
    });

    tauriDriver.stderr?.on('data', (data) => {
      console.error(`tauri-driver error: ${data}`);
    });

    tauriDriver.on('error', (err) => {
      console.error('Failed to start tauri-driver:', err);
      throw err;
    });

    // Wait for driver to initialize
    // 2s is usually enough, increase if you see connection failures
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('tauri-driver ready');
  },

  // Stop tauri-driver after all tests
  onComplete: async function () {
    if (tauriDriver) {
      console.log('Stopping tauri-driver...');
      tauriDriver.kill();
      tauriDriver = null;
    }
  },

  // ============================================
  // Optional: Per-Test Hooks
  // ============================================

  beforeTest: async function (test) {
    // Reset app state before each test if needed
    // Example: await browser.execute(() => window.resetState?.());
  },

  afterTest: async function (test, context, result) {
    // Take screenshot on failure (useful for debugging)
    if (result.error) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `./e2e/screenshots/failure-${timestamp}.png`;
      try {
        await browser.saveScreenshot(filename);
        console.log(`Screenshot saved: ${filename}`);
      } catch (e) {
        // Screenshot failed, continue anyway
      }
    }
  },
};

export default config;
