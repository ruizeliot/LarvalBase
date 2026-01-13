/**
 * Dataset Management Module
 *
 * JSONL dataset operations for persistent storage of features and ratings.
 *
 * @module lib/analyzer/dataset
 * @version 11.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Ensure dataset directory exists
 * @param {string} datasetPath - Path to dataset file
 */
function ensureDatasetDir(datasetPath) {
  const dir = path.dirname(datasetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Append an entry to a JSONL dataset
 * @param {string} datasetPath - Path to dataset file
 * @param {Object} entry - Entry to append
 */
function appendToDataset(datasetPath, entry) {
  ensureDatasetDir(datasetPath);

  // Add timestamp if not present
  const entryWithTimestamp = {
    timestamp: new Date().toISOString(),
    ...entry
  };

  const line = JSON.stringify(entryWithTimestamp) + '\n';
  fs.appendFileSync(datasetPath, line, 'utf8');
}

/**
 * Read entire dataset into memory
 * @param {string} datasetPath - Path to dataset file
 * @returns {Object[]} Array of dataset entries
 */
function readDataset(datasetPath) {
  if (!fs.existsSync(datasetPath)) {
    return [];
  }

  const content = fs.readFileSync(datasetPath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());

  const entries = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // Skip invalid lines
    }
  }

  return entries;
}

/**
 * Read dataset with streaming (for large files)
 * @param {string} datasetPath - Path to dataset file
 * @returns {Promise<Object[]>} Array of dataset entries
 */
async function readDatasetStreaming(datasetPath) {
  if (!fs.existsSync(datasetPath)) {
    return [];
  }

  const entries = [];
  const fileStream = fs.createReadStream(datasetPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
      // Skip invalid lines
    }
  }

  return entries;
}

/**
 * Get statistics about a dataset
 * @param {string} datasetPath - Path to dataset file
 * @returns {Object} Dataset statistics
 */
function getDatasetStats(datasetPath) {
  const entries = readDataset(datasetPath);

  if (entries.length === 0) {
    return {
      count: 0,
      features: [],
      ratings: [],
      dateRange: null
    };
  }

  // Collect all feature and rating names
  const featureSet = new Set();
  const ratingSet = new Set();
  const timestamps = [];

  for (const entry of entries) {
    // Features
    const features = entry.features || {};
    Object.keys(features).forEach(k => featureSet.add(k));

    // Also check top-level for features
    Object.keys(entry).forEach(k => {
      if (!['timestamp', 'project', 'ratings', 'id'].includes(k) &&
          typeof entry[k] === 'number') {
        featureSet.add(k);
      }
    });

    // Ratings
    const ratings = entry.ratings || {};
    Object.keys(ratings).forEach(k => ratingSet.add(k));

    // Timestamps
    if (entry.timestamp) {
      timestamps.push(new Date(entry.timestamp));
    }
  }

  // Calculate date range
  let dateRange = null;
  if (timestamps.length > 0) {
    timestamps.sort((a, b) => a - b);
    dateRange = {
      earliest: timestamps[0].toISOString(),
      latest: timestamps[timestamps.length - 1].toISOString()
    };
  }

  // Calculate rating averages
  const ratingAverages = {};
  const ratingNames = Array.from(ratingSet);

  for (const ratingName of ratingNames) {
    const values = entries
      .map(e => e.ratings?.[ratingName])
      .filter(v => typeof v === 'number');

    if (values.length > 0) {
      ratingAverages[ratingName] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  }

  return {
    count: entries.length,
    features: Array.from(featureSet).sort(),
    ratings: ratingNames.sort(),
    ratingAverages,
    dateRange
  };
}

/**
 * Filter dataset by criteria
 * @param {string} datasetPath - Path to dataset file
 * @param {Object} criteria - Filter criteria
 * @returns {Object[]} Filtered entries
 */
function filterDataset(datasetPath, criteria) {
  const entries = readDataset(datasetPath);

  return entries.filter(entry => {
    for (const [key, value] of Object.entries(criteria)) {
      // Handle nested paths (e.g., 'features.websearch_count')
      const keys = key.split('.');
      let current = entry;

      for (const k of keys) {
        current = current?.[k];
      }

      // Apply filter
      if (typeof value === 'object' && value !== null) {
        // Range filter: { min, max }
        if (value.min !== undefined && current < value.min) return false;
        if (value.max !== undefined && current > value.max) return false;
      } else {
        // Exact match
        if (current !== value) return false;
      }
    }

    return true;
  });
}

/**
 * Merge multiple datasets
 * @param {string[]} datasetPaths - Paths to datasets to merge
 * @param {string} outputPath - Path for merged dataset
 * @returns {number} Number of entries in merged dataset
 */
function mergeDatasets(datasetPaths, outputPath) {
  const allEntries = [];
  const seenIds = new Set();

  for (const datasetPath of datasetPaths) {
    const entries = readDataset(datasetPath);

    for (const entry of entries) {
      // Deduplicate by timestamp + project
      const id = `${entry.timestamp}:${entry.project}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        allEntries.push(entry);
      }
    }
  }

  // Sort by timestamp
  allEntries.sort((a, b) => {
    const aTime = new Date(a.timestamp || 0);
    const bTime = new Date(b.timestamp || 0);
    return aTime - bTime;
  });

  // Write merged dataset
  ensureDatasetDir(outputPath);
  const content = allEntries.map(e => JSON.stringify(e)).join('\n') + '\n';
  fs.writeFileSync(outputPath, content, 'utf8');

  return allEntries.length;
}

/**
 * Split dataset into train/test sets
 * @param {string} datasetPath - Path to dataset
 * @param {number} [trainRatio=0.8] - Ratio of data to use for training
 * @returns {{ train: Object[], test: Object[] }} Split datasets
 */
function splitDataset(datasetPath, trainRatio = 0.8) {
  const entries = readDataset(datasetPath);

  // Shuffle (Fisher-Yates)
  const shuffled = [...entries];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const splitIndex = Math.floor(shuffled.length * trainRatio);

  return {
    train: shuffled.slice(0, splitIndex),
    test: shuffled.slice(splitIndex)
  };
}

/**
 * Create a combined entry with features and ratings
 * @param {Object} features - Extracted features
 * @param {Object} ratings - User ratings
 * @param {string} project - Project name
 * @returns {Object} Combined entry
 */
function createDatasetEntry(features, ratings, project) {
  return {
    timestamp: new Date().toISOString(),
    project,
    features,
    ratings
  };
}

/**
 * Validate a dataset entry
 * @param {Object} entry - Entry to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateEntry(entry) {
  const errors = [];

  if (!entry.timestamp) {
    errors.push('Missing timestamp');
  }

  if (!entry.project) {
    errors.push('Missing project name');
  }

  if (!entry.features || typeof entry.features !== 'object') {
    errors.push('Missing or invalid features object');
  }

  if (!entry.ratings || typeof entry.ratings !== 'object') {
    errors.push('Missing or invalid ratings object');
  }

  // Validate ratings are in range
  if (entry.ratings) {
    for (const [key, value] of Object.entries(entry.ratings)) {
      if (typeof value === 'number' && (value < 1 || value > 5)) {
        errors.push(`Rating ${key} out of range (1-5): ${value}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  appendToDataset,
  readDataset,
  readDatasetStreaming,
  getDatasetStats,
  filterDataset,
  mergeDatasets,
  splitDataset,
  createDatasetEntry,
  validateEntry,
  ensureDatasetDir
};
