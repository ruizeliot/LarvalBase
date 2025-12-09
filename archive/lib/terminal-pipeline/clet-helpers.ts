/**
 * CLET Test Helpers for Terminal Pipeline
 *
 * This module provides utilities for writing CLET E2E tests
 * for Ink-based terminal applications.
 *
 * CLET (Command Line E2E Testing) is a framework for testing CLI apps
 * by spawning them in a pseudo-terminal and interacting with stdin/stdout.
 */

import { runner, KEYS } from 'clet';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Extended CLET key codes for common terminal interactions
 */
export const EXTENDED_KEYS = {
  ...KEYS,
  // Navigation
  TAB: '\t',
  SHIFT_TAB: '\x1b[Z',

  // Control keys
  CTRL_C: '\x03',
  CTRL_D: '\x04',
  CTRL_Z: '\x1a',
  CTRL_L: '\x0c',  // Clear screen

  // Function keys
  F1: '\x1bOP',
  F2: '\x1bOQ',
  F3: '\x1bOR',
  F4: '\x1bOS',
  F5: '\x1b[15~',
  F6: '\x1b[17~',
  F7: '\x1b[18~',
  F8: '\x1b[19~',
  F9: '\x1b[20~',
  F10: '\x1b[21~',
  F11: '\x1b[23~',
  F12: '\x1b[24~',

  // Page keys
  PAGE_UP: '\x1b[5~',
  PAGE_DOWN: '\x1b[6~',
  HOME: '\x1b[H',
  END: '\x1b[F',

  // Delete/Insert
  INSERT: '\x1b[2~',
  DELETE: '\x1b[3~',
};

/**
 * Options for creating a test runner
 */
export interface TestRunnerOptions {
  /** Path to the CLI binary (default: auto-detect) */
  cliPath?: string;
  /** Environment variables to set */
  env?: Record<string, string>;
  /** Timeout for individual waits in ms (default: 5000) */
  timeout?: number;
  /** Working directory for the CLI process */
  cwd?: string;
}

/**
 * Create a configured test runner for the CLI
 *
 * @param options - Runner options
 * @returns Configured CLET runner
 */
export function createTestRunner(options: TestRunnerOptions = {}) {
  const cliPath = options.cliPath || detectCliPath();

  return runner()
    .fork(cliPath, [], {
      cwd: options.cwd || process.cwd(),
      env: {
        ...process.env,
        ...options.env,
        // Ensure mock mode for Claude
        USE_MOCK_CLAUDE: 'true',
        // Disable color if needed for consistent output
        FORCE_COLOR: '0',
        NO_COLOR: '1',
      },
    });
}

/**
 * Auto-detect the CLI path based on project structure
 */
