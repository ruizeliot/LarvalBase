/**
 * Rating Prompt Module
 *
 * CLI prompts for collecting user ratings.
 *
 * @module lib/rating/prompt
 * @version 11.0.0
 */

'use strict';

const readline = require('readline');
const {
  RATING_CATEGORIES,
  LIKERT_SCALE,
  createEmptyRating,
  validateRatingValue
} = require('./schema.cjs');

/**
 * Create readline interface
 * @returns {readline.Interface}
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompt for a single value
 * @param {readline.Interface} rl - Readline interface
 * @param {string} question - Question to ask
 * @returns {Promise<string>} User response
 */
function prompt(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Display rating scale
 * @returns {string} Formatted scale display
 */
function formatScale() {
  return LIKERT_SCALE.map(l => `  ${l.value} = ${l.label}`).join('\n');
}

/**
 * Prompt for a single rating
 * @param {readline.Interface} rl - Readline interface
 * @param {Object} category - Rating category
 * @returns {Promise<number>} Rating value
 */
async function promptRating(rl, category) {
  console.log(`\n${category.label}`);
  console.log(`${category.description}`);
  console.log(formatScale());

  while (true) {
    const answer = await prompt(rl, 'Your rating (1-5): ');

    const value = parseInt(answer, 10);
    const validation = validateRatingValue(value);

    if (validation.valid) {
      return value;
    }

    console.log(`Invalid input: ${validation.error}. Please enter 1-5.`);
  }
}

/**
 * Prompt for all ratings interactively
 * @param {string} project - Project name
 * @param {Object} [options] - Prompt options
 * @returns {Promise<Object>} Complete rating object
 */
async function promptRatings(project, options = {}) {
  const { skipComments = false, rl: existingRl = null } = options;

  const rl = existingRl || createInterface();
  const shouldCloseRl = !existingRl;

  try {
    console.log('\n========================================');
    console.log('         PIPELINE RATING SURVEY');
    console.log('========================================');
    console.log(`\nProject: ${project}`);
    console.log('\nPlease rate the pipeline output on a scale of 1-5.');

    const rating = createEmptyRating();
    rating.project = project;
    rating.timestamp = new Date().toISOString();

    // Prompt for each category
    for (const category of RATING_CATEGORIES) {
      rating[category.name] = await promptRating(rl, category);
    }

    // Prompt for comments
    if (!skipComments) {
      console.log('\n----------------------------------------');
      const comments = await prompt(rl, '\nAny additional comments? (press Enter to skip)\n> ');
      rating.comments = comments || null;
    }

    console.log('\n========================================');
    console.log('         THANK YOU FOR YOUR FEEDBACK');
    console.log('========================================\n');

    return rating;

  } finally {
    if (shouldCloseRl) {
      rl.close();
    }
  }
}

/**
 * Prompt for quick rating (overall only)
 * @param {string} project - Project name
 * @param {Object} [options] - Prompt options
 * @returns {Promise<Object>} Rating with overall only
 */
async function promptQuickRating(project, options = {}) {
  const { rl: existingRl = null } = options;

  const rl = existingRl || createInterface();
  const shouldCloseRl = !existingRl;

  try {
    console.log('\n========================================');
    console.log('           QUICK RATING');
    console.log('========================================');
    console.log(`\nProject: ${project}`);

    const rating = createEmptyRating();
    rating.project = project;
    rating.timestamp = new Date().toISOString();

    // Only prompt for overall
    const overallCategory = RATING_CATEGORIES.find(c => c.name === 'overall');
    rating.overall = await promptRating(rl, overallCategory);

    console.log('\nThank you!\n');

    return rating;

  } finally {
    if (shouldCloseRl) {
      rl.close();
    }
  }
}

/**
 * Prompt for confirmation
 * @param {readline.Interface} rl - Readline interface
 * @param {string} question - Question to ask
 * @param {boolean} [defaultValue=true] - Default if user presses Enter
 * @returns {Promise<boolean>} User's answer
 */
async function confirm(rl, question, defaultValue = true) {
  const hint = defaultValue ? '[Y/n]' : '[y/N]';
  const answer = await prompt(rl, `${question} ${hint} `);

  if (answer === '') {
    return defaultValue;
  }

  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

/**
 * Display rating summary
 * @param {Object} rating - Rating object
 */
function displayRatingSummary(rating) {
  console.log('\n--- Rating Summary ---');
  console.log(`Project: ${rating.project}`);

  for (const category of RATING_CATEGORIES) {
    const value = rating[category.name];
    if (value !== null) {
      const likert = LIKERT_SCALE.find(l => l.value === value);
      console.log(`${category.label}: ${value}/5 (${likert?.label || 'N/A'})`);
    }
  }

  if (rating.comments) {
    console.log(`\nComments: ${rating.comments}`);
  }

  console.log('----------------------\n');
}

/**
 * Build rating from answers object (non-interactive)
 * @param {string} project - Project name
 * @param {Object} answers - Object with category names as keys
 * @returns {Object} Rating object
 */
function buildRatingFromAnswers(project, answers) {
  const rating = createEmptyRating();
  rating.project = project;
  rating.timestamp = new Date().toISOString();

  for (const category of RATING_CATEGORIES) {
    if (answers[category.name] !== undefined) {
      rating[category.name] = parseInt(answers[category.name], 10);
    }
  }

  if (answers.comments !== undefined) {
    rating.comments = answers.comments || null;
  }

  return rating;
}

module.exports = {
  createInterface,
  prompt,
  formatScale,
  promptRating,
  promptRatings,
  promptQuickRating,
  confirm,
  displayRatingSummary,
  buildRatingFromAnswers
};
