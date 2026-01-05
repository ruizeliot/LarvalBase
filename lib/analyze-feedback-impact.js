#!/usr/bin/env node
/**
 * Cascade Analyzer for Step Mode
 *
 * Analyzes user feedback to determine which phases need to be re-run.
 * Updates manifest with cascadeRestartPhase.
 *
 * Usage: node analyze-feedback-impact.js "<feedback text>"
 */

const fs = require('fs');
const path = require('path');

// Get feedback from command line
const feedback = process.argv[2];
if (!feedback) {
  console.error('Usage: node analyze-feedback-impact.js "<feedback text>"');
  process.exit(1);
}

// Read manifest
const manifestPath = '.pipeline/manifest.json';
if (!fs.existsSync(manifestPath)) {
  console.error('Manifest not found:', manifestPath);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const currentPhase = parseInt(manifest.currentPhase, 10);

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  CASCADE ANALYZER - Feedback Impact Assessment');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('Feedback:', feedback);
console.log('Current Phase:', currentPhase);
console.log('');

// Keywords that indicate impact level
const phase1Keywords = [
  // Major changes requiring user story rewrites
  'instead of', 'replace', 'remove feature', 'delete feature', 'don\'t want',
  'completely different', 'start over', 'wrong approach', 'redesign',
  'change the concept', 'different idea', 'scrap', 'rethink',
  // New features requiring new stories
  'add feature', 'new feature', 'also need', 'missing feature',
  'should also', 'want to add', 'include', 'additionally'
];

const phase2Keywords = [
  // Spec-level changes
  'test should', 'behavior should', 'should work like', 'expected behavior',
  'change how', 'modify behavior', 'different logic', 'calculation wrong',
  'validation', 'edge case', 'error handling'
];

const phase3Keywords = [
  // UI/skeleton changes
  'layout', 'design', 'ui', 'interface', 'button position', 'styling',
  'component', 'structure', 'arrangement', 'look and feel'
];

const phase4Keywords = [
  // Implementation-only changes (bugs, minor fixes)
  'bug', 'fix', 'broken', 'doesn\'t work', 'error', 'crash',
  'typo', 'wrong text', 'minor', 'small change', 'tweak'
];

// Analyze feedback
const feedbackLower = feedback.toLowerCase();

let impactsPhase1 = false;
let impactsPhase2 = false;
let impactsPhase3 = false;
let impactsPhase4 = false;

// Check for phase 1 impact (most severe)
for (const keyword of phase1Keywords) {
  if (feedbackLower.includes(keyword)) {
    impactsPhase1 = true;
    console.log(`[Phase 1] Triggered by keyword: "${keyword}"`);
    break;
  }
}

// Check for phase 2 impact
for (const keyword of phase2Keywords) {
  if (feedbackLower.includes(keyword)) {
    impactsPhase2 = true;
    console.log(`[Phase 2] Triggered by keyword: "${keyword}"`);
    break;
  }
}

// Check for phase 3 impact
for (const keyword of phase3Keywords) {
  if (feedbackLower.includes(keyword)) {
    impactsPhase3 = true;
    console.log(`[Phase 3] Triggered by keyword: "${keyword}"`);
    break;
  }
}

// Check for phase 4 impact only
for (const keyword of phase4Keywords) {
  if (feedbackLower.includes(keyword)) {
    impactsPhase4 = true;
    console.log(`[Phase 4] Triggered by keyword: "${keyword}"`);
    break;
  }
}

// Determine restart phase (cascade logic)
let restartPhase;
let impactLevel;

if (impactsPhase1) {
  restartPhase = 1;
  impactLevel = 'MAJOR';
} else if (impactsPhase2) {
  restartPhase = 2;
  impactLevel = 'MODERATE';
} else if (impactsPhase3) {
  restartPhase = 3;
  impactLevel = 'MINOR';
} else if (impactsPhase4) {
  restartPhase = 4;
  impactLevel = 'MINIMAL';
} else {
  // Default: assume phase 1 impact for safety
  restartPhase = 1;
  impactLevel = 'UNKNOWN (defaulting to MAJOR)';
  console.log('[Warning] No keywords matched - defaulting to Phase 1 restart for safety');
}

// Cannot restart from a phase later than current
if (restartPhase > currentPhase) {
  restartPhase = currentPhase;
  console.log(`[Adjusted] Restart phase capped at current phase (${currentPhase})`);
}

console.log('');
console.log('───────────────────────────────────────────────────────────────');
console.log('ANALYSIS RESULT:');
console.log('───────────────────────────────────────────────────────────────');
console.log(`Impact Level: ${impactLevel}`);
console.log(`Restart Phase: ${restartPhase}`);
console.log('');

// Show cascade effect
console.log('Cascade Effect:');
if (restartPhase <= 1) console.log('  → Phase 1: User Stories will be UPDATED');
if (restartPhase <= 2) console.log('  → Phase 2: Functionality Specs will be REGENERATED');
if (restartPhase <= 3) console.log('  → Phase 3: Skeleton/Tests will be UPDATED');
if (restartPhase <= 4) console.log('  → Phase 4: Implementation will CONTINUE with changes');
console.log('');

// Update manifest
manifest.cascadeRestartPhase = String(restartPhase);
manifest.cascadeAnalysis = {
  feedback: feedback,
  impactLevel: impactLevel,
  restartPhase: restartPhase,
  analyzedAt: new Date().toISOString(),
  impacts: {
    phase1: impactsPhase1,
    phase2: impactsPhase2,
    phase3: impactsPhase3,
    phase4: impactsPhase4
  }
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('Manifest updated with cascade analysis.');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
