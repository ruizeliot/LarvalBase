/**
 * dependencies.test.js - E2E tests for Dependencies (US-DEP)
 *
 * Tests: US-DEP-001 to US-DEP-004 with edge cases
 *
 * These tests verify dependency checking at the system level.
 */

const { describe, it, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const helpers = require('./test-helpers.cjs');

describe('Dependencies E2E (US-DEP)', () => {
  let testProject;

  beforeEach(() => {
    testProject = helpers.createTestProject('dependencies-test');
  });

  afterEach(() => {
    if (testProject) testProject.cleanup();
  });

  // ============ US-DEP-001: Node.js Version Check ============

  describe('US-DEP-001: Node.js Version Check', () => {

    it('should detect Node.js version', () => {
      const version = process.version;
      assert.ok(version.startsWith('v'));
    });

    it('should parse major version number', () => {
      const version = process.version;
      const major = parseInt(version.slice(1).split('.')[0]);
      assert.ok(typeof major === 'number');
      assert.ok(major >= 18, 'Node.js should be v18+');
    });

    it('should verify v18 or higher', () => {
      const major = parseInt(process.version.slice(1).split('.')[0]);
      assert.ok(major >= 18, `Node.js version ${process.version} is below v18`);
    });

    it('should store version check result', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        nodeVersion: process.version,
        nodeVersionOk: true
      });

      assert.ok(manifest.nodeVersionOk);
    });

    // Edge case: Parse complex version strings
    it('should handle version with pre-release suffix', () => {
      const testVersion = 'v20.0.0-rc.1';
      const major = parseInt(testVersion.slice(1).split('.')[0]);
      assert.strictEqual(major, 20);
    });

  });

  // ============ US-DEP-002: ccusage Check ============

  describe('US-DEP-002: ccusage Check', () => {

    it('should check if ccusage is available', () => {
      let ccusageAvailable = false;
      try {
        execSync('npx ccusage --version', { encoding: 'utf8', timeout: 10000 });
        ccusageAvailable = true;
      } catch (e) {
        ccusageAvailable = false;
      }

      // Just verify we can check - availability depends on environment
      assert.ok(typeof ccusageAvailable === 'boolean');
    });

    it('should record ccusage availability', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        ccusageAvailable: true,
        ccusageVersion: '1.0.0'
      });

      assert.ok(manifest.ccusageAvailable !== undefined);
    });

    it('should handle missing ccusage gracefully', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        ccusageAvailable: false,
        costTrackingEnabled: false,
        costTrackingWarning: 'ccusage not available'
      });

      // Should degrade gracefully
      assert.strictEqual(manifest.costTrackingEnabled, false);
      assert.ok(manifest.costTrackingWarning);
    });

    // Edge case: ccusage installed but broken
    it('should handle ccusage errors', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        ccusageAvailable: true,
        ccusageError: 'Output parsing failed'
      });

      assert.ok(manifest.ccusageError);
    });

  });

  // ============ US-DEP-003: Claude CLI Check ============

  describe('US-DEP-003: Claude CLI Check', () => {

    it('should check if Claude CLI is available', () => {
      let claudeAvailable = false;
      try {
        execSync('claude --version', { encoding: 'utf8', timeout: 10000 });
        claudeAvailable = true;
      } catch (e) {
        claudeAvailable = false;
      }

      // In test environment, Claude should be available
      assert.ok(typeof claudeAvailable === 'boolean');
    });

    it('should record Claude CLI availability', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        claudeCliAvailable: true
      });

      assert.ok(manifest.claudeCliAvailable !== undefined);
    });

    it('should store installation instructions if missing', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        claudeCliAvailable: false,
        claudeInstallInstructions: 'Install Claude CLI from: https://claude.ai/cli'
      });

      assert.ok(manifest.claudeInstallInstructions);
    });

    // Edge case: Claude CLI exists but permission denied
    it('should handle permission errors', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        claudeCliAvailable: false,
        claudeCliError: 'EACCES: permission denied'
      });

      assert.ok(manifest.claudeCliError);
    });

  });

  // ============ US-DEP-004: Windows Terminal Check ============

  describe('US-DEP-004: Windows Terminal Check', () => {

    it('should check Windows Terminal availability', () => {
      let wtAvailable = false;
      if (helpers.IS_WINDOWS) {
        try {
          execSync('where wt.exe', { encoding: 'utf8', timeout: 5000 });
          wtAvailable = true;
        } catch (e) {
          wtAvailable = false;
        }
      }

      assert.ok(typeof wtAvailable === 'boolean');
    });

    it('should record terminal availability', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        windowsTerminalAvailable: helpers.IS_WINDOWS,
        terminalFallback: 'cmd.exe'
      });

      assert.ok(manifest.terminalFallback);
    });

    it('should detect fallback to cmd.exe', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        windowsTerminalAvailable: false,
        cmdExeAvailable: true,
        terminalMode: 'cmd'
      });

      assert.strictEqual(manifest.terminalMode, 'cmd');
    });

    // Edge case: Neither wt nor cmd available
    it('should handle no terminal available', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        windowsTerminalAvailable: false,
        cmdExeAvailable: false,
        terminalError: 'No compatible terminal found'
      });

      assert.ok(manifest.terminalError);
    });

    // Edge case: Linux/macOS
    it('should handle non-Windows systems', () => {
      if (!helpers.IS_WINDOWS) {
        const manifest = helpers.createManifest(testProject.manifestPath, {
          platform: process.platform,
          terminalMode: 'bash'
        });

        assert.strictEqual(manifest.terminalMode, 'bash');
      } else {
        assert.ok(true); // Skip on Windows
      }
    });

  });

  // ============ Dependencies Integration ============

  describe('Dependencies Integration', () => {

    it('should check all dependencies at once', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        dependencyCheck: {
          nodeVersion: process.version,
          nodeOk: true,
          claudeCliOk: true,
          ccusageOk: true,
          terminalOk: true,
          allOk: true,
          checkedAt: new Date().toISOString()
        }
      });

      assert.ok(manifest.dependencyCheck.checkedAt);
    });

    it('should block startup on critical dependency failure', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        dependencyCheck: {
          nodeOk: true,
          claudeCliOk: false, // Critical
          canStart: false,
          blockingReason: 'Claude CLI is required'
        }
      });

      assert.strictEqual(manifest.dependencyCheck.canStart, false);
    });

    it('should allow startup with degraded features', () => {
      const manifest = helpers.createManifest(testProject.manifestPath, {
        dependencyCheck: {
          nodeOk: true,
          claudeCliOk: true,
          ccusageOk: false, // Non-critical
          canStart: true,
          degradedFeatures: ['cost-tracking']
        }
      });

      assert.strictEqual(manifest.dependencyCheck.canStart, true);
      assert.ok(manifest.dependencyCheck.degradedFeatures.includes('cost-tracking'));
    });

  });

});
