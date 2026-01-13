/**
 * Analyzer Engine Tests
 *
 * Tests for feature extraction, correlation, prediction, and dataset management.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const analyzer = require('../index.cjs');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const SAMPLE_TRANSCRIPT = path.join(FIXTURES_DIR, 'sample-transcript.jsonl');
const SAMPLE_DATASET = path.join(FIXTURES_DIR, 'sample-dataset.jsonl');

describe('Feature Extraction', () => {
  test('extractFeatures extracts from transcript file', async () => {
    const features = await analyzer.extractFeatures(SAMPLE_TRANSCRIPT);

    expect(features.websearch_count).toBeGreaterThan(0);
    expect(features.message_count).toBeGreaterThan(0);
    expect(features.error_retry_count).toBeGreaterThan(0);
    expect(features.review_loop_count).toBeGreaterThan(0);
  });

  test('extractFeatures counts user and assistant messages', async () => {
    const features = await analyzer.extractFeatures(SAMPLE_TRANSCRIPT);

    expect(features.user_message_count).toBe(2);
    expect(features.assistant_message_count).toBe(12);
    expect(features.message_count).toBe(14);
  });

  test('extractFeatures detects patterns', async () => {
    const features = await analyzer.extractFeatures(SAMPLE_TRANSCRIPT);

    // Should not detect mocking in sample
    expect(features.mocking_detected).toBe(false);
  });

  test('extractFeaturesFromEntries works with array', () => {
    const entries = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'Using WebSearch now' },
      { role: 'assistant', content: 'Found jest.mock in code' }
    ];

    const features = analyzer.extractFeaturesFromEntries(entries);

    expect(features.message_count).toBe(3);
    expect(features.websearch_count).toBe(1);
    expect(features.mocking_detected).toBe(true);
  });

  test('getNumericFeatureNames returns feature list', () => {
    const names = analyzer.getNumericFeatureNames();

    expect(names).toContain('websearch_count');
    expect(names).toContain('tool_call_count');
    expect(names).toContain('total_duration');
  });

  test('getBooleanFeatureNames returns flag list', () => {
    const names = analyzer.getBooleanFeatureNames();

    expect(names).toContain('mocking_detected');
    expect(names).toContain('placeholder_detected');
    expect(names).toContain('test_cheating_detected');
  });
});

describe('Correlation Analysis', () => {
  test('mean calculates average', () => {
    expect(analyzer.mean([1, 2, 3, 4, 5])).toBe(3);
    expect(analyzer.mean([10])).toBe(10);
    expect(analyzer.mean([])).toBe(0);
  });

  test('standardDeviation calculates std', () => {
    const std = analyzer.standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(std).toBeCloseTo(2, 0);
  });

  test('pearsonCorrelation calculates r value', () => {
    // Perfect positive correlation
    const perfect = analyzer.pearsonCorrelation([1, 2, 3], [1, 2, 3]);
    expect(perfect.r).toBeCloseTo(1, 5);

    // Perfect negative correlation
    const negative = analyzer.pearsonCorrelation([1, 2, 3], [3, 2, 1]);
    expect(negative.r).toBeCloseTo(-1, 5);

    // No correlation (small sample)
    const none = analyzer.pearsonCorrelation([1, 2, 3], [1, 3, 2]);
    expect(Math.abs(none.r)).toBeLessThan(1);
  });

  test('pointBiserialCorrelation works with binary data', () => {
    const binary = [0, 0, 0, 1, 1, 1];
    const continuous = [1, 2, 3, 4, 5, 6];

    const result = analyzer.pointBiserialCorrelation(binary, continuous);
    expect(result.r).toBeGreaterThan(0);
    expect(result.type).toBeUndefined(); // Raw function doesn't add type
  });

  test('correlate auto-detects correlation type', () => {
    const dataset = analyzer.readDataset(SAMPLE_DATASET);

    // Numeric feature
    const numericResult = analyzer.correlate(dataset, 'websearch_count', 'overall');
    expect(numericResult.type).toBe('pearson');

    // Boolean feature
    const boolResult = analyzer.correlate(dataset, 'mocking_detected', 'overall');
    expect(boolResult.type).toBe('point-biserial');
  });

  test('findCorrelations returns significant correlations', () => {
    const dataset = analyzer.readDataset(SAMPLE_DATASET);
    const correlations = analyzer.findCorrelations(dataset, 0.3, 0.5);

    expect(Array.isArray(correlations)).toBe(true);
    // All returned correlations should meet threshold
    for (const corr of correlations) {
      expect(Math.abs(corr.r)).toBeGreaterThanOrEqual(0.3);
    }
  });

  test('interpretCorrelation returns strength description', () => {
    expect(analyzer.interpretCorrelation(0.95)).toContain('Very strong');
    expect(analyzer.interpretCorrelation(-0.75)).toContain('Strong');
    expect(analyzer.interpretCorrelation(0.55)).toContain('Moderate');
    expect(analyzer.interpretCorrelation(-0.35)).toContain('Weak');
    expect(analyzer.interpretCorrelation(0.1)).toContain('Negligible');
  });
});

describe('Prediction', () => {
  test('trainLinearRegression creates model', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10];

    const model = analyzer.trainLinearRegression(x, y);

    expect(model.slope).toBeCloseTo(2, 5);
    expect(model.intercept).toBeCloseTo(0, 5);
    expect(model.r2).toBeCloseTo(1, 5);
  });

  test('trainModel trains from dataset', () => {
    const dataset = analyzer.readDataset(SAMPLE_DATASET);
    const model = analyzer.trainModel(dataset, 'overall');

    expect(model.type).toBeDefined();
    expect(model.targetRating).toBe('overall');
  });

  test('predict uses trained model', () => {
    const dataset = analyzer.readDataset(SAMPLE_DATASET);
    const model = analyzer.trainModel(dataset, 'overall', ['websearch_count']);

    const prediction = analyzer.predict({ websearch_count: 5 }, model);

    expect(typeof prediction).toBe('number');
    expect(prediction).toBeGreaterThan(0);
  });

  test('trainAllModels creates models for all ratings', () => {
    const dataset = analyzer.readDataset(SAMPLE_DATASET);
    const models = analyzer.trainAllModels(dataset);

    expect(models.overall).toBeDefined();
    expect(models.ui_design).toBeDefined();
    expect(models.code_quality).toBeDefined();
  });

  test('predictAll returns all rating predictions', () => {
    const dataset = analyzer.readDataset(SAMPLE_DATASET);
    const models = analyzer.trainAllModels(dataset);
    const features = { websearch_count: 5, error_retry_count: 2 };

    const predictions = analyzer.predictAll(features, models);

    expect(predictions.overall).toBeDefined();
    expect(predictions.ui_design).toBeDefined();
  });

  test('evaluateModel calculates performance metrics', () => {
    const dataset = analyzer.readDataset(SAMPLE_DATASET);
    const model = analyzer.trainModel(dataset, 'overall');

    const metrics = analyzer.evaluateModel(model, dataset);

    expect(metrics.mse).toBeDefined();
    expect(metrics.mae).toBeDefined();
    expect(metrics.r2).toBeDefined();
  });
});

describe('Dataset Management', () => {
  let tempDir;
  let tempDataset;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'analyzer-test-'));
    tempDataset = path.join(tempDir, 'test-dataset.jsonl');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('appendToDataset adds entry', () => {
    analyzer.appendToDataset(tempDataset, { project: 'test', value: 1 });
    analyzer.appendToDataset(tempDataset, { project: 'test', value: 2 });

    const entries = analyzer.readDataset(tempDataset);
    expect(entries.length).toBe(2);
    expect(entries[0].value).toBe(1);
    expect(entries[1].value).toBe(2);
  });

  test('appendToDataset adds timestamp', () => {
    analyzer.appendToDataset(tempDataset, { project: 'test' });

    const entries = analyzer.readDataset(tempDataset);
    expect(entries[0].timestamp).toBeDefined();
  });

  test('readDataset returns empty array for non-existent file', () => {
    const entries = analyzer.readDataset('/nonexistent/path.jsonl');
    expect(entries).toEqual([]);
  });

  test('getDatasetStats returns statistics', () => {
    const stats = analyzer.getDatasetStats(SAMPLE_DATASET);

    expect(stats.count).toBe(5);
    expect(stats.features.length).toBeGreaterThan(0);
    expect(stats.ratings.length).toBeGreaterThan(0);
    expect(stats.dateRange).toBeDefined();
  });

  test('filterDataset filters by criteria', () => {
    const filtered = analyzer.filterDataset(SAMPLE_DATASET, {
      'features.websearch_count': { min: 5 }
    });

    expect(filtered.length).toBeGreaterThan(0);
    for (const entry of filtered) {
      expect(entry.features.websearch_count).toBeGreaterThanOrEqual(5);
    }
  });

  test('splitDataset creates train/test sets', () => {
    const { train, test } = analyzer.splitDataset(SAMPLE_DATASET, 0.6);

    expect(train.length).toBe(3);
    expect(test.length).toBe(2);
  });

  test('createDatasetEntry combines features and ratings', () => {
    const entry = analyzer.createDatasetEntry(
      { websearch_count: 5 },
      { overall: 4 },
      'test-project'
    );

    expect(entry.project).toBe('test-project');
    expect(entry.features.websearch_count).toBe(5);
    expect(entry.ratings.overall).toBe(4);
    expect(entry.timestamp).toBeDefined();
  });

  test('validateEntry checks entry structure', () => {
    const validEntry = {
      timestamp: '2025-01-01T00:00:00Z',
      project: 'test',
      features: { count: 1 },
      ratings: { overall: 4 }
    };

    const result = analyzer.validateEntry(validEntry);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('validateEntry rejects invalid ratings', () => {
    const invalidEntry = {
      timestamp: '2025-01-01T00:00:00Z',
      project: 'test',
      features: {},
      ratings: { overall: 10 } // Out of range
    };

    const result = analyzer.validateEntry(invalidEntry);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('out of range'))).toBe(true);
  });

  test('mergeDatasets combines multiple datasets', () => {
    // Create two temp datasets
    const dataset1 = path.join(tempDir, 'data1.jsonl');
    const dataset2 = path.join(tempDir, 'data2.jsonl');
    const merged = path.join(tempDir, 'merged.jsonl');

    analyzer.appendToDataset(dataset1, { project: 'a', timestamp: '2025-01-01' });
    analyzer.appendToDataset(dataset2, { project: 'b', timestamp: '2025-01-02' });

    const count = analyzer.mergeDatasets([dataset1, dataset2], merged);

    expect(count).toBe(2);
    const entries = analyzer.readDataset(merged);
    expect(entries.length).toBe(2);
  });
});

describe('High-Level API', () => {
  test('analyzeTranscript extracts features', async () => {
    const { features } = await analyzer.analyzeTranscript(SAMPLE_TRANSCRIPT);

    expect(features.message_count).toBeGreaterThan(0);
    expect(features.websearch_count).toBeGreaterThan(0);
  });

  test('analyzeTranscript includes predictions when models provided', async () => {
    const dataset = analyzer.readDataset(SAMPLE_DATASET);
    const models = analyzer.trainAllModels(dataset);

    const { features, predictions } = await analyzer.analyzeTranscript(SAMPLE_TRANSCRIPT, models);

    expect(features).toBeDefined();
    expect(predictions).toBeDefined();
    expect(predictions.overall).toBeDefined();
  });

  test('generateReport creates summary', () => {
    const report = analyzer.generateReport(SAMPLE_DATASET);

    expect(report.datasetStats).toBeDefined();
    expect(report.datasetStats.count).toBe(5);
    expect(report.modelPerformance).toBeDefined();
    expect(Array.isArray(report.recommendations)).toBe(true);
  });
});

describe('Module Exports', () => {
  test('exports extraction functions', () => {
    expect(typeof analyzer.extractFeatures).toBe('function');
    expect(typeof analyzer.extractFeaturesFromEntries).toBe('function');
    expect(typeof analyzer.getNumericFeatureNames).toBe('function');
    expect(typeof analyzer.getBooleanFeatureNames).toBe('function');
  });

  test('exports correlation functions', () => {
    expect(typeof analyzer.mean).toBe('function');
    expect(typeof analyzer.standardDeviation).toBe('function');
    expect(typeof analyzer.pearsonCorrelation).toBe('function');
    expect(typeof analyzer.pointBiserialCorrelation).toBe('function');
    expect(typeof analyzer.correlate).toBe('function');
    expect(typeof analyzer.findCorrelations).toBe('function');
    expect(typeof analyzer.interpretCorrelation).toBe('function');
  });

  test('exports prediction functions', () => {
    expect(typeof analyzer.trainLinearRegression).toBe('function');
    expect(typeof analyzer.trainModel).toBe('function');
    expect(typeof analyzer.predict).toBe('function');
    expect(typeof analyzer.predictAll).toBe('function');
    expect(typeof analyzer.trainAllModels).toBe('function');
    expect(typeof analyzer.evaluateModel).toBe('function');
  });

  test('exports dataset functions', () => {
    expect(typeof analyzer.appendToDataset).toBe('function');
    expect(typeof analyzer.readDataset).toBe('function');
    expect(typeof analyzer.getDatasetStats).toBe('function');
    expect(typeof analyzer.filterDataset).toBe('function');
    expect(typeof analyzer.mergeDatasets).toBe('function');
    expect(typeof analyzer.splitDataset).toBe('function');
    expect(typeof analyzer.createDatasetEntry).toBe('function');
    expect(typeof analyzer.validateEntry).toBe('function');
  });

  test('exports high-level functions', () => {
    expect(typeof analyzer.analyzeTranscript).toBe('function');
    expect(typeof analyzer.generateReport).toBe('function');
    expect(typeof analyzer.generateRecommendations).toBe('function');
  });

  test('exports constants', () => {
    expect(analyzer.FEATURE_SCHEMA).toBeDefined();
    expect(analyzer.DETECTION_PATTERNS).toBeDefined();
  });
});
