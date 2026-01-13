/**
 * Feature Extraction Module
 *
 * Extracts features from transcript files for analysis.
 *
 * @module lib/analyzer/extract
 * @version 11.0.0
 */

'use strict';

const fs = require('fs');
const readline = require('readline');

/**
 * Feature schema - all extractable features
 */
const FEATURE_SCHEMA = {
  // Timing
  phase_durations: [],       // ms per phase
  total_duration: 0,

  // Pattern counts
  websearch_count: 0,
  tool_call_count: 0,
  error_retry_count: 0,
  review_loop_count: 0,

  // Violation flags
  mocking_detected: false,
  placeholder_detected: false,
  test_cheating_detected: false,

  // Complexity
  story_count: 0,
  epic_count: 0,
  total_cost: 0,

  // Additional metrics
  message_count: 0,
  user_message_count: 0,
  assistant_message_count: 0,
  average_message_length: 0
};

/**
 * Patterns for detecting various features
 */
const DETECTION_PATTERNS = {
  websearch: /WebSearch|web_search|webfetch/i,
  tool_call: /"type"\s*:\s*"tool_use"|<tool_use>|<function_calls>/i,
  error_retry: /retry|attempt \d+|failed.*trying again/i,
  review_loop: /review.*loop|score.*\d+\/100|passed.*false/i,
  mocking: /jest\.mock|vi\.mock|mock\(|sinon\.stub/i,
  placeholder: /\{\{\w+\}\}|TODO:|FIXME:|placeholder/i,
  test_cheating: /skip.*test|test\.skip|describe\.skip|it\.skip/i,
  phase_start: /phase\s*(\d+)\s*(start|begin)/i,
  phase_end: /phase\s*(\d+)\s*(complete|end|finish)/i,
  epic: /epic\s*\d+|US-\w+-\d+/i,
  story: /user\s+story|as\s+a\s+user/i,
  cost: /cost[:\s]+\$?([\d.]+)|tokens?[:\s]+([\d,]+)/i
};

/**
 * Extract features from a single transcript line
 * @param {Object} entry - Parsed JSON entry
 * @param {Object} features - Features object to update
 * @param {Object} state - Extraction state
 */
function extractFromEntry(entry, features, state) {
  const content = JSON.stringify(entry);

  // Count message types
  features.message_count++;
  if (entry.role === 'user') {
    features.user_message_count++;
  } else if (entry.role === 'assistant') {
    features.assistant_message_count++;
  }

  // Track message lengths for average
  if (entry.content) {
    const length = typeof entry.content === 'string'
      ? entry.content.length
      : JSON.stringify(entry.content).length;
    state.totalMessageLength += length;
  }

  // Detect patterns
  if (DETECTION_PATTERNS.websearch.test(content)) {
    features.websearch_count++;
  }

  if (DETECTION_PATTERNS.tool_call.test(content)) {
    features.tool_call_count++;
  }

  if (DETECTION_PATTERNS.error_retry.test(content)) {
    features.error_retry_count++;
  }

  if (DETECTION_PATTERNS.review_loop.test(content)) {
    features.review_loop_count++;
  }

  if (DETECTION_PATTERNS.mocking.test(content)) {
    features.mocking_detected = true;
  }

  if (DETECTION_PATTERNS.placeholder.test(content)) {
    features.placeholder_detected = true;
  }

  if (DETECTION_PATTERNS.test_cheating.test(content)) {
    features.test_cheating_detected = true;
  }

  // Track phases
  const phaseStartMatch = content.match(DETECTION_PATTERNS.phase_start);
  if (phaseStartMatch) {
    const phaseNum = parseInt(phaseStartMatch[1], 10);
    state.phaseStarts[phaseNum] = entry.timestamp || Date.now();
  }

  const phaseEndMatch = content.match(DETECTION_PATTERNS.phase_end);
  if (phaseEndMatch) {
    const phaseNum = parseInt(phaseEndMatch[1], 10);
    state.phaseEnds[phaseNum] = entry.timestamp || Date.now();
  }

  // Count epics and stories
  const epicMatches = content.match(new RegExp(DETECTION_PATTERNS.epic.source, 'gi'));
  if (epicMatches) {
    epicMatches.forEach(match => state.epicSet.add(match.toLowerCase()));
  }

  const storyMatches = content.match(new RegExp(DETECTION_PATTERNS.story.source, 'gi'));
  if (storyMatches) {
    features.story_count += storyMatches.length;
  }

  // Track cost
  const costMatch = content.match(DETECTION_PATTERNS.cost);
  if (costMatch) {
    const cost = parseFloat(costMatch[1] || '0');
    if (cost > 0) {
      features.total_cost = Math.max(features.total_cost, cost);
    }
  }

  // Track timestamps
  if (entry.timestamp) {
    const ts = typeof entry.timestamp === 'number'
      ? entry.timestamp
      : new Date(entry.timestamp).getTime();

    if (!state.firstTimestamp || ts < state.firstTimestamp) {
      state.firstTimestamp = ts;
    }
    if (!state.lastTimestamp || ts > state.lastTimestamp) {
      state.lastTimestamp = ts;
    }
  }
}

/**
 * Finalize features after extraction
 * @param {Object} features - Features object
 * @param {Object} state - Extraction state
 */
function finalizeFeatures(features, state) {
  // Calculate total duration
  if (state.firstTimestamp && state.lastTimestamp) {
    features.total_duration = state.lastTimestamp - state.firstTimestamp;
  }

  // Calculate phase durations
  for (let i = 2; i <= 5; i++) {
    if (state.phaseStarts[i] && state.phaseEnds[i]) {
      features.phase_durations.push(state.phaseEnds[i] - state.phaseStarts[i]);
    }
  }

  // Set epic count from unique epics
  features.epic_count = state.epicSet.size;

  // Calculate average message length
  if (features.message_count > 0) {
    features.average_message_length = Math.round(
      state.totalMessageLength / features.message_count
    );
  }
}

/**
 * Extract features from a transcript file (JSONL format)
 * @param {string} transcriptPath - Path to transcript file
 * @returns {Promise<Object>} Extracted features
 */
async function extractFeatures(transcriptPath) {
  if (!fs.existsSync(transcriptPath)) {
    throw new Error(`Transcript not found: ${transcriptPath}`);
  }

  const features = { ...FEATURE_SCHEMA, phase_durations: [] };
  const state = {
    phaseStarts: {},
    phaseEnds: {},
    epicSet: new Set(),
    totalMessageLength: 0,
    firstTimestamp: null,
    lastTimestamp: null
  };

  // Read file line by line
  const fileStream = fs.createReadStream(transcriptPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const entry = JSON.parse(line);
      extractFromEntry(entry, features, state);
    } catch {
      // Skip invalid JSON lines
    }
  }

  finalizeFeatures(features, state);

  return features;
}

