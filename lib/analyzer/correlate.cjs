/**
 * Correlation Analysis Module
 *
 * Implements Pearson and point-biserial correlation for feature analysis.
 *
 * @module lib/analyzer/correlate
 * @version 11.0.0
 */

'use strict';

/**
 * Calculate mean of an array
 * @param {number[]} arr - Array of numbers
 * @returns {number} Mean value
 */
function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * Calculate standard deviation of an array
 * @param {number[]} arr - Array of numbers
 * @param {number} [avg] - Pre-calculated mean (optional)
 * @returns {number} Standard deviation
 */
function standardDeviation(arr, avg = null) {
  if (arr.length === 0) return 0;
  const m = avg !== null ? avg : mean(arr);
  const squareDiffs = arr.map(val => Math.pow(val - m, 2));
  return Math.sqrt(mean(squareDiffs));
}

/**
 * Calculate Pearson correlation coefficient
 * @param {number[]} x - First variable array
 * @param {number[]} y - Second variable array
 * @returns {{ r: number, p: number, n: number }} Correlation result
 */
function pearsonCorrelation(x, y) {
  if (x.length !== y.length) {
    throw new Error('Arrays must have equal length');
  }

  const n = x.length;
  if (n < 3) {
    return { r: 0, p: 1, n };
  }

  const meanX = mean(x);
  const meanY = mean(y);
  const stdX = standardDeviation(x, meanX);
  const stdY = standardDeviation(y, meanY);

  // If either has no variance, correlation is undefined
  if (stdX === 0 || stdY === 0) {
    return { r: 0, p: 1, n };
  }

  // Calculate covariance
  let covariance = 0;
  for (let i = 0; i < n; i++) {
    covariance += (x[i] - meanX) * (y[i] - meanY);
  }
  covariance /= n;

  // Pearson r
  const r = covariance / (stdX * stdY);

  // Calculate t-statistic for p-value approximation
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  // Approximate p-value (two-tailed) using t-distribution
  const p = approximatePValue(t, n - 2);

  return { r, p, n };
}

/**
 * Calculate point-biserial correlation (for binary variables)
 * @param {boolean[]|number[]} binary - Binary variable (0/1 or true/false)
 * @param {number[]} continuous - Continuous variable
 * @returns {{ r: number, p: number, n: number }} Correlation result
 */
function pointBiserialCorrelation(binary, continuous) {
  if (binary.length !== continuous.length) {
    throw new Error('Arrays must have equal length');
  }

  const n = binary.length;
  if (n < 3) {
    return { r: 0, p: 1, n };
  }

  // Convert to numeric
  const binaryNumeric = binary.map(v => (v ? 1 : 0));

  // Split continuous by binary grouping
  const group0 = [];
  const group1 = [];

  for (let i = 0; i < n; i++) {
    if (binaryNumeric[i] === 0) {
      group0.push(continuous[i]);
    } else {
      group1.push(continuous[i]);
    }
  }

  // Need both groups to have data
  if (group0.length === 0 || group1.length === 0) {
    return { r: 0, p: 1, n };
  }

  const n0 = group0.length;
  const n1 = group1.length;
  const mean0 = mean(group0);
  const mean1 = mean(group1);
  const stdTotal = standardDeviation(continuous);

  if (stdTotal === 0) {
    return { r: 0, p: 1, n };
  }

  // Point-biserial formula
  const r = ((mean1 - mean0) / stdTotal) * Math.sqrt((n0 * n1) / (n * n));

  // Approximate p-value
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const p = approximatePValue(t, n - 2);

  return { r, p, n };
}

/**
 * Approximate p-value from t-statistic (two-tailed)
 * Uses approximation formula for t-distribution
 * @param {number} t - T-statistic
 * @param {number} df - Degrees of freedom
 * @returns {number} Approximate p-value
 */
function approximatePValue(t, df) {
  if (!isFinite(t) || df <= 0) return 1;

  // Use approximation: p ≈ 2 * (1 - Φ(|t|)) for large df
  // For smaller df, use a lookup approximation
  const absT = Math.abs(t);

  if (df >= 30) {
    // Normal approximation for large df
    return 2 * (1 - normalCDF(absT));
  }

  // Simple approximation for smaller df
  // This is a rough estimate
  const x = df / (df + absT * absT);
  return Math.pow(x, df / 2);
}

