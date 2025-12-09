# Terminal Pipeline Utilities

Test helpers and Mock Claude utilities for Terminal Pipeline E2E testing.

## Overview

This library provides:

1. **Mock Claude CLI** - Simulate Claude CLI without real API calls
2. **CLET Helpers** - Utilities for Command Line E2E Testing
3. **Test Setup** - Standard configuration for terminal app tests

## Installation

Copy these files to your terminal project's `tests/e2e/helpers/` directory:

```bash
cp lib/terminal-pipeline/*.ts your-project/tests/e2e/helpers/
cp lib/terminal-pipeline/mock-claude-bin.js your-project/bin/
```

Install dependencies:

```bash
npm install --save-dev vitest clet node-pty @types/node
```

## Quick Start

### 1. Configure Tests

Create `tests/e2e/setup.ts`:

```typescript
import { configureTests } from './helpers';

configureTests({
  fixturesDir: 'tests/e2e/fixtures',
  defaultFixture: 'basic.json',
  timeout: 30000,
});
```

Add to `vitest.config.ts`:

```typescript
export default {
  test: {
    setupFiles: ['./tests/e2e/setup.ts'],
  },
};
```

### 2. Create Fixtures

Create `tests/e2e/fixtures/basic.json`:

```json
{
  "output": [
    "[TODO] Starting task...",
    "[PROGRESS] {\"percent\": 50, \"message\": \"Working\"}",
    "[TODO] Task complete!"
  ],
  "finalState": {
    "exitCode": 0
  },
  "lineDelay": 50
}
```

### 3. Write Tests

```typescript
import { describe, it, beforeEach } from 'vitest';
import {
  createTestRunner,
  setupMockClaude,
  KEYS,
  navigation,
  patterns
} from './helpers';

describe('My CLI App', () => {
  beforeEach(() => {
    setupMockClaude('basic.json');
  });

  it('should navigate main menu', async () => {
    await createTestRunner()
      .wait('stdout', /Main Menu/)
      .stdin('stdout', /Menu/, navigation.down(2))
      .stdin('stdout', /Settings/, KEYS.ENTER)
      .wait('stdout', /Settings Screen/)
      .stdin('stdout', /Settings/, 'q')
      .wait('close', 0);
  });

  it('should show success message', async () => {
    await createTestRunner()
      .wait('stdout', /Main Menu/)
      .stdin('stdout', /Menu/, KEYS.ENTER)
      .wait('stdout', patterns.success('Task complete'))
      .wait('close', 0);
  });
});
```

## Mock Claude Usage

### In Your App Code

```typescript
// src/services/claude.ts
import { spawnClaude } from '../test-helpers/mock-claude';

export function runClaude(task: string) {
  // This automatically uses mock in test mode
  const child = spawnClaude(['--print', task]);

  child.stdout.on('data', (data) => {
    // Handle output
  });

  return child;
}
```

### Fixture Format

```typescript
interface MockClaudeFixture {
  output: (string | OutputObject)[];
  finalState: {
    exitCode: number;
    files?: Record<string, string>;
  };
  lineDelay?: number;  // ms between lines
}

type OutputObject =
  | { type: 'stdout' | 'stderr'; content: string; delay?: number }
  | { type: 'progress'; percent: number; message: string }
  | { type: 'todo'; action: 'add' | 'update' | 'complete'; content: string };
```

### Fixture Templates

```typescript
import { FIXTURE_TEMPLATES, writeMockFixture } from './helpers';

// Simple task
const simple = FIXTURE_TEMPLATES.simpleTask('Build project');

// Task with error
const error = FIXTURE_TEMPLATES.taskWithError('Build failed');

// Multi-step task with todos
const multiStep = FIXTURE_TEMPLATES.multiStepTask([
  'Analyze code',
  'Generate tests',
  'Run verification',
]);

// Write to file
writeMockFixture('tests/e2e/fixtures/build.json', simple);
```

## CLET Helpers

### Navigation

```typescript
import { navigation, KEYS } from './helpers';

// Navigate menu
.stdin('stdout', /Menu/, navigation.down(3))
.stdin('stdout', /Item/, navigation.select())

// Select specific index
.stdin('stdout', /Menu/, navigation.selectIndex(2))

// Go back
.stdin('stdout', /Screen/, navigation.back())

// Quit
.stdin('stdout', /Screen/, navigation.quit())
```

