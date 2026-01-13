/**
 * Template Composition Module
 *
 * Composes CLAUDE.md files from templates for each phase.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Template directory (relative to Pipeline-Office root)
const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'claude-md');

// Placeholder patterns
const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g;

/**
 * Load a template file
 * @param {string} templateName - Template file name (without .md)
 * @returns {string} Template content
 */
function loadTemplate(templateName) {
  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.md`);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }

  return fs.readFileSync(templatePath, 'utf8');
}

/**
 * List available templates
 * @returns {string[]} Array of template names (without .md extension)
 */
function listTemplates() {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    return [];
  }

  return fs.readdirSync(TEMPLATES_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace('.md', ''));
}

/**
 * Replace placeholders in template content
 * @param {string} content - Template content
 * @param {Object} context - Context object with placeholder values
 * @returns {string} Content with placeholders replaced
 */
function injectContext(content, context) {
  return content.replace(PLACEHOLDER_PATTERN, (match, key) => {
    if (context.hasOwnProperty(key)) {
      return context[key];
    }
    // Keep placeholder if no value provided
    return match;
  });
}

/**
 * Find unreplaced placeholders in content
 * @param {string} content - Content to check
 * @returns {string[]} Array of unreplaced placeholder names
 */
function findUnreplacedPlaceholders(content) {
  const matches = content.matchAll(PLACEHOLDER_PATTERN);
  const placeholders = new Set();

  for (const match of matches) {
    placeholders.add(match[1]);
  }

  return Array.from(placeholders);
}

/**
 * Compose CLAUDE.md for a specific phase
 * @param {string} phase - Phase number ('2', '3', '4', '5')
 * @param {Object} projectContext - Project-specific context
 * @returns {string} Composed CLAUDE.md content
 */
function compose(phase, projectContext = {}) {
  // Load phase-specific template
  const phaseTemplate = loadTemplate(`phase-${phase}`);

  // Load shared rules and worker base
  let sharedRules = '';
  let workerBase = '';

  try {
    sharedRules = loadTemplate('_shared-rules');
  } catch {
    // Optional file
  }

  try {
    workerBase = loadTemplate('_worker-base');
  } catch {
    // Optional file
  }

  // Build context with defaults
  const context = {
    projectName: 'Unknown Project',
    projectPath: '.',
    phase,
    version: '11.0.0',
    timestamp: new Date().toISOString(),
    ...projectContext
  };

  // Compose the full CLAUDE.md
  let composed = phaseTemplate;

  // Append shared rules if they exist
  if (sharedRules) {
    composed += '\n\n---\n\n' + sharedRules;
  }

  // Append worker base if it exists
  if (workerBase) {
    composed += '\n\n---\n\n' + workerBase;
  }

  // Inject context values
  composed = injectContext(composed, context);

  return composed;
}

/**
 * Compose supervisor CLAUDE.md
 * @param {Object} projectContext - Project-specific context
 * @returns {string} Composed supervisor CLAUDE.md
 */
function composeSupervisor(projectContext = {}) {
  // Check for supervisor template
  try {
    const supervisorTemplate = loadTemplate('supervisor');
    return injectContext(supervisorTemplate, {
      ...projectContext,
      timestamp: new Date().toISOString()
    });
  } catch {
    // Return minimal supervisor instructions if no template
    return `# Supervisor Instructions

**Role:** Review worker output and provide scores.
**Model:** Haiku 4.5

## Review Process

1. Wait for orchestrator to send review request
2. Analyze the provided content
3. Return JSON with score (0-100) and feedback

## Response Format

\`\`\`json
{
  "score": 95,
  "passed": true,
  "feedback": "Brief explanation of score",
  "fixes": []
}
\`\`\`

**Threshold:** Score ≥ 95 to pass
**Max retries:** 3 (then escalate to human)
`;
  }
}

/**
 * Compose orchestrator CLAUDE.md
 * @param {Object} projectContext - Project-specific context
 * @returns {string} Composed orchestrator CLAUDE.md
 */
function composeOrchestrator(projectContext = {}) {
  try {
    const orchestratorTemplate = loadTemplate('orchestrator');
    return injectContext(orchestratorTemplate, {
      ...projectContext,
      timestamp: new Date().toISOString()
    });
  } catch {
    throw new Error('Orchestrator template not found');
  }
}

module.exports = {
  TEMPLATES_DIR,
  PLACEHOLDER_PATTERN,
  loadTemplate,
  listTemplates,
  injectContext,
  findUnreplacedPlaceholders,
  compose,
  composeSupervisor,
  composeOrchestrator
};
