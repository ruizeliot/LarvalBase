# Coding Conventions

**Analysis Date:** 2026-01-26

## Naming Patterns

**Files:**
- CommonJS modules: `*.cjs` extension (e.g., `runner.cjs`, `events.cjs`)
- Modules in directories: `index.cjs` serves as public API entry point
- Test files: `*.test.cjs` co-located in `__tests__` subdirectory (e.g., `lib/orchestrator/__tests__/orchestrator.test.cjs`)
- Configuration files: snake-case (e.g., `package.json`, `manifest.json`)
- Scripts: dash-case with version (e.g., `dashboard-runner-v11.cjs`, `dashboard-v3.cjs`)

**Functions:**
- Camel case: `functionName()`, `getProcessStatus()`, `restartWorker()`, `executePowerShell()`
- Async functions: Prefix with `async`, named naturally: `async function readDatasetStreaming(path)`
- Boolean predicates: `is` prefix: `isProcessRunning()`, `isWorkerAlive()`, `exists()`
- Factory/creator functions: `create` prefix: `createOrchestrator()`, `createPhaseEntry()`

**Variables:**
- Camel case: `const manifest = ...`, `let currentPhase = null`, `const errorContext = new ErrorContext()`
- Constants: ALL_CAPS with underscores: `ERROR_SEVERITY`, `STATES`, `VALID_PHASES`, `DEFAULT_CONFIG`
- Enums/lookup objects: ALL_CAPS: `EVENTS`, `TRANSITIONS`, `STATES`, `DASHBOARD_SCRIPTS`, `ERROR_PATTERNS`

**Classes:**
- Pascal case: `class OrchestratorRunner`, `class ErrorContext`, `class StateMachine`, `class EventEmitter`, `class EventHistory`, `class WorkerMonitor`

**Types/Interfaces:**
- Constants for type values: ALL_CAPS (e.g., `STATES.INIT`, `EVENTS.START`)
- Object shape descriptors in comments show structure (e.g., `{ pid, role, running }`)

## Code Style

**Formatting:**
- No explicit formatter configured (eslint not found)
- Consistent 2-space indentation throughout
- Single quotes for strings: `'use strict';`, `const x = 'value'`
- Semicolons at statement ends
- Spaces around operators: `result = x + y`, `if (condition) {`

**Linting:**
- No ESLint config detected
- Jest configured with testEnvironment: 'node' and verbose: true

**Module Headers:**
```javascript
/**
 * Module Name
 *
 * Brief description of what this module does.
 * Additional context about role/purpose.
 *
 * @module lib/path/to/module
 * @version 11.0.0
 */

'use strict';
```

**JSDoc Pattern:**
```javascript
/**
 * Function description
 * @param {type} paramName - Description
 * @returns {type} Return description
 */
function functionName(paramName) { ... }
```

## Import Organization

**Order:**
1. Built-in Node modules: `const fs = require('fs');`, `const path = require('path');`
2. Core project modules (relative paths): `const manifest = require('../manifest/index.cjs');`
3. Submodule imports from same package: `const { events } = require('./handlers/events.cjs');`
4. Constants and setup

**Path Aliases:**
- No aliases configured
- Explicit relative paths used throughout: `require('../manifest/index.cjs')`, `require('./spawn.cjs')`
- `__dirname` used for script-relative paths: `path.join(__dirname, 'scriptname.cjs')`

**Module.exports Pattern:**
```javascript
// Named exports in object form
module.exports = {
  constant1,
  constant2,
  function1,
  function2
};

// At bottom of file only
```

**Module Imports:**
```javascript
const {
  CONSTANT_A,
  CONSTANT_B,
  functionA,
  functionB
} = require('./module.cjs');
```

## Error Handling

**Patterns:**
- Try-catch blocks with explicit error classification:
```javascript
try {
  execSync(`taskkill /PID ${pid} /T /F`, { windowsHide: true, stdio: 'pipe' });
  return true;
} catch (err) {
  // Process may already be dead - that's OK
  return false;
}
```

- Error context objects: `const errorContext = new ErrorContext();`
- Error patterns matched with regex: `pattern: /ENOENT|no such file/i`
- Severity levels: `ERROR_SEVERITY.INFO`, `RECOVERABLE`, `WARNING`, `FATAL`
- Recovery strategies: `RECOVERY_STRATEGIES.RETRY`, `WAIT_AND_RETRY`, `RESTART_WORKER`

