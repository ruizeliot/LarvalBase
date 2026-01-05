/**
 * WebdriverIO SMOKE Configuration for Tauri E2E Testing
 * Pipeline v9.1 - ULTRA-FAST FEEDBACK (smoke tests only)
 *
 * USAGE: Copy to your project root as wdio.conf.smoke.ts
 *
 * PURPOSE:
 * - Run quick sanity checks before full E2E suite
 * - Verify app launches and basic interactions work
 * - Fail fast if something is fundamentally broken
 *
 * TIMEOUTS (aggressive):
 * - 3s per test (vs 15s in dev)
 * - 10s connection (vs 15s in dev)
 * - 3s element wait (vs 5s in dev)
 *
 * RUN: npm run test:smoke (add script: "wdio wdio.conf.smoke.ts")
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

// Uses debug build for speed
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
  // Test Files - SMOKE ONLY
  // ============================================
  specs: ['./e2e/specs/smoke.e2e.ts'],
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
  // AGGRESSIVE TIMEOUTS - Smoke tests should be FAST
  // ============================================
  waitforTimeout: 3000,           // 3s - element wait (reduced from 5s)
  connectionRetryTimeout: 10000,  // 10s - connection (reduced from 15s)
  connectionRetryCount: 1,        // 1 retry only

  // ============================================
  // Framework & Reporters
  // ============================================
  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 5000,  // 5s per test (reduced from 15s) - smoke tests must be quick
  },

  // 'silent' for clean output - shows ONLY our custom hooks (v9.1)
  logLevel: 'silent',

  // ============================================
  // FAIL FAST - Stop immediately on any failure
  // ============================================
  bail: 1,

  // ============================================
  // Hooks - tauri-driver Lifecycle + Visibility (v9.1)
  // ============================================

  onPrepare: async function () {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║  SMOKE TESTS (Quick Sanity Check)    ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('App:', applicationPath);

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

    // Shorter wait for smoke tests
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log('✓ Ready\n');
  },

  onComplete: async function () {
    if (tauriDriver) {
      tauriDriver.kill();
      tauriDriver = null;
    }
    console.log('\n══════════════════════════════════════\n');
  },

  beforeTest: async function (test) {
    console.log(`┌─ SMOKE: ${test.title}`);
  },

  afterTest: async function (test, context, result) {
    const duration = result.duration ? `${result.duration}ms` : 'N/A';

    if (result.passed) {
      console.log(`└─ ✓ OK (${duration})`);
    } else {
      console.log(`│  ✗ FAILED (${duration})`);
      if (result.error) {
        const errorMsg = result.error.message || String(result.error);
        console.log(`│  ${errorMsg.substring(0, 150)}`);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `./e2e/screenshots/smoke-failure-${timestamp}.png`;
      try {
        await browser.saveScreenshot(filename);
        console.log(`│  Screenshot: ${filename}`);
      } catch (e) {
        // Screenshot failed, continue
      }
      console.log(`└─────────────────────────────`);
    }
  },
};

export default config;
