/**
 * Rating Collector Module - Public API
 *
 * Collects Likert ratings from users at end of pipeline.
 *
 * @module lib/rating
 * @version 11.0.0
 */

'use strict';

const {
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
} = require('./schema.cjs');

const {
  createInterface,
  prompt,
  formatScale,
  promptRating,
  promptRatings,
  promptQuickRating,
  confirm,
  displayRatingSummary,
  buildRatingFromAnswers
} = require('./prompt.cjs');

const {
  DEFAULT_RATINGS_FILE,
  getRatingsPath,
  saveRating,
  loadRatings,
  getLatestRating,
  getRatingStats,
  exportToCsv,
  clearRatings,
  ratingsExist
} = require('./save.cjs');

/**
 * Collect and save ratings (combined convenience function)
 * @param {string} projectPath - Project root path
 * @param {string} projectName - Project name
 * @param {Object} [options] - Options
 * @returns {Promise<{ rating: Object, saved: boolean, path: string }>}
 */
async function collectAndSaveRatings(projectPath, projectName, options = {}) {
  const { quick = false, skipSave = false } = options;

  // Collect ratings
  const rating = quick
    ? await promptQuickRating(projectName, options)
    : await promptRatings(projectName, options);

  // Display summary
  displayRatingSummary(rating);

  // Save if requested
  if (!skipSave) {
    const result = saveRating(projectPath, rating);
    return {
      rating,
      saved: result.success,
      path: result.path
    };
  }

  return {
    rating,
    saved: false,
    path: null
  };
}

/**
 * Generate rating report for a project
 * @param {string} projectPath - Project root path
 * @returns {Object} Rating report
 */
function generateRatingReport(projectPath) {
  const stats = getRatingStats(projectPath);
  const latest = getLatestRating(projectPath);

  return {
    totalRatings: stats.count,
    projects: stats.projects,
    categoryAverages: stats.averages,
    overallAverage: stats.averages.overall || 0,
    interpretation: interpretRating(stats.averages.overall || 0),
    latestRating: latest ? toDisplayFormat(latest) : null
  };
}

// Export public API
module.exports = {
  // Schema
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
  toDisplayFormat,

  // Prompts
  createInterface,
  prompt,
  formatScale,
  promptRating,
  promptRatings,
  promptQuickRating,
  confirm,
  displayRatingSummary,
  buildRatingFromAnswers,

  // Persistence
  DEFAULT_RATINGS_FILE,
  getRatingsPath,
  saveRating,
  loadRatings,
  getLatestRating,
  getRatingStats,
  exportToCsv,
  clearRatings,
  ratingsExist,

  // High-Level
  collectAndSaveRatings,
  generateRatingReport
};
