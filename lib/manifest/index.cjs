/**
 * Manifest Library - Public API
 *
 * Main entry point for the Manifest Library module.
 * Provides schema definition, validation, read/write operations, and migrations.
 *
 * @module lib/manifest
 * @version 11.0.0
 */

'use strict';

const {
  SCHEMA_VERSION,
  VALID_STACKS,
  VALID_MODES,
  VALID_USER_MODES,
  VALID_STATUSES,
  VALID_PHASES,
  VALID_PHASE_STATUSES,
  manifestSchema,
  createDefaultManifest,
  createPhaseEntry
} = require('./schema.cjs');

const {
  validate,
  validatePhase,
  validateBrainstormComplete,
  validatePhaseCanStart,
  needsMigration
} = require('./validate.cjs');

const {
  MANIFEST_FILENAME,
  MANIFEST_DIR,
  getManifestPath,
  getBackupPath,
  ensureDirectory,
  read,
  readWithFallback,
  write,
  exists,
  remove
} = require('./read-write.cjs');

const {
  migrate,
  getMigrationSummary
} = require('./migrations.cjs');

/**
 * Create a new manifest for a project
 * @param {string} projectPath - Path to the project
 * @param {Object} options - Creation options
 * @param {string} options.name - Project name
 * @param {string} options.stack - Stack type ('desktop', 'unity', 'android')
 * @param {string} options.mode - Pipeline mode ('new', 'feature')
 * @param {string} options.userMode - User mode ('user', 'dev')
 * @returns {Object} The created manifest
 */
function create(projectPath, options = {}) {
  const projectName = options.name || require('path').basename(projectPath);

  const manifest = createDefaultManifest(projectPath, projectName, {
    stack: options.stack,
    mode: options.mode,
    userMode: options.userMode
  });

  write(projectPath, manifest);

  return manifest;
}

/**
 * Update phase information in manifest
 * @param {Object} manifest - The manifest to update
 * @param {string} phase - The phase to update ('2', '3', '4', '5')
 * @param {Object} updates - Updates to apply
 * @returns {Object} The updated manifest
 */
function updatePhase(manifest, phase, updates) {
  if (!VALID_PHASES.includes(phase)) {
    throw new Error(`Invalid phase: ${phase}`);
  }

  manifest.phases[phase] = {
    ...manifest.phases[phase],
    ...updates
  };

  manifest.updatedAt = new Date().toISOString();

  return manifest;
}

/**
 * Update worker information in manifest
 * @param {Object} manifest - The manifest to update
 * @param {Object} workerInfo - Worker information
 * @param {string} workerInfo.type - Worker type ('current', 'supervisor')
 * @param {Object|null} workerInfo.data - Worker data or null to clear
 * @returns {Object} The updated manifest
 */
function updateWorker(manifest, workerInfo) {
  const { type, data } = workerInfo;

  if (!['current', 'supervisor'].includes(type)) {
    throw new Error(`Invalid worker type: ${type}`);
  }

  manifest.workers[type] = data;
  manifest.updatedAt = new Date().toISOString();

  return manifest;
}

/**
 * Update heartbeat timestamp
 * @param {Object} manifest - The manifest to update
 * @returns {Object} The updated manifest
 */
function updateHeartbeat(manifest) {
  manifest.heartbeat.lastSeen = new Date().toISOString();
  manifest.updatedAt = new Date().toISOString();
  return manifest;
}

/**
 * Mark brainstorm as complete
 * @param {Object} manifest - The manifest to update
 * @param {Object} stats - Brainstorm statistics
 * @param {number} stats.epicCount - Number of epics created
 * @param {number} stats.storyCount - Number of stories created
 * @returns {Object} The updated manifest
 */
function completeBrainstorm(manifest, stats) {
  manifest.brainstorm.completed = true;
  manifest.brainstorm.completedAt = new Date().toISOString();
  manifest.brainstorm.epicCount = stats.epicCount || 0;
  manifest.brainstorm.storyCount = stats.storyCount || 0;
  manifest.updatedAt = new Date().toISOString();

  return manifest;
}

/**
 * Start a phase
 * @param {Object} manifest - The manifest to update
 * @param {string} phase - The phase to start
 * @returns {Object} The updated manifest
 * @throws {Error} If phase cannot be started
 */
function startPhase(manifest, phase) {
  const canStart = validatePhaseCanStart(manifest, phase);
  if (!canStart.valid) {
    throw new Error(`Cannot start phase ${phase}: ${canStart.errors.join('; ')}`);
  }

  manifest.currentPhase = phase;
  manifest.status = 'running';
  manifest.phases[phase].status = 'running';
  manifest.phases[phase].startedAt = new Date().toISOString();
  manifest.updatedAt = new Date().toISOString();

  return manifest;
}

/**
 * Complete a phase
 * @param {Object} manifest - The manifest to update
 * @param {string} phase - The phase to complete
 * @param {Object} stats - Phase completion statistics
 * @param {number} stats.cost - Phase cost in dollars
 * @param {number} stats.duration - Phase duration in milliseconds
 * @returns {Object} The updated manifest
 */
function completePhase(manifest, phase, stats = {}) {
  if (!VALID_PHASES.includes(phase)) {
    throw new Error(`Invalid phase: ${phase}`);
  }

  const now = new Date().toISOString();

  manifest.phases[phase].status = 'complete';
  manifest.phases[phase].completedAt = now;
  manifest.phases[phase].cost = stats.cost || 0;
  manifest.phases[phase].duration = stats.duration || 0;

  manifest.totalCost += stats.cost || 0;
  manifest.totalDuration += stats.duration || 0;

  // Check if pipeline is complete
  if (phase === '5') {
    manifest.status = 'complete';
    manifest.currentPhase = null;
  }

  manifest.updatedAt = now;

  return manifest;
}

/**
 * Fail a phase
 * @param {Object} manifest - The manifest to update
 * @param {string} phase - The phase that failed
 * @param {string} reason - Failure reason
 * @returns {Object} The updated manifest
 */
function failPhase(manifest, phase, reason) {
  if (!VALID_PHASES.includes(phase)) {
    throw new Error(`Invalid phase: ${phase}`);
  }

  manifest.phases[phase].status = 'failed';
  manifest.phases[phase].failureReason = reason;
  manifest.status = 'failed';
  manifest.updatedAt = new Date().toISOString();

  return manifest;
}

// Export public API
module.exports = {
  // Schema
  SCHEMA_VERSION,
  VALID_STACKS,
  VALID_MODES,
  VALID_USER_MODES,
  VALID_STATUSES,
  VALID_PHASES,
  VALID_PHASE_STATUSES,
  schema: manifestSchema,
  createDefaultManifest,
  createPhaseEntry,

  // Validation
  validate,
  validatePhase,
  validateBrainstormComplete,
  validatePhaseCanStart,
  needsMigration,

  // Read/Write
  MANIFEST_FILENAME,
  MANIFEST_DIR,
  getManifestPath,
  getBackupPath,
  ensureDirectory,
  read,
  readWithFallback,
  write,
  exists,
  remove,

  // Migrations
  migrate,
  getMigrationSummary,

  // High-level operations
  create,
  updatePhase,
  updateWorker,
  updateHeartbeat,
  completeBrainstorm,
  startPhase,
  completePhase,
  failPhase
};
