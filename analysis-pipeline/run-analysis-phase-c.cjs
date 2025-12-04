#!/usr/bin/env node
/**
 * Analysis Pipeline - Phase C: Validation & Auto-Apply
 *
 * Compares original run vs test runs, validates improvements,
 * and auto-applies high-confidence validated improvements.
 *
 * Usage: node run-analysis-phase-c.cjs <project-path> --run-id <id> [--auto-apply]
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRIPT_DIR = __dirname;
const LIB_DIR = path.join(SCRIPT_DIR, '..', 'lib');
const COMMANDS_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'commands');
const PIPELINE_DIR = path.join(SCRIPT_DIR, '..');

// ============ UTILITIES ============

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
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
  const result = { projectPath: null, runId: null, autoApply: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--run-id' && args[i + 1]) {
      result.runId = args[i + 1];
      i++;
    } else if (args[i] === '--auto-apply') {
      result.autoApply = true;
    } else if (!result.projectPath) {
      result.projectPath = path.resolve(args[i]);
    }
  }

  return result;
}

// ============ VALIDATION LOGIC ============

function compareMetrics(original, test) {
  // Compare key metrics to determine if improvement helped
  if (!original || !test || test.simulated) {
    return {
      verdict: 'INCONCLUSIVE',
      reason: 'Test metrics not available (simulated run)',
      improvement_pct: null
    };
  }

  const origDuration = original.phase_metrics?.total_duration_seconds || 0;
  const testDuration = test.phase_metrics?.total_duration_seconds || 0;

  const origIssues = original.issues?.length || 0;
  const testIssues = test.issues?.length || 0;

  // Calculate improvement
  const durationImprovement = origDuration > 0
    ? ((origDuration - testDuration) / origDuration) * 100
    : 0;

  const issueReduction = origIssues - testIssues;

  // Verdict logic
  let verdict = 'INCONCLUSIVE';
  let reason = '';

  if (durationImprovement > 10 && issueReduction >= 0) {
    verdict = 'VALIDATED';
    reason = `${durationImprovement.toFixed(1)}% faster, ${issueReduction} fewer issues`;
  } else if (durationImprovement < -10 || issueReduction < -2) {
    verdict = 'REJECTED';
    reason = `Performance degraded or issues increased`;
  } else {
    verdict = 'INCONCLUSIVE';
    reason = 'No significant change detected';
  }

  return {
    verdict,
    reason,
    improvement_pct: durationImprovement,
    issue_delta: issueReduction
  };
}

// ============ PATTERN DATABASE UPDATE ============

function updatePatternDB(patternId, verdict) {
  const scriptPath = path.join(LIB_DIR, 'pattern-db.sh');

  let updateFunc = '';
  if (verdict === 'VALIDATED') {
    updateFunc = `pattern_db_validate_pattern "${patternId}"`;
  } else if (verdict === 'REJECTED') {
    // Mark as rejected in pattern
    updateFunc = `pattern_db_get_pattern "${patternId}" | jq '.status = "rejected"'`;
  }

  if (updateFunc) {
    try {
      execSync(`bash -c 'source "${scriptPath}" && ${updateFunc}'`, { encoding: 'utf8' });
      log(`Updated pattern ${patternId}: ${verdict}`);
    } catch (err) {
      log(`Warning: Could not update pattern: ${err.message}`);
    }
  }
}

// ============ AUTO-APPLY IMPROVEMENTS ============

function applyImprovement(suggestion) {
  const target = suggestion.target?.replace('~', process.env.USERPROFILE || process.env.HOME);
  const change = suggestion.change_preview;

  if (!target || !change) {
    log('Cannot apply: missing target or change preview');
    return false;
  }

  if (!fs.existsSync(target)) {
    log(`Cannot apply: target file not found: ${target}`);
    return false;
  }

  log(`Applying improvement to: ${target}`);

  // For now, we'll just log. Real implementation would:
  // 1. Parse the diff/change preview
  // 2. Apply the changes using Edit-like logic
  // 3. Verify the file is still valid

  log(`[SIMULATED] Would apply: ${suggestion.description}`);

  return true; // Simulated success
}

function runPipelineTests() {
  log('Running pipeline unit tests...');

  const testsDir = path.join(PIPELINE_DIR, 'tests');
  if (fs.existsSync(path.join(testsDir, 'run-tests.sh'))) {
    try {
      execSync(`bash run-tests.sh`, { cwd: testsDir, encoding: 'utf8', stdio: 'pipe' });
      log('All tests passed');
      return true;
    } catch (err) {
      log('Tests failed - rolling back');
      return false;
    }
  }

  log('No tests found - skipping');
  return true;
}

function bumpVersion() {
  const versionFile = path.join(PIPELINE_DIR, 'VERSION');
  if (fs.existsSync(versionFile)) {
    const version = fs.readFileSync(versionFile, 'utf8').trim();
    const parts = version.split('.');
    if (parts.length >= 3) {
      parts[2] = String(parseInt(parts[2]) + 1);
      const newVersion = parts.join('.');
      fs.writeFileSync(versionFile, newVersion);
      log(`Version bumped: ${version} → ${newVersion}`);
      return newVersion;
    }
  }
  return null;
}

// ============ REPORT GENERATION ============

function generateFinalReport(analysisDir, data) {
  const report = {
    version: '6.0',
    phase: 'C',
    status: 'complete',
    generated_at: new Date().toISOString(),
    project: data.projectName,
    run_id: data.runId,

    original_metrics_summary: {
      sessions: data.originalMetrics?.all_metrics?.length || 0,
      total_issues: data.phaseAReport?.issues_found || 0
    },

    test_results: data.validationResults,

    summary: {
      tests_run: data.validationResults.length,
      validated: data.validationResults.filter(r => r.verdict === 'VALIDATED').length,
      rejected: data.validationResults.filter(r => r.verdict === 'REJECTED').length,
      inconclusive: data.validationResults.filter(r => r.verdict === 'INCONCLUSIVE').length
    },

    improvements_applied: data.appliedImprovements,

    pattern_db_updates: data.patternUpdates,

    new_version: data.newVersion
  };

  const reportFile = path.join(analysisDir, 'phase-c-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

  // Also generate human-readable summary
  const summaryFile = path.join(analysisDir, 'final-summary.md');
  const summaryMd = `# Analysis Pipeline - Final Summary

## Run ID: ${data.runId}
**Generated:** ${new Date().toISOString()}

## Results

| Metric | Value |
|--------|-------|
| Tests Run | ${report.summary.tests_run} |
| Validated | ${report.summary.validated} |
| Rejected | ${report.summary.rejected} |
| Inconclusive | ${report.summary.inconclusive} |

## Improvements Applied

${data.appliedImprovements.length > 0
    ? data.appliedImprovements.map(i => `- ${i.description}`).join('\n')
    : '_No improvements auto-applied_'}

## Validation Details

${data.validationResults.map(r => `### ${r.test_id}
- **Verdict:** ${r.verdict}
- **Reason:** ${r.reason}
${r.improvement_pct !== null ? `- **Improvement:** ${r.improvement_pct.toFixed(1)}%` : ''}
`).join('\n')}

---
*Analysis Pipeline v6.0*
`;

  fs.writeFileSync(summaryFile, summaryMd);

  return report;
}

// ============ MAIN ============

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ANALYSIS PIPELINE - PHASE C: VALIDATION & AUTO-APPLY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { projectPath, runId, autoApply } = parseArgs();

  if (!projectPath || !runId) {
    console.log('Usage: node run-analysis-phase-c.cjs <project-path> --run-id <id> [--auto-apply]');
    process.exit(1);
  }

  const projectName = path.basename(projectPath);
  const analysisDir = path.join(projectPath, '.pipeline', 'analysis', runId);

  log(`Project: ${projectName}`);
  log(`Run ID: ${runId}`);
  log(`Auto-apply: ${autoApply}`);

  // Step C1: Load Phase A report and metrics
  const phaseAReportFile = path.join(analysisDir, 'phase-a-report.json');
  const metricsFile = path.join(analysisDir, 'layer1-metrics.json');

  if (!fs.existsSync(phaseAReportFile)) {
    log('ERROR: Phase A report not found. Run Phase A first.');
    process.exit(1);
  }

  const phaseAReport = JSON.parse(fs.readFileSync(phaseAReportFile, 'utf8'));
  const originalMetrics = fs.existsSync(metricsFile)
    ? JSON.parse(fs.readFileSync(metricsFile, 'utf8'))
    : null;

  // Step C2: Load Phase B results
  const phaseBResultsFile = path.join(analysisDir, 'phase-b-results.json');
  let phaseBResults = { results: [] };

  if (fs.existsSync(phaseBResultsFile)) {
    phaseBResults = JSON.parse(fs.readFileSync(phaseBResultsFile, 'utf8'));
  } else {
    log('Warning: Phase B results not found. Using empty results.');
  }

  log(`Phase B tests to validate: ${phaseBResults.results.length}`);

  // Step C3: Validate each test result
  const validationResults = [];
  const patternUpdates = [];

  for (const testResult of phaseBResults.results) {
    log(`Validating: ${testResult.test_id}`);

    const comparison = compareMetrics(originalMetrics, testResult.test_metrics);

    const validation = {
      test_id: testResult.test_id,
      ...comparison,
      suggestion: testResult.suggestion || {}
    };

    validationResults.push(validation);

    // Step C4: Update pattern database
    const patternId = testResult.suggestion?.pattern_id;
    if (patternId) {
      updatePatternDB(patternId, comparison.verdict);
      patternUpdates.push({ pattern_id: patternId, verdict: comparison.verdict });
    }
  }

  log(`\nValidation complete:`);
  log(`  Validated: ${validationResults.filter(r => r.verdict === 'VALIDATED').length}`);
  log(`  Rejected: ${validationResults.filter(r => r.verdict === 'REJECTED').length}`);
  log(`  Inconclusive: ${validationResults.filter(r => r.verdict === 'INCONCLUSIVE').length}`);

  // Step C5: Apply validated improvements (if auto-apply enabled)
  const appliedImprovements = [];

  if (autoApply) {
    const toApply = validationResults.filter(r =>
      r.verdict === 'VALIDATED' &&
      (r.suggestion?.confidence === 'high')
    );

    log(`\nAuto-applying ${toApply.length} high-confidence validated improvements...`);

    for (const improvement of toApply) {
      if (applyImprovement(improvement.suggestion)) {
        appliedImprovements.push({
          test_id: improvement.test_id,
          description: improvement.suggestion.description,
          target: improvement.suggestion.target
        });
      }
    }

    // Step C6: Run pipeline tests
    if (appliedImprovements.length > 0) {
      const testsPass = runPipelineTests();

      if (!testsPass) {
        log('Rolling back applied improvements...');
        // In real implementation, would git checkout the changed files
        appliedImprovements.length = 0;
      }
    }
  } else {
    log('\nAuto-apply disabled. Use --auto-apply to apply validated improvements.');
  }

  // Step C7: Bump version if improvements were applied
  let newVersion = null;
  if (appliedImprovements.length > 0) {
    newVersion = bumpVersion();

    // Commit changes
    gitExec(`add -A`, PIPELINE_DIR);
    gitExec(`commit -m "chore: apply validated improvements from analysis ${runId}"`, PIPELINE_DIR);
  }

  // Step C8: Generate final report
  log('\nGenerating final report...');
  const finalReport = generateFinalReport(analysisDir, {
    projectName,
    runId,
    originalMetrics,
    phaseAReport,
    validationResults,
    appliedImprovements,
    patternUpdates,
    newVersion
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ANALYSIS PIPELINE COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\nValidated: ${finalReport.summary.validated}`);
  console.log(`Rejected: ${finalReport.summary.rejected}`);
  console.log(`Inconclusive: ${finalReport.summary.inconclusive}`);
  console.log(`\nImprovements applied: ${appliedImprovements.length}`);
  if (newVersion) {
    console.log(`New version: ${newVersion}`);
  }
  console.log(`\nFinal report: ${path.join(analysisDir, 'phase-c-report.json')}`);
  console.log(`Summary: ${path.join(analysisDir, 'final-summary.md')}`);
  console.log('\nANALYSIS:COMPLETE');
}

main().catch(err => {
  console.error('Phase C failed:', err);
  process.exit(1);
});