function detectCliPath(): string {
  const possiblePaths = [
    path.resolve(process.cwd(), 'bin/cli.js'),
    path.resolve(process.cwd(), 'dist/cli.js'),
    path.resolve(process.cwd(), 'build/cli.js'),
    path.resolve(__dirname, '../../../bin/cli.js'),
    path.resolve(__dirname, '../../../dist/cli.js'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  throw new Error(
    'Could not detect CLI path. Set cliPath option or ensure bin/cli.js exists.'
  );
}

/**
 * Setup Mock Claude environment for tests
 *
 * @param fixtureName - Name of the fixture file (without path)
 * @param fixturesDir - Directory containing fixtures (default: tests/e2e/fixtures)
 */
export function setupMockClaude(
  fixtureName: string,
  fixturesDir: string = path.resolve(process.cwd(), 'tests/e2e/fixtures')
): void {
  const fixturePath = path.join(fixturesDir, fixtureName);

  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Mock fixture not found: ${fixturePath}`);
  }

  process.env.USE_MOCK_CLAUDE = 'true';
  process.env.MOCK_CLAUDE_FIXTURE = fixturePath;
}

/**
 * Clear Mock Claude environment
 */
export function clearMockClaude(): void {
  delete process.env.USE_MOCK_CLAUDE;
  delete process.env.MOCK_CLAUDE_FIXTURE;
}

/**
 * Navigation helpers for menu-based UIs
 */
export const navigation = {
  /**
   * Navigate down N items in a menu
   */
  down(count: number = 1): string[] {
    return Array(count).fill(KEYS.DOWN);
  },

  /**
   * Navigate up N items in a menu
   */
  up(count: number = 1): string[] {
    return Array(count).fill(KEYS.UP);
  },

  /**
   * Navigate to specific menu index (0-based)
   */
  toIndex(index: number, fromStart: boolean = true): string[] {
    if (fromStart) {
      // Go to top first, then navigate down
      return [...Array(10).fill(KEYS.UP), ...this.down(index)];
    }
    return this.down(index);
  },

  /**
   * Select current item
   */
  select(): string {
    return KEYS.ENTER;
  },

  /**
   * Navigate to item and select
   */
  selectIndex(index: number): string[] {
    return [...this.toIndex(index), this.select()];
  },

  /**
   * Go back (escape)
   */
  back(): string {
    return KEYS.ESCAPE;
  },

  /**
   * Quit application
   */
  quit(): string {
    return 'q';
  },
};

/**
 * Text input helpers
 */
export const textInput = {
  /**
   * Type text character by character
   */
  type(text: string): string {
    return text;
  },

  /**
   * Type and submit (with Enter)
   */
  typeAndSubmit(text: string): string[] {
    return [text, KEYS.ENTER];
  },

  /**
   * Clear current input (Ctrl+U or multiple backspaces)
   */
  clear(): string {
    return '\x15';  // Ctrl+U
  },

  /**
   * Backspace N characters
   */
  backspace(count: number = 1): string[] {
    return Array(count).fill(KEYS.BACKSPACE);
  },
};

/**
 * Pattern matchers for common output formats
 */
export const patterns = {
  /**
   * Match a menu item (highlighted or not)
   */
  menuItem: (text: string): RegExp => new RegExp(`[>\\s]\\s*${escapeRegex(text)}`),

  /**
   * Match a selected/highlighted menu item
   */
  selectedItem: (text: string): RegExp => new RegExp(`>\\s*${escapeRegex(text)}`),

  /**
   * Match a progress indicator
   */
  progress: (percent?: number): RegExp => {
    if (percent !== undefined) {
      return new RegExp(`\\[PROGRESS\\].*"percent":\\s*${percent}`);
    }
    return /\[PROGRESS\]/;
  },

  /**
   * Match a todo update
   */
  todo: (action?: 'add' | 'update' | 'complete'): RegExp => {
    if (action) {
      return new RegExp(`\\[TODO\\].*"action":\\s*"${action}"`);
    }
    return /\[TODO\]/;
  },

  /**
   * Match an error message
   */
  error: (message?: string): RegExp => {
    if (message) {
      return new RegExp(`(?:Error|ERROR|error)[:\\s]*${escapeRegex(message)}`, 'i');
    }
    return /(?:Error|ERROR|error)/i;
  },

  /**
   * Match a success message
   */
  success: (message?: string): RegExp => {
    if (message) {
      return new RegExp(`(?:Success|✓|✔|Done)[:\\s]*${escapeRegex(message)}`, 'i');
    }
    return /(?:Success|✓|✔|Done)/i;
  },

  /**
   * Match keyboard hint
   */
  keyHint: (key: string, action: string): RegExp =>
    new RegExp(`\\[${escapeRegex(key)}\\]\\s*${escapeRegex(action)}`),
};

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Wait utilities for CLET tests
 */
export const waits = {
  /**
   * Wait for application ready state
   */
  forReady(): RegExp {
    return /(?:Ready|Loaded|initialized)/i;
  },

  /**
   * Wait for loading to complete
   */
  forLoadingComplete(): RegExp {
    return /(?:Loading\.{3}|Loaded|Ready)/;
  },

  /**
   * Wait for specific screen
   */
  forScreen(screenName: string): RegExp {
    return new RegExp(escapeRegex(screenName), 'i');
  },

  /**
   * Wait for any of multiple patterns
   */
  forAny(...patterns: RegExp[]): RegExp {
    const combined = patterns.map(p => p.source).join('|');
    return new RegExp(combined);
  },
};

/**
 * Test data generators
 */
export const testData = {
  /**
   * Generate unique test ID
   */
  uniqueId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Generate random string
   */
  randomString(length: number = 10): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array(length)
      .fill(0)
      .map(() => chars[Math.floor(Math.random() * chars.length)])
      .join('');
  },

  /**
   * Generate test task name
   */
  taskName(): string {
    const adjectives = ['quick', 'simple', 'test', 'sample', 'demo'];
    const nouns = ['task', 'job', 'item', 'work', 'request'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj}-${noun}-${Math.floor(Math.random() * 1000)}`;
  },
};

/**
 * Re-export CLET runner and keys for convenience
 */
export { runner, KEYS };
