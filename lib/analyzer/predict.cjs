/**
 * Prediction Module
 *
 * Regression-based predictions using trained models.
 *
 * @module lib/analyzer/predict
 * @version 11.0.0
 */

'use strict';

const { mean } = require('./correlate.cjs');

/**
 * Train a simple linear regression model
 * @param {number[]} x - Feature values
 * @param {number[]} y - Target values
 * @returns {{ slope: number, intercept: number, r2: number }} Model parameters
 */
function trainLinearRegression(x, y) {
  if (x.length !== y.length) {
    throw new Error('Arrays must have equal length');
  }

  const n = x.length;
  if (n < 2) {
    return { slope: 0, intercept: mean(y), r2: 0 };
  }

  const meanX = mean(x);
  const meanY = mean(y);

  // Calculate slope
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (x[i] - meanX) * (y[i] - meanY);
    denominator += Math.pow(x[i] - meanX, 2);
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;

  // Calculate R-squared
  let ssRes = 0;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    const predicted = slope * x[i] + intercept;
    ssRes += Math.pow(y[i] - predicted, 2);
    ssTot += Math.pow(y[i] - meanY, 2);
  }

  const r2 = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;

  return { slope, intercept, r2 };
}

/**
 * Train a multiple linear regression model
 * @param {number[][]} X - Feature matrix (rows are samples, cols are features)
 * @param {number[]} y - Target values
 * @returns {{ coefficients: number[], intercept: number, r2: number, featureNames: string[] }} Model
 */
function trainMultipleRegression(X, y, featureNames = []) {
  const n = X.length;
  const p = X[0]?.length || 0;

  if (n < p + 2) {
    // Not enough samples for regression
    return {
      coefficients: new Array(p).fill(0),
      intercept: mean(y),
      r2: 0,
      featureNames
    };
  }

  // Add intercept column (column of 1s)
  const Xa = X.map(row => [1, ...row]);

  // Calculate (X'X)^-1 X'y using normal equations
  // For simplicity, use iterative approach (gradient descent)
  const coefficients = new Array(p + 1).fill(0);
  const learningRate = 0.01;
  const iterations = 1000;

  // Normalize features
  const featureMeans = [];
  const featureStds = [];

  for (let j = 1; j < p + 1; j++) {
    const col = Xa.map(row => row[j]);
    const colMean = mean(col);
    const colStd = Math.sqrt(col.reduce((sum, v) => sum + Math.pow(v - colMean, 2), 0) / n) || 1;
    featureMeans.push(colMean);
    featureStds.push(colStd);

    // Normalize
    for (let i = 0; i < n; i++) {
      Xa[i][j] = (Xa[i][j] - colMean) / colStd;
    }
  }

  // Gradient descent
  for (let iter = 0; iter < iterations; iter++) {
    const gradients = new Array(p + 1).fill(0);

    for (let i = 0; i < n; i++) {
      let predicted = 0;
      for (let j = 0; j < p + 1; j++) {
        predicted += coefficients[j] * Xa[i][j];
      }
      const error = predicted - y[i];

      for (let j = 0; j < p + 1; j++) {
        gradients[j] += error * Xa[i][j];
      }
    }

    for (let j = 0; j < p + 1; j++) {
      coefficients[j] -= learningRate * gradients[j] / n;
    }
  }

  // Denormalize coefficients
  const denormalizedCoeffs = [];
  let denormalizedIntercept = coefficients[0];

  for (let j = 1; j < p + 1; j++) {
    const coef = coefficients[j] / featureStds[j - 1];
    denormalizedCoeffs.push(coef);
    denormalizedIntercept -= coef * featureMeans[j - 1];
  }

  // Calculate R-squared
  const meanY = mean(y);
  let ssRes = 0;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    let predicted = denormalizedIntercept;
    for (let j = 0; j < p; j++) {
      predicted += denormalizedCoeffs[j] * X[i][j];
    }
    ssRes += Math.pow(y[i] - predicted, 2);
    ssTot += Math.pow(y[i] - meanY, 2);
  }

  const r2 = ssTot !== 0 ? Math.max(0, 1 - (ssRes / ssTot)) : 0;

  return {
    coefficients: denormalizedCoeffs,
    intercept: denormalizedIntercept,
    r2,
    featureNames
  };
}

/**
 * Train a model from dataset
 * @param {Object[]} dataset - Array of data entries
 * @param {string} targetRating - Rating to predict
 * @param {string[]} [featureNames] - Features to use (default: all numeric)
 * @returns {Object} Trained model
 */
