/**
 * Startup Handler
 *
 * Handles orchestrator startup: file validation, questions, manifest creation.
 *
 * @module lib/orchestrator/handlers/startup
 * @version 11.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Required brainstorm files
 */
const REQUIRED_FILES = [
  'docs/brainstorm-notes.md',
  'docs/user-stories.md'
];

/**
 * Startup questions
 */
const STARTUP_QUESTIONS = [
  {
    id: 'stack',
    question: 'What is the stack type?',
    options: ['desktop', 'web', 'mobile'],
    default: 'desktop'
  },
  {
    id: 'mode',
    question: 'What is the pipeline mode?',
    options: ['new', 'feature', 'fix'],
    default: 'new'
  },
  {
    id: 'userMode',
    question: 'User interaction mode?',
    options: ['autonomous', 'interactive'],
    default: 'autonomous'
  },
  {
    id: 'stepMode',
    question: 'Step through phases?',
    options: ['continuous', 'step'],
    default: 'continuous'
  },
  {
    id: 'startPhase',
    question: 'Starting phase?',
    options: ['2', '3', '4', '5'],
    default: '2'
  }
];

/**
 * Validate that required brainstorm files exist
 * @param {string} projectPath - Project root path
 * @returns {{ valid: boolean, missing: string[], found: string[] }}
 */
function validateBrainstormFiles(projectPath) {
  const missing = [];
  const found = [];

  for (const file of REQUIRED_FILES) {
    const fullPath = path.join(projectPath, file);
    if (fs.existsSync(fullPath)) {
      found.push(file);
    } else {
      missing.push(file);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    found
  };
}

/**
 * Get default answers for startup questions
 * @returns {Object} Default answers
 */
function getDefaultAnswers() {
  const answers = {};
  for (const q of STARTUP_QUESTIONS) {
    answers[q.id] = q.default;
  }
  return answers;
}

/**
 * Validate startup answers
 * @param {Object} answers - User answers
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateAnswers(answers) {
  const errors = [];

  for (const q of STARTUP_QUESTIONS) {
    const value = answers[q.id];

    if (!value) {
      errors.push(`Missing answer for: ${q.id}`);
      continue;
    }

    if (!q.options.includes(value)) {
      errors.push(`Invalid value for ${q.id}: ${value}. Must be one of: ${q.options.join(', ')}`);
    }
  }

  // Additional validation
  if (answers.startPhase) {
    const phase = parseInt(answers.startPhase, 10);
    if (phase < 2 || phase > 5) {
      errors.push('Start phase must be between 2 and 5');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Handle startup flow
 * @param {Object} context - Handler context
 * @param {string} context.projectPath - Project root path
 * @param {Object} [context.answers] - Pre-provided answers (for non-interactive mode)
 * @param {EventEmitter} context.emitter - Event emitter
 * @param {StateMachine} context.stateMachine - State machine
 */
async function handleStartup(context) {
  const { projectPath, answers, emitter, stateMachine } = context;

  // Validate brainstorm files
  const fileValidation = validateBrainstormFiles(projectPath);

  if (!fileValidation.valid) {
    emitter.emit('FILES_INVALID', {
      missing: fileValidation.missing,
      message: `Missing required files: ${fileValidation.missing.join(', ')}`
    });
    return { success: false, error: 'Missing brainstorm files' };
  }

  emitter.emit('FILES_VALID', { found: fileValidation.found });

  // Handle questions (use provided answers or defaults)
  const finalAnswers = answers || getDefaultAnswers();
  const answerValidation = validateAnswers(finalAnswers);

  if (!answerValidation.valid) {
    emitter.emit('ERROR', {
      errors: answerValidation.errors,
      message: 'Invalid startup answers'
    });
    return { success: false, error: 'Invalid answers' };
  }

  emitter.emit('QUESTIONS_ANSWERED', { answers: finalAnswers });

  return {
    success: true,
    answers: finalAnswers
  };
}

/**
 * Read project info from package.json or directory name
 * @param {string} projectPath - Project root path
 * @returns {Object} Project info
 */
function getProjectInfo(projectPath) {
  const info = {
    name: path.basename(projectPath),
    path: projectPath,
    hasPackageJson: false,
    version: null,
    description: null
  };

  const packagePath = path.join(projectPath, 'package.json');
  if (fs.existsSync(packagePath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      info.hasPackageJson = true;
      info.name = pkg.name || info.name;
      info.version = pkg.version;
      info.description = pkg.description;
    } catch {
      // Keep defaults
    }
  }

  return info;
}

/**
 * Format file validation message for display
 * @param {Object} validation - Validation result
 * @returns {string} Formatted message
 */
function formatValidationMessage(validation) {
  const lines = [];

  if (validation.found.length > 0) {
    lines.push('✓ Found files:');
    for (const file of validation.found) {
      lines.push(`  - ${file}`);
    }
  }

  if (validation.missing.length > 0) {
    lines.push('✗ Missing files:');
    for (const file of validation.missing) {
      lines.push(`  - ${file}`);
    }
    lines.push('');
    lines.push('Please complete Phase 1 (Brainstorm) first.');
  }

  return lines.join('\n');
}

module.exports = {
  REQUIRED_FILES,
  STARTUP_QUESTIONS,
  validateBrainstormFiles,
  getDefaultAnswers,
  validateAnswers,
  handleStartup,
  getProjectInfo,
  formatValidationMessage
};
