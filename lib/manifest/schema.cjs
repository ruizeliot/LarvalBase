/**
 * Manifest Schema v11.0.0
 *
 * Defines the JSON schema for pipeline manifest files.
 * Used by validate.cjs for validation and by other modules for type reference.
 */

'use strict';

const SCHEMA_VERSION = '11.0.0';

/**
 * Valid values for various manifest fields
 */
const VALID_STACKS = ['desktop', 'unity', 'android'];
const VALID_MODES = ['new', 'feature'];
const VALID_USER_MODES = ['user', 'dev'];
const VALID_STATUSES = ['pending', 'running', 'paused', 'complete', 'failed'];
const VALID_PHASES = ['2', '3', '4', '5']; // Note: Phase 1 is pre-pipeline (brainstorm)
const VALID_PHASE_STATUSES = ['pending', 'running', 'complete', 'failed', 'skipped'];

/**
 * Default manifest structure for new projects
 */
function createDefaultManifest(projectPath, projectName, options = {}) {
  const now = new Date().toISOString();

  return {
    version: SCHEMA_VERSION,

    project: {
      name: projectName,
      path: projectPath
    },

    stack: options.stack || 'desktop',
    mode: options.mode || 'new',
    userMode: options.userMode || 'dev',
    status: 'pending',

    // Pre-pipeline brainstorm tracking
    brainstorm: {
      completed: false,
      completedAt: null,
      notesFile: 'docs/brainstorm-notes.md',
      storiesFile: 'docs/user-stories.md',
      epicCount: 0,
      storyCount: 0
    },

    // Current position
    currentPhase: null,
    currentAgent: null,
    currentEpic: null,

    // Phase tracking
    phases: {
      '2': createPhaseEntry(),
      '3': createPhaseEntry(),
      '4': createPhaseEntry(),
      '5': createPhaseEntry()
    },

    // Totals
    totalCost: 0,
    totalDuration: 0,

    // Process tracking
    workers: {
      current: null,
      supervisor: null
    },

    // Heartbeat
    heartbeat: {
      enabled: true,
      intervalMs: 300000, // 5 minutes
      lastSeen: null
    },

    // Metadata
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Create a default phase entry
 */
function createPhaseEntry() {
  return {
    status: 'pending',
    startedAt: null,
    completedAt: null,
    duration: 0,
    cost: 0,
    agents: null,        // For Phase 2 multi-agent tracking
    currentEpic: null,   // For Phase 4 epic iteration
    epicStatuses: null   // For Phase 4 epic status tracking
  };
}

/**
 * v11 Manifest JSON Schema (for validation)
 * This follows JSON Schema draft-07 format
 */
const manifestSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'manifest-v11',
  title: 'Pipeline Manifest v11',
  type: 'object',
  required: [
    'version',
    'project',
    'stack',
    'mode',
    'userMode',
    'status',
    'brainstorm',
    'phases',
    'heartbeat'
  ],
  properties: {
    version: {
      type: 'string',
      pattern: '^11\\.\\d+\\.\\d+$',
      description: 'Manifest schema version (must be 11.x.x)'
    },

    project: {
      type: 'object',
      required: ['name', 'path'],
      properties: {
        name: { type: 'string', minLength: 1 },
        path: { type: 'string', minLength: 1 }
      }
    },

    stack: {
      type: 'string',
      enum: VALID_STACKS
    },

    mode: {
      type: 'string',
      enum: VALID_MODES
    },

    userMode: {
      type: 'string',
      enum: VALID_USER_MODES
    },

    status: {
      type: 'string',
      enum: VALID_STATUSES
    },

    brainstorm: {
      type: 'object',
      required: ['completed', 'notesFile', 'storiesFile'],
      properties: {
        completed: { type: 'boolean' },
        completedAt: { type: ['string', 'null'] },
        notesFile: { type: 'string' },
        storiesFile: { type: 'string' },
        epicCount: { type: 'integer', minimum: 0 },
        storyCount: { type: 'integer', minimum: 0 }
      }
    },

    currentPhase: {
      type: ['string', 'null'],
      enum: [...VALID_PHASES, null]
    },

    currentAgent: {
      type: ['string', 'null']
    },

    currentEpic: {
      type: ['integer', 'null'],
      minimum: 1
    },

    phases: {
      type: 'object',
      required: ['2', '3', '4', '5'],
      properties: {
        '2': { $ref: '#/definitions/phase' },
        '3': { $ref: '#/definitions/phase' },
        '4': { $ref: '#/definitions/phase' },
        '5': { $ref: '#/definitions/phase' }
      }
    },

    totalCost: {
      type: 'number',
      minimum: 0
    },

    totalDuration: {
      type: 'number',
      minimum: 0
    },

    workers: {
      type: 'object',
      properties: {
        current: {
          type: ['object', 'null'],
          properties: {
            pid: { type: 'integer' },
            phase: { type: 'string' },
            startedAt: { type: 'string' }
          }
        },
        supervisor: {
          type: ['object', 'null'],
          properties: {
            pid: { type: 'integer' },
            startedAt: { type: 'string' }
          }
        }
      }
    },

    heartbeat: {
      type: 'object',
      required: ['enabled', 'intervalMs'],
      properties: {
        enabled: { type: 'boolean' },
        intervalMs: { type: 'integer', minimum: 1000 },
        lastSeen: { type: ['string', 'null'] }
      }
    },

    createdAt: { type: 'string' },
    updatedAt: { type: 'string' }
  },

  definitions: {
    phase: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: VALID_PHASE_STATUSES
        },
        startedAt: { type: ['string', 'null'] },
        completedAt: { type: ['string', 'null'] },
        duration: { type: 'number', minimum: 0 },
        cost: { type: 'number', minimum: 0 },
        agents: { type: ['object', 'null'] },
        currentEpic: { type: ['integer', 'null'] },
        epicStatuses: { type: ['array', 'null'] }
      }
    }
  }
};

module.exports = {
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
};
