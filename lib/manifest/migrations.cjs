/**
 * Manifest Migrations
 *
 * Handles migration from older manifest versions to v11.
 */

'use strict';

const { SCHEMA_VERSION, createDefaultManifest, createPhaseEntry } = require('./schema.cjs');

/**
 * Migrate a v10 (or earlier) manifest to v11 format
 * @param {Object} oldManifest - The old manifest
 * @returns {Object} The migrated v11 manifest
 */
function migrate(oldManifest) {
  if (!oldManifest) {
    throw new Error('Cannot migrate null/undefined manifest');
  }

  const oldVersion = oldManifest.version || '0.0.0';
  const majorVersion = parseInt(oldVersion.split('.')[0], 10);

  // Already v11
  if (majorVersion >= 11) {
    return oldManifest;
  }

  console.log(`Migrating manifest from v${oldVersion} to v${SCHEMA_VERSION}...`);

  // Create base v11 structure
  const newManifest = {
    version: SCHEMA_VERSION,

    project: {
      name: oldManifest.project?.name || oldManifest.projectName || 'Unknown Project',
      path: oldManifest.project?.path || oldManifest.projectPath || process.cwd()
    },

    stack: oldManifest.stack || 'desktop',
    mode: oldManifest.mode || 'new',
    userMode: oldManifest.userMode || 'dev',
    status: migrateStatus(oldManifest.status),

    // Convert old phase 1 completion to brainstorm
    brainstorm: migrateBrainstorm(oldManifest),

    // Current position
    currentPhase: migrateCurrentPhase(oldManifest),
    currentAgent: oldManifest.currentAgent || null,
    currentEpic: oldManifest.currentEpic || null,

    // Phase tracking
    phases: migratePhases(oldManifest),

    // Totals
    totalCost: oldManifest.totalCost || 0,
    totalDuration: oldManifest.totalDuration || 0,

    // Process tracking
    workers: {
      current: oldManifest.workers?.current || null,
      supervisor: oldManifest.workers?.supervisor || null
    },

    // Heartbeat
    heartbeat: {
      enabled: oldManifest.heartbeat?.enabled ?? true,
      intervalMs: oldManifest.heartbeat?.intervalMs || 300000,
      lastSeen: oldManifest.heartbeat?.lastSeen || null
    },

    // Preserve timestamps
    createdAt: oldManifest.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return newManifest;
}

/**
 * Migrate status field
 */
function migrateStatus(oldStatus) {
  const validStatuses = ['pending', 'running', 'paused', 'complete', 'failed'];

  if (validStatuses.includes(oldStatus)) {
    return oldStatus;
  }

  // Map old statuses
  const statusMap = {
    'in-progress': 'running',
    'in_progress': 'running',
    'completed': 'complete',
    'done': 'complete',
    'error': 'failed'
  };

  return statusMap[oldStatus] || 'pending';
}

/**
 * Migrate brainstorm section from v10 phase 1 data
 */
function migrateBrainstorm(oldManifest) {
  // Check if v10 had phase 1 completed
  const phase1 = oldManifest.phases?.['1'];
  const isComplete = phase1?.status === 'complete' || phase1?.status === 'completed';

  return {
    completed: isComplete,
    completedAt: phase1?.completedAt || null,
    notesFile: 'docs/brainstorm-notes.md',
    storiesFile: 'docs/user-stories.md',
    epicCount: oldManifest.epics?.length || 0,
    storyCount: countStories(oldManifest)
  };
}

/**
 * Count stories from old manifest
 */
function countStories(oldManifest) {
  let count = 0;

  if (Array.isArray(oldManifest.epics)) {
    for (const epic of oldManifest.epics) {
      if (Array.isArray(epic.stories)) {
        count += epic.stories.length;
      }
    }
  }

  return count;
}

/**
 * Migrate current phase (v11 doesn't have phase 1)
 */
function migrateCurrentPhase(oldManifest) {
  const oldPhase = oldManifest.currentPhase;

  // Phase 1 becomes null (brainstorm is pre-pipeline)
  if (oldPhase === '1' || oldPhase === 1) {
    return null;
  }

  // Keep phases 2-5
  if (['2', '3', '4', '5'].includes(String(oldPhase))) {
    return String(oldPhase);
  }

  return null;
}

/**
 * Migrate phases structure (v11 only has phases 2-5)
 */
function migratePhases(oldManifest) {
  const newPhases = {};

  for (const phase of ['2', '3', '4', '5']) {
    const oldPhase = oldManifest.phases?.[phase];

    if (oldPhase) {
      newPhases[phase] = {
        status: migrateStatus(oldPhase.status),
        startedAt: oldPhase.startedAt || null,
        completedAt: oldPhase.completedAt || null,
        duration: oldPhase.duration || 0,
        cost: oldPhase.cost || 0,
        agents: oldPhase.agents || null,
        currentEpic: oldPhase.currentEpic || null,
        epicStatuses: oldPhase.epicStatuses || null
      };
    } else {
      newPhases[phase] = createPhaseEntry();
    }
  }

  return newPhases;
}

/**
 * Get migration summary describing what changed
 * @param {Object} oldManifest - The original manifest
 * @param {Object} newManifest - The migrated manifest
 * @returns {Object} Summary of changes
 */
function getMigrationSummary(oldManifest, newManifest) {
  return {
    fromVersion: oldManifest.version || 'unknown',
    toVersion: newManifest.version,
    changes: [
      'Converted Phase 1 to brainstorm section',
      'Removed Phase 1 from phases object',
      'Updated schema to v11 format',
      `Preserved ${Object.keys(newManifest.phases).length} phases`,
      `Migrated ${newManifest.brainstorm.epicCount} epics`
    ]
  };
}

module.exports = {
  migrate,
  getMigrationSummary
};
