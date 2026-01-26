# Testing Patterns

**Analysis Date:** 2026-01-26

## Test Framework

**Runner:**
- Jest 29.7.0
- Config: `package.json` with `"jest"` section
- Environment: Node.js (`testEnvironment: "node"`)
- Verbose output enabled

**Assertion Library:**
- Jest built-in matchers (no external assertion library)
- Matchers used: `expect().toBe()`, `expect().toHaveBeenCalledTimes()`, `expect().toThrow()`, `expect().toBeCloseTo()`

**Run Commands:**
```bash
npm test              # Run all tests once
npm run test:watch   # Watch mode for development
npm run test:coverage # Generate coverage report
```

## Test File Organization

**Location:**
- Co-located with source code in `__tests__` subdirectories
- Pattern: `<module>/__tests__/<module>.test.cjs`

**Examples:**
- `lib/orchestrator/__tests__/orchestrator.test.cjs` - tests for orchestrator module
- `lib/analyzer/__tests__/analyzer.test.cjs` - tests for analyzer module
- `lib/composer/__tests__/composer.test.cjs` - tests for composer module
- `lib/manifest/__tests__/manifest.test.cjs` - tests for manifest module
- `lib/dashboard/__tests__/dashboard.test.cjs` - tests for dashboard module

**Naming:**
- Test files: `<moduleName>.test.cjs`
- Fixtures directory: `fixtures/` subdirectory in `__tests__/`
- Fixture files: Named descriptively, e.g., `sample-transcript.jsonl`, `sample-dataset.jsonl`

**Jest Configuration in package.json:**
```json
"jest": {
  "testEnvironment": "node",
  "testMatch": ["**/__tests__/**/*.test.cjs"],
  "verbose": true
}
```

## Test Structure

**Suite Organization:**
```javascript
describe('Feature Name', () => {
  describe('Sub-feature', () => {
    test('should behave correctly', () => {
      // Arrange
      const input = ...;

      // Act
      const result = ...;

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

**Patterns from codebase:**
```javascript
// From lib/orchestrator/__tests__/orchestrator.test.cjs
describe('Events', () => {
  describe('EVENTS constants', () => {
    test('should define all required events', () => {
      expect(EVENTS.START).toBe('START');
      expect(EVENTS.SHUTDOWN).toBe('SHUTDOWN');
      // ... more assertions
    });
  });

  describe('EventEmitter', () => {
    let emitter;

    beforeEach(() => {
      emitter = new EventEmitter();
    });

    test('should emit and receive events', () => {
      const handler = jest.fn();
      emitter.on(EVENTS.START, handler);
      emitter.emit(EVENTS.START, { data: 'value' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENTS.START,
          payload: { data: 'value' }
        })
      );
    });
  });
});
```

**Setup/Teardown:**
- `beforeEach()` for test isolation
- `afterEach()` rarely used (not observed in current tests)
- Local variable setup in `beforeEach()`: `let emitter; ... emitter = new EventEmitter();`

**Assertion Patterns:**
```javascript
// Type checks
expect(Array.isArray(templates)).toBe(true);
expect(typeof content).toBe('string');

// Equality
expect(result).toBe('expected');
expect(features.websearch_count).toBeGreaterThan(0);

// Object containment
expect(handler).toHaveBeenCalledWith(
  expect.objectContaining({
    type: EVENTS.START,
    payload: { data: 'value' }
  })
);

// Numeric approximation
expect(std).toBeCloseTo(2, 0);
expect(perfect.r).toBeCloseTo(1, 5);

// Error testing
expect(() => composer.loadTemplate('nonexistent')).toThrow('Template not found');

// Function call tracking
const handler = jest.fn();
expect(handler).toHaveBeenCalledTimes(1);
expect(handler).not.toHaveBeenCalled();
```

## Mocking

**Framework:** Jest mocking with `jest.fn()`

**Patterns:**
```javascript
// Mock function for call tracking
const handler = jest.fn();
emitter.on(EVENTS.START, handler);
emitter.emit(EVENTS.START, { data: 'value' });
expect(handler).toHaveBeenCalledTimes(1);

// Spy on method calls
const spy = jest.spyOn(object, 'method');
expect(spy).toHaveBeenCalledWith(arg);

// Note: jest.mock() for module mocking not observed in current codebase
```

**What to Mock:**
- Test handlers/callbacks that need call verification: `jest.fn()`
- Non-deterministic operations (if any): time, randomness
- External systems ONLY in integration test boundaries (not in unit tests)

**What NOT to Mock:**
- Internal business logic - test real implementations
- File system operations when testing I/O code - use real fixtures
- Event emission/listening - test actual EventEmitter behavior
- State machine transitions - test real STATES and TRANSITIONS

## Fixtures and Factories

**Test Data:**
```javascript
// From lib/analyzer/__tests__/analyzer.test.cjs
const entries = [
  { role: 'user', content: 'hello' },
  { role: 'assistant', content: 'Using WebSearch now' },
  { role: 'assistant', content: 'Found jest.mock in code' }
];

