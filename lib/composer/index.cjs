/**
 * CLAUDE.md Composer Module - Public API
 *
 * Main entry point for the Composer module.
 * Composes phase-specific CLAUDE.md files from templates.
 *
 * @module lib/composer
 * @version 11.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const {
  TEMPLATES_DIR,
  PLACEHOLDER_PATTERN,
  loadTemplate,
  listTemplates,
  injectContext,
  findUnreplacedPlaceholders,
  compose,
  composeSupervisor,
  composeOrchestrator
} = require('./compose.cjs');

const {
  REQUIRED_SECTIONS,
  COMMON_REQUIRED_SECTIONS,
  validate,
  validateMarkdownStructure,
  validateSupervisor,
  validateComposed
} = require('./validate.cjs');

// Output directory name within project
const OUTPUT_DIR = '.claude';

/**
 * Get the output path for CLAUDE.md in a project
 * @param {string} projectPath - Project root path
 * @returns {string}
 */
function getOutputPath(projectPath) {
  return path.join(projectPath, OUTPUT_DIR, 'CLAUDE.md');
}

/**
 * Ensure the .claude directory exists in project
 * @param {string} projectPath - Project root path
 */
function ensureOutputDir(projectPath) {
  const dir = path.join(projectPath, OUTPUT_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Write composed CLAUDE.md to project
 * @param {string} projectPath - Project root path
 * @param {string} content - Composed content
 * @param {Object} options - Write options
 */
function writeToProject(projectPath, content, options = {}) {
  const { validate: shouldValidate = true, backup = true } = options;

  if (shouldValidate) {
    const result = validateComposed(content, options);
    if (!result.valid) {
      throw new Error(`Validation failed: ${result.errors.join('; ')}`);
    }
  }

  ensureOutputDir(projectPath);
  const outputPath = getOutputPath(projectPath);

  // Backup existing file
  if (backup && fs.existsSync(outputPath)) {
    const backupPath = outputPath + '.backup';
    fs.copyFileSync(outputPath, backupPath);
  }

  fs.writeFileSync(outputPath, content, 'utf8');
}

/**
 * Read existing CLAUDE.md from project
 * @param {string} projectPath - Project root path
 * @returns {string|null}
 */
function readFromProject(projectPath) {
  const outputPath = getOutputPath(projectPath);

  if (!fs.existsSync(outputPath)) {
    return null;
  }

  return fs.readFileSync(outputPath, 'utf8');
}

/**
 * Compose and write CLAUDE.md for a phase
 * @param {string} projectPath - Project root path
 * @param {string} phase - Phase number ('2', '3', '4', '5')
 * @param {Object} context - Project context
 * @returns {string} The composed content
 */
function composeAndWrite(projectPath, phase, context = {}) {
  const projectContext = {
    projectName: path.basename(projectPath),
    projectPath,
    ...context
  };

  const content = compose(phase, projectContext);
  writeToProject(projectPath, content, { phase });

  return content;
}

/**
 * Get template info for all available templates
 * @returns {Object[]} Array of template info objects
 */
function getTemplateInfo() {
  const templates = listTemplates();

  return templates.map(name => {
    try {
      const content = loadTemplate(name);
      const lines = content.split('\n');
      const firstHeading = lines.find(l => l.startsWith('#'))?.replace(/^#+\s*/, '') || name;

      return {
        name,
        title: firstHeading,
        size: content.length,
        lines: lines.length,
        isPhase: /^phase-\d$/.test(name),
        isShared: name.startsWith('_')
      };
    } catch {
      return {
        name,
        title: name,
        size: 0,
        lines: 0,
        isPhase: false,
        isShared: false
      };
    }
  });
}

// Export public API
module.exports = {
  // Constants
  TEMPLATES_DIR,
  OUTPUT_DIR,
  PLACEHOLDER_PATTERN,
  REQUIRED_SECTIONS,
  COMMON_REQUIRED_SECTIONS,

  // Template loading
  loadTemplate,
  listTemplates,
  getTemplateInfo,

  // Composition
  injectContext,
  findUnreplacedPlaceholders,
  compose,
  composeSupervisor,
  composeOrchestrator,

  // Validation
  validate,
  validateMarkdownStructure,
  validateSupervisor,
  validateComposed,

  // Project operations
  getOutputPath,
  ensureOutputDir,
  writeToProject,
  readFromProject,
  composeAndWrite
};
