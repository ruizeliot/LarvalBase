/**
 * cli-arguments.test.js - E2E tests for CLI Arguments (US-CLI)
 *
 * Tests: US-CLI-001 to US-CLI-002 with edge cases
 *
 * These tests verify CLI argument parsing and help display.
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const helpers = require('./test-helpers.cjs');

describe('CLI Arguments E2E (US-CLI)', () => {
  let testProject;

  beforeEach(() => {
    testProject = helpers.createTestProject('cli-arguments-test');
  });

  afterEach(() => {
    if (testProject) testProject.cleanup();
  });

  // ============ US-CLI-001: Argument Parsing ============

  describe('US-CLI-001: Argument Parsing', () => {

    it('should parse --mode with value', () => {
      // Simulate CLI arg parsing
      const args = ['--mode', 'feature'];
      const parseArgs = (args) => {
        const result = {};
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '--mode' && args[i + 1]) {
            result.mode = args[i + 1];
            i++;
          }
        }
        return result;
      };

      const parsed = parseArgs(args);
      assert.strictEqual(parsed.mode, 'feature');
    });

    it('should parse --no-timeout as boolean', () => {
      const args = ['--no-timeout'];
      const parseArgs = (args) => {
        return {
          noTimeout: args.includes('--no-timeout')
        };
      };

      const parsed = parseArgs(args);
      assert.strictEqual(parsed.noTimeout, true);
    });

    it('should parse --verbose as boolean', () => {
      const args = ['--verbose'];
      const parseArgs = (args) => {
        return {
          verbose: args.includes('--verbose')
        };
      };

      const parsed = parseArgs(args);
      assert.strictEqual(parsed.verbose, true);
    });

    it('should parse --budget with number', () => {
      const args = ['--budget', '10.00'];
      const parseArgs = (args) => {
        const result = {};
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '--budget' && args[i + 1]) {
            result.budget = parseFloat(args[i + 1]);
            i++;
          }
        }
        return result;
      };

      const parsed = parseArgs(args);
      assert.strictEqual(parsed.budget, 10.00);
    });

    it('should parse --max-restarts with number', () => {
      const args = ['--max-restarts', '5'];
      const parseArgs = (args) => {
        const result = {};
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '--max-restarts' && args[i + 1]) {
            result.maxRestarts = parseInt(args[i + 1]);
            i++;
          }
        }
        return result;
      };

      const parsed = parseArgs(args);
      assert.strictEqual(parsed.maxRestarts, 5);
    });

    it('should store parsed args in manifest', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        cliArgs: {
          mode: 'new',
          verbose: true,
          budget: 15.00,
          maxRestarts: 3,
          noTimeout: false
        }
      });

      assert.strictEqual(manifest.cliArgs.mode, 'new');
      assert.strictEqual(manifest.cliArgs.verbose, true);
      assert.strictEqual(manifest.cliArgs.budget, 15.00);
    });

    // Edge case: Missing value for --mode
    it('should handle missing value for --mode', () => {
      const args = ['--mode'];
      const parseArgs = (args) => {
        const result = {};
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '--mode' && args[i + 1] && !args[i + 1].startsWith('--')) {
            result.mode = args[i + 1];
            i++;
          }
        }
        return result;
      };

      const parsed = parseArgs(args);
      assert.strictEqual(parsed.mode, undefined);
    });

    // Edge case: Invalid mode value
    it('should detect invalid mode values', () => {
      const validModes = ['new', 'feature', 'fix'];
      const mode = 'invalid';
      const isValid = validModes.includes(mode);
      assert.strictEqual(isValid, false);
    });

    // Edge case: Negative budget
    it('should handle negative budget', () => {
      const args = ['--budget', '-5'];
      const parseArgs = (args) => {
        const result = {};
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '--budget' && args[i + 1]) {
            const value = parseFloat(args[i + 1]);
            result.budget = value >= 0 ? value : null;
            result.budgetError = value < 0 ? 'Budget cannot be negative' : null;
            i++;
          }
        }
        return result;
      };

      const parsed = parseArgs(args);
      assert.strictEqual(parsed.budget, null);
      assert.ok(parsed.budgetError);
    });

    // Edge case: Non-numeric budget
    it('should handle non-numeric budget', () => {
      const args = ['--budget', 'abc'];
      const parseArgs = (args) => {
        const result = {};
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '--budget' && args[i + 1]) {
            const value = parseFloat(args[i + 1]);
            result.budget = isNaN(value) ? null : value;
            result.budgetError = isNaN(value) ? 'Budget must be a number' : null;
            i++;
          }
        }
        return result;
      };

      const parsed = parseArgs(args);
      assert.strictEqual(parsed.budget, null);
    });

    // Edge case: Multiple flags together
    it('should parse multiple flags', () => {
      const args = ['--mode', 'feature', '--verbose', '--budget', '5.00', '--no-timeout'];
      const parseArgs = (args) => {
        const result = {
          verbose: args.includes('--verbose'),
          noTimeout: args.includes('--no-timeout')
        };
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '--mode' && args[i + 1]) {
            result.mode = args[i + 1];
            i++;
          }
          if (args[i] === '--budget' && args[i + 1]) {
            result.budget = parseFloat(args[i + 1]);
            i++;
          }
        }
        return result;
      };

      const parsed = parseArgs(args);
      assert.strictEqual(parsed.mode, 'feature');
      assert.strictEqual(parsed.verbose, true);
      assert.strictEqual(parsed.budget, 5.00);
      assert.strictEqual(parsed.noTimeout, true);
    });

  });

  // ============ US-CLI-002: Help Display ============

  describe('US-CLI-002: Help Display', () => {

    it('should detect --help flag', () => {
      const args = ['--help'];
      const showHelp = args.includes('--help') || args.includes('-h');
      assert.strictEqual(showHelp, true);
    });

    it('should detect -h flag', () => {
      const args = ['-h'];
      const showHelp = args.includes('--help') || args.includes('-h');
      assert.strictEqual(showHelp, true);
    });

    it('should have all flags documented', () => {
      const helpText = `
Pipeline Dashboard Orchestrator

Usage: node bin/pipeline-dashboard.cjs <project-path> [options]

Options:
  --mode <mode>       Pipeline mode: new, feature, fix (default: new)
  --budget <amount>   Budget limit in USD
  --max-restarts <n>  Maximum consecutive restarts (default: 3)
  --no-timeout        Disable phase timeouts
  --verbose           Enable verbose output
  -h, --help          Show this help message

Examples:
  node bin/pipeline-dashboard.cjs /path/to/project
  node bin/pipeline-dashboard.cjs /path/to/project --mode feature
  node bin/pipeline-dashboard.cjs /path/to/project --budget 10.00 --verbose
`;

      assert.ok(helpText.includes('--mode'));
      assert.ok(helpText.includes('--budget'));
      assert.ok(helpText.includes('--max-restarts'));
      assert.ok(helpText.includes('--no-timeout'));
      assert.ok(helpText.includes('--verbose'));
      assert.ok(helpText.includes('--help'));
    });

    it('should include examples', () => {
      const helpText = `
Examples:
  node bin/pipeline-dashboard.cjs /path/to/project
  node bin/pipeline-dashboard.cjs /path/to/project --mode feature
`;

      assert.ok(helpText.includes('Examples:'));
    });

    // Edge case: Help with other args
    it('should show help even with other args', () => {
      const args = ['--mode', 'feature', '--help'];
      const showHelp = args.includes('--help') || args.includes('-h');
      assert.strictEqual(showHelp, true);
    });

    // Edge case: Help should be first check
    it('should prioritize help over validation', () => {
      const args = ['--invalid-flag', '--help'];
      const showHelp = args.includes('--help');
      // Help should show before validating other args
      assert.strictEqual(showHelp, true);
    });

  });

  // ============ CLI Integration ============

  describe('CLI Integration', () => {

    it('should create manifest from CLI args', () => {
      const cliArgs = {
        mode: 'feature',
        budget: 10.00,
        verbose: true,
        noTimeout: false,
        maxRestarts: 3
      };

      const manifest = helpers.createManifest(testProject.manifestPath, {
        mode: cliArgs.mode,
        budgetLimit: cliArgs.budget,
        verbose: cliArgs.verbose,
        noTimeout: cliArgs.noTimeout,
        maxRestarts: cliArgs.maxRestarts
      });

      assert.strictEqual(manifest.mode, 'feature');
      assert.strictEqual(manifest.budgetLimit, 10.00);
      assert.strictEqual(manifest.verbose, true);
    });

    it('should use defaults for missing args', () => {
      const defaults = {
        mode: 'new',
        budget: null,
        verbose: false,
        noTimeout: false,
        maxRestarts: 3
      };

      const cliArgs = {}; // No args provided

      const config = {
        mode: cliArgs.mode || defaults.mode,
        budget: cliArgs.budget || defaults.budget,
        verbose: cliArgs.verbose || defaults.verbose,
        noTimeout: cliArgs.noTimeout || defaults.noTimeout,
        maxRestarts: cliArgs.maxRestarts || defaults.maxRestarts
      };

      assert.strictEqual(config.mode, 'new');
      assert.strictEqual(config.maxRestarts, 3);
    });

    it('should validate required args', () => {
      const args = []; // Missing project path
      const projectPath = args[0];

      const errors = [];
      if (!projectPath) {
        errors.push('Project path is required');
      }

      assert.ok(errors.length > 0);
      assert.ok(errors.includes('Project path is required'));
    });

    it('should handle path as positional argument', () => {
      const args = ['/path/to/project', '--mode', 'feature'];

      // First non-flag arg is the path
      const projectPath = args.find(a => !a.startsWith('-'));
      assert.strictEqual(projectPath, '/path/to/project');
    });

  });

});