function trainModel(dataset, targetRating, featureNames = null) {
  if (dataset.length < 3) {
    return {
      type: 'constant',
      value: 3, // Default middle rating
      r2: 0,
      targetRating,
      featureNames: []
    };
  }

  // Determine feature names
  const sampleEntry = dataset[0];
  const features = featureNames || Object.keys(sampleEntry.features || sampleEntry).filter(
    key => !['ratings', 'timestamp', 'project', 'id'].includes(key) &&
    typeof (sampleEntry.features?.[key] ?? sampleEntry[key]) === 'number'
  );

  // Build feature matrix and target vector
  const X = [];
  const y = [];

  for (const entry of dataset) {
    const targetVal = entry.ratings?.[targetRating] ?? entry[targetRating];
    if (typeof targetVal !== 'number') continue;

    const featureRow = [];
    let hasAllFeatures = true;

    for (const featureName of features) {
      const val = entry.features?.[featureName] ?? entry[featureName];
      if (typeof val !== 'number') {
        hasAllFeatures = false;
        break;
      }
      featureRow.push(val);
    }

    if (hasAllFeatures) {
      X.push(featureRow);
      y.push(targetVal);
    }
  }

  if (X.length < 3) {
    return {
      type: 'constant',
      value: mean(y) || 3,
      r2: 0,
      targetRating,
      featureNames: features
    };
  }

  // Train model
  if (features.length === 1) {
    const model = trainLinearRegression(X.map(row => row[0]), y);
    return {
      type: 'linear',
      ...model,
      targetRating,
      featureNames: features
    };
  } else {
    const model = trainMultipleRegression(X, y, features);
    return {
      type: 'multiple',
      ...model,
      targetRating
    };
  }
}

/**
 * Make prediction using trained model
 * @param {Object} features - Feature values
 * @param {Object} model - Trained model
 * @returns {number} Predicted value
 */
function predict(features, model) {
  if (model.type === 'constant') {
    return model.value;
  }

  if (model.type === 'linear') {
    const featureName = model.featureNames[0];
    const featureVal = features[featureName];
    if (typeof featureVal !== 'number') return model.intercept;
    return model.slope * featureVal + model.intercept;
  }

  if (model.type === 'multiple') {
    let prediction = model.intercept;
    for (let i = 0; i < model.featureNames.length; i++) {
      const featureName = model.featureNames[i];
      const featureVal = features[featureName];
      if (typeof featureVal === 'number') {
        prediction += model.coefficients[i] * featureVal;
      }
    }
    return prediction;
  }

  return 3; // Default
}

/**
 * Make predictions for all ratings
 * @param {Object} features - Feature values
 * @param {Object} models - Object with rating names as keys and models as values
 * @returns {Object} Predicted ratings
 */
function predictAll(features, models) {
  const predictions = {};

  for (const [ratingName, model] of Object.entries(models)) {
    predictions[ratingName] = predict(features, model);
  }

  return predictions;
}

/**
 * Train models for all ratings
 * @param {Object[]} dataset - Training dataset
 * @param {string[]} [featureNames] - Features to use
 * @returns {Object} Models for each rating
 */
function trainAllModels(dataset, featureNames = null) {
  const ratingNames = [
    'overall', 'ui_design', 'navigation', 'performance',
    'code_quality', 'test_coverage', 'functionality'
  ];

  const models = {};

  for (const ratingName of ratingNames) {
    models[ratingName] = trainModel(dataset, ratingName, featureNames);
  }

  return models;
}

/**
 * Evaluate model performance
 * @param {Object} model - Trained model
 * @param {Object[]} testSet - Test dataset
 * @returns {{ mse: number, mae: number, r2: number }} Performance metrics
 */
function evaluateModel(model, testSet) {
  const predictions = [];
  const actuals = [];

  for (const entry of testSet) {
    const actual = entry.ratings?.[model.targetRating] ?? entry[model.targetRating];
    if (typeof actual !== 'number') continue;

    const features = entry.features || entry;
    const predicted = predict(features, model);

    predictions.push(predicted);
    actuals.push(actual);
  }

  if (predictions.length === 0) {
    return { mse: 0, mae: 0, r2: 0 };
  }

  // Calculate MSE
  let mse = 0;
  let mae = 0;
  for (let i = 0; i < predictions.length; i++) {
    mse += Math.pow(predictions[i] - actuals[i], 2);
    mae += Math.abs(predictions[i] - actuals[i]);
  }
  mse /= predictions.length;
  mae /= predictions.length;

  // Calculate R-squared
  const meanActual = mean(actuals);
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < predictions.length; i++) {
    ssRes += Math.pow(actuals[i] - predictions[i], 2);
    ssTot += Math.pow(actuals[i] - meanActual, 2);
  }
  const r2 = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;

  return { mse, mae, r2 };
}

module.exports = {
  trainLinearRegression,
  trainMultipleRegression,
  trainModel,
  predict,
  predictAll,
  trainAllModels,
  evaluateModel
};
