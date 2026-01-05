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
  // Timeouts - Optimized for Fast Feedback
  // ============================================
  waitforTimeout: 5000,
  connectionRetryTimeout: 30000,
  connectionRetryCount: 2,

  // ============================================
  // Framework & Reporters
  // ============================================
  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 15000,
  },

  logLevel: 'warn',
  bail: 0,

  // ============================================
  // Hooks - tauri-driver Lifecycle
  // ============================================

  onPrepare: async function () {
    console.log('Starting tauri-driver (DEV MODE)...');
    console.log('App path:', applicationPath);
    console.log('NOTE: Using DEBUG build for faster iteration');

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
    console.log('tauri-driver ready (DEV MODE)');
  },

  onComplete: async function () {
    if (tauriDriver) {
      console.log('Stopping tauri-driver...');
      tauriDriver.kill();
      tauriDriver = null;
    }
  },

  afterTest: async function (test, context, result) {
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
