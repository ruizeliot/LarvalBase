/**
 * Analyzer Engine Module - Public API
 *
 * Feature extraction, correlation analysis, and predictions.
 *
 * @module lib/analyzer
 * @version 11.0.0
 */

'use strict';

const {
  FEATURE_SCHEMA,
  DETECTION_PATTERNS,
  extractFeatures,
  extractFeaturesFromEntries,
  getNumericFeatureNames,
  getBooleanFeatureNames
} = require('./extract.cjs');

const {
  mean,
  standardDeviation,
  pearsonCorrelation,
  pointBiserialCorrelation,
  correlate,
  findCorrelations,
  interpretCorrelation
} = require('./correlate.cjs');

const {
  trainLinearRegression,
  trainMultipleRegression,
  trainModel,
  predict,
  predictAll,
  trainAllModels,
  evaluateModel
} = require('./predict.cjs');

const {
  appendToDataset,
  readDataset,
  readDatasetStreaming,
  getDatasetStats,
  filterDataset,
  mergeDatasets,
  splitDataset,
  createDatasetEntry,
  validateEntry
} = require('./dataset.cjs');

/**
 * Analyze a transcript and generate predictions
 * @param {string} transcriptPath - Path to transcript file
 * @param {Object} models - Trained prediction models
 * @returns {Promise<{ features: Object, predictions: Object }>}
 */
async function analyzeTranscript(transcriptPath, models = null) {
  const features = await extractFeatures(transcriptPath);

  let predictions = null;
  if (models) {
    predictions = predictAll(features, models);
  }

  return { features, predictions };
}

/**
 * Generate a summary report from dataset
 * @param {string} datasetPath - Path to dataset
 * @returns {Object} Summary report
 */
function generateReport(datasetPath) {
  const stats = getDatasetStats(datasetPath);
  const dataset = readDataset(datasetPath);

  // Find significant correlations
  const correlations = findCorrelations(dataset, 0.3, 0.1);

  // Train models and get R2 scores
  const models = trainAllModels(dataset);
  const modelPerformance = {};

  for (const [rating, model] of Object.entries(models)) {
    modelPerformance[rating] = {
      type: model.type,
      r2: model.r2
    };
  }

  return {
    datasetStats: stats,
    significantCorrelations: correlations.slice(0, 10), // Top 10
    modelPerformance,
    recommendations: generateRecommendations(correlations)
  };
}

/**
 * Generate recommendations based on correlations
 * @param {Object[]} correlations - Correlation results
 * @returns {string[]} Recommendations
 */
function generateRecommendations(correlations) {
  const recommendations = [];

  for (const corr of correlations) {
    const direction = corr.r > 0 ? 'positively' : 'negatively';
    const strength = interpretCorrelation(corr.r);

    if (Math.abs(corr.r) >= 0.5) {
      if (corr.r > 0) {
        recommendations.push(
          `Higher ${corr.feature} ${direction} correlates with ${corr.rating} (${strength})`
        );
      } else {
        recommendations.push(
          `Lower ${corr.feature} may improve ${corr.rating} (${strength} negative correlation)`
        );
      }
    }
  }

  // Add feature-specific recommendations
  const featureRecommendations = {
    'mocking_detected': 'Avoid mocking - real integrations correlate with better ratings',
    'placeholder_detected': 'Replace all placeholders before completion',
    'test_cheating_detected': 'Ensure tests verify actual functionality',
    'error_retry_count': 'Research before retrying - blind retries waste time',
    'websearch_count': 'Use WebSearch early and often for current documentation'
  };

  for (const corr of correlations) {
    if (featureRecommendations[corr.feature] && corr.r < -0.3) {
      recommendations.push(featureRecommendations[corr.feature]);
    }
  }

  return [...new Set(recommendations)].slice(0, 5);
}

// Export public API
module.exports = {
  // Feature Extraction
  FEATURE_SCHEMA,
  DETECTION_PATTERNS,
  extractFeatures,
  extractFeaturesFromEntries,
  getNumericFeatureNames,
  getBooleanFeatureNames,

  // Correlation Analysis
  mean,
  standardDeviation,
  pearsonCorrelation,
  pointBiserialCorrelation,
  correlate,
  findCorrelations,
  interpretCorrelation,

  // Prediction
  trainLinearRegression,
  trainMultipleRegression,
  trainModel,
  predict,
  predictAll,
  trainAllModels,
  evaluateModel,

  // Dataset Management
  appendToDataset,
  readDataset,
  readDatasetStreaming,
  getDatasetStats,
  filterDataset,
  mergeDatasets,
  splitDataset,
  createDatasetEntry,
  validateEntry,

  // High-Level API
  analyzeTranscript,
  generateReport,
  generateRecommendations
};
