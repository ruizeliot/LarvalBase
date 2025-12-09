#!/usr/bin/env node
/**
 * Analysis Pipeline - Phase B: Improvement Testing
 *
 * Processes queued improvement tests from Phase A.
 * For each test: checkout commit, apply improvement, run phase, measure results.
 *
 * Usage: node run-analysis-phase-b.cjs <project-path> --run-id <id>
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const LIB_DIR = path.join(SCRIPT_DIR, '..', 'lib');
const COMMANDS_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'commands');

// ============ UTILITIES ============

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function runShellScript(script, args = [], cwd = null) {
  const scriptPath = path.join(LIB_DIR, script);
  const cmd = `bash "${scriptPath}" ${args.map(a => `"${a}"`).join(' ')}`;
  try {
    return execSync(cmd, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, cwd });
  } catch (err) {
    console.error(`Error running ${script}:`, err.message);
    return null;
  }
}

function gitExec(cmd, cwd) {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf8', cwd }).trim();
  } catch (err) {
    console.error(`Git error: ${err.message}`);
    return null;
  }
}

function parseJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

// ============ PARSE ARGUMENTS ============

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { projectPath: null, runId: null, dryRun: false, testIndex: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--run-id' && args[i + 1]) {
      result.runId = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      result.dryRun = true;
    } else if (args[i] === '--test' && args[i + 1]) {
      result.testIndex = parseInt(args[i + 1]);
      i++;
    } else if (!result.projectPath) {
      result.projectPath = path.resolve(args[i]);
    }
  }

  return result;
}

// ============ TEST EXECUTION ============

class ImprovementTester {
  constructor(projectPath, runId, analysisDir, dryRun = false) {
    this.projectPath = projectPath;
    this.runId = runId;
    this.analysisDir = analysisDir;
    this.dryRun = dryRun;
    this.originalBranch = null;
    this.stashed = false;
  }

  async runTest(test) {
    const testId = test.id;
    const suggestion = test.suggestion;

    log(`\n─────────────────────────────────────────────────`);
    log(`Testing: ${testId}`);
    log(`Target: ${suggestion.target || 'unknown'}`);
    log(`Fix: ${suggestion.description || 'N/A'}`);
    log(`─────────────────────────────────────────────────`);

    const result = {
      test_id: testId,
      started_at: new Date().toISOString(),
      status: 'pending',
      baseline_metrics: null,
      test_metrics: null,
      improvement_delta: null,
      verdict: null
    };

    try {
      // Step B1: Save current state
      await this.saveState();

      // Step B2: Get checkpoint commit
      const checkpoint = suggestion.checkpoint_commit || 'HEAD~1';
      log(`Checkpoint: ${checkpoint}`);

      // Step B3: Create test branch
      const testBranch = `analysis-test-${testId}`;

      if (this.dryRun) {
        log(`[DRY RUN] Would create branch ${testBranch} from ${checkpoint}`);
        result.status = 'dry_run';
        result.notes = ['Dry run - no changes made'];
        return result;
      }

      gitExec(`checkout -b ${testBranch} ${checkpoint}`, this.projectPath);
      log(`Created test branch: ${testBranch}`);

      // Step B4: Apply the improvement
      if (suggestion.change_preview && suggestion.target) {
        const targetPath = suggestion.target.replace('~', process.env.USERPROFILE || process.env.HOME);
        log(`Applying change to: ${targetPath}`);

        // For now, append a marker. Real implementation would parse and apply the diff
        if (fs.existsSync(targetPath)) {
          const content = fs.readFileSync(targetPath, 'utf8');
          fs.writeFileSync(targetPath, content + `\n<!-- ANALYSIS TEST: ${suggestion.description} -->\n`);
        }
      }

      // Step B5: Run the target phase
      const affectedPhase = suggestion.affected_phase || '2';
      log(`Running phase ${affectedPhase}...`);

      // Spawn the pipeline phase (simulated for now)
      // In real implementation, this would call:
      // execSync(`node ../pipeline step ${affectedPhase} "${this.projectPath}"`)

      result.status = 'phase_simulated';
      result.notes = [
        'Test environment set up correctly',
        'Full phase execution requires actual pipeline run',
        'Improvement was prepared for application'
      ];

      // Step B6: Extract test metrics (simulated)
      result.test_metrics = {
        simulated: true,
        note: 'Actual metrics require full phase execution'
      };

      // Step B7: Cleanup
      await this.restoreState(testBranch);

      result.completed_at = new Date().toISOString();
      result.status = 'setup_complete';

    } catch (err) {
      log(`Test failed: ${err.message}`);
      result.status = 'error';
      result.error = err.message;

      // Try to restore state
      try {
        await this.restoreState();
      } catch (restoreErr) {
        log(`Warning: Could not restore state: ${restoreErr.message}`);
      }
    }

    return result;
  }

  async saveState() {
    this.originalBranch = gitExec('branch --show-current', this.projectPath);

    // Check for uncommitted changes
    const status = gitExec('status --porcelain', this.projectPath);
    if (status && status.length > 0) {
      log('Stashing uncommitted changes...');
      gitExec('stash push -m "analysis-test-stash"', this.projectPath);
      this.stashed = true;
    }
  }

  async restoreState(testBranch = null) {
    log('Restoring original state...');

    if (this.originalBranch) {
      gitExec(`checkout ${this.originalBranch}`, this.projectPath);
    }

    if (testBranch) {
      gitExec(`branch -D ${testBranch}`, this.projectPath);
    }

    if (this.stashed) {
      gitExec('stash pop', this.projectPath);
      this.stashed = false;
    }
  }
}

// ============ MAIN ============

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ANALYSIS PIPELINE - PHASE B: IMPROVEMENT TESTING');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { projectPath, runId, dryRun, testIndex } = parseArgs();

  if (!projectPath || !runId) {
    console.log('Usage: node run-analysis-phase-b.cjs <project-path> --run-id <id> [--dry-run] [--test N]');
    process.exit(1);
  }

  const projectName = path.basename(projectPath);
  const analysisDir = path.join(projectPath, '.pipeline', 'analysis', runId);

  log(`Project: ${projectName}`);
  log(`Run ID: ${runId}`);
  log(`Dry run: ${dryRun}`);

  // Load pending tests from Phase A
  const pendingFile = path.join(analysisDir, 'pending-tests.json');
  if (!fs.existsSync(pendingFile)) {
    log('ERROR: No pending tests found. Run Phase A first.');
    process.exit(1);
  }

  const pendingTests = JSON.parse(fs.readFileSync(pendingFile, 'utf8'));
  log(`Pending tests: ${pendingTests.length}`);

  if (pendingTests.length === 0) {
    log('No tests to run. Phase B complete.');
    console.log('\nANALYSIS:PHASE-B-COMPLETE');
    return;
  }

  // Filter to specific test if requested
  const testsToRun = testIndex !== null
    ? [pendingTests[testIndex]].filter(Boolean)
    : pendingTests.filter(t => t.status === 'pending');

  log(`Tests to run: ${testsToRun.length}`);

  const tester = new ImprovementTester(projectPath, runId, analysisDir, dryRun);
  const results = [];

  for (let i = 0; i < testsToRun.length; i++) {
    const test = testsToRun[i];
    log(`\nTest ${i + 1}/${testsToRun.length}`);

    const result = await tester.runTest(test);
    results.push(result);

    // Update test status in pending file
    const idx = pendingTests.findIndex(t => t.id === test.id);
    if (idx !== -1) {
      pendingTests[idx].status = result.status;
      pendingTests[idx].result = result;
    }
  }

  // Save updated pending tests
  fs.writeFileSync(pendingFile, JSON.stringify(pendingTests, null, 2));

  // Save test results
  const resultsFile = path.join(analysisDir, 'phase-b-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify({
    version: '6.0',
    phase: 'B',
    run_id: runId,
    completed_at: new Date().toISOString(),
    tests_run: results.length,
    results
  }, null, 2));

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  PHASE B COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\nTests executed: ${results.length}`);
  console.log(`Results: ${resultsFile}`);
  console.log(`\nNext: Run Phase C to validate and apply improvements`);
  console.log(`Command: node run-analysis-phase-c.cjs "${projectPath}" --run-id "${runId}"`);
  console.log('\nANALYSIS:PHASE-B-COMPLETE');
}

main().catch(err => {
  console.error('Phase B failed:', err);
  process.exit(1);
});