**Validation Pattern:**
```javascript
function validate(manifest) {
  if (!VALID_PHASES.includes(phase)) {
    throw new Error(`Invalid phase: ${phase}`);
  }
  // ... more validation
}
```

## Logging

**Framework:** `console` (Node.js native) - no dedicated logging library

**Patterns:**
- Event-based logging via event emitter: `this.emitter.on('*', (event) => { ... })`
- Console output in dashboard: structured text formatting
- No debug logs in production code observed
- Error logging via event: `emitter.emit(EVENTS.ERROR, errorData)`

## Comments

**When to Comment:**
- JSDoc block comments for all exported functions (required)
- Inline comments for non-obvious logic
- Section comments: `// ============ CONFIGURATION ============`
- Recovery/fallback explanations: `// Process may already be dead - that's OK`

**JSDoc/TSDoc:**
- Full documentation for all functions: `@param`, `@returns`, `@module`, `@version`
- Parameter types always included: `@param {string}`, `@param {Object}`
- Return types always included: `@returns {boolean}`, `@returns {Promise<Object>}`

## Function Design

**Size:** Functions typically 20-50 lines; orchestrator runner can exceed 100 lines for state coordination

**Parameters:**
- Explicit parameters preferred over implicit context
- Options object pattern for optional settings: `function name(required, options = {})`
- Spread default config: `this.config = { ...DEFAULT_CONFIG, ...options };`

**Return Values:**
- Boolean for success/failure checks: `isProcessRunning()`, `killProcess()`
- Objects for data results: `getProcessStatus()` returns status object with typed properties
- Promises for async operations: `async function restartWorker(...) { return { pid: ... } }`
- Objects with clear shape: `{ stdout: string, stderr: string, code: number }`

## Module Design

**Exports:**
- Public API module (`index.cjs`) re-exports internal submodules
- All submodule functions exposed at public API level
- Example from `lib/process/index.cjs`: groups exports by category (Constants, PID Management, Spawning, Killing, Message Injection, High-level operations)

**Barrel Files:**
- Index.cjs pattern used throughout for module organization
- `lib/orchestrator/index.cjs` groups all orchestrator components
- `lib/manifest/index.cjs` groups all manifest operations
- Enables clean imports: `const { constant } = require('../module')`

**Module Grouping Pattern:**
```javascript
// Import submodules
const submodule1 = require('./submodule1.cjs');
const submodule2 = require('./submodule2.cjs');

// Import from submodule1
const { item1, item2 } = require('./submodule1.cjs');

// Export grouped by category
module.exports = {
  // Category 1
  item1,
  item2,

  // Category 2
  item3,
  item4
};
```

## Constants and Configuration

**Configuration Objects:**
```javascript
const DEFAULT_CONFIG = {
  heartbeatIntervalMs: 30000,
  todoCheckIntervalMs: 10000,
  autoTransition: true,
  dashboardEnabled: true
};
```

**Enum Objects:**
```javascript
const STATES = {
  INIT: 'INIT',
  VALIDATING: 'VALIDATING',
  MONITORING: 'MONITORING'
};

const TRANSITIONS = {
  [STATES.INIT]: {
    [EVENTS.START]: STATES.VALIDATING
  }
};
```

**Constant Arrays:**
```javascript
const VALID_PHASES = ['1', '2', '3', '4', '5'];
const VALID_STACKS = ['desktop', 'unity', 'android'];
```

## Special Patterns

**State Machine Pattern:**
- `STATES` object with all possible states
- `TRANSITIONS` object mapping `[currentState][event]` to `nextState`
- StateMachine class with `current()`, `can()`, `transition()` methods
- Callbacks on transition: `onTransition: (transition) => {}`

**Event Emitter Pattern:**
- `EventEmitter` class with `on()`, `off()`, `emit()`, `once()`, `waitFor()` methods
- Wildcard listener support: `emitter.on('*', handler)`
- Event objects: `{ type, timestamp, payload }`
- EventHistory tracks all events: `this.eventHistory.add(event)`

**Feature Extraction Pattern:**
- Named boolean features: `mocking_detected`, `placeholder_detected`, `test_cheating_detected`
- Named numeric features: `websearch_count`, `message_count`, `error_retry_count`, `tool_call_count`, `total_duration`
- Feature names retrieved via `getNumericFeatureNames()`, `getBooleanFeatureNames()`

---

*Convention analysis: 2026-01-26*
