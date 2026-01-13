/**
 * Rating Save Module
 *
 * Persistence operations for ratings.
 *
 * @module lib/rating/save
 * @version 11.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { validateRating } = require('./schema.cjs');

/**
 * Default ratings file location
 */
const DEFAULT_RATINGS_FILE = '.pipeline/ratings.jsonl';

/**
 * Get ratings file path for a project
 * @param {string} projectPath - Project root path
 * @param {string} [filename] - Custom filename
 * @returns {string} Full path to ratings file
 */
function getRatingsPath(projectPath, filename = DEFAULT_RATINGS_FILE) {
  return path.join(projectPath, filename);
}

/**
 * Ensure ratings directory exists
 * @param {string} ratingsPath - Path to ratings file
 */
function ensureRatingsDir(ratingsPath) {
  const dir = path.dirname(ratingsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Save rating to file
 * @param {string} projectPath - Project root path
 * @param {Object} rating - Rating object to save
 * @param {Object} [options] - Save options
 * @returns {{ success: boolean, path: string, errors: string[] }}
 */
function saveRating(projectPath, rating, options = {}) {
  const { validate = true, filename = DEFAULT_RATINGS_FILE } = options;

  // Validate if requested
  if (validate) {
    const validation = validateRating(rating);
    if (!validation.valid) {
      return {
        success: false,
        path: null,
        errors: validation.errors
      };
    }
  }

  const ratingsPath = getRatingsPath(projectPath, filename);
  ensureRatingsDir(ratingsPath);

  // Append to file
  const line = JSON.stringify(rating) + '\n';
  fs.appendFileSync(ratingsPath, line, 'utf8');

  return {
    success: true,
    path: ratingsPath,
    errors: []
  };
}

/**
 * Load all ratings from file
 * @param {string} projectPath - Project root path
 * @param {string} [filename] - Custom filename
 * @returns {Object[]} Array of rating objects
 */
function loadRatings(projectPath, filename = DEFAULT_RATINGS_FILE) {
  const ratingsPath = getRatingsPath(projectPath, filename);

  if (!fs.existsSync(ratingsPath)) {
    return [];
  }

  const content = fs.readFileSync(ratingsPath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());

  const ratings = [];
  for (const line of lines) {
    try {
      ratings.push(JSON.parse(line));
    } catch {
      // Skip invalid lines
    }
  }

  return ratings;
}

/**
 * Get latest rating for a project
 * @param {string} projectPath - Project root path
 * @param {string} [projectName] - Filter by project name (optional)
 * @returns {Object | null} Latest rating or null
 */
function getLatestRating(projectPath, projectName = null) {
  const ratings = loadRatings(projectPath);

  if (ratings.length === 0) {
    return null;
  }

  // Filter by project name if provided
  let filtered = ratings;
  if (projectName) {
    filtered = ratings.filter(r => r.project === projectName);
  }

  if (filtered.length === 0) {
    return null;
  }

  // Sort by timestamp descending
  filtered.sort((a, b) => {
    const aTime = new Date(a.timestamp || 0);
    const bTime = new Date(b.timestamp || 0);
    return bTime - aTime;
  });

  return filtered[0];
}

/**
 * Get rating statistics
 * @param {string} projectPath - Project root path
 * @returns {Object} Rating statistics
 */
function getRatingStats(projectPath) {
  const ratings = loadRatings(projectPath);

  if (ratings.length === 0) {
    return {
      count: 0,
      averages: {},
      projects: []
    };
  }

  // Collect stats
  const categoryTotals = {};
  const categoryCounts = {};
  const projects = new Set();

  for (const rating of ratings) {
    if (rating.project) {
      projects.add(rating.project);
    }

    for (const [key, value] of Object.entries(rating)) {
      if (typeof value === 'number' && value >= 1 && value <= 5) {
        categoryTotals[key] = (categoryTotals[key] || 0) + value;
        categoryCounts[key] = (categoryCounts[key] || 0) + 1;
      }
    }
  }

  // Calculate averages
  const averages = {};
  for (const key of Object.keys(categoryTotals)) {
    averages[key] = categoryTotals[key] / categoryCounts[key];
  }

  return {
    count: ratings.length,
    averages,
    projects: Array.from(projects)
  };
}

/**
 * Export ratings to CSV format
 * @param {string} projectPath - Project root path
 * @param {string} outputPath - Output CSV file path
 * @returns {{ success: boolean, count: number }}
 */
function exportToCsv(projectPath, outputPath) {
  const ratings = loadRatings(projectPath);

  if (ratings.length === 0) {
    return { success: false, count: 0 };
  }

  // Build CSV header from first rating
  const headers = Object.keys(ratings[0]);
  const csvLines = [headers.join(',')];

  // Add data rows
  for (const rating of ratings) {
    const values = headers.map(h => {
      const val = rating[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string' && val.includes(',')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return String(val);
    });
    csvLines.push(values.join(','));
  }

  // Write file
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf8');

  return { success: true, count: ratings.length };
}

/**
 * Clear all ratings
 * @param {string} projectPath - Project root path
 * @param {string} [filename] - Custom filename
 * @returns {boolean} Success status
 */
function clearRatings(projectPath, filename = DEFAULT_RATINGS_FILE) {
  const ratingsPath = getRatingsPath(projectPath, filename);

  if (fs.existsSync(ratingsPath)) {
    fs.unlinkSync(ratingsPath);
    return true;
  }

  return false;
}

/**
 * Check if ratings file exists
 * @param {string} projectPath - Project root path
 * @param {string} [filename] - Custom filename
 * @returns {boolean}
 */
function ratingsExist(projectPath, filename = DEFAULT_RATINGS_FILE) {
  const ratingsPath = getRatingsPath(projectPath, filename);
  return fs.existsSync(ratingsPath);
}

module.exports = {
  DEFAULT_RATINGS_FILE,
  getRatingsPath,
  ensureRatingsDir,
  saveRating,
  loadRatings,
  getLatestRating,
  getRatingStats,
  exportToCsv,
  clearRatings,
  ratingsExist
};