/**
 * Extract features from raw content (array of entries)
 * @param {Object[]} entries - Array of transcript entries
 * @returns {Object} Extracted features
 */
function extractFeaturesFromEntries(entries) {
  const features = { ...FEATURE_SCHEMA, phase_durations: [] };
  const state = {
    phaseStarts: {},
    phaseEnds: {},
    epicSet: new Set(),
    totalMessageLength: 0,
    firstTimestamp: null,
    lastTimestamp: null
  };

  for (const entry of entries) {
    extractFromEntry(entry, features, state);
  }

  finalizeFeatures(features, state);

  return features;
}

/**
 * Get feature names that are numeric (for correlation)
 * @returns {string[]} Numeric feature names
 */
function getNumericFeatureNames() {
  return [
    'total_duration',
    'websearch_count',
    'tool_call_count',
    'error_retry_count',
    'review_loop_count',
    'story_count',
    'epic_count',
    'total_cost',
    'message_count',
    'user_message_count',
    'assistant_message_count',
    'average_message_length'
  ];
}

/**
 * Get feature names that are boolean (for point-biserial correlation)
 * @returns {string[]} Boolean feature names
 */
function getBooleanFeatureNames() {
  return [
    'mocking_detected',
    'placeholder_detected',
    'test_cheating_detected'
  ];
}

module.exports = {
  FEATURE_SCHEMA,
  DETECTION_PATTERNS,
  extractFeatures,
  extractFeaturesFromEntries,
  getNumericFeatureNames,
  getBooleanFeatureNames
};