/**
 * Standard normal cumulative distribution function
 * @param {number} x - Value
 * @returns {number} CDF value
 */
function normalCDF(x) {
  // Approximation using error function
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Calculate correlation between a feature and rating in a dataset
 * @param {Object[]} dataset - Array of data entries
 * @param {string} featureName - Name of feature to correlate
 * @param {string} ratingName - Name of rating to correlate with
 * @param {string} [type='auto'] - Correlation type ('pearson', 'point-biserial', 'auto')
 * @returns {{ r: number, p: number, n: number, type: string }} Correlation result
 */
function correlate(dataset, featureName, ratingName, type = 'auto') {
  const featureValues = [];
  const ratingValues = [];

  for (const entry of dataset) {
    const featureVal = entry.features?.[featureName] ?? entry[featureName];
    const ratingVal = entry.ratings?.[ratingName] ?? entry[ratingName];

    if (featureVal !== undefined && ratingVal !== undefined) {
      featureValues.push(featureVal);
      ratingValues.push(ratingVal);
    }
  }

  if (featureValues.length < 3) {
    return { r: 0, p: 1, n: featureValues.length, type: 'insufficient_data' };
  }

  // Determine correlation type
  let correlationType = type;
  if (type === 'auto') {
    // Check if feature is binary
    const uniqueValues = new Set(featureValues);
    const isBinary = uniqueValues.size <= 2 &&
      featureValues.every(v => v === 0 || v === 1 || v === true || v === false);

    correlationType = isBinary ? 'point-biserial' : 'pearson';
  }

  // Calculate correlation
  const result = correlationType === 'point-biserial'
    ? pointBiserialCorrelation(featureValues, ratingValues)
    : pearsonCorrelation(featureValues, ratingValues);

  return { ...result, type: correlationType };
}

/**
 * Find all significant correlations in a dataset
 * @param {Object[]} dataset - Array of data entries
 * @param {number} [minR=0.3] - Minimum absolute r value
 * @param {number} [maxP=0.05] - Maximum p-value
 * @param {string[]} [features] - Feature names to check (default: all)
 * @param {string[]} [ratings] - Rating names to check (default: all)
 * @returns {Object[]} Array of significant correlations
 */
function findCorrelations(dataset, minR = 0.3, maxP = 0.05, features = null, ratings = null) {
  const results = [];

  // Get feature and rating names from first entry
  if (dataset.length === 0) return results;

  const sampleEntry = dataset[0];
  const featureNames = features || Object.keys(sampleEntry.features || sampleEntry);
  const ratingNames = ratings || Object.keys(sampleEntry.ratings || {});

  // If no ratings structure, look for common rating names
  const defaultRatings = [
    'overall', 'ui_design', 'navigation', 'performance',
    'code_quality', 'test_coverage', 'functionality'
  ];

  const actualRatings = ratingNames.length > 0 ? ratingNames : defaultRatings;

  for (const feature of featureNames) {
    // Skip non-feature fields
    if (['ratings', 'timestamp', 'project', 'id'].includes(feature)) continue;

    for (const rating of actualRatings) {
      const result = correlate(dataset, feature, rating);

      if (Math.abs(result.r) >= minR && result.p <= maxP) {
        results.push({
          feature,
          rating,
          ...result
        });
      }
    }
  }

  // Sort by absolute r value (strongest first)
  results.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  return results;
}

/**
 * Interpret correlation strength
 * @param {number} r - Correlation coefficient
 * @returns {string} Interpretation
 */
function interpretCorrelation(r) {
  const absR = Math.abs(r);
  const direction = r >= 0 ? 'positive' : 'negative';

  if (absR >= 0.9) return `Very strong ${direction}`;
  if (absR >= 0.7) return `Strong ${direction}`;
  if (absR >= 0.5) return `Moderate ${direction}`;
  if (absR >= 0.3) return `Weak ${direction}`;
  return 'Negligible';
}

module.exports = {
  mean,
  standardDeviation,
  pearsonCorrelation,
  pointBiserialCorrelation,
  correlate,
  findCorrelations,
  interpretCorrelation,
  approximatePValue,
  normalCDF
};