const features = analyzer.extractFeaturesFromEntries(entries);
expect(features.message_count).toBe(3);

// Numeric arrays for statistical tests
const perfect = analyzer.pearsonCorrelation([1, 2, 3], [1, 2, 3]);
expect(perfect.r).toBeCloseTo(1, 5);
```

**Location:**
- `lib/analyzer/__tests__/fixtures/` - contains fixture files
- Fixture files: `sample-transcript.jsonl`, `sample-dataset.jsonl`
- Inline test data: Used directly in test functions for simple cases

**Pattern:**
```javascript
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const SAMPLE_TRANSCRIPT = path.join(FIXTURES_DIR, 'sample-transcript.jsonl');

test('extractFeatures extracts from transcript file', async () => {
  const features = await analyzer.extractFeatures(SAMPLE_TRANSCRIPT);
  expect(features.websearch_count).toBeGreaterThan(0);
});
```

## Coverage

**Requirements:** Not explicitly enforced (coverage check not in package.json scripts)

**View Coverage:**
```bash
npm run test:coverage
```

Creates coverage report for all test files in `__tests__/`.

## Test Types

**Unit Tests:**
- Scope: Individual functions, classes, modules
- Approach: Test public API, verify behavior with various inputs
- Examples: `EventEmitter.on()`, `EventEmitter.emit()`, `parseTodos()`, `compose()`
- Characteristics: Fast, isolated, no external dependencies

**Integration Tests:**
- Scope: Module interactions, handler chains
- Approach: Test components working together
- Examples: `StateMachine` with `EventEmitter`, error patterns with recovery
- Characteristics: Slower, real module behavior, fixture files may be involved

**E2E Tests:**
- Not found in current codebase
- Pipeline uses orchestrator runner and actual worker processes instead

## Common Patterns

**Async Testing:**
```javascript
test('should wait for event with waitFor', async () => {
  const promise = emitter.waitFor(EVENTS.WORKER_READY, 1000);

  setTimeout(() => {
    emitter.emit(EVENTS.WORKER_READY, { value: 42 });
  }, 10);

  const event = await promise;
  expect(event.payload.value).toBe(42);
});

test('should timeout on waitFor', async () => {
  await expect(emitter.waitFor(EVENTS.WORKER_READY, 50)).rejects.toThrow('Timeout');
});
```

**Error Testing:**
```javascript
test('loadTemplate throws for non-existent template', () => {
  expect(() => composer.loadTemplate('nonexistent')).toThrow('Template not found');
});
```

**Callback Tracking:**
```javascript
test('should handle multiple listeners', () => {
  const handler1 = jest.fn();
  const handler2 = jest.fn();

  emitter.on(EVENTS.HEARTBEAT, handler1);
  emitter.on(EVENTS.HEARTBEAT, handler2);
  emitter.emit(EVENTS.HEARTBEAT);

  expect(handler1).toHaveBeenCalledTimes(1);
  expect(handler2).toHaveBeenCalledTimes(1);
});
```

**Wildcard Listeners:**
```javascript
test('should support wildcard listener', () => {
  const handler = jest.fn();
  emitter.on('*', handler);

  emitter.emit(EVENTS.START);
  emitter.emit(EVENTS.SHUTDOWN);

  expect(handler).toHaveBeenCalledTimes(2);
});
```

**Once Listeners:**
```javascript
test('should support once listeners', () => {
  const handler = jest.fn();
  emitter.once(EVENTS.PHASE_COMPLETE, handler);

  emitter.emit(EVENTS.PHASE_COMPLETE);
  emitter.emit(EVENTS.PHASE_COMPLETE);

  expect(handler).toHaveBeenCalledTimes(1);
});
```

**Feature Extraction Testing:**
```javascript
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
```

**Statistical Testing:**
```javascript
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
```

## Test Organization by Module

**Orchestrator Tests:** `lib/orchestrator/__tests__/orchestrator.test.cjs`
- EventEmitter functionality (emit, on, off, once, wildcard, waitFor)
- StateMachine state transitions
- Worker monitoring
- Error handling and recovery
- Startup, phase transition, shutdown handlers
- Constants and enums

**Analyzer Tests:** `lib/analyzer/__tests__/analyzer.test.cjs`
- Feature extraction from transcripts
- Correlation analysis (mean, std dev, Pearson, point-biserial)
- Dataset operations (read, write, filter, merge)
- Prediction and scoring

**Composer Tests:** `lib/composer/__tests__/composer.test.cjs`
- Template loading
- Context injection and placeholder replacement
- Template composition for each phase
- Unreplaced placeholder detection

**Manifest Tests:** `lib/manifest/__tests__/manifest.test.cjs`
- Schema validation
- Manifest creation and updates
- Phase tracking
- Migrations

**Dashboard Tests:** `lib/dashboard/__tests__/dashboard.test.cjs`
- Layout rendering
- Input handling
- State updates

---

*Testing analysis: 2026-01-26*
