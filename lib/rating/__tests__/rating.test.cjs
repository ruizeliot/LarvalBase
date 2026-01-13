/**
 * Rating Collector Tests
 *
 * Tests for schema validation, persistence, and rating operations.
 * Note: Interactive prompt tests are skipped (require TTY).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const rating = require('../index.cjs');

describe('Rating Schema', () => {
  test('RATING_CATEGORIES has expected categories', () => {
    const names = rating.getCategoryNames();

    expect(names).toContain('overall');
    expect(names).toContain('ui_design');
    expect(names).toContain('navigation');
    expect(names).toContain('performance');
    expect(names).toContain('code_quality');
    expect(names).toContain('test_coverage');
    expect(names).toContain('functionality');
  });

  test('LIKERT_SCALE has 5 levels', () => {
    expect(rating.LIKERT_SCALE).toHaveLength(5);
    expect(rating.LIKERT_SCALE[0].value).toBe(1);
    expect(rating.LIKERT_SCALE[4].value).toBe(5);
  });

  test('createEmptyRating creates empty object', () => {
    const empty = rating.createEmptyRating();

    expect(empty.timestamp).toBeNull();
    expect(empty.project).toBeNull();
    expect(empty.overall).toBeNull();
    expect(empty.comments).toBeNull();
  });

  test('createDefaultRating creates with defaults', () => {
    const defaultRating = rating.createDefaultRating('test-project');

    expect(defaultRating.project).toBe('test-project');
    expect(defaultRating.timestamp).toBeDefined();
    expect(defaultRating.overall).toBe(3);
    expect(defaultRating.ui_design).toBe(3);
  });

  test('validateRatingValue accepts valid values', () => {
    expect(rating.validateRatingValue(1).valid).toBe(true);
    expect(rating.validateRatingValue(3).valid).toBe(true);
    expect(rating.validateRatingValue(5).valid).toBe(true);
  });

  test('validateRatingValue rejects invalid values', () => {
    expect(rating.validateRatingValue(0).valid).toBe(false);
    expect(rating.validateRatingValue(6).valid).toBe(false);
    expect(rating.validateRatingValue(null).valid).toBe(false);
    expect(rating.validateRatingValue('3').valid).toBe(false);
    expect(rating.validateRatingValue(3.5).valid).toBe(false);
  });

  test('validateRating validates complete rating', () => {
    const validRating = {
      timestamp: '2025-01-01T00:00:00Z',
      project: 'test',
      overall: 4,
      ui_design: 4,
      navigation: 4,
      performance: 4,
      code_quality: 4,
      test_coverage: 4,
      functionality: 4,
      comments: 'Great!'
    };

    const result = rating.validateRating(validRating);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('validateRating catches missing fields', () => {
    const invalidRating = {
      overall: 4
    };

    const result = rating.validateRating(invalidRating);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing timestamp');
    expect(result.errors).toContain('Missing project name');
  });

  test('validateRating catches invalid values', () => {
    const invalidRating = {
      timestamp: '2025-01-01T00:00:00Z',
      project: 'test',
      overall: 10
    };

    const result = rating.validateRating(invalidRating);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('between 1 and 5'))).toBe(true);
  });

  test('calculateAverageRating computes average', () => {
    const testRating = {
      overall: 4,
      ui_design: 5,
      navigation: 3,
      performance: 4,
      code_quality: 4,
      test_coverage: 4,
      functionality: 4
    };

    const avg = rating.calculateAverageRating(testRating);
    expect(avg).toBeCloseTo(4, 1);
  });

  test('interpretRating returns correct interpretation', () => {
    expect(rating.interpretRating(4.7)).toBe('Excellent');
    expect(rating.interpretRating(4.0)).toBe('Good');
    expect(rating.interpretRating(3.0)).toBe('Average');
    expect(rating.interpretRating(2.0)).toBe('Poor');
    expect(rating.interpretRating(1.0)).toBe('Very Poor');
  });

  test('getCategoryByName returns category object', () => {
    const overall = rating.getCategoryByName('overall');
    expect(overall).toBeDefined();
    expect(overall.label).toBe('Overall Satisfaction');

    const nonExistent = rating.getCategoryByName('fake');
    expect(nonExistent).toBeNull();
  });

  test('toDisplayFormat creates display object', () => {
    const testRating = rating.createDefaultRating('test');
    const display = rating.toDisplayFormat(testRating);

    expect(display.project).toBe('test');
    expect(display.average).toBe(3);
    expect(display.interpretation).toBe('Average');
    expect(display.categories).toHaveLength(7);
    expect(display.categories[0].displayValue).toBe('Average');
  });
});

describe('Prompt Functions', () => {
  test('formatScale returns formatted string', () => {
    const scale = rating.formatScale();

    expect(scale).toContain('1 = Very Poor');
    expect(scale).toContain('5 = Excellent');
  });

  test('buildRatingFromAnswers creates rating from object', () => {
    const answers = {
      overall: 4,
      ui_design: 5,
      comments: 'Test comment'
    };

    const result = rating.buildRatingFromAnswers('test-project', answers);

    expect(result.project).toBe('test-project');
    expect(result.overall).toBe(4);
    expect(result.ui_design).toBe(5);
    expect(result.comments).toBe('Test comment');
    expect(result.timestamp).toBeDefined();
  });
});

describe('Rating Persistence', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rating-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('saveRating saves to file', () => {
    const testRating = rating.createDefaultRating('test-project');

    const result = rating.saveRating(tempDir, testRating);

    expect(result.success).toBe(true);
    expect(result.path).toBeDefined();
    expect(fs.existsSync(result.path)).toBe(true);
  });

  test('saveRating rejects invalid ratings', () => {
    const invalidRating = { overall: 10 };

    const result = rating.saveRating(tempDir, invalidRating);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('saveRating with validate=false skips validation', () => {
    const invalidRating = { overall: 10 };

    const result = rating.saveRating(tempDir, invalidRating, { validate: false });

    expect(result.success).toBe(true);
  });

  test('loadRatings returns saved ratings', () => {
    const rating1 = rating.createDefaultRating('project-1');
    const rating2 = rating.createDefaultRating('project-2');

    rating.saveRating(tempDir, rating1);
    rating.saveRating(tempDir, rating2);

    const loaded = rating.loadRatings(tempDir);

    expect(loaded).toHaveLength(2);
    expect(loaded[0].project).toBe('project-1');
    expect(loaded[1].project).toBe('project-2');
  });

  test('loadRatings returns empty array for non-existent file', () => {
    const loaded = rating.loadRatings(tempDir);
    expect(loaded).toEqual([]);
  });

  test('getLatestRating returns most recent', () => {
    const rating1 = {
      ...rating.createDefaultRating('project'),
      timestamp: '2025-01-01T00:00:00Z'
    };
    const rating2 = {
      ...rating.createDefaultRating('project'),
      timestamp: '2025-01-02T00:00:00Z'
    };

    rating.saveRating(tempDir, rating1);
    rating.saveRating(tempDir, rating2);

    const latest = rating.getLatestRating(tempDir);

    expect(latest.timestamp).toBe('2025-01-02T00:00:00Z');
  });

  test('getLatestRating filters by project name', () => {
    const rating1 = {
      ...rating.createDefaultRating('project-a'),
      timestamp: '2025-01-02T00:00:00Z'
    };
    const rating2 = {
      ...rating.createDefaultRating('project-b'),
      timestamp: '2025-01-01T00:00:00Z'
    };

    rating.saveRating(tempDir, rating1);
    rating.saveRating(tempDir, rating2);

    const latest = rating.getLatestRating(tempDir, 'project-b');

    expect(latest.project).toBe('project-b');
  });

  test('getRatingStats calculates statistics', () => {
    const rating1 = { ...rating.createDefaultRating('project-1'), overall: 4 };
    const rating2 = { ...rating.createDefaultRating('project-2'), overall: 5 };

    rating.saveRating(tempDir, rating1);
    rating.saveRating(tempDir, rating2);

    const stats = rating.getRatingStats(tempDir);

    expect(stats.count).toBe(2);
    expect(stats.projects).toContain('project-1');
    expect(stats.projects).toContain('project-2');
    expect(stats.averages.overall).toBe(4.5);
  });

  test('exportToCsv creates CSV file', () => {
    const testRating = rating.createDefaultRating('test');
    rating.saveRating(tempDir, testRating);

    const csvPath = path.join(tempDir, 'export.csv');
    const result = rating.exportToCsv(tempDir, csvPath);

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    expect(fs.existsSync(csvPath)).toBe(true);

    const csvContent = fs.readFileSync(csvPath, 'utf8');
    expect(csvContent).toContain('timestamp');
    expect(csvContent).toContain('project');
  });

  test('clearRatings removes ratings file', () => {
    rating.saveRating(tempDir, rating.createDefaultRating('test'));
    expect(rating.ratingsExist(tempDir)).toBe(true);

    const result = rating.clearRatings(tempDir);

    expect(result).toBe(true);
    expect(rating.ratingsExist(tempDir)).toBe(false);
  });

  test('ratingsExist checks file existence', () => {
    expect(rating.ratingsExist(tempDir)).toBe(false);

    rating.saveRating(tempDir, rating.createDefaultRating('test'));

    expect(rating.ratingsExist(tempDir)).toBe(true);
  });
});

describe('High-Level Functions', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rating-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('generateRatingReport creates report', () => {
    const testRating = {
      ...rating.createDefaultRating('test-project'),
      overall: 4
    };
    rating.saveRating(tempDir, testRating);

    const report = rating.generateRatingReport(tempDir);

    expect(report.totalRatings).toBe(1);
    expect(report.projects).toContain('test-project');
    expect(report.overallAverage).toBe(4);
    expect(report.interpretation).toBe('Good');
    expect(report.latestRating).toBeDefined();
  });

  test('generateRatingReport handles empty dataset', () => {
    const report = rating.generateRatingReport(tempDir);

    expect(report.totalRatings).toBe(0);
    expect(report.projects).toEqual([]);
    expect(report.latestRating).toBeNull();
  });
});

describe('Module Exports', () => {
  test('exports schema functions', () => {
    expect(typeof rating.createEmptyRating).toBe('function');
    expect(typeof rating.createDefaultRating).toBe('function');
    expect(typeof rating.validateRating).toBe('function');
    expect(typeof rating.calculateAverageRating).toBe('function');
    expect(typeof rating.interpretRating).toBe('function');
    expect(typeof rating.toDisplayFormat).toBe('function');
  });

  test('exports prompt functions', () => {
    expect(typeof rating.createInterface).toBe('function');
    expect(typeof rating.prompt).toBe('function');
    expect(typeof rating.formatScale).toBe('function');
    expect(typeof rating.buildRatingFromAnswers).toBe('function');
    expect(typeof rating.displayRatingSummary).toBe('function');
  });

  test('exports persistence functions', () => {
    expect(typeof rating.saveRating).toBe('function');
    expect(typeof rating.loadRatings).toBe('function');
    expect(typeof rating.getLatestRating).toBe('function');
    expect(typeof rating.getRatingStats).toBe('function');
    expect(typeof rating.exportToCsv).toBe('function');
    expect(typeof rating.clearRatings).toBe('function');
  });

  test('exports high-level functions', () => {
    expect(typeof rating.collectAndSaveRatings).toBe('function');
    expect(typeof rating.generateRatingReport).toBe('function');
  });

  test('exports constants', () => {
    expect(rating.RATING_CATEGORIES).toBeDefined();
    expect(rating.LIKERT_SCALE).toBeDefined();
    expect(rating.DEFAULT_RATINGS_FILE).toBe('.pipeline/ratings.jsonl');
  });
});
