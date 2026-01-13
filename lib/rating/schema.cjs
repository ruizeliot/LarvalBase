/**
 * Rating Schema Module
 *
 * Defines the rating schema and validation for user feedback.
 *
 * @module lib/rating/schema
 * @version 11.0.0
 */

'use strict';

/**
 * Rating categories with descriptions
 */
const RATING_CATEGORIES = [
  {
    name: 'overall',
    label: 'Overall Satisfaction',
    description: 'How satisfied are you with the final result?'
  },
  {
    name: 'ui_design',
    label: 'UI Design',
    description: 'How do you rate the visual design and aesthetics?'
  },
  {
    name: 'navigation',
    label: 'Navigation',
    description: 'How intuitive is the app navigation and user flow?'
  },
  {
    name: 'performance',
    label: 'Performance',
    description: 'How do you rate the app speed and responsiveness?'
  },
  {
    name: 'code_quality',
    label: 'Code Quality',
    description: 'How well-structured and maintainable is the code?'
  },
  {
    name: 'test_coverage',
    label: 'Test Coverage',
    description: 'How comprehensive are the automated tests?'
  },
  {
    name: 'functionality',
    label: 'Functionality',
    description: 'Does the app deliver all requested features?'
  }
];

/**
 * Likert scale options
 */
const LIKERT_SCALE = [
  { value: 1, label: 'Very Poor' },
  { value: 2, label: 'Poor' },
  { value: 3, label: 'Average' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Excellent' }
];

/**
 * Create empty rating object with all categories
 * @returns {Object} Empty rating object
 */
function createEmptyRating() {
  const rating = {
    timestamp: null,
    project: null
  };

  for (const category of RATING_CATEGORIES) {
    rating[category.name] = null;
  }

  rating.comments = null;

  return rating;
}

/**
 * Create default rating object (all 3s - average)
 * @param {string} project - Project name
 * @returns {Object} Default rating object
 */
function createDefaultRating(project) {
  const rating = {
    timestamp: new Date().toISOString(),
    project
  };

  for (const category of RATING_CATEGORIES) {
    rating[category.name] = 3;
  }

  rating.comments = null;

  return rating;
}

/**
 * Validate a single rating value
 * @param {number} value - Rating value to validate
 * @returns {{ valid: boolean, error: string | null }}
 */
function validateRatingValue(value) {
  if (value === null || value === undefined) {
    return { valid: false, error: 'Rating is required' };
  }

  if (typeof value !== 'number') {
    return { valid: false, error: 'Rating must be a number' };
  }

  if (!Number.isInteger(value)) {
    return { valid: false, error: 'Rating must be an integer' };
  }

  if (value < 1 || value > 5) {
    return { valid: false, error: 'Rating must be between 1 and 5' };
  }

  return { valid: true, error: null };
}

/**
 * Validate a complete rating object
 * @param {Object} rating - Rating object to validate
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateRating(rating) {
  const errors = [];
  const warnings = [];

  // Check required fields
  if (!rating.timestamp) {
    errors.push('Missing timestamp');
  }

  if (!rating.project) {
    errors.push('Missing project name');
  }

  // Validate each rating category
  for (const category of RATING_CATEGORIES) {
    const value = rating[category.name];

    if (value === null || value === undefined) {
      warnings.push(`Missing rating for ${category.label}`);
      continue;
    }

    const validation = validateRatingValue(value);
    if (!validation.valid) {
      errors.push(`${category.label}: ${validation.error}`);
    }
  }

  // Check comments if present
  if (rating.comments !== null && typeof rating.comments !== 'string') {
    errors.push('Comments must be a string');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Calculate average rating from rating object
 * @param {Object} rating - Rating object
 * @returns {number} Average rating (1-5)
 */
function calculateAverageRating(rating) {
  const values = [];

  for (const category of RATING_CATEGORIES) {
    const value = rating[category.name];
    if (typeof value === 'number' && value >= 1 && value <= 5) {
      values.push(value);
    }
  }

  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Get rating interpretation
 * @param {number} average - Average rating
 * @returns {string} Interpretation
 */
function interpretRating(average) {
  if (average >= 4.5) return 'Excellent';
  if (average >= 3.5) return 'Good';
  if (average >= 2.5) return 'Average';
  if (average >= 1.5) return 'Poor';
  return 'Very Poor';
}

/**
 * Get category names
 * @returns {string[]} Array of category names
 */
function getCategoryNames() {
  return RATING_CATEGORIES.map(c => c.name);
}

/**
 * Get category by name
 * @param {string} name - Category name
 * @returns {Object | null} Category object or null
 */
function getCategoryByName(name) {
  return RATING_CATEGORIES.find(c => c.name === name) || null;
}

/**
 * Convert rating to display format
 * @param {Object} rating - Rating object
 * @returns {Object} Display-friendly rating
 */
function toDisplayFormat(rating) {
  const display = {
    project: rating.project,
    timestamp: rating.timestamp,
    average: calculateAverageRating(rating),
    interpretation: interpretRating(calculateAverageRating(rating)),
    categories: []
  };

  for (const category of RATING_CATEGORIES) {
    const value = rating[category.name];
    const likert = LIKERT_SCALE.find(l => l.value === value);

    display.categories.push({
      name: category.name,
      label: category.label,
      value,
      displayValue: likert ? likert.label : 'N/A'
    });
  }

  if (rating.comments) {
    display.comments = rating.comments;
  }

  return display;
}

module.exports = {
  RATING_CATEGORIES,
  LIKERT_SCALE,
  createEmptyRating,
  createDefaultRating,
  validateRatingValue,
  validateRating,
  calculateAverageRating,
  interpretRating,
  getCategoryNames,
  getCategoryByName,
  toDisplayFormat
};