### Text Input

```typescript
import { textInput } from './helpers';

// Type text
.stdin('stdout', /Name:/, textInput.type('My Project'))

// Type and submit
.stdin('stdout', /Name:/, textInput.typeAndSubmit('My Project'))

// Clear and retype
.stdin('stdout', /Name:/, textInput.clear())
.stdin('stdout', /Name:/, 'New Name')
```

### Pattern Matching

```typescript
import { patterns } from './helpers';

// Menu items
.wait('stdout', patterns.menuItem('Settings'))
.wait('stdout', patterns.selectedItem('Settings'))

// Progress
.wait('stdout', patterns.progress(50))
.wait('stdout', patterns.progress())  // any progress

// Todos
.wait('stdout', patterns.todo('complete'))
.wait('stdout', patterns.todo())  // any todo update

// Results
.wait('stdout', patterns.success('Done'))
.wait('stdout', patterns.error('Failed'))

// Key hints
.wait('stdout', patterns.keyHint('q', 'Quit'))
```

### Wait Utilities

```typescript
import { waits } from './helpers';

.wait('stdout', waits.forReady())
.wait('stdout', waits.forScreen('Dashboard'))
.wait('stdout', waits.forLoadingComplete())
.wait('stdout', waits.forAny(/Success/, /Error/))
```

## Test Setup Utilities

### Temp Directories

```typescript
import { createTempDir } from './helpers';

const tempDir = createTempDir('my-test');
// Use tempDir for test artifacts
// Automatically cleaned up after tests
```

### File Assertions

```typescript
import {
  assertFileExists,
  assertFileContains,
  assertFileMatches,
  readJsonFile
} from './helpers';

assertFileExists('output.txt');
assertFileContains('output.txt', 'success');
assertFileMatches('output.txt', /completed in \d+ms/);

const config = readJsonFile<Config>('config.json');
```

### Custom Fixtures

```typescript
import { createTestFixture } from './helpers';

const fixturePath = createTestFixture('custom.json', {
  output: ['Custom output'],
  finalState: { exitCode: 0 },
});

setupMockClaude('custom.json');
```

## Extended Keys

```typescript
import { EXTENDED_KEYS } from './helpers';

// Function keys
.stdin('stdout', /Help/, EXTENDED_KEYS.F1)

// Control keys
.stdin('stdout', /Cancel/, EXTENDED_KEYS.CTRL_C)

// Page navigation
.stdin('stdout', /List/, EXTENDED_KEYS.PAGE_DOWN)
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `USE_MOCK_CLAUDE` | Set to `'true'` to use mock Claude |
| `MOCK_CLAUDE_FIXTURE` | Path to fixture file |
| `MOCK_DELAY_MULTIPLIER` | Multiply all mock delays |
| `MOCK_INSTANT` | Set to `'true'` to skip delays |
| `TEST_DEBUG` | Set to `'true'` for debug logs |

## Best Practices

1. **Always use Mock Claude** - Never call real Claude API in tests
2. **Keep fixtures minimal** - Only include output needed for test
3. **Use pattern helpers** - More robust than exact string matching
4. **Test keyboard thoroughly** - Terminal apps are keyboard-driven
5. **Add timeouts** - Use `.wait('stdout', /pattern/, 5000)` for slow operations
6. **Clean up artifacts** - Use `createTempDir()` for automatic cleanup

## Troubleshooting

### Tests Timeout

- Increase wait timeout: `.wait('stdout', /pattern/, 10000)`
- Check Mock Claude fixture exists
- Verify app builds correctly: `npm run build`

### Keyboard Not Working

- Check `useInput` is properly set up in component
- Verify component is mounted and receiving focus
- Add debug logging to keyboard handler

### Output Not Matching

- Use `patterns` helpers instead of exact strings
- Check for color codes (disable with `FORCE_COLOR=0`)
- Add `.wait('stdout', /./)` to see actual output

### Mock Claude Errors

- Verify fixture file exists and is valid JSON
- Check `MOCK_CLAUDE_FIXTURE` path is absolute
- Ensure `USE_MOCK_CLAUDE=true` is set
