/**
 * Template Validation Module
 *
 * Validates composed CLAUDE.md content.
 */

'use strict';

const { findUnreplacedPlaceholders } = require('./compose.cjs');

/**
 * Required sections for worker CLAUDE.md
 */
const REQUIRED_SECTIONS = {
  '2': ['PM Agent', 'Stories', 'Epic'],
  '3': ['Test', 'Architect', 'Spec'],
  '4': ['Developer', 'Implementation', 'Epic'],
  '5': ['Quality', 'Final', 'Polish']
};

/**
 * Required sections for all workers
 */
const COMMON_REQUIRED_SECTIONS = [
  'Rules',
  'Phase'
];

/**
 * Validate composed CLAUDE.md content
 * @param {string} content - Composed content to validate
 * @param {string} phase - Phase number for phase-specific validation
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validate(content, phase = null) {
  const errors = [];
  const warnings = [];

  // Check for empty content
  if (!content || content.trim().length === 0) {
    errors.push('Content is empty');
    return { valid: false, errors, warnings };
  }

  // Check for unreplaced placeholders
  const unreplaced = findUnreplacedPlaceholders(content);
  if (unreplaced.length > 0) {
    errors.push(`Unreplaced placeholders: ${unreplaced.join(', ')}`);
  }

  // Check minimum length (CLAUDE.md should be substantial)
  if (content.length < 500) {
    warnings.push('Content is unusually short (< 500 chars)');
  }

  // Check for common required sections
  for (const section of COMMON_REQUIRED_SECTIONS) {
    if (!content.toLowerCase().includes(section.toLowerCase())) {
      warnings.push(`Missing recommended section: ${section}`);
    }
  }

  // Check for phase-specific required sections
  if (phase && REQUIRED_SECTIONS[phase]) {
    for (const section of REQUIRED_SECTIONS[phase]) {
      if (!content.toLowerCase().includes(section.toLowerCase())) {
        warnings.push(`Missing phase-specific section: ${section}`);
      }
    }
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    { pattern: /--no-verify/i, message: 'Contains --no-verify flag (bypasses git hooks)' },
    { pattern: /SKIP.*TEST/i, message: 'Contains SKIP TEST pattern' },
    { pattern: /rm\s+-rf\s+\/[^.]/, message: 'Contains dangerous rm -rf command' }
  ];

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(content)) {
      warnings.push(`Dangerous pattern detected: ${message}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate that content has proper markdown structure
 * @param {string} content - Content to validate
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateMarkdownStructure(content) {
  const errors = [];
  const warnings = [];

  // Check for at least one heading
  if (!/^#\s+.+/m.test(content)) {
    errors.push('No top-level heading (# Title) found');
  }

  // Check for heading hierarchy (should have ## subheadings)
  if (!/^##\s+.+/m.test(content)) {
    warnings.push('No second-level headings (## Section) found');
  }

  // Check for code blocks are properly closed
  const codeBlockStarts = (content.match(/```/g) || []).length;
  if (codeBlockStarts % 2 !== 0) {
    errors.push('Unclosed code block detected');
  }

  // Check for broken links (basic check)
  const linkPattern = /\[([^\]]*)\]\(([^)]*)\)/g;
  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    const [, text, url] = match;
    if (!url || url.trim() === '') {
      warnings.push(`Empty link URL for text: "${text}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate supervisor template
 * @param {string} content - Supervisor content
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateSupervisor(content) {
  const errors = [];
  const warnings = [];

  // Check for required supervisor elements
  const requiredElements = [
    { pattern: /review/i, message: 'review instructions' },
    { pattern: /score/i, message: 'scoring criteria' },
    { pattern: /json/i, message: 'JSON response format' }
  ];

  for (const { pattern, message } of requiredElements) {
    if (!pattern.test(content)) {
      warnings.push(`Missing ${message}`);
    }
  }

  // Check for threshold mention
  if (!/\b9[05]\b/.test(content)) {
    warnings.push('No passing threshold (90 or 95) mentioned');
  }

  const baseValidation = validate(content);

  return {
    valid: baseValidation.valid && errors.length === 0,
    errors: [...baseValidation.errors, ...errors],
    warnings: [...baseValidation.warnings, ...warnings]
  };
}

/**
 * Validate composed content before writing to file
 * @param {string} content - Composed content
 * @param {Object} options - Validation options
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateComposed(content, options = {}) {
  const { phase, strict = false } = options;

  const contentValidation = validate(content, phase);
  const structureValidation = validateMarkdownStructure(content);

  const errors = [...contentValidation.errors, ...structureValidation.errors];
  const warnings = [...contentValidation.warnings, ...structureValidation.warnings];

  // In strict mode, warnings become errors
  if (strict) {
    errors.push(...warnings);
    return { valid: errors.length === 0, errors, warnings: [] };
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

module.exports = {
  REQUIRED_SECTIONS,
  COMMON_REQUIRED_SECTIONS,
  validate,
  validateMarkdownStructure,
  validateSupervisor,
  validateComposed
};
