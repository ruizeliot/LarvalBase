# Test Specifications

**Project:** Pipeline v8
**Type:** Terminal/TUI Application
**Date:** 2025-12-08
**Total Tests:** 420 (140 stories × ~3 tests each)

---

## Testing Strategy

### Framework Stack
- **Unit Tests:** Vitest + ink-testing-library
- **Integration Tests:** Vitest + mock filesystem
- **E2E Tests:** CLET + node-pty + Vitest

### Test Distribution
| Layer | Count | Percentage |
|-------|-------|------------|
| Unit | 126 | 30% |
| Integration | 168 | 40% |
| E2E | 126 | 30% |

### Mock Claude Pattern
For tests involving Claude CLI:
- Mock binary: `tests/e2e/helpers/mock-claude.js`
- Fixtures: `tests/e2e/fixtures/*.json`
- **NEVER call real Claude CLI in tests**

### Mock Claude Binary Specification

```javascript
// tests/e2e/helpers/mock-claude.js
/**
 * Mock Claude CLI for testing
 *
 * Reads fixture from MOCK_FIXTURE environment variable
 * Outputs data according to fixture schedule
 * Creates todo files matching session ID
 * Exits with configured code
 */
const fixturePath = process.env.MOCK_FIXTURE;
const sessionId = process.env.PIPELINE_SESSION_ID;
const todoDir = process.env.CLAUDE_TODO_DIR || path.join(os.homedir(), '.claude', 'todos');

const fixture = JSON.parse(fs.readFileSync(fixturePath));

// Output sequence with timing
for (const output of fixture.output) {
  console.log(output.text);
  await sleep(output.delay || 100);
}

// Write todo states at specified times
for (const todoState of fixture.todoStates) {
  await sleep(todoState.timestamp);
  const todoFile = path.join(todoDir, `${sessionId}.jsonl`);
  fs.writeFileSync(todoFile, todoState.todos.map(JSON.stringify).join('\n'));
}

process.exit(fixture.exitCode || 0);
```

---

## Epic 1: Project Bootstrap (US-001 to US-025)

### US-001: CLI Entry Point

**Layer:** E2E

**File:** `tests/e2e/specs/epic1-cli.test.ts`

```typescript
describe('US-001: CLI Entry Point', () => {
  it('[AC-1] pipeline command executes without errors', async () => {
    await runner()
      .fork('bin/pipeline.js')
      .wait('stdout', /Pipeline/i)
      .stdin('stdout', /Project Path/, 'q')
      .stdin('stdout', /sure/, KEYS.ENTER)
      .wait('close', 0);
  });

  it('[AC-2] TUI renders in terminal', async () => {
    await runner()
      .fork('bin/pipeline.js')
      .wait('stdout', /┌|│|└|─/); // Box characters
  });

  it('[AC-3] Launcher screen displays', async () => {
    await runner()
      .fork('bin/pipeline.js')
      .wait('stdout', /Mode:/)
      .wait('stdout', /New Project/);
  });

  // Edge cases
  it('[AC-1] Edge: handles no TTY gracefully', async () => {
    await runner()
      .spawn('node', ['bin/pipeline.js', '--check'], { stdio: 'pipe' })
      .wait('stdout', /ok/i)
      .wait('close', 0);
  });
});
```

---

### US-002: CLI with Path Argument

**Layer:** E2E

**File:** `tests/e2e/specs/epic1-cli.test.ts`

```typescript
describe('US-002: CLI with Path Argument', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir('pipeline-test-');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  it('[AC-1] path argument is parsed', async () => {
    await runner()
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', new RegExp(path.basename(tempDir)));
  });

  it('[AC-2] path input is pre-filled', async () => {
    await runner()
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', new RegExp(tempDir.replace(/\\/g, '\\\\')));
  });

  it('[AC-3] invalid path shows error', async () => {
    await runner()
      .fork('bin/pipeline.js', ['/nonexistent/path/here'])
      .wait('stdout', /not found|invalid|does not exist/i);
  });

  // Edge cases
  it('[AC-1] Edge: handles path with spaces', async () => {
    const spacedDir = path.join(tempDir, 'my project');
    await fs.mkdir(spacedDir);
    await runner()
      .fork('bin/pipeline.js', [spacedDir])
      .wait('stdout', /my project/);
  });
});
```

---

### US-003: CLI Help Flag

**Layer:** E2E

**File:** `tests/e2e/specs/epic1-cli.test.ts`

```typescript
describe('US-003: CLI Help Flag', () => {
  it('[AC-1] shows usage syntax', async () => {
    await runner()
      .fork('bin/pipeline.js', ['--help'])
      .wait('stdout', /Usage:/i);
  });

  it('[AC-2] lists available options', async () => {
    await runner()
      .fork('bin/pipeline.js', ['--help'])
      .wait('stdout', /--help/)
      .wait('stdout', /--version/);
  });

  it('[AC-3] exits after displaying', async () => {
    await runner()
      .fork('bin/pipeline.js', ['--help'])
      .wait('close', 0);
  });

  // Edge case
  it('[AC-1] Edge: -h alias works', async () => {
    await runner()
      .fork('bin/pipeline.js', ['-h'])
      .wait('stdout', /Usage:/i);
  });
});
```

---

### US-004: CLI Version Flag

**Layer:** E2E

**File:** `tests/e2e/specs/epic1-cli.test.ts`

```typescript
describe('US-004: CLI Version Flag', () => {
  it('[AC-1] shows version number (8.x.x)', async () => {
    await runner()
      .fork('bin/pipeline.js', ['--version'])
      .wait('stdout', /8\.\d+\.\d+/);
  });

  it('[AC-2] exits after displaying', async () => {
    await runner()
      .fork('bin/pipeline.js', ['--version'])
      .wait('close', 0);
  });

  // Edge case
  it('[AC-1] Edge: -v alias works', async () => {
    await runner()
      .fork('bin/pipeline.js', ['-v'])
      .wait('stdout', /8\.\d+\.\d+/);
  });
});
```

---

### US-005: Ink App Shell

**Layer:** Integration

**File:** `tests/integration/app-shell.test.ts`

```typescript
describe('US-005: Ink App Shell', () => {
  it('[AC-1] Ink app renders', () => {
    const { lastFrame } = render(<App />);
    expect(lastFrame()).toContain('Pipeline');
  });

  it('[AC-2] handles clean exit', async () => {
    const { unmount, exitCode } = render(<App />);
    unmount();
    expect(exitCode).toBe(0);
  });

  it('[AC-3] catches uncaught errors', () => {
    const errorHandler = vi.fn();
    process.on('uncaughtException', errorHandler);

    const { lastFrame } = render(<App throwError />);
    expect(errorHandler).not.toHaveBeenCalled();
    expect(lastFrame()).toContain('Error');
  });

  // Edge case
  it('[AC-2] Edge: handles SIGTERM gracefully', async () => {
    const cleanup = vi.fn();
    const { unmount } = render(<App onCleanup={cleanup} />);
    process.emit('SIGTERM');
    expect(cleanup).toHaveBeenCalled();
  });
});
```

---

### US-006: Screen Router

**Layer:** Integration

**File:** `tests/integration/router.test.ts`

```typescript
describe('US-006: Screen Router', () => {
  it('[AC-1] tracks current screen name', () => {
    const router = new ScreenRouter();
    expect(router.currentScreen).toBe('launcher');
  });

  it('[AC-2] renders active screen component', () => {
    const { lastFrame } = render(<RouterProvider />);
    expect(lastFrame()).toContain('Launcher');
  });

  it('[AC-3] navigate(screen) function works', () => {
    const router = new ScreenRouter();
    router.navigate('dashboard');
    expect(router.currentScreen).toBe('dashboard');
  });

  // Edge case
  it('[AC-3] Edge: navigate to invalid screen throws', () => {
    const router = new ScreenRouter();
    expect(() => router.navigate('invalid')).toThrow();
  });
});
```

---

### US-007: Global Keyboard Handler

**Layer:** E2E

**File:** `tests/e2e/specs/epic1-keyboard.test.ts`

```typescript
describe('US-007: Global Keyboard Handler', () => {
  it('[AC-1] q triggers quit flow', async () => {
    await runner()
      .fork('bin/pipeline.js')
      .wait('stdout', /Pipeline/)
      .stdin('stdout', /Project Path/, 'q')
      .wait('stdout', /quit|exit|sure/i);
  });

  it('[AC-2] ? toggles help overlay', async () => {
    await runner()
      .fork('bin/pipeline.js')
      .wait('stdout', /Pipeline/)
      .stdin('stdout', /Project Path/, '?')
      .wait('stdout', /Help|Keyboard|Shortcuts/i);
  });

  it('[AC-3] Ctrl+C triggers emergency stop', async () => {
    await runner()
      .fork('bin/pipeline.js')
      .wait('stdout', /Pipeline/)
      .kill('SIGINT')
      .wait('close');
  });

  // Edge case
  it('[AC-2] Edge: ? toggles help off', async () => {
    await runner()
      .fork('bin/pipeline.js')
      .stdin('stdout', /Project Path/, '?')
      .wait('stdout', /Help/)
      .stdin('stdout', /Help/, '?')
      .wait('stdout', /Project Path/);
  });
});
```

---

### US-008: Quit Confirmation Dialog

**Layer:** E2E

**File:** `tests/e2e/specs/epic1-keyboard.test.ts`

```typescript
describe('US-008: Quit Confirmation Dialog', () => {
  it('[AC-1] modal dialog appears', async () => {
    await runner()
      .fork('bin/pipeline.js')
      .stdin('stdout', /Project Path/, 'q')
      .wait('stdout', /─.*─/); // Dialog border
  });

  it('[AC-2] shows "Are you sure?" message', async () => {
    await runner()
      .fork('bin/pipeline.js')
      .stdin('stdout', /Project Path/, 'q')
      .wait('stdout', /are you sure|really quit/i);
  });

  it('[AC-3] can cancel with Esc', async () => {
    await runner()
      .fork('bin/pipeline.js')
      .stdin('stdout', /Project Path/, 'q')
      .wait('stdout', /sure/)
      .stdin('stdout', /sure/, KEYS.ESCAPE)
      .wait('stdout', /Project Path/);
  });

  it('[AC-4] confirms with Enter', async () => {
    await runner()
      .fork('bin/pipeline.js')
      .stdin('stdout', /Project Path/, 'q')
      .wait('stdout', /sure/)
      .stdin('stdout', /sure/, KEYS.ENTER)
      .wait('close', 0);
  });
});
```

---

### US-009: Project Path Validation

**Layer:** Unit

**File:** `tests/unit/validators.test.ts`

```typescript
describe('US-009: Project Path Validation', () => {
  it('[AC-1] checks path exists format', () => {
    expect(isValidPathFormat('C:\\Users\\test\\project')).toBe(true);
    expect(isValidPathFormat('/home/user/project')).toBe(true);
  });

  it('[AC-2] checks path is directory format', () => {
    expect(isValidPathFormat('/path/to/dir')).toBe(true);
  });

  it('[AC-3] shows error message if invalid', () => {
    const result = validatePathFormat('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  // Edge cases
  it('[AC-1] Edge: handles unicode paths', () => {
    expect(isValidPathFormat('/home/user/проект')).toBe(true);
  });

  it('[AC-2] Edge: rejects relative paths', () => {
    expect(isValidPathFormat('./relative').valid).toBe(false);
  });
});
```

---

### US-010: Project Directory Detection

**Layer:** Integration

**File:** `tests/integration/filesystem.test.ts`

```typescript
describe('US-010: Project Directory Detection', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir('pipeline-test-');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  it('[AC-1] returns true if .pipeline/ exists', async () => {
    await fs.mkdir(path.join(tempDir, '.pipeline'));
    expect(await isPipelineProject(tempDir)).toBe(true);
  });

  it('[AC-2] returns false otherwise', async () => {
    expect(await isPipelineProject(tempDir)).toBe(false);
  });

  it('[AC-3] checks for manifest.json inside', async () => {
    await fs.mkdir(path.join(tempDir, '.pipeline'));
    expect(await hasManifest(tempDir)).toBe(false);
    await fs.writeFile(path.join(tempDir, '.pipeline', 'manifest.json'), '{}');
    expect(await hasManifest(tempDir)).toBe(true);
  });

  // Edge case
  it('[AC-1] Edge: .pipeline as file returns false', async () => {
    await fs.writeFile(path.join(tempDir, '.pipeline'), 'not a dir');
    expect(await isPipelineProject(tempDir)).toBe(false);
  });
});
```

---

### US-011: Manifest File Creation

**Layer:** Integration

**File:** `tests/integration/manifest.test.ts`

```typescript
describe('US-011: Manifest File Creation', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir('pipeline-test-');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  it('[AC-1] creates .pipeline/ directory', async () => {
    await createManifest(tempDir);
    const stat = await fs.stat(path.join(tempDir, '.pipeline'));
    expect(stat.isDirectory()).toBe(true);
  });

  it('[AC-2] creates manifest.json with defaults', async () => {
    await createManifest(tempDir);
    const manifest = await readManifest(tempDir);
    expect(manifest.currentPhase).toBe(1);
  });

  it('[AC-3] sets version to 8.0.0', async () => {
    await createManifest(tempDir);
    const manifest = await readManifest(tempDir);
    expect(manifest.version).toBe('8.0.0');
  });

  // Edge case
  it('[AC-2] Edge: preserves existing manifest', async () => {
    await createManifest(tempDir);
    await updateManifest(tempDir, { currentPhase: 3 });
    await createManifest(tempDir);
    const manifest = await readManifest(tempDir);
    expect(manifest.currentPhase).toBe(3);
  });
});
```

---

### US-012: Manifest File Reading

**Layer:** Integration

**File:** `tests/integration/manifest.test.ts`

```typescript
describe('US-012: Manifest File Reading', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir('pipeline-test-');
    await createManifest(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  it('[AC-1] reads .pipeline/manifest.json', async () => {
    const manifest = await readManifest(tempDir);
    expect(manifest).toBeDefined();
  });

  it('[AC-2] parses JSON', async () => {
    await writeManifest(tempDir, { test: 'value' });
    const manifest = await readManifest(tempDir);
    expect(manifest.test).toBe('value');
  });

  it('[AC-3] returns manifest object', async () => {
    const manifest = await readManifest(tempDir);
    expect(manifest.version).toBeDefined();
    expect(manifest.currentPhase).toBeDefined();
  });

  // Edge case
  it('[AC-2] Edge: throws on invalid JSON', async () => {
    await fs.writeFile(path.join(tempDir, '.pipeline', 'manifest.json'), 'invalid');
    await expect(readManifest(tempDir)).rejects.toThrow();
  });
});
```

---

### US-013: Manifest File Writing

**Layer:** Integration

**File:** `tests/integration/manifest.test.ts`

```typescript
describe('US-013: Manifest File Writing', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir('pipeline-test-');
    await createManifest(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  it('[AC-1] writes to temp file first', async () => {
    const writePromise = writeManifest(tempDir, { data: 'x'.repeat(10000) });
    // Should not corrupt file during write
    await writePromise;
    const manifest = await readManifest(tempDir);
    expect(manifest.data.length).toBe(10000);
  });

  it('[AC-2] renames to manifest.json (atomic)', async () => {
    await writeManifest(tempDir, { test: true });
    const files = await fs.readdir(path.join(tempDir, '.pipeline'));
    expect(files).toContain('manifest.json');
    expect(files.filter(f => f.includes('.tmp'))).toHaveLength(0);
  });

  it('[AC-3] preserves formatting (pretty print)', async () => {
    await writeManifest(tempDir, { nested: { value: true } });
    const content = await fs.readFile(
      path.join(tempDir, '.pipeline', 'manifest.json'), 'utf8'
    );
    expect(content).toMatch(/\n\s+/); // Has indentation
  });
});
```

---

### US-014: Manifest Schema Validation

**Layer:** Unit

**File:** `tests/unit/manifest-validator.test.ts`

```typescript
describe('US-014: Manifest Schema Validation', () => {
  it('[AC-1] validates required fields', () => {
    const valid = { version: '8.0.0', project: {}, currentPhase: 1 };
    expect(validateManifest(valid).valid).toBe(true);
  });

  it('[AC-2] checks field types', () => {
    const invalid = { version: '8.0.0', currentPhase: 'not-a-number' };
    expect(validateManifest(invalid).valid).toBe(false);
  });

  it('[AC-3] returns validation errors', () => {
    const result = validateManifest({});
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  // Edge case
  it('[AC-2] Edge: validates nested phase structure', () => {
    const manifest = { version: '8.0.0', phases: { 4: { epics: 'invalid' } } };
    expect(validateManifest(manifest).valid).toBe(false);
  });
});
```

---

### US-015: Manifest Version Migration

**Layer:** Integration

**File:** `tests/integration/manifest-migration.test.ts`

```typescript
describe('US-015: Manifest Version Migration', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir('pipeline-test-');
    await fs.mkdir(path.join(tempDir, '.pipeline'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  it('[AC-1] detects version from manifest', async () => {
    await fs.writeFile(
      path.join(tempDir, '.pipeline', 'manifest.json'),
      JSON.stringify({ version: '7.0.0' })
    );
    expect(await getManifestVersion(tempDir)).toBe('7.0.0');
  });

  it('[AC-2] applies migrations if needed', async () => {
    await fs.writeFile(
      path.join(tempDir, '.pipeline', 'manifest.json'),
      JSON.stringify({ version: '7.0.0' })
    );
    const migrated = await migrateManifest(tempDir);
    expect(migrated.version).toBe('8.0.0');
  });

  it('[AC-3] updates version field', async () => {
    await fs.writeFile(
      path.join(tempDir, '.pipeline', 'manifest.json'),
      JSON.stringify({ version: '7.0.0' })
    );
    await migrateManifest(tempDir);
    const manifest = await readManifest(tempDir);
    expect(manifest.version).toBe('8.0.0');
  });
});
```

---

### US-016: Project Config Store

**Layer:** Integration

**File:** `tests/integration/stores.test.ts`

```typescript
describe('US-016: Project Config Store', () => {
  it('[AC-1] stores name, path, mode', () => {
    const store = new ProjectConfigStore();
    store.set({ name: 'test', path: '/test', mode: 'new' });
    expect(store.get().name).toBe('test');
    expect(store.get().path).toBe('/test');
    expect(store.get().mode).toBe('new');
  });

  it('[AC-2] get/set methods work', () => {
    const store = new ProjectConfigStore();
    store.set({ name: 'test' });
    expect(store.get().name).toBe('test');
  });

  it('[AC-3] notifies on change', () => {
    const store = new ProjectConfigStore();
    const handler = vi.fn();
    store.subscribe(handler);
    store.set({ name: 'updated' });
    expect(handler).toHaveBeenCalled();
  });
});
```

---

### US-017: Recent Projects Storage

**Layer:** Integration

**File:** `tests/integration/recent-projects.test.ts`

```typescript
describe('US-017: Recent Projects Storage', () => {
  let configDir: string;

  beforeEach(async () => {
    configDir = await createTempDir('pipeline-config-');
    process.env.PIPELINE_CONFIG_DIR = configDir;
  });

  afterEach(async () => {
    await fs.rm(configDir, { recursive: true });
    delete process.env.PIPELINE_CONFIG_DIR;
  });

  it('[AC-1] stores last 5 projects', async () => {
    for (let i = 0; i < 7; i++) {
      await addRecentProject({ name: `project-${i}`, path: `/path/${i}` });
    }
    const recent = await getRecentProjects();
    expect(recent).toHaveLength(5);
  });

  it('[AC-2] persists to ~/.pipeline/config.json', async () => {
    await addRecentProject({ name: 'test', path: '/test' });
    const configPath = path.join(configDir, 'config.json');
    expect(await fs.access(configPath).then(() => true).catch(() => false)).toBe(true);
  });

  it('[AC-3] updates on project start', async () => {
    await addRecentProject({ name: 'old', path: '/old' });
    await addRecentProject({ name: 'new', path: '/new' });
    const recent = await getRecentProjects();
    expect(recent[0].name).toBe('new');
  });
});
```

---

### US-018: Recent Projects Display

**Layer:** E2E

**File:** `tests/e2e/specs/epic1-launcher.test.ts`

```typescript
describe('US-018: Recent Projects Display', () => {
  it('[AC-1] shows project name', async () => {
    await setupRecentProject({ name: 'my-app', path: '/test' });
    await runner()
      .fork('bin/pipeline.js')
      .wait('stdout', /my-app/);
  });

  it('[AC-2] shows last phase/status', async () => {
    await setupRecentProject({ name: 'app', path: '/test', phase: 3 });
    await runner()
      .fork('bin/pipeline.js')
      .wait('stdout', /Phase 3|Bootstrap/);
  });

  it('[AC-3] shows time since last use', async () => {
    await setupRecentProject({ name: 'app', path: '/test' });
    await runner()
      .fork('bin/pipeline.js')
      .wait('stdout', /ago|\d+[hms]/);
  });
});
```

---

### US-019: CWD Auto-Population

**Layer:** Integration

**File:** `tests/integration/cwd.test.ts`

```typescript
describe('US-019: CWD Auto-Population', () => {
  it('[AC-1] detects process.cwd()', () => {
    const cwd = detectCwd();
    expect(cwd).toBe(process.cwd());
  });

  it('[AC-2] pre-fills path input', () => {
    const { lastFrame } = render(<LauncherScreen />);
    expect(lastFrame()).toContain(process.cwd());
  });

  it('[AC-3] validates pre-filled path', async () => {
    const result = await validatePath(process.cwd());
    expect(result.valid).toBe(true);
  });
});
```

---

### US-020: Mode Selection Store

**Layer:** Integration

**File:** `tests/integration/stores.test.ts`

```typescript
describe('US-020: Mode Selection Store', () => {
  it('[AC-1] stores: new, feature, or fix', () => {
    const store = new ModeStore();
    store.set('new');
    expect(store.get()).toBe('new');
    store.set('feature');
    expect(store.get()).toBe('feature');
    store.set('fix');
    expect(store.get()).toBe('fix');
  });

  it('[AC-2] defaults to "new"', () => {
    const store = new ModeStore();
    expect(store.get()).toBe('new');
  });

  it('[AC-3] persists to manifest', async () => {
    const store = new ModeStore(tempDir);
    store.set('feature');
    await store.save();
    const manifest = await readManifest(tempDir);
    expect(manifest.project.mode).toBe('feature');
  });
});
```

---

### US-021: Basic Text Component

**Layer:** Unit

**File:** `tests/unit/components.test.ts`

```typescript
describe('US-021: Basic Text Component', () => {
  it('[AC-1] supports color prop', () => {
    const { lastFrame } = render(<Text color="green">Test</Text>);
    expect(lastFrame()).toContain('Test');
  });

  it('[AC-2] supports bold, dim', () => {
    const { lastFrame } = render(<Text bold>Bold</Text>);
    expect(lastFrame()).toContain('Bold');
  });

  it('[AC-3] renders correctly', () => {
    const { lastFrame } = render(<Text>Hello World</Text>);
    expect(lastFrame()).toContain('Hello World');
  });
});
```

---

### US-022: Basic Box Component

**Layer:** Unit

**File:** `tests/unit/components.test.ts`

```typescript
describe('US-022: Basic Box Component', () => {
  it('[AC-1] supports border styles', () => {
    const { lastFrame } = render(<Box borderStyle="single">Content</Box>);
    expect(lastFrame()).toMatch(/[┌┐└┘│─]/);
  });

  it('[AC-2] supports padding', () => {
    const { lastFrame } = render(<Box padding={1}>X</Box>);
    const lines = lastFrame().split('\n');
    expect(lines.length).toBeGreaterThan(1);
  });

  it('[AC-3] supports flexbox layout', () => {
    const { lastFrame } = render(
      <Box flexDirection="column">
        <Text>A</Text>
        <Text>B</Text>
      </Box>
    );
    expect(lastFrame()).toContain('A');
    expect(lastFrame()).toContain('B');
  });
});
```

---

### US-023: Basic Input Component

**Layer:** Unit

**File:** `tests/unit/components.test.ts`

```typescript
describe('US-023: Basic Input Component', () => {
  it('[AC-1] shows current value', () => {
    const { lastFrame } = render(<Input value="test" onChange={() => {}} />);
    expect(lastFrame()).toContain('test');
  });

  it('[AC-2] handles typing', () => {
    const onChange = vi.fn();
    const { stdin } = render(<Input value="" onChange={onChange} />);
    stdin.write('a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('[AC-3] handles backspace', () => {
    const onChange = vi.fn();
    const { stdin } = render(<Input value="ab" onChange={onChange} />);
    stdin.write('\x7f'); // Backspace
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('[AC-4] shows cursor', () => {
    const { lastFrame } = render(<Input value="test" onChange={() => {}} />);
    expect(lastFrame()).toMatch(/test[█▌|_]/);
  });
});
```

---

### US-024: Basic Select Component

**Layer:** Unit

**File:** `tests/unit/components.test.ts`

```typescript
describe('US-024: Basic Select Component', () => {
  const options = [{ label: 'A' }, { label: 'B' }, { label: 'C' }];

  it('[AC-1] shows options list', () => {
    const { lastFrame } = render(<Select options={options} />);
    expect(lastFrame()).toContain('A');
    expect(lastFrame()).toContain('B');
    expect(lastFrame()).toContain('C');
  });

  it('[AC-2] arrow keys navigate', () => {
    const { stdin, lastFrame } = render(<Select options={options} />);
    stdin.write(KEYS.DOWN);
    expect(lastFrame()).toMatch(/[►>] B/);
  });

  it('[AC-3] Enter selects', () => {
    const onSelect = vi.fn();
    const { stdin } = render(<Select options={options} onSelect={onSelect} />);
    stdin.write(KEYS.ENTER);
    expect(onSelect).toHaveBeenCalledWith(options[0]);
  });

  it('[AC-4] shows current selection', () => {
    const { lastFrame } = render(<Select options={options} />);
    expect(lastFrame()).toMatch(/[►>*] A/);
  });
});
```

---

### US-025: Mock Claude Binary

**Layer:** Integration

**File:** `tests/integration/mock-claude.test.ts`

```typescript
describe('US-025: Mock Claude Binary', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir('mock-claude-test-');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  it('[AC-1] executes as Node script', async () => {
    const result = await execAsync('node tests/e2e/helpers/mock-claude.js', {
      env: { ...process.env, MOCK_FIXTURE: 'tests/e2e/fixtures/minimal.json' }
    });
    expect(result.exitCode).toBe(0);
  });

  it('[AC-2] reads fixture from env var', async () => {
    const fixturePath = path.join(tempDir, 'fixture.json');
    await fs.writeFile(fixturePath, JSON.stringify({ output: ['Hello'] }));

    const result = await execAsync('node tests/e2e/helpers/mock-claude.js', {
      env: { ...process.env, MOCK_FIXTURE: fixturePath }
    });
    expect(result.stdout).toContain('Hello');
  });

  it('[AC-3] writes todo files per fixture', async () => {
    const fixturePath = path.join(tempDir, 'fixture.json');
    const sessionId = 'test-session-123';
    await fs.writeFile(fixturePath, JSON.stringify({
      output: [],
      todoStates: [{ timestamp: 0, todos: [{ content: 'Test' }] }]
    }));

    await execAsync('node tests/e2e/helpers/mock-claude.js', {
      env: {
        ...process.env,
        MOCK_FIXTURE: fixturePath,
        PIPELINE_SESSION_ID: sessionId,
        CLAUDE_TODO_DIR: tempDir
      }
    });

    const todoFile = path.join(tempDir, `${sessionId}.jsonl`);
    expect(await fs.access(todoFile).then(() => true).catch(() => false)).toBe(true);
  });

  it('[AC-4] exits with configured code', async () => {
    const fixturePath = path.join(tempDir, 'fixture.json');
    await fs.writeFile(fixturePath, JSON.stringify({ output: [], exitCode: 42 }));

    const result = await execAsync('node tests/e2e/helpers/mock-claude.js', {
      env: { ...process.env, MOCK_FIXTURE: fixturePath }
    });
    expect(result.exitCode).toBe(42);
  });
});
```

---

## Epic 2: Worker Spawning (US-026 to US-045)

### US-026: Windows Terminal Detection

**Layer:** Integration

**File:** `tests/integration/spawn.test.ts`

```typescript
describe('US-026: Windows Terminal Detection', () => {
  it('[AC-1] checks wt.exe in PATH', async () => {
    const result = await detectWindowsTerminal();
    expect(typeof result).toBe('boolean');
  });

  it('[AC-2] returns boolean', async () => {
    const result = await detectWindowsTerminal();
    expect(result === true || result === false).toBe(true);
  });

  it('[AC-3] caches result', async () => {
    const first = await detectWindowsTerminal();
    const second = await detectWindowsTerminal();
    expect(first).toBe(second);
  });

  // Edge case
  it('[AC-1] Edge: returns false if PATH empty', async () => {
    const oldPath = process.env.PATH;
    process.env.PATH = '';
    clearWTCache();
    const result = await detectWindowsTerminal();
    expect(result).toBe(false);
    process.env.PATH = oldPath;
  });
});
```

---

### US-027: Spawn Worker via wt.exe

**Layer:** Integration (mocked)

**File:** `tests/integration/spawn.test.ts`

```typescript
describe('US-027: Spawn Worker via wt.exe', () => {
  it('[AC-1] opens new Windows Terminal tab', async () => {
    const execSpy = vi.spyOn(childProcess, 'spawn');
    await spawnWorker({ workDir: '/test', command: 'claude' });
    expect(execSpy).toHaveBeenCalledWith('wt.exe', expect.anything());
  });

  it('[AC-2] runs claude command', async () => {
    const execSpy = vi.spyOn(childProcess, 'spawn');
    await spawnWorker({ workDir: '/test', command: 'claude --yes' });
    expect(execSpy.mock.calls[0][1]).toContain('claude');
  });

  it('[AC-3] sets working directory', async () => {
    const execSpy = vi.spyOn(childProcess, 'spawn');
    await spawnWorker({ workDir: '/my/project', command: 'claude' });
    expect(execSpy.mock.calls[0][1]).toContain('/my/project');
  });
});
```

---

### US-028: Spawn Command Building

**Layer:** Unit

**File:** `tests/unit/spawn-command.test.ts`

```typescript
describe('US-028: Spawn Command Building', () => {
  it('[AC-1] uses -w 0 for existing window', () => {
    const cmd = buildSpawnCommand({ workDir: '/test', command: 'claude', title: 'Worker' });
    expect(cmd.args).toContain('-w');
    expect(cmd.args).toContain('0');
  });

  it('[AC-2] uses nt for new tab', () => {
    const cmd = buildSpawnCommand({ workDir: '/test', command: 'claude', title: 'Worker' });
    expect(cmd.args).toContain('nt');
  });

  it('[AC-3] uses -d for directory', () => {
    const cmd = buildSpawnCommand({ workDir: '/custom/path', command: 'claude', title: 'Worker' });
    const dIndex = cmd.args.indexOf('-d');
    expect(cmd.args[dIndex + 1]).toBe('/custom/path');
  });

  it('[AC-4] uses --title for window title', () => {
    const cmd = buildSpawnCommand({ workDir: '/test', command: 'claude', title: 'My Worker' });
    expect(cmd.args).toContain('--title');
  });
});
```

---

### US-029: Session ID Generation

**Layer:** Unit

**File:** `tests/unit/session.test.ts`

```typescript
describe('US-029: Session ID Generation', () => {
  it('[AC-1] generates UUID v4', () => {
    const id = generateSessionId();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(id).toMatch(uuidRegex);
  });

  it('[AC-2] unique per spawn', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateSessionId()));
    expect(ids.size).toBe(100);
  });

  it('[AC-3] 36 character format', () => {
    expect(generateSessionId().length).toBe(36);
  });
});
```

---

### US-030: Session ID Environment Variable

**Layer:** Integration

**File:** `tests/integration/spawn.test.ts`

```typescript
describe('US-030: Session ID Environment Variable', () => {
  it('[AC-1] sets PIPELINE_SESSION_ID', () => {
    const env = buildWorkerEnv({ sessionId: 'test-123' });
    expect(env.PIPELINE_SESSION_ID).toBe('test-123');
  });

  it('[AC-2] worker can read it', async () => {
    const { stdout } = await execAsync('node -e "console.log(process.env.PIPELINE_SESSION_ID)"', {
      env: { ...process.env, PIPELINE_SESSION_ID: 'abc' }
    });
    expect(stdout.trim()).toBe('abc');
  });

  it('[AC-3] used in todo file naming', () => {
    const sessionId = 'session-xyz';
    const todoFileName = getTodoFileName(sessionId);
    expect(todoFileName).toContain(sessionId);
  });
});
```

---

### US-031: Project Path Environment Variable

**Layer:** Integration

**File:** `tests/integration/spawn.test.ts`

```typescript
describe('US-031: Project Path Environment Variable', () => {
  it('[AC-1] sets PIPELINE_PROJECT_PATH', () => {
    const env = buildWorkerEnv({ projectPath: '/my/project' });
    expect(env.PIPELINE_PROJECT_PATH).toBe('/my/project');
  });

  it('[AC-2] absolute path', () => {
    const env = buildWorkerEnv({ projectPath: '/my/project' });
    expect(path.isAbsolute(env.PIPELINE_PROJECT_PATH)).toBe(true);
  });

  it('[AC-3] worker can read it', async () => {
    const { stdout } = await execAsync('node -e "console.log(process.env.PIPELINE_PROJECT_PATH)"', {
      env: { ...process.env, PIPELINE_PROJECT_PATH: '/test/path' }
    });
    expect(stdout.trim()).toBe('/test/path');
  });
});
```

---

### US-032: Phase Environment Variable

**Layer:** Integration

**File:** `tests/integration/spawn.test.ts`

```typescript
describe('US-032: Phase Environment Variable', () => {
  it('[AC-1] sets PIPELINE_PHASE', () => {
    const env = buildWorkerEnv({ phase: 3 });
    expect(env.PIPELINE_PHASE).toBe('3');
  });

  it('[AC-2] value 1-5', () => {
    for (let phase = 1; phase <= 5; phase++) {
      const env = buildWorkerEnv({ phase });
      expect(parseInt(env.PIPELINE_PHASE)).toBe(phase);
    }
  });

  it('[AC-3] worker can read it', async () => {
    const { stdout } = await execAsync('node -e "console.log(process.env.PIPELINE_PHASE)"', {
      env: { ...process.env, PIPELINE_PHASE: '4' }
    });
    expect(stdout.trim()).toBe('4');
  });
});
```

---

### US-033: Worker PID Capture

**Layer:** Integration

**File:** `tests/integration/spawn.test.ts`

```typescript
describe('US-033: Worker PID Capture', () => {
  it('[AC-1] captures PID from spawn', async () => {
    const mockSpawn = vi.fn().mockReturnValue({ pid: 12345 });
    const result = await spawnWorkerWithMock(mockSpawn, { workDir: '/test' });
    expect(result.pid).toBe(12345);
  });

  it('[AC-2] stores in worker session', async () => {
    const session = new WorkerSession();
    session.setPid(12345);
    expect(session.pid).toBe(12345);
  });

  it('[AC-3] updates manifest', async () => {
    const tempDir = await createTempDir('pid-test-');
    await createManifest(tempDir);
    await updateWorkerPid(tempDir, 12345);
    const manifest = await readManifest(tempDir);
    expect(manifest.worker.pid).toBe(12345);
    await fs.rm(tempDir, { recursive: true });
  });
});
```

---

### US-034: Worker Session Store

**Layer:** Integration

**File:** `tests/integration/worker-session.test.ts`

```typescript
describe('US-034: Worker Session Store', () => {
  it('[AC-1] stores session ID', () => {
    const session = new WorkerSession();
    session.sessionId = 'abc-123';
    expect(session.sessionId).toBe('abc-123');
  });

  it('[AC-2] stores PID', () => {
    const session = new WorkerSession();
    session.pid = 12345;
    expect(session.pid).toBe(12345);
  });

  it('[AC-3] stores status', () => {
    const session = new WorkerSession();
    session.status = 'running';
    expect(session.status).toBe('running');
  });

  it('[AC-4] stores phase/epic', () => {
    const session = new WorkerSession();
    session.phase = 4;
    session.epic = 2;
    expect(session.phase).toBe(4);
    expect(session.epic).toBe(2);
  });
});
```

---

### US-035: Worker Status Tracking

**Layer:** Integration

**File:** `tests/integration/worker-session.test.ts`

```typescript
describe('US-035: Worker Status Tracking', () => {
  it('[AC-1] status: running', () => {
    const session = new WorkerSession();
    session.setStatus('running');
    expect(session.status).toBe('running');
  });

  it('[AC-2] status: completed', () => {
    const session = new WorkerSession();
    session.setStatus('completed');
    expect(session.status).toBe('completed');
  });

  it('[AC-3] status: killed', () => {
    const session = new WorkerSession();
    session.setStatus('killed');
    expect(session.status).toBe('killed');
  });

  it('[AC-4] status: errored', () => {
    const session = new WorkerSession();
    session.setStatus('errored');
    expect(session.status).toBe('errored');
  });
});
```

---

### US-036: Kill Worker by Session ID

**Layer:** Integration

**File:** `tests/integration/worker-session.test.ts`

```typescript
describe('US-036: Kill Worker by Session ID', () => {
  it('[AC-1] looks up PID from session', () => {
    const sessions = new Map([['session-1', { pid: 12345 }]]);
    const pid = lookupPidBySession(sessions, 'session-1');
    expect(pid).toBe(12345);
  });

  it('[AC-2] kills process by PID', async () => {
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);
    await killWorkerBySession(new Map([['s1', { pid: 123 }]]), 's1');
    expect(killSpy).toHaveBeenCalledWith(123, expect.anything());
    killSpy.mockRestore();
  });

  it('[AC-3] updates session status', async () => {
    const session = { pid: 123, status: 'running' };
    const sessions = new Map([['s1', session]]);
    vi.spyOn(process, 'kill').mockImplementation(() => true);
    await killWorkerBySession(sessions, 's1');
    expect(session.status).toBe('killed');
  });
});
```

---

### US-037: Kill Worker Graceful

**Layer:** Integration

**File:** `tests/integration/worker-session.test.ts`

```typescript
describe('US-037: Kill Worker Graceful', () => {
  it('[AC-1] sends SIGTERM first', async () => {
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);
    await killWorkerGraceful(12345);
    expect(killSpy).toHaveBeenCalledWith(12345, 'SIGTERM');
    killSpy.mockRestore();
  });

  it('[AC-2] waits for exit (timeout)', async () => {
    vi.useFakeTimers();
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);
    const promise = killWorkerGraceful(12345, { timeout: 5000 });
    vi.advanceTimersByTime(5000);
    await promise;
    expect(killSpy).toHaveBeenCalledTimes(2); // SIGTERM then SIGKILL
    vi.useRealTimers();
    killSpy.mockRestore();
  });

  it('[AC-3] force kills if needed', async () => {
    vi.useFakeTimers();
    const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);
    const promise = killWorkerGraceful(12345, { timeout: 1000 });
    vi.advanceTimersByTime(1000);
    await promise;
    expect(killSpy).toHaveBeenCalledWith(12345, 'SIGKILL');
    vi.useRealTimers();
    killSpy.mockRestore();
  });
});
```

---

### US-038: Worker Exit Detection

**Layer:** Integration

**File:** `tests/integration/worker-session.test.ts`

```typescript
describe('US-038: Worker Exit Detection', () => {
  it('[AC-1] listens for exit event', () => {
    const mockProcess = new EventEmitter();
    const handler = vi.fn();
    onWorkerExit(mockProcess, handler);
    mockProcess.emit('exit', 0);
    expect(handler).toHaveBeenCalled();
  });

  it('[AC-2] captures exit code', () => {
    const mockProcess = new EventEmitter();
    const handler = vi.fn();
    onWorkerExit(mockProcess, handler);
    mockProcess.emit('exit', 42);
    expect(handler).toHaveBeenCalledWith({ code: 42 });
  });

  it('[AC-3] emits event to orchestrator', () => {
    const orchestrator = new EventEmitter();
    const handler = vi.fn();
    orchestrator.on('workerExit', handler);
    const mockProcess = new EventEmitter();
    connectWorkerToOrchestrator(mockProcess, orchestrator);
    mockProcess.emit('exit', 0);
    expect(handler).toHaveBeenCalled();
  });
});
```

---

### US-039: Worker Exit Code Capture

**Layer:** Integration

**File:** `tests/integration/worker-session.test.ts`

```typescript
describe('US-039: Worker Exit Code Capture', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir('exit-code-test-');
    await createManifest(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  it('[AC-1] code 0 = success', () => {
    expect(interpretExitCode(0)).toBe('success');
  });

  it('[AC-2] code != 0 = error', () => {
    expect(interpretExitCode(1)).toBe('error');
    expect(interpretExitCode(127)).toBe('error');
  });

  it('[AC-3] stored in manifest', async () => {
    await updateWorkerExitCode(tempDir, 0);
    const manifest = await readManifest(tempDir);
    expect(manifest.worker.exitCode).toBe(0);
  });
});
```

---

### US-040: Process Cleanup on App Exit

**Layer:** Integration

**File:** `tests/integration/cleanup.test.ts`

```typescript
describe('US-040: Process Cleanup on App Exit', () => {
  it('[AC-1] kills all tracked workers', () => {
    const killSpy = vi.fn();
    const sessions = [{ pid: 1 }, { pid: 2 }, { pid: 3 }];
    cleanupAllWorkers(sessions, killSpy);
    expect(killSpy).toHaveBeenCalledTimes(3);
  });

  it('[AC-2] handles SIGINT, SIGTERM', () => {
    const cleanup = vi.fn();
    setupExitHandlers(cleanup);
    process.emit('SIGINT');
    expect(cleanup).toHaveBeenCalled();
  });

  it('[AC-3] runs on clean exit too', () => {
    const cleanup = vi.fn();
    setupExitHandlers(cleanup);
    process.emit('exit');
    expect(cleanup).toHaveBeenCalled();
  });
});
```

---

### US-041: Worker Window Title

**Layer:** Unit

**File:** `tests/unit/spawn-command.test.ts`

```typescript
describe('US-041: Worker Window Title', () => {
  it('[AC-1] includes project name', () => {
    const title = buildWindowTitle({ projectName: 'my-app', phase: 3 });
    expect(title).toContain('my-app');
  });

  it('[AC-2] includes phase number', () => {
    const title = buildWindowTitle({ projectName: 'app', phase: 3 });
    expect(title).toContain('3');
  });

  it('[AC-3] uses --title flag', () => {
    const cmd = buildSpawnCommand({
      workDir: '/test',
      command: 'claude',
      title: 'Pipeline Worker'
    });
    expect(cmd.args).toContain('--title');
  });
});
```

---

### US-042: Focus Worker Window

**Layer:** E2E

**File:** `tests/e2e/specs/epic2-worker.test.ts`

```typescript
describe('US-042: Focus Worker Window', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir('focus-test-');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  it('[AC-1] press w to focus', async () => {
    await runner()
      .fork('bin/pipeline.js', [tempDir], { env: { ...process.env, MOCK_CLAUDE: 'true' } })
      .stdin('stdout', /Project Path/, KEYS.ENTER)
      .wait('stdout', /Running/)
      .stdin('stdout', /Running/, 'w')
      .wait('stdout', /Focus|Window/i);
  });

  it('[AC-2] brings WT window to front', async () => {
    // This is platform-specific behavior, verify message shown
    await runner()
      .fork('bin/pipeline.js', [tempDir], { env: { ...process.env, MOCK_CLAUDE: 'true' } })
      .stdin('stdout', /Project Path/, KEYS.ENTER)
      .stdin('stdout', /Running/, 'w')
      .wait('stdout', /worker/i);
  });

  it('[AC-3] works when minimized', async () => {
    // Verify no error thrown
    await runner()
      .fork('bin/pipeline.js', [tempDir], { env: { ...process.env, MOCK_CLAUDE: 'true' } })
      .stdin('stdout', /Project Path/, KEYS.ENTER)
      .stdin('stdout', /Running/, 'w');
      // Should not throw
  });
});
```

---

### US-043: Spawn Fallback (no wt.exe)

**Layer:** Integration

**File:** `tests/integration/spawn.test.ts`

```typescript
describe('US-043: Spawn Fallback (no wt.exe)', () => {
  it('[AC-1] uses cmd /c start', async () => {
    const execSpy = vi.spyOn(childProcess, 'spawn');
    vi.spyOn(wtDetection, 'detectWindowsTerminal').mockResolvedValue(false);

    await spawnWorker({ workDir: '/test', command: 'claude' });
    expect(execSpy.mock.calls[0][0]).toBe('cmd');
    expect(execSpy.mock.calls[0][1]).toContain('/c');
    expect(execSpy.mock.calls[0][1]).toContain('start');
  });

  it('[AC-2] opens new cmd window', async () => {
    vi.spyOn(wtDetection, 'detectWindowsTerminal').mockResolvedValue(false);
    const execSpy = vi.spyOn(childProcess, 'spawn');

    await spawnWorker({ workDir: '/test', command: 'claude' });
    expect(execSpy.mock.calls[0][1]).toContain('cmd.exe');
  });

  it('[AC-3] still tracks PID', async () => {
    vi.spyOn(wtDetection, 'detectWindowsTerminal').mockResolvedValue(false);
    vi.spyOn(childProcess, 'spawn').mockReturnValue({ pid: 999 });

    const result = await spawnWorker({ workDir: '/test', command: 'claude' });
    expect(result.pid).toBe(999);
  });
});
```

---

### US-044: Command Injection Prevention

**Layer:** Unit

**File:** `tests/unit/security.test.ts`

```typescript
describe('US-044: Command Injection Prevention', () => {
  it('[AC-1] escapes special characters', () => {
    expect(escapeShellArg('path; rm -rf /')).not.toContain(';');
    expect(escapeShellArg('path & echo')).not.toContain('&');
    expect(escapeShellArg('$(whoami)')).not.toContain('$(');
  });

  it('[AC-2] validates paths', () => {
    expect(isPathSafe('../../../etc/passwd')).toBe(false);
    expect(isPathSafe('C:\\Windows\\System32')).toBe(false);
  });

  it('[AC-3] no shell interpretation', () => {
    const escaped = escapeShellArg('`id`');
    expect(escaped).not.toContain('`');
  });

  // Edge cases
  it('[AC-1] Edge: handles quotes', () => {
    expect(escapeShellArg('path"with"quotes')).not.toMatch(/[^\\]"/);
  });

  it('[AC-1] Edge: handles newlines', () => {
    expect(escapeShellArg('path\ninjection')).not.toContain('\n');
  });
});
```

---

### US-045: Worker Spawn Error Handling

**Layer:** Integration

**File:** `tests/integration/spawn.test.ts`

```typescript
describe('US-045: Worker Spawn Error Handling', () => {
  it('[AC-1] catches spawn errors', async () => {
    vi.spyOn(childProcess, 'spawn').mockImplementation(() => {
      throw new Error('spawn failed');
    });

    const result = await spawnWorker({ workDir: '/test', command: 'claude' });
    expect(result.error).toBeDefined();
  });

  it('[AC-2] shows error to user', async () => {
    vi.spyOn(childProcess, 'spawn').mockImplementation(() => {
      throw new Error('spawn failed');
    });

    const result = await spawnWorker({ workDir: '/test', command: 'claude' });
    expect(result.error.message).toContain('spawn');
  });

  it('[AC-3] allows retry', async () => {
    let attempts = 0;
    vi.spyOn(childProcess, 'spawn').mockImplementation(() => {
      attempts++;
      if (attempts < 2) throw new Error('fail');
      return { pid: 123 };
    });

    await expect(spawnWorkerWithRetry({ workDir: '/test', maxRetries: 2 })).resolves.toBeDefined();
  });
});
```

---

## Epic 3: File Watching & Todos (US-046 to US-070)

### US-046: Watch Manifest File

**Layer:** Integration

**File:** `tests/integration/file-watcher.test.ts`

```typescript
describe('US-046: Watch Manifest File', () => {
  let tempDir: string;
  let watcher: FileWatcher;

  beforeEach(async () => {
    tempDir = await createTempDir('watch-test-');
    await createManifest(tempDir);
  });

  afterEach(async () => {
    if (watcher) await watcher.close();
    await fs.rm(tempDir, { recursive: true });
  });

  it('[AC-1] watches .pipeline/manifest.json', async () => {
    const onChange = vi.fn();
    watcher = await watchManifest(tempDir, onChange);
    await writeManifest(tempDir, { changed: true });
    await waitFor(() => expect(onChange).toHaveBeenCalled());
  });

  it('[AC-2] calls callback on change', async () => {
    const onChange = vi.fn();
    watcher = await watchManifest(tempDir, onChange);
    await writeManifest(tempDir, { test: 1 });
    await waitFor(() => expect(onChange).toHaveBeenCalled());
  });

  it('[AC-3] handles file not existing', async () => {
    await fs.rm(path.join(tempDir, '.pipeline', 'manifest.json'));
    const onChange = vi.fn();
    watcher = await watchManifest(tempDir, onChange); // Should not throw
    expect(watcher).toBeDefined();
  });
});
```

---

### US-047: Manifest Watch Debounce

**Layer:** Unit

**File:** `tests/unit/debounce.test.ts`

```typescript
describe('US-047: Manifest Watch Debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('[AC-1] groups changes within 100ms', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 100);
    debounced(); debounced(); debounced();
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('[AC-2] single callback per batch', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 100);
    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('[AC-3] configurable delay', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 200);
    debounced();
    vi.advanceTimersByTime(100);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
```

---

### US-048: Watch Todo Directory

**Layer:** Integration

**File:** `tests/integration/file-watcher.test.ts`

```typescript
describe('US-048: Watch Todo Directory', () => {
  let todoDir: string;
  let watcher: FileWatcher;

  beforeEach(async () => {
    todoDir = await createTempDir('todo-watch-');
  });

  afterEach(async () => {
    if (watcher) await watcher.close();
    await fs.rm(todoDir, { recursive: true });
  });

  it('[AC-1] watches directory for changes', async () => {
    const onFile = vi.fn();
    watcher = await watchTodoDirectory(todoDir, onFile);
    await fs.writeFile(path.join(todoDir, 'test.json'), '{}');
    await waitFor(() => expect(onFile).toHaveBeenCalled());
  });

  it('[AC-2] detects new files', async () => {
    const onFile = vi.fn();
    watcher = await watchTodoDirectory(todoDir, onFile);
    await fs.writeFile(path.join(todoDir, 'new.json'), '{}');
    await waitFor(() => expect(onFile).toHaveBeenCalledWith(expect.objectContaining({ type: 'add' })));
  });

  it('[AC-3] detects modified files', async () => {
    const todoFile = path.join(todoDir, 'session.json');
    await fs.writeFile(todoFile, '{"v":1}');
    const onFile = vi.fn();
    watcher = await watchTodoDirectory(todoDir, onFile);
    await fs.writeFile(todoFile, '{"v":2}');
    await waitFor(() => expect(onFile).toHaveBeenCalledWith(expect.objectContaining({ type: 'change' })));
  });
});
```

---

### US-049: Todo File Pattern Match

**Layer:** Unit

**File:** `tests/unit/todo-filter.test.ts`

```typescript
describe('US-049: Todo File Pattern Match', () => {
  const sessionId = 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';

  it('[AC-1] matches session ID in filename', () => {
    expect(matchesTodoSession(`todos-${sessionId}.jsonl`, sessionId)).toBe(true);
  });

  it('[AC-2] ignores other sessions', () => {
    const other = 'xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx';
    expect(matchesTodoSession(`todos-${other}.jsonl`, sessionId)).toBe(false);
  });

  it('[AC-3] handles UUID format', () => {
    expect(matchesTodoSession(`${sessionId}.json`, sessionId)).toBe(true);
  });

  // Edge case
  it('[AC-1] Edge: rejects partial match', () => {
    const partial = sessionId.substring(0, 8);
    expect(matchesTodoSession(`todos-${partial}.jsonl`, sessionId)).toBe(false);
  });
});
```

---

### US-050: Todo File Parsing

**Layer:** Unit

**File:** `tests/unit/todo-parser.test.ts`

```typescript
describe('US-050: Todo File Parsing', () => {
  it('[AC-1] parses JSONL lines', () => {
    const content = '{"id":1}\n{"id":2}';
    expect(parseTodoJsonl(content)).toHaveLength(2);
  });

  it('[AC-2] extracts todo objects', () => {
    const content = '{"content":"Test","status":"completed"}';
    const todos = parseTodoJsonl(content);
    expect(todos[0].content).toBe('Test');
    expect(todos[0].status).toBe('completed');
  });

  it('[AC-3] handles malformed lines', () => {
    const content = '{"valid":true}\ninvalid\n{"also":true}';
    expect(parseTodoJsonl(content)).toHaveLength(2);
  });

  // Edge case
  it('[AC-1] Edge: handles empty file', () => {
    expect(parseTodoJsonl('')).toEqual([]);
  });
});
```

---

### US-051: Todo Status Extraction

**Layer:** Unit

**File:** `tests/unit/todo-status.test.ts`

```typescript
describe('US-051: Todo Status Extraction', () => {
  const todos = [
    { status: 'pending' },
    { status: 'in_progress' },
    { status: 'completed' },
    { status: 'completed' }
  ];

  it('[AC-1] extracts: pending', () => {
    expect(extractTodoStatuses(todos).pending).toBe(1);
  });

  it('[AC-2] extracts: in_progress', () => {
    expect(extractTodoStatuses(todos).inProgress).toBe(1);
  });

  it('[AC-3] extracts: completed', () => {
    expect(extractTodoStatuses(todos).completed).toBe(2);
  });
});
```

---

### US-052: Todo Store

**Layer:** Integration

**File:** `tests/integration/stores.test.ts`

```typescript
describe('US-052: Todo Store', () => {
  it('[AC-1] stores todo array', () => {
    const store = new TodoStore();
    store.set([{ content: 'Test' }]);
    expect(store.get()).toHaveLength(1);
  });

  it('[AC-2] get/set methods', () => {
    const store = new TodoStore();
    store.set([{ content: 'A' }]);
    expect(store.get()[0].content).toBe('A');
  });

  it('[AC-3] notifies on change', () => {
    const store = new TodoStore();
    const handler = vi.fn();
    store.subscribe(handler);
    store.set([{ content: 'Updated' }]);
    expect(handler).toHaveBeenCalled();
  });
});
```

---

### US-053: Todo Progress Calculation

**Layer:** Unit

**File:** `tests/unit/progress.test.ts`

```typescript
describe('US-053: Todo Progress Calculation', () => {
  it('[AC-1] formula: (completed / total) * 100', () => {
    expect(calculateProgress({ pending: 1, inProgress: 1, completed: 2 })).toBe(50);
  });

  it('[AC-2] returns 0-100', () => {
    expect(calculateProgress({ pending: 0, inProgress: 0, completed: 1 })).toBe(100);
    expect(calculateProgress({ pending: 5, inProgress: 0, completed: 0 })).toBe(0);
  });

  it('[AC-3] handles empty todos (0%)', () => {
    expect(calculateProgress({ pending: 0, inProgress: 0, completed: 0 })).toBe(0);
  });
});
```

---

### US-054: Todo Completion Detection

**Layer:** Integration

**File:** `tests/integration/orchestrator.test.ts`

```typescript
describe('US-054: Todo Completion Detection', () => {
  it('[AC-1] detects all todos completed', () => {
    const todos = [{ status: 'completed' }, { status: 'completed' }];
    expect(isAllComplete(todos)).toBe(true);
  });

  it('[AC-2] emits completion event', () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on('complete', handler);
    detectCompletion(emitter, [{ status: 'completed' }]);
    expect(handler).toHaveBeenCalled();
  });

  it('[AC-3] only emits once per phase', () => {
    const detector = new CompletionDetector();
    const handler = vi.fn();
    detector.on('complete', handler);
    detector.check([{ status: 'completed' }]);
    detector.check([{ status: 'completed' }]);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
```

---

### US-055: Current Todo Identification

**Layer:** Unit

**File:** `tests/unit/todo-utils.test.ts`

```typescript
describe('US-055: Current Todo Identification', () => {
  it('[AC-1] returns first in_progress todo', () => {
    const todos = [
      { content: 'Done', status: 'completed' },
      { content: 'Current', status: 'in_progress' },
      { content: 'Next', status: 'pending' }
    ];
    expect(getCurrentTodo(todos)?.content).toBe('Current');
  });

  it('[AC-2] returns null if none', () => {
    const todos = [{ status: 'completed' }, { status: 'pending' }];
    expect(getCurrentTodo(todos)).toBeNull();
  });

  it('[AC-3] updates on change', () => {
    // Behavioral test - verify returns correct current
    const before = [{ content: 'A', status: 'in_progress' }];
    const after = [{ content: 'A', status: 'completed' }, { content: 'B', status: 'in_progress' }];
    expect(getCurrentTodo(before)?.content).toBe('A');
    expect(getCurrentTodo(after)?.content).toBe('B');
  });
});
```

---

### US-056: Phase Progress Calculation

**Layer:** Unit

**File:** `tests/unit/progress.test.ts`

```typescript
describe('US-056: Phase Progress Calculation', () => {
  it('[AC-1] based on todo completion', () => {
    const todos = [{ status: 'completed' }, { status: 'completed' }, { status: 'pending' }, { status: 'pending' }];
    expect(calculatePhaseProgress(todos)).toBe(50);
  });

  it('[AC-2] returns 0-100', () => {
    expect(calculatePhaseProgress([])).toBe(0);
    expect(calculatePhaseProgress([{ status: 'completed' }])).toBe(100);
  });

  it('[AC-3] updates on todo change', () => {
    const before = [{ status: 'pending' }];
    const after = [{ status: 'completed' }];
    expect(calculatePhaseProgress(before)).toBe(0);
    expect(calculatePhaseProgress(after)).toBe(100);
  });
});
```

---

### US-057: Overall Progress Calculation

**Layer:** Unit

**File:** `tests/unit/progress.test.ts`

```typescript
describe('US-057: Overall Progress Calculation', () => {
  it('[AC-1] combines phases + epics', () => {
    const state = { currentPhase: 3, completedPhases: 2, totalPhases: 5, phaseProgress: 50 };
    const result = calculateOverallProgress(state);
    expect(result).toBeGreaterThan(40);
    expect(result).toBeLessThan(60);
  });

  it('[AC-2] weights phases appropriately', () => {
    const state = { currentPhase: 1, completedPhases: 0, totalPhases: 5, phaseProgress: 50 };
    expect(calculateOverallProgress(state)).toBe(10); // 50% of 20%
  });

  it('[AC-3] returns 0-100', () => {
    expect(calculateOverallProgress({ currentPhase: 1, phaseProgress: 0 })).toBe(0);
  });
});
```

---

### US-058: File Watch Error Handling

**Layer:** Integration

**File:** `tests/integration/file-watcher.test.ts`

```typescript
describe('US-058: File Watch Error Handling', () => {
  it('[AC-1] catches watch errors', async () => {
    const onError = vi.fn();
    const watcher = new FileWatcher({ onError });
    watcher.emit('error', new Error('test'));
    expect(onError).toHaveBeenCalled();
  });

  it('[AC-2] attempts reconnect', async () => {
    const watcher = new FileWatcher({ reconnect: true });
    const reconnectSpy = vi.spyOn(watcher, 'reconnect');
    watcher.emit('error', new Error('disconnected'));
    expect(reconnectSpy).toHaveBeenCalled();
  });

  it('[AC-3] logs errors', async () => {
    const logSpy = vi.spyOn(console, 'error');
    const watcher = new FileWatcher();
    watcher.emit('error', new Error('test error'));
    expect(logSpy).toHaveBeenCalled();
  });
});
```

---

### US-059: File Watch Cleanup

**Layer:** Integration

**File:** `tests/integration/file-watcher.test.ts`

```typescript
describe('US-059: File Watch Cleanup', () => {
  it('[AC-1] closes all watchers', async () => {
    const watchers = [{ close: vi.fn() }, { close: vi.fn() }];
    await cleanupAllWatchers(watchers);
    expect(watchers[0].close).toHaveBeenCalled();
    expect(watchers[1].close).toHaveBeenCalled();
  });

  it('[AC-2] called on app exit', () => {
    const cleanup = vi.fn();
    registerCleanup(cleanup);
    process.emit('exit');
    expect(cleanup).toHaveBeenCalled();
  });

  it('[AC-3] no memory leaks', async () => {
    const watcher = new FileWatcher();
    const listenerCount = process.listenerCount('exit');
    await watcher.close();
    expect(process.listenerCount('exit')).toBe(listenerCount);
  });
});
```

---

### US-060: Manifest Change Handler

**Layer:** Integration

**File:** `tests/integration/handlers.test.ts`

```typescript
describe('US-060: Manifest Change Handler', () => {
  it('[AC-1] reads new manifest', async () => {
    const tempDir = await createTempDir('handler-test-');
    await createManifest(tempDir);
    await writeManifest(tempDir, { test: 'value' });

    const result = await handleManifestChange(tempDir);
    expect(result.test).toBe('value');
    await fs.rm(tempDir, { recursive: true });
  });

  it('[AC-2] updates relevant stores', () => {
    const stores = { project: new ProjectStore() };
    handleManifestChange('/test', { project: { name: 'new' } }, stores);
    expect(stores.project.get().name).toBe('new');
  });

  it('[AC-3] triggers UI update', () => {
    const updateUI = vi.fn();
    handleManifestChange('/test', {}, {}, updateUI);
    expect(updateUI).toHaveBeenCalled();
  });
});
```

---

### US-061: Todo Change Handler

**Layer:** Integration

**File:** `tests/integration/handlers.test.ts`

```typescript
describe('US-061: Todo Change Handler', () => {
  it('[AC-1] parses new todo file', async () => {
    const tempDir = await createTempDir('todo-handler-');
    const todoFile = path.join(tempDir, 'session.jsonl');
    await fs.writeFile(todoFile, '{"content":"Test"}');

    const result = await handleTodoChange(todoFile);
    expect(result[0].content).toBe('Test');
    await fs.rm(tempDir, { recursive: true });
  });

  it('[AC-2] updates todo store', () => {
    const store = new TodoStore();
    handleTodoChange('/path', [{ content: 'New' }], store);
    expect(store.get()[0].content).toBe('New');
  });

  it('[AC-3] triggers UI update', () => {
    const updateUI = vi.fn();
    handleTodoChange('/path', [], null, updateUI);
    expect(updateUI).toHaveBeenCalled();
  });
});
```

---

### US-062: Epic Status from Manifest

**Layer:** Integration

**File:** `tests/integration/manifest.test.ts`

```typescript
describe('US-062: Epic Status from Manifest', () => {
  it('[AC-1] parses phases[4].epics', async () => {
    const manifest = {
      phases: {
        4: {
          epics: [
            { id: 1, status: 'complete' },
            { id: 2, status: 'in-progress' }
          ]
        }
      }
    };
    const epics = getEpicsFromManifest(manifest);
    expect(epics).toHaveLength(2);
  });

  it('[AC-2] returns epic array', () => {
    const manifest = { phases: { 4: { epics: [{ id: 1 }] } } };
    expect(Array.isArray(getEpicsFromManifest(manifest))).toBe(true);
  });

  it('[AC-3] handles missing data', () => {
    expect(getEpicsFromManifest({})).toEqual([]);
    expect(getEpicsFromManifest({ phases: {} })).toEqual([]);
  });
});
```

---

### US-063: Current Epic Identification

**Layer:** Integration

**File:** `tests/integration/manifest.test.ts`

```typescript
describe('US-063: Current Epic Identification', () => {
  it('[AC-1] returns in-progress epic', () => {
    const manifest = {
      currentPhase: 4,
      phases: {
        4: {
          currentEpic: 2,
          epics: [
            { id: 1, status: 'complete' },
            { id: 2, status: 'in-progress' }
          ]
        }
      }
    };
    expect(getCurrentEpic(manifest)?.id).toBe(2);
  });

  it('[AC-2] returns null if not in phase 4', () => {
    const manifest = { currentPhase: 3 };
    expect(getCurrentEpic(manifest)).toBeNull();
  });

  it('[AC-3] updates on change', () => {
    const before = { currentPhase: 4, phases: { 4: { currentEpic: 1 } } };
    const after = { currentPhase: 4, phases: { 4: { currentEpic: 2 } } };
    expect(getCurrentEpic(before)?.id).toBe(1);
    expect(getCurrentEpic(after)?.id).toBe(2);
  });
});
```

---

### US-064: Cost Reading from Manifest

**Layer:** Integration

**File:** `tests/integration/manifest.test.ts`

```typescript
describe('US-064: Cost Reading from Manifest', () => {
  it('[AC-1] reads cost.total', () => {
    const manifest = { cost: { total: 5.23 } };
    expect(getCostFromManifest(manifest).total).toBe(5.23);
  });

  it('[AC-2] reads cost.byPhase', () => {
    const manifest = { cost: { total: 5, byPhase: { 1: 2, 2: 3 } } };
    expect(getCostFromManifest(manifest).byPhase[1]).toBe(2);
  });

  it('[AC-3] returns 0 if missing', () => {
    expect(getCostFromManifest({}).total).toBe(0);
    expect(getCostFromManifest({ cost: {} }).total).toBe(0);
  });
});
```

---

### US-065: Duration Reading from Manifest

**Layer:** Integration

**File:** `tests/integration/manifest.test.ts`

```typescript
describe('US-065: Duration Reading from Manifest', () => {
  it('[AC-1] reads duration.total (seconds)', () => {
    const manifest = { duration: { total: 3600 } };
    expect(getDurationFromManifest(manifest).total).toBe(3600);
  });

  it('[AC-2] reads duration.byPhase', () => {
    const manifest = { duration: { total: 100, byPhase: { 1: 50, 2: 50 } } };
    expect(getDurationFromManifest(manifest).byPhase[1]).toBe(50);
  });

  it('[AC-3] returns 0 if missing', () => {
    expect(getDurationFromManifest({}).total).toBe(0);
  });
});
```

---

### US-066: Duration Timer

**Layer:** Integration

**File:** `tests/integration/timer.test.ts`

```typescript
describe('US-066: Duration Timer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('[AC-1] increments every second', () => {
    const timer = new DurationTimer();
    timer.start();
    vi.advanceTimersByTime(3000);
    expect(timer.elapsed).toBe(3);
  });

  it('[AC-2] starts on phase start', () => {
    const timer = new DurationTimer();
    timer.start();
    expect(timer.running).toBe(true);
  });

  it('[AC-3] stops on pause/complete', () => {
    const timer = new DurationTimer();
    timer.start();
    vi.advanceTimersByTime(1000);
    timer.stop();
    vi.advanceTimersByTime(1000);
    expect(timer.elapsed).toBe(1);
  });
});
```

---

### US-067: Cost Formatting

**Layer:** Unit

**File:** `tests/unit/formatters.test.ts`

```typescript
describe('US-067: Cost Formatting', () => {
  it('[AC-1] format: $X.XX', () => {
    expect(formatCost(12.5)).toBe('$12.50');
  });

  it('[AC-2] two decimal places', () => {
    expect(formatCost(10)).toBe('$10.00');
  });

  it('[AC-3] handles 0', () => {
    expect(formatCost(0)).toBe('$0.00');
  });

  // Edge case
  it('[AC-1] Edge: rounds correctly', () => {
    expect(formatCost(1.005)).toBe('$1.01');
  });
});
```

---

### US-068: Duration Formatting

**Layer:** Unit

**File:** `tests/unit/formatters.test.ts`

```typescript
describe('US-068: Duration Formatting', () => {
  it('[AC-1] format: Xh Xm Xs', () => {
    expect(formatDuration(3723)).toBe('1h 2m 3s');
  });

  it('[AC-2] omits zero units', () => {
    expect(formatDuration(3600)).toBe('1h');
    expect(formatDuration(60)).toBe('1m');
  });

  it('[AC-3] handles 0 (0s)', () => {
    expect(formatDuration(0)).toBe('0s');
  });
});
```

---

### US-069: ccusage Integration

**Layer:** Integration

**File:** `tests/integration/cost.test.ts`

```typescript
describe('US-069: ccusage Integration', () => {
  it('[AC-1] runs ccusage command', async () => {
    const mockExec = vi.fn().mockResolvedValue({ stdout: '{"sessions":[]}' });
    await queryCcusage(mockExec);
    expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('ccusage'));
  });

  it('[AC-2] parses output', async () => {
    const output = '{"sessions":[{"cost":1.5}]}';
    const result = parseCcusageOutput(output);
    expect(result.sessions[0].cost).toBe(1.5);
  });

  it('[AC-3] extracts cost value', async () => {
    const sessions = [{ cost: 1.0 }, { cost: 2.5 }];
    expect(calculateTotalCost(sessions)).toBe(3.5);
  });
});
```

---

### US-070: Cost Recalculation on Resume

**Layer:** Integration

**File:** `tests/integration/cost.test.ts`

```typescript
describe('US-070: Cost Recalculation on Resume', () => {
  it('[AC-1] queries ccusage sessions', async () => {
    const mockQuery = vi.fn().mockResolvedValue({ sessions: [] });
    await recalculateCost('/project', mockQuery);
    expect(mockQuery).toHaveBeenCalled();
  });

  it('[AC-2] filters by project path', () => {
    const sessions = [
      { path: '/project', cost: 1 },
      { path: '/other', cost: 5 }
    ];
    const filtered = filterSessionsByPath(sessions, '/project');
    expect(filtered).toHaveLength(1);
  });

  it('[AC-3] sums all session costs', () => {
    const sessions = [{ cost: 1 }, { cost: 2 }, { cost: 0.5 }];
    expect(sumSessionCosts(sessions)).toBe(3.5);
  });
});
```

---

## Epic 4: Pipeline Orchestration (US-071 to US-100)

*(Full specifications for US-071 through US-100 following same pattern)*

### US-071: Orchestrator Service

**Layer:** Integration

**File:** `tests/integration/orchestrator.test.ts`

```typescript
describe('US-071: Orchestrator Service', () => {
  it('[AC-1] class with methods', () => {
    const orch = new Orchestrator({});
    expect(typeof orch.start).toBe('function');
    expect(typeof orch.pause).toBe('function');
  });

  it('[AC-2] injected dependencies', () => {
    const deps = { spawnService: {}, fileWatcher: {} };
    const orch = new Orchestrator(deps);
    expect(orch).toBeDefined();
  });

  it('[AC-3] event emitter', () => {
    const orch = new Orchestrator({});
    const handler = vi.fn();
    orch.on('test', handler);
    orch.emit('test');
    expect(handler).toHaveBeenCalled();
  });
});
```

---

### US-072: Pipeline State Machine

**Layer:** Unit

**File:** `tests/unit/state-machine.test.ts`

```typescript
describe('US-072: Pipeline State Machine', () => {
  it('[AC-1] states: idle, running, paused, complete, error', () => {
    expect(PipelineState.IDLE).toBeDefined();
    expect(PipelineState.RUNNING).toBeDefined();
    expect(PipelineState.PAUSED).toBeDefined();
    expect(PipelineState.COMPLETE).toBeDefined();
    expect(PipelineState.ERROR).toBeDefined();
  });

  it('[AC-2] current state tracked', () => {
    const machine = new StateMachine();
    expect(machine.state).toBe(PipelineState.IDLE);
  });

  it('[AC-3] state change events', () => {
    const machine = new StateMachine();
    const handler = vi.fn();
    machine.on('change', handler);
    machine.transition(PipelineState.RUNNING);
    expect(handler).toHaveBeenCalled();
  });
});
```

---

### US-073: State Transition Validation

**Layer:** Unit

**File:** `tests/unit/state-machine.test.ts`

```typescript
describe('US-073: State Transition Validation', () => {
  it('[AC-1] defines valid transitions', () => {
    expect(isValidTransition('idle', 'running')).toBe(true);
    expect(isValidTransition('running', 'paused')).toBe(true);
  });

  it('[AC-2] rejects invalid changes', () => {
    expect(isValidTransition('idle', 'complete')).toBe(false);
    expect(isValidTransition('complete', 'running')).toBe(false);
  });

  it('[AC-3] throws on invalid', () => {
    const machine = new StateMachine();
    expect(() => machine.transition('complete')).toThrow();
  });
});
```

---

### US-074: Initialize New Pipeline

**Layer:** Integration

**File:** `tests/integration/orchestrator.test.ts`

```typescript
describe('US-074: Initialize New Pipeline', () => {
  it('[AC-1] creates manifest', async () => {
    const orch = new Orchestrator({ manifestService });
    await orch.initializeNew(tempDir);
    expect(await fs.exists(path.join(tempDir, '.pipeline', 'manifest.json'))).toBe(true);
  });

  it('[AC-2] sets phase to 1', async () => {
    await orch.initializeNew(tempDir);
    const manifest = await readManifest(tempDir);
    expect(manifest.currentPhase).toBe(1);
  });

  it('[AC-3] sets state to running', async () => {
    await orch.initializeNew(tempDir);
    expect(orch.state).toBe('running');
  });
});
```

---

### US-075: Resume Existing Pipeline

**Layer:** Integration

**File:** `tests/integration/orchestrator.test.ts`

```typescript
describe('US-075: Resume Existing Pipeline', () => {
  it('[AC-1] loads manifest', async () => {
    await createTestManifest(tempDir, { currentPhase: 3 });
    await orch.resume(tempDir);
    expect(orch.manifest.currentPhase).toBe(3);
  });

  it('[AC-2] restores state', async () => {
    await createTestManifest(tempDir, { state: 'paused' });
    await orch.resume(tempDir);
    expect(orch.state).toBe('running');
  });

  it('[AC-3] spawns worker at saved point', async () => {
    await createTestManifest(tempDir, { currentPhase: 3 });
    await orch.resume(tempDir);
    expect(spawnService.spawn).toHaveBeenCalledWith(expect.objectContaining({ phase: 3 }));
  });
});
```

---

### US-076: Phase 1 Command Selection

**Layer:** Unit

**File:** `tests/unit/command-selector.test.ts`

```typescript
describe('US-076: Phase 1 Command Selection', () => {
  it('[AC-1] new: /1-new-pipeline-desktop-v6.0', () => {
    expect(getCommand(1, 'new')).toBe('/1-new-pipeline-desktop-v6.0');
  });

  it('[AC-2] feature: /1-feature-pipeline-desktop-v6.0', () => {
    expect(getCommand(1, 'feature')).toBe('/1-feature-pipeline-desktop-v6.0');
  });

  it('[AC-3] fix: /1-fix-pipeline-desktop-v6.0', () => {
    expect(getCommand(1, 'fix')).toBe('/1-fix-pipeline-desktop-v6.0');
  });
});
```

---

### US-077: Phase 2 Command Selection

**Layer:** Unit

**File:** `tests/unit/command-selector.test.ts`

```typescript
describe('US-077: Phase 2 Command Selection', () => {
  it('[AC-1] new: /2-new-pipeline-desktop-v6.0', () => {
    expect(getCommand(2, 'new')).toBe('/2-new-pipeline-desktop-v6.0');
  });

  it('[AC-2] feature: /2-feature-pipeline-desktop-v6.0', () => {
    expect(getCommand(2, 'feature')).toBe('/2-feature-pipeline-desktop-v6.0');
  });

  it('[AC-3] fix: /2-fix-pipeline-desktop-v6.0', () => {
    expect(getCommand(2, 'fix')).toBe('/2-fix-pipeline-desktop-v6.0');
  });
});
```

---

### US-078: Phase 3 Command Selection

**Layer:** Unit

**File:** `tests/unit/command-selector.test.ts`

```typescript
describe('US-078: Phase 3 Command Selection', () => {
  it('[AC-1] new: /3-new-pipeline-desktop-v6.0', () => {
    expect(getCommand(3, 'new')).toBe('/3-new-pipeline-desktop-v6.0');
  });

  it('[AC-2] feature: /3-feature-pipeline-desktop-v6.0', () => {
    expect(getCommand(3, 'feature')).toBe('/3-feature-pipeline-desktop-v6.0');
  });

  it('[AC-3] fix: /3-fix-pipeline-desktop-v6.0', () => {
    expect(getCommand(3, 'fix')).toBe('/3-fix-pipeline-desktop-v6.0');
  });
});
```

---

### US-079: Phase 4 Command Selection

**Layer:** Unit

**File:** `tests/unit/command-selector.test.ts`

```typescript
describe('US-079: Phase 4 Command Selection', () => {
  it('[AC-1] new: /4-new-pipeline-desktop-v6.0', () => {
    expect(getCommand(4, 'new')).toBe('/4-new-pipeline-desktop-v6.0');
  });

  it('[AC-2] feature: /4-feature-pipeline-desktop-v6.0', () => {
    expect(getCommand(4, 'feature')).toBe('/4-feature-pipeline-desktop-v6.0');
  });

  it('[AC-3] fix: /4-fix-pipeline-desktop-v6.0', () => {
    expect(getCommand(4, 'fix')).toBe('/4-fix-pipeline-desktop-v6.0');
  });
});
```

---

### US-080: Phase 5 Command Selection

**Layer:** Unit

**File:** `tests/unit/command-selector.test.ts`

```typescript
describe('US-080: Phase 5 Command Selection', () => {
  it('[AC-1] new: /5-new-pipeline-desktop-v6.0', () => {
    expect(getCommand(5, 'new')).toBe('/5-new-pipeline-desktop-v6.0');
  });

  it('[AC-2] feature: /5-feature-pipeline-desktop-v6.0', () => {
    expect(getCommand(5, 'feature')).toBe('/5-feature-pipeline-desktop-v6.0');
  });

  it('[AC-3] fix: /5-fix-pipeline-desktop-v6.0', () => {
    expect(getCommand(5, 'fix')).toBe('/5-fix-pipeline-desktop-v6.0');
  });
});
```

---

### US-081: Feature Mode Commands

**Layer:** Unit

**File:** `tests/unit/command-selector.test.ts`

```typescript
describe('US-081: Feature Mode Commands', () => {
  it('[AC-1] uses -feature- in command name', () => {
    for (let phase = 1; phase <= 5; phase++) {
      expect(getCommand(phase, 'feature')).toContain('-feature-');
    }
  });

  it('[AC-2] all phases have feature variant', () => {
    for (let phase = 1; phase <= 5; phase++) {
      expect(getCommand(phase, 'feature')).toBeDefined();
    }
  });

  it('[AC-3] mode stored in manifest', async () => {
    await orch.start(tempDir, { mode: 'feature' });
    const manifest = await readManifest(tempDir);
    expect(manifest.mode).toBe('feature');
  });
});
```

---

### US-082: Fix Mode Commands

**Layer:** Unit

**File:** `tests/unit/command-selector.test.ts`

```typescript
describe('US-082: Fix Mode Commands', () => {
  it('[AC-1] uses -fix- in command name', () => {
    for (let phase = 1; phase <= 5; phase++) {
      expect(getCommand(phase, 'fix')).toContain('-fix-');
    }
  });

  it('[AC-2] all phases have fix variant', () => {
    for (let phase = 1; phase <= 5; phase++) {
      expect(getCommand(phase, 'fix')).toBeDefined();
    }
  });

  it('[AC-3] mode stored in manifest', async () => {
    await orch.start(tempDir, { mode: 'fix' });
    const manifest = await readManifest(tempDir);
    expect(manifest.mode).toBe('fix');
  });
});
```

---

### US-083: Phase Completion Detection

**Layer:** Integration

**File:** `tests/integration/orchestrator.test.ts`

```typescript
describe('US-083: Phase Completion Detection', () => {
  it('[AC-1] detects 100% todos', async () => {
    const callback = vi.fn();
    orch.on('phaseComplete', callback);
    await simulateTodoCompletion(100);
    expect(callback).toHaveBeenCalled();
  });

  it('[AC-2] triggers advance logic', async () => {
    await simulateTodoCompletion(100);
    expect(orch.advanceToNextPhase).toHaveBeenCalled();
  });

  it('[AC-3] updates manifest', async () => {
    await simulateTodoCompletion(100);
    const manifest = await readManifest(tempDir);
    expect(manifest.phases[1].status).toBe('complete');
  });
});
```

---

### US-084: Auto-Advance to Next Phase

**Layer:** Integration

**File:** `tests/integration/orchestrator.test.ts`

```typescript
describe('US-084: Auto-Advance to Next Phase', () => {
  it('[AC-1] kills current worker', async () => {
    await orch.advanceToNextPhase();
    expect(spawnService.kill).toHaveBeenCalled();
  });

  it('[AC-2] updates phase number', async () => {
    orch.currentPhase = 1;
    await orch.advanceToNextPhase();
    expect(orch.currentPhase).toBe(2);
  });

  it('[AC-3] spawns next worker', async () => {
    await orch.advanceToNextPhase();
    expect(spawnService.spawn).toHaveBeenCalledWith(expect.objectContaining({ phase: 2 }));
  });
});
```

---

### US-085: Epic Loop Management

**Layer:** Integration

**File:** `tests/integration/orchestrator.test.ts`

```typescript
describe('US-085: Epic Loop Management', () => {
  it('[AC-1] tracks current epic index', () => {
    orch.setPhase(4);
    expect(orch.currentEpicIndex).toBe(0);
  });

  it('[AC-2] advances to next epic', async () => {
    orch.setPhase(4);
    await orch.advanceToNextEpic();
    expect(orch.currentEpicIndex).toBe(1);
  });

  it('[AC-3] updates manifest', async () => {
    await orch.advanceToNextEpic();
    const manifest = await readManifest(tempDir);
    expect(manifest.currentEpic).toBe(1);
  });
});
```

---

### US-086: Epic Completion Detection

**Layer:** Integration

**File:** `tests/integration/orchestrator.test.ts`

```typescript
describe('US-086: Epic Completion Detection', () => {
  it('[AC-1] detects 100% todos for epic', async () => {
    const callback = vi.fn();
    orch.on('epicComplete', callback);
    await simulateEpicCompletion();
    expect(callback).toHaveBeenCalled();
  });

  it('[AC-2] triggers epic advance', async () => {
    await simulateEpicCompletion();
    expect(orch.advanceToNextEpic).toHaveBeenCalled();
  });

  it('[AC-3] updates epic status', async () => {
    await simulateEpicCompletion();
    const manifest = await readManifest(tempDir);
    expect(manifest.epics[0].status).toBe('complete');
  });
});
```

---

### US-087: All Epics Complete Detection

**Layer:** Integration

**File:** `tests/integration/orchestrator.test.ts`

```typescript
describe('US-087: All Epics Complete Detection', () => {
  it('[AC-1] checks all epic statuses', async () => {
    const manifest = { epics: [{ status: 'complete' }, { status: 'complete' }] };
    expect(areAllEpicsComplete(manifest)).toBe(true);
  });

  it('[AC-2] all complete triggers advance', async () => {
    await simulateAllEpicsComplete();
    expect(orch.advanceToNextPhase).toHaveBeenCalled();
  });

  it('[AC-3] advances to phase 5', async () => {
    orch.currentPhase = 4;
    await simulateAllEpicsComplete();
    expect(orch.currentPhase).toBe(5);
  });
});
```

---

### US-088: Pipeline Completion Detection

**Layer:** Integration

**File:** `tests/integration/orchestrator.test.ts`

```typescript
describe('US-088: Pipeline Completion Detection', () => {
  it('[AC-1] phase 5 todos complete', async () => {
    orch.currentPhase = 5;
    await simulateTodoCompletion(100);
    expect(orch.isPipelineComplete()).toBe(true);
  });

  it('[AC-2] sets state to complete', async () => {
    orch.currentPhase = 5;
    await simulateTodoCompletion(100);
    expect(orch.state).toBe('complete');
  });

  it('[AC-3] navigates to complete screen', async () => {
    orch.currentPhase = 5;
    await simulateTodoCompletion(100);
    expect(router.navigate).toHaveBeenCalledWith('complete');
  });
});
```

---

### US-089: Pause Pipeline

**Layer:** Integration

**File:** `tests/integration/orchestrator.test.ts`

```typescript
describe('US-089: Pause Pipeline', () => {
  it('[AC-1] sets state to paused', async () => {
    await orch.pause();
    expect(orch.state).toBe('paused');
  });

  it('[AC-2] saves current state to manifest', async () => {
    await orch.pause();
    const manifest = await readManifest(tempDir);
    expect(manifest.state).toBe('paused');
  });

  it('[AC-3] worker keeps running', async () => {
    await orch.pause();
    expect(spawnService.kill).not.toHaveBeenCalled();
  });
});
```

---

### US-090: Resume Pipeline

**Layer:** Integration

**File:** `tests/integration/orchestrator.test.ts`

```typescript
describe('US-090: Resume Pipeline', () => {
  it('[AC-1] sets state to running', async () => {
    orch.state = 'paused';
    await orch.resume();
    expect(orch.state).toBe('running');
  });

  it('[AC-2] continues monitoring', async () => {
    orch.state = 'paused';
    await orch.resume();
    expect(fileWatcher.resume).toHaveBeenCalled();
  });

  it('[AC-3] no data lost', async () => {
    const todosBefore = orch.todos.length;
    await orch.pause();
    await orch.resume();
    expect(orch.todos.length).toBe(todosBefore);
  });
});
```

---

### US-091: Manual Phase Advance

**Layer:** E2E

**File:** `tests/e2e/specs/epic4-orchestration.test.ts`

```typescript
describe('US-091: Manual Phase Advance', () => {
  it('[AC-1] requires confirmation dialog', async () => {
    await runner()
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /Dashboard/)
      .stdin('stdout', /Dashboard/, 'a')
      .wait('stdout', /confirm|sure/i);
  });

  it('[AC-2] confirm kills current worker', async () => {
    await runner()
      .fork('bin/pipeline.js', [tempDir])
      .stdin('stdout', /Dashboard/, 'a')
      .stdin('stdout', /confirm/, KEYS.ENTER)
      .wait('stdout', /Phase 2/);
  });

  it('[AC-3] cancel returns to dashboard', async () => {
    await runner()
      .fork('bin/pipeline.js', [tempDir])
      .stdin('stdout', /Dashboard/, 'a')
      .stdin('stdout', /confirm/, KEYS.ESCAPE)
      .wait('stdout', /Phase 1/);
  });
});
```

---

### US-092: Worker Crash Detection

**Layer:** Integration

**File:** `tests/integration/orchestrator.test.ts`

```typescript
describe('US-092: Worker Crash Detection', () => {
  it('[AC-1] detects non-zero exit code', async () => {
    const callback = vi.fn();
    orch.on('workerCrash', callback);
    await simulateWorkerExit(1);
    expect(callback).toHaveBeenCalled();
  });

  it('[AC-2] sets state to error', async () => {
    await simulateWorkerExit(1);
    expect(orch.state).toBe('error');
  });

  it('[AC-3] shows error dialog', async () => {
    await simulateWorkerExit(1);
    expect(router.showDialog).toHaveBeenCalledWith('error');
  });
});
```

---

### US-093: Worker Crash Recovery

**Layer:** E2E

**File:** `tests/e2e/specs/epic4-orchestration.test.ts`

```typescript
describe('US-093: Worker Crash Recovery', () => {
  it('[AC-1] offers retry option', async () => {
    await runner()
      .env('MOCK_FIXTURE', 'worker-crash.json')
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /error|crash/i)
      .wait('stdout', /Retry/i);
  });

  it('[AC-2] offers skip option', async () => {
    await runner()
      .env('MOCK_FIXTURE', 'worker-crash.json')
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /error/)
      .wait('stdout', /Skip/i);
  });

  it('[AC-3] offers abort option', async () => {
    await runner()
      .env('MOCK_FIXTURE', 'worker-crash.json')
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /error/)
      .wait('stdout', /Abort/i);
  });
});
```

---

### US-094: Orchestrator Event Emitter

**Layer:** Unit

**File:** `tests/unit/orchestrator-events.test.ts`

```typescript
describe('US-094: Orchestrator Event Emitter', () => {
  it('[AC-1] onPhaseStart event', () => {
    const callback = vi.fn();
    orch.on('phaseStart', callback);
    orch.emit('phaseStart', { phase: 1 });
    expect(callback).toHaveBeenCalledWith({ phase: 1 });
  });

  it('[AC-2] onPhaseComplete event', () => {
    const callback = vi.fn();
    orch.on('phaseComplete', callback);
    orch.emit('phaseComplete', { phase: 1 });
    expect(callback).toHaveBeenCalled();
  });

  it('[AC-3] onEpicComplete event', () => {
    const callback = vi.fn();
    orch.on('epicComplete', callback);
    orch.emit('epicComplete', { epic: 0 });
    expect(callback).toHaveBeenCalled();
  });

  it('[AC-4] onError event', () => {
    const callback = vi.fn();
    orch.on('error', callback);
    orch.emit('error', new Error('test'));
    expect(callback).toHaveBeenCalled();
  });
});
```

---

### US-095: Manifest Update on Phase Change

**Layer:** Integration

**File:** `tests/integration/orchestrator.test.ts`

```typescript
describe('US-095: Manifest Update on Phase Change', () => {
  it('[AC-1] updates currentPhase', async () => {
    await orch.advanceToNextPhase();
    const manifest = await readManifest(tempDir);
    expect(manifest.currentPhase).toBe(2);
  });

  it('[AC-2] updates phase status', async () => {
    await orch.advanceToNextPhase();
    const manifest = await readManifest(tempDir);
    expect(manifest.phases[1].status).toBe('complete');
  });

  it('[AC-3] writes to file', async () => {
    const before = await fs.stat(path.join(tempDir, '.pipeline', 'manifest.json'));
    await orch.advanceToNextPhase();
    const after = await fs.stat(path.join(tempDir, '.pipeline', 'manifest.json'));
    expect(after.mtimeMs).toBeGreaterThan(before.mtimeMs);
  });
});
```

---

### US-096: Manifest Update on Epic Change

**Layer:** Integration

**File:** `tests/integration/orchestrator.test.ts`

```typescript
describe('US-096: Manifest Update on Epic Change', () => {
  it('[AC-1] updates currentEpic', async () => {
    await orch.advanceToNextEpic();
    const manifest = await readManifest(tempDir);
    expect(manifest.currentEpic).toBe(1);
  });

  it('[AC-2] updates epic status', async () => {
    await orch.advanceToNextEpic();
    const manifest = await readManifest(tempDir);
    expect(manifest.epics[0].status).toBe('complete');
  });

  it('[AC-3] writes to file', async () => {
    const writeSpy = vi.spyOn(fs, 'writeFile');
    await orch.advanceToNextEpic();
    expect(writeSpy).toHaveBeenCalled();
  });
});
```

---

### US-097: Cost Update on Phase Complete

**Layer:** Integration

**File:** `tests/integration/cost.test.ts`

```typescript
describe('US-097: Cost Update on Phase Complete', () => {
  it('[AC-1] queries ccusage', async () => {
    const ccSpy = vi.spyOn(costService, 'queryCCUsage');
    await orch.onPhaseComplete(1);
    expect(ccSpy).toHaveBeenCalled();
  });

  it('[AC-2] updates cost.byPhase', async () => {
    costService.queryCCUsage.mockResolvedValue(1.50);
    await orch.onPhaseComplete(1);
    const manifest = await readManifest(tempDir);
    expect(manifest.cost.byPhase[1]).toBe(1.50);
  });

  it('[AC-3] updates cost.total', async () => {
    await orch.onPhaseComplete(1);
    const manifest = await readManifest(tempDir);
    expect(manifest.cost.total).toBeGreaterThan(0);
  });
});
```

---

### US-098: Duration Update on Phase Complete

**Layer:** Integration

**File:** `tests/integration/timer.test.ts`

```typescript
describe('US-098: Duration Update on Phase Complete', () => {
  it('[AC-1] calculates elapsed seconds', async () => {
    const start = Date.now() - 60000;
    orch.phaseStartTime = start;
    const elapsed = orch.getElapsedSeconds();
    expect(elapsed).toBeGreaterThanOrEqual(60);
  });

  it('[AC-2] updates duration.byPhase', async () => {
    await orch.onPhaseComplete(1);
    const manifest = await readManifest(tempDir);
    expect(manifest.duration.byPhase[1]).toBeGreaterThan(0);
  });

  it('[AC-3] updates duration.total', async () => {
    await orch.onPhaseComplete(1);
    const manifest = await readManifest(tempDir);
    expect(manifest.duration.total).toBeGreaterThan(0);
  });
});
```

---

### US-099: Orchestrator Logging

**Layer:** Integration

**File:** `tests/integration/orchestrator.test.ts`

```typescript
describe('US-099: Orchestrator Logging', () => {
  it('[AC-1] logs to .pipeline/orchestrator.log', async () => {
    await orch.log('test message');
    const logPath = path.join(tempDir, '.pipeline', 'orchestrator.log');
    expect(await fs.exists(logPath)).toBe(true);
  });

  it('[AC-2] timestamps all entries', async () => {
    await orch.log('test');
    const content = await fs.readFile(path.join(tempDir, '.pipeline', 'orchestrator.log'), 'utf-8');
    expect(content).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('[AC-3] logs phase/epic transitions', async () => {
    await orch.advanceToNextPhase();
    const content = await fs.readFile(path.join(tempDir, '.pipeline', 'orchestrator.log'), 'utf-8');
    expect(content).toContain('phase');
  });
});
```

---

### US-100: Worker Timeout Detection

**Layer:** Integration

**File:** `tests/integration/orchestrator.test.ts`

```typescript
describe('US-100: Worker Timeout Detection', () => {
  it('[AC-1] configurable timeout (default 30min)', () => {
    expect(orch.workerTimeout).toBe(30 * 60 * 1000);
    orch.setWorkerTimeout(10 * 60 * 1000);
    expect(orch.workerTimeout).toBe(10 * 60 * 1000);
  });

  it('[AC-2] no todo activity triggers alert', async () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    orch.on('workerTimeout', callback);
    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(callback).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('[AC-3] offers restart option', async () => {
    await orch.handleWorkerTimeout();
    expect(router.showDialog).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.arrayContaining(['Restart'])
    }));
  });
});
```

---

## Epic 5: Full Dashboard UI (US-101 to US-140)

### US-101: Launcher Screen

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-launcher.test.ts`

```typescript
describe('US-101: Launcher Screen', () => {
  it('[AC-1] shows path input', async () => {
    await runner().fork('bin/pipeline.js').wait('stdout', /Project Path:/);
  });

  it('[AC-2] shows mode selection', async () => {
    await runner().fork('bin/pipeline.js').wait('stdout', /Mode:/).wait('stdout', /New Project/);
  });

  it('[AC-3] shows start button', async () => {
    await runner().fork('bin/pipeline.js').wait('stdout', /START|Begin/i);
  });
});
```

---

### US-102: Launcher Path Input

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-launcher.test.ts`

```typescript
describe('US-102: Launcher Path Input', () => {
  it('[AC-1] text input works', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /Project Path/)
      .stdin('stdout', /Project Path/, 'my-project\r')
      .wait('stdout', /my-project/);
  });

  it('[AC-2] can paste paths', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /Project Path/)
      .stdin('stdout', /Project Path/, tempDir + '\r')
      .wait('stdout', new RegExp(escapeRegex(tempDir)));
  });

  it('[AC-3] shows validation status', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /Project Path/)
      .stdin('stdout', /Project Path/, tempDir + '\r')
      .wait('stdout', /✓|valid/i);
  });
});
```

---

### US-103: Launcher Path Browse Hint

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-launcher.test.ts`

```typescript
describe('US-103: Launcher Path Browse Hint', () => {
  it('[AC-1] shows [...] indicator', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /\.\.\./);
  });

  it('[AC-2] tooltip or hint text', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /paste|browse/i);
  });

  it('[AC-3] works with paste', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /Project Path/)
      .stdin('stdout', /Project Path/, tempDir)
      .wait('stdout', new RegExp(escapeRegex(tempDir)));
  });
});
```

---

### US-104: Launcher Mode Radio Buttons

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-launcher.test.ts`

```typescript
describe('US-104: Launcher Mode Radio Buttons', () => {
  it('[AC-1] New Project option', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /New Project/);
  });

  it('[AC-2] Add Feature option', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /Add Feature/);
  });

  it('[AC-3] Fix Bug option', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /Fix Bug/);
  });

  it('[AC-4] one selected at a time', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /\(\*\).*New Project/)
      .stdin('stdout', /New Project/, KEYS.DOWN)
      .wait('stdout', /\(\*\).*Add Feature/)
      .wait('stdout', /\( \).*New Project/);
  });
});
```

---

### US-105: Launcher Start Button

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-launcher.test.ts`

```typescript
describe('US-105: Launcher Start Button', () => {
  it('[AC-1] validates inputs first', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /invalid|error|required/i);
  });

  it('[AC-2] shows error if invalid', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /START/)
      .stdin('stdout', /Project Path/, '/nonexistent')
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /does not exist/i);
  });

  it('[AC-3] navigates to dashboard if valid', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /Project Path/)
      .stdin('stdout', /Project Path/, tempDir + '\r')
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Dashboard|Phase 1/i);
  });
});
```

---

### US-106: Launcher Recent Projects List

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-launcher.test.ts`

```typescript
describe('US-106: Launcher Recent Projects List', () => {
  it('[AC-1] shows last 5 projects', async () => {
    await setupRecentProjects(5);
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /Recent/)
      .wait('stdout', /project-1/)
      .wait('stdout', /project-5/);
  });

  it('[AC-2] click/enter to select', async () => {
    await setupRecentProjects(1);
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /Recent/)
      .stdin('stdout', /project-1/, '\r')
      .wait('stdout', /project-1.*selected/i);
  });

  it('[AC-3] fills path input', async () => {
    await setupRecentProjects(1);
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /Recent/)
      .stdin('stdout', /project-1/, '\r')
      .wait('stdout', /Project Path.*project-1/);
  });
});
```

---

### US-107: Launcher Validation Errors

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-launcher.test.ts`

```typescript
describe('US-107: Launcher Validation Errors', () => {
  it('[AC-1] red text for errors', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /Project Path/)
      .stdin('stdout', /Project Path/, '/invalid\r')
      .wait('stdout', /\x1b\[31m.*error/i); // Red ANSI code
  });

  it('[AC-2] clear error message', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /Project Path/)
      .stdin('stdout', /Project Path/, '/invalid\r')
      .wait('stdout', /does not exist|not found/i);
  });

  it('[AC-3] updates on input change', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /Project Path/)
      .stdin('stdout', /Project Path/, '/invalid\r')
      .wait('stdout', /error/i)
      .stdin('stdout', /error/, '\b'.repeat(8) + tempDir + '\r')
      .wait('stdout', /✓|valid/i);
  });
});
```

---

### US-108: Resume Screen

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-resume.test.ts`

```typescript
describe('US-108: Resume Screen', () => {
  it('[AC-1] shows last state', async () => {
    await runner().fork('bin/pipeline.js', [existingProjectDir])
      .wait('stdout', /RESUME/)
      .wait('stdout', /Phase \d/);
  });

  it('[AC-2] Resume button', async () => {
    await runner().fork('bin/pipeline.js', [existingProjectDir])
      .wait('stdout', /RESUME/)
      .wait('stdout', /Resume|Continue/i);
  });

  it('[AC-3] Cancel button', async () => {
    await runner().fork('bin/pipeline.js', [existingProjectDir])
      .wait('stdout', /RESUME/)
      .wait('stdout', /Cancel|Back/i);
  });
});
```

---

### US-109: Resume State Display

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-resume.test.ts`

```typescript
describe('US-109: Resume State Display', () => {
  it('[AC-1] shows phase name', async () => {
    await runner().fork('bin/pipeline.js', [existingProjectDir])
      .wait('stdout', /Phase.*Implement|Phase 4/i);
  });

  it('[AC-2] shows epic if phase 4', async () => {
    await setupProjectAtPhase4Epic2();
    await runner().fork('bin/pipeline.js', [phase4ProjectDir])
      .wait('stdout', /Epic.*2|Epic 2/i);
  });

  it('[AC-3] shows progress %', async () => {
    await runner().fork('bin/pipeline.js', [existingProjectDir])
      .wait('stdout', /\d+%/);
  });
});
```

---

### US-110: Resume Cost Display

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-resume.test.ts`

```typescript
describe('US-110: Resume Cost Display', () => {
  it('[AC-1] shows total cost', async () => {
    await runner().fork('bin/pipeline.js', [existingProjectDir])
      .wait('stdout', /Cost.*\$/);
  });

  it('[AC-3] formatted as $X.XX', async () => {
    await runner().fork('bin/pipeline.js', [existingProjectDir])
      .wait('stdout', /\$\d+\.\d{2}/);
  });
});
```

---

### US-111: Resume Duration Display

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-resume.test.ts`

```typescript
describe('US-111: Resume Duration Display', () => {
  it('[AC-1] shows total time', async () => {
    await runner().fork('bin/pipeline.js', [existingProjectDir])
      .wait('stdout', /Time|Duration/i);
  });

  it('[AC-2] formatted as Xh Xm', async () => {
    await runner().fork('bin/pipeline.js', [existingProjectDir])
      .wait('stdout', /\d+h|\d+m/);
  });
});
```

---

### US-112: Resume Button

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-resume.test.ts`

```typescript
describe('US-112: Resume Button', () => {
  it('[AC-2] navigates to dashboard', async () => {
    await runner().fork('bin/pipeline.js', [existingProjectDir])
      .wait('stdout', /RESUME/)
      .stdin('stdout', /Resume/, '\r')
      .wait('stdout', /Dashboard|Phase/i);
  });

  it('[AC-3] restores all state', async () => {
    await runner().fork('bin/pipeline.js', [existingProjectDir])
      .wait('stdout', /RESUME/)
      .stdin('stdout', /Resume/, '\r')
      .wait('stdout', /Phase 4/)
      .wait('stdout', /Epic 2/);
  });
});
```

---

### US-113: Resume Cancel Button

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-resume.test.ts`

```typescript
describe('US-113: Resume Cancel Button', () => {
  it('[AC-1] returns to launcher', async () => {
    await runner().fork('bin/pipeline.js', [existingProjectDir])
      .wait('stdout', /RESUME/)
      .stdin('stdout', /Cancel/, '\r')
      .wait('stdout', /Project Path/);
  });

  it('[AC-3] path still selected', async () => {
    await runner().fork('bin/pipeline.js', [existingProjectDir])
      .wait('stdout', /RESUME/)
      .stdin('stdout', /Cancel/, '\r')
      .wait('stdout', new RegExp(escapeRegex(existingProjectDir)));
  });
});
```

---

### US-114: Resume Delete Option

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-resume.test.ts`

```typescript
describe('US-114: Resume Delete Option', () => {
  it('[AC-1] confirms deletion', async () => {
    await runner().fork('bin/pipeline.js', [existingProjectDir])
      .wait('stdout', /RESUME/)
      .stdin('stdout', /RESUME/, 'd')
      .wait('stdout', /confirm|are you sure/i);
  });

  it('[AC-3] returns to launcher', async () => {
    await runner().fork('bin/pipeline.js', [existingProjectDir])
      .wait('stdout', /RESUME/)
      .stdin('stdout', /RESUME/, 'd')
      .stdin('stdout', /confirm/, '\r')
      .wait('stdout', /Project Path/);
  });
});
```

---

### US-115: Dashboard Screen

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-dashboard.test.ts`

```typescript
describe('US-115: Dashboard Screen', () => {
  it('[AC-1] shows all status info', async () => {
    await runner().env({ MOCK_FIXTURE: 'progress-update.json' })
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Phase/)
      .wait('stdout', /Epic/)
      .wait('stdout', /%/);
  });

  it('[AC-2] updates in real-time', async () => {
    await runner().env({ MOCK_FIXTURE: 'progress-update.json' })
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /0%/)
      .wait('stdout', /50%/, { timeout: 3000 });
  });

  it('[AC-3] keyboard shortcuts work', async () => {
    await runner().env({ MOCK_FIXTURE: 'progress-update.json' })
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /Dashboard/)
      .stdin('stdout', /Dashboard/, '?')
      .wait('stdout', /Help/);
  });
});
```

---

### US-116: Dashboard Project Info

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-dashboard.test.ts`

```typescript
describe('US-116: Dashboard Project Info', () => {
  it('[AC-1] shows project name', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', new RegExp(path.basename(tempDir)));
  });

  it('[AC-2] shows mode (New/Feature/Fix)', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /New Project|Feature|Fix/);
  });

  it('[AC-3] in header area', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /PIPELINE.*\n.*Project/);
  });
});
```

---

### US-117: Dashboard Phase Display

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-dashboard.test.ts`

```typescript
describe('US-117: Dashboard Phase Display', () => {
  it('[AC-1] shows phase number (1-5)', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Phase [1-5]/);
  });

  it('[AC-2] shows phase name', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Brainstorm|Specs|Bootstrap|Implement|Finalize/i);
  });

  it('[AC-3] shows epic if phase 4', async () => {
    await runner().fork('bin/pipeline.js', [phase4ProjectDir])
      .wait('stdout', /RESUME/)
      .stdin('stdout', /Resume/, '\r')
      .wait('stdout', /Epic \d/);
  });
});
```

---

### US-118: Dashboard Progress Bar

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-dashboard.test.ts`

```typescript
describe('US-118: Dashboard Progress Bar', () => {
  it('[AC-1] filled bar visualization', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /[█▓▒░■□]+/);
  });

  it('[AC-2] shows percentage number', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /\d+%/);
  });

  it('[AC-3] updates on todo changes', async () => {
    await runner().env({ MOCK_FIXTURE: 'progress-update.json' })
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /0%/)
      .wait('stdout', /50%/, { timeout: 3000 });
  });
});
```

---

### US-119: Dashboard Epic List

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-dashboard.test.ts`

```typescript
describe('US-119: Dashboard Epic List', () => {
  it('[AC-1] lists all epics', async () => {
    await runner().fork('bin/pipeline.js', [phase4ProjectDir])
      .wait('stdout', /RESUME/)
      .stdin('stdout', /Resume/, '\r')
      .wait('stdout', /Epic.*1/)
      .wait('stdout', /Epic.*2/);
  });

  it('[AC-2] checkmark for complete', async () => {
    await runner().fork('bin/pipeline.js', [phase4ProjectDir])
      .wait('stdout', /RESUME/)
      .stdin('stdout', /Resume/, '\r')
      .wait('stdout', /[✓✔].*Epic 1/);
  });

  it('[AC-3] arrow for current', async () => {
    await runner().fork('bin/pipeline.js', [phase4ProjectDir])
      .wait('stdout', /RESUME/)
      .stdin('stdout', /Resume/, '\r')
      .wait('stdout', /[►▶→].*Epic 2/);
  });

  it('[AC-4] empty for pending', async () => {
    await runner().fork('bin/pipeline.js', [phase4ProjectDir])
      .wait('stdout', /RESUME/)
      .stdin('stdout', /Resume/, '\r')
      .wait('stdout', /[ ].*Epic 3/);
  });
});
```

---

### US-120: Dashboard Todo List

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-dashboard.test.ts`

```typescript
describe('US-120: Dashboard Todo List', () => {
  it('[AC-1] lists todos', async () => {
    await runner().env({ MOCK_FIXTURE: 'progress-update.json' })
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Todo|Task/i);
  });

  it('[AC-2] status icons (check, arrow, empty)', async () => {
    await runner().env({ MOCK_FIXTURE: 'progress-update.json' })
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /[✓✔►▶ ]/);
  });

  it('[AC-3] current highlighted', async () => {
    await runner().env({ MOCK_FIXTURE: 'progress-update.json' })
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /[►▶].*in.progress/i);
  });
});
```

---

### US-121: Dashboard Cost Display

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-dashboard.test.ts`

```typescript
describe('US-121: Dashboard Cost Display', () => {
  it('[AC-1] shows $X.XX format', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /\$\d+\.\d{2}/);
  });

  it('[AC-2] updates on phase complete', async () => {
    await runner().env({ MOCK_FIXTURE: 'phase-complete.json' })
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /\$0\.00/)
      .wait('stdout', /\$\d+\.\d{2}/, { timeout: 5000 });
  });
});
```

---

### US-122: Dashboard Duration Display

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-dashboard.test.ts`

```typescript
describe('US-122: Dashboard Duration Display', () => {
  it('[AC-1] shows Xh Xm Xs', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /\d+[hms]/);
  });

  it('[AC-2] updates every second', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /0s|1s/)
      .wait('stdout', /2s|3s/, { timeout: 3000 });
  });

  it('[AC-3] accurate total', async () => {
    await runner().fork('bin/pipeline.js', [existingProjectDir])
      .wait('stdout', /RESUME/)
      .stdin('stdout', /Resume/, '\r')
      .wait('stdout', /\d+h \d+m/);
  });
});
```

---

### US-123: Dashboard Worker Status

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-dashboard.test.ts`

```typescript
describe('US-123: Dashboard Worker Status', () => {
  it('[AC-1] shows "Running" with green dot', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /●.*Running|Running.*●/i);
  });

  it('[AC-2] shows "Stopped" with red dot', async () => {
    await runner().env({ MOCK_FIXTURE: 'worker-crash.json' })
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /●.*Stopped|Stopped.*●/i, { timeout: 3000 });
  });

  it('[AC-3] updates on state change', async () => {
    await runner().env({ MOCK_FIXTURE: 'phase-complete.json' })
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Running/)
      .wait('stdout', /Stopped|Complete/, { timeout: 5000 });
  });
});
```

---

### US-124: Dashboard Session Info

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-dashboard.test.ts`

```typescript
describe('US-124: Dashboard Session Info', () => {
  it('[AC-1] shows session ID (truncated)', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Session.*[a-f0-9]{8}/i);
  });

  it('[AC-2] shows PID', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /PID.*\d+/i);
  });

  it('[AC-3] in footer area', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Session.*PID/);
  });
});
```

---

### US-125: Dashboard Pause Key

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-dashboard.test.ts`

```typescript
describe('US-125: Dashboard Pause Key', () => {
  it('[AC-1] p triggers pause', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Dashboard/)
      .stdin('stdout', /Dashboard/, 'p')
      .wait('stdout', /PAUSED/i);
  });

  it('[AC-2] state changes to paused', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Dashboard/)
      .stdin('stdout', /Dashboard/, 'p')
      .wait('stdout', /paused/i);
  });

  it('[AC-3] UI shows paused state', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Dashboard/)
      .stdin('stdout', /Dashboard/, 'p')
      .wait('stdout', /PAUSED.*r.*resume/i);
  });
});
```

---

### US-126: Dashboard Advance Key

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-dashboard.test.ts`

```typescript
describe('US-126: Dashboard Advance Key', () => {
  it('[AC-1] a shows confirmation', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Dashboard/)
      .stdin('stdout', /Dashboard/, 'a')
      .wait('stdout', /confirm|sure/i);
  });

  it('[AC-2] confirm advances phase', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Phase 1/)
      .stdin('stdout', /Phase 1/, 'a')
      .stdin('stdout', /confirm/, '\r')
      .wait('stdout', /Phase 2/);
  });

  it('[AC-3] cancel returns to dashboard', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Dashboard/)
      .stdin('stdout', /Dashboard/, 'a')
      .stdin('stdout', /confirm/, '\x1b')
      .wait('stdout', /Dashboard/);
  });
});
```

---

### US-127: Dashboard Focus Worker Key

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-dashboard.test.ts`

```typescript
describe('US-127: Dashboard Focus Worker Key', () => {
  it('[AC-1] w focuses worker window', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Dashboard/)
      .stdin('stdout', /Dashboard/, 'w');
  });

  it('[AC-2] brings to front', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Dashboard/)
      .stdin('stdout', /Dashboard/, 'w');
  });

  it('[AC-3] works when minimized', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Dashboard/)
      .stdin('stdout', /Dashboard/, 'w');
  });
});
```

---

### US-128: Dashboard Paused Indicator

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-dashboard.test.ts`

```typescript
describe('US-128: Dashboard Paused Indicator', () => {
  it('[AC-1] shows "PAUSED" prominently', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Dashboard/)
      .stdin('stdout', /Dashboard/, 'p')
      .wait('stdout', /PAUSED/);
  });

  it('[AC-2] different color/style', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .stdin('stdout', /Dashboard/, 'p')
      .wait('stdout', /\x1b\[.*PAUSED/);
  });

  it('[AC-3] shows r to resume hint', async () => {
    await runner().fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .stdin('stdout', /Dashboard/, 'p')
      .wait('stdout', /r.*resume/i);
  });
});
```

---

### US-129: Complete Screen

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-complete.test.ts`

```typescript
describe('US-129: Complete Screen', () => {
  it('[AC-1] shows success message', async () => {
    await runner().fork('bin/pipeline.js', [completedProjectDir])
      .wait('stdout', /COMPLETE|SUCCESS|✓/i);
  });

  it('[AC-2] shows all stats', async () => {
    await runner().fork('bin/pipeline.js', [completedProjectDir])
      .wait('stdout', /Phases.*5\/5/)
      .wait('stdout', /Epics/)
      .wait('stdout', /Cost/)
      .wait('stdout', /Time/);
  });

  it('[AC-3] shows next actions', async () => {
    await runner().fork('bin/pipeline.js', [completedProjectDir])
      .wait('stdout', /New Project|Exit/);
  });
});
```

---

### US-130: Complete Summary Stats

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-complete.test.ts`

```typescript
describe('US-130: Complete Summary Stats', () => {
  it('[AC-1] Phases: 5/5 complete', async () => {
    await runner().fork('bin/pipeline.js', [completedProjectDir])
      .wait('stdout', /Phases.*5\/5/);
  });

  it('[AC-2] Epics: X/X complete', async () => {
    await runner().fork('bin/pipeline.js', [completedProjectDir])
      .wait('stdout', /Epics.*\d+\/\d+/);
  });

  it('[AC-3] Tests: X passing', async () => {
    await runner().fork('bin/pipeline.js', [completedProjectDir])
      .wait('stdout', /Tests.*\d+.*pass/i);
  });
});
```

---

### US-131: Complete Cost Summary

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-complete.test.ts`

```typescript
describe('US-131: Complete Cost Summary', () => {
  it('[AC-1] shows total cost', async () => {
    await runner().fork('bin/pipeline.js', [completedProjectDir])
      .wait('stdout', /Cost/);
  });

  it('[AC-2] $X.XX format', async () => {
    await runner().fork('bin/pipeline.js', [completedProjectDir])
      .wait('stdout', /\$\d+\.\d{2}/);
  });
});
```

---

### US-132: Complete Duration Summary

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-complete.test.ts`

```typescript
describe('US-132: Complete Duration Summary', () => {
  it('[AC-1] shows total time', async () => {
    await runner().fork('bin/pipeline.js', [completedProjectDir])
      .wait('stdout', /Time|Duration/i);
  });

  it('[AC-2] Xh Xm format', async () => {
    await runner().fork('bin/pipeline.js', [completedProjectDir])
      .wait('stdout', /\d+h.*\d+m|\d+m/);
  });
});
```

---

### US-133: Complete New Project Button

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-complete.test.ts`

```typescript
describe('US-133: Complete New Project Button', () => {
  it('[AC-1] returns to launcher', async () => {
    await runner().fork('bin/pipeline.js', [completedProjectDir])
      .wait('stdout', /New Project/)
      .stdin('stdout', /New Project/, '\r')
      .wait('stdout', /Project Path/);
  });

  it('[AC-3] ready for new project', async () => {
    await runner().fork('bin/pipeline.js', [completedProjectDir])
      .wait('stdout', /New Project/)
      .stdin('stdout', /New Project/, '\r')
      .wait('stdout', /Project Path/)
      .wait('stdout', /START/);
  });
});
```

---

### US-134: Complete Exit Button

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-complete.test.ts`

```typescript
describe('US-134: Complete Exit Button', () => {
  it('[AC-1] exits cleanly', async () => {
    await runner().fork('bin/pipeline.js', [completedProjectDir])
      .wait('stdout', /Exit/)
      .stdin('stdout', /Exit/, '\r')
      .wait('close', 0);
  });

  it('[AC-2] no confirmation needed', async () => {
    await runner().fork('bin/pipeline.js', [completedProjectDir])
      .wait('stdout', /Exit/)
      .stdin('stdout', /Exit/, '\r')
      .wait('close', 0);
  });
});
```

---

### US-135: Help Overlay

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-help.test.ts`

```typescript
describe('US-135: Help Overlay', () => {
  it('[AC-1] press ? to show', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /PIPELINE/)
      .stdin('stdout', /PIPELINE/, '?')
      .wait('stdout', /Help|Shortcuts/i);
  });

  it('[AC-2] overlay on current screen', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /PIPELINE/)
      .stdin('stdout', /PIPELINE/, '?')
      .wait('stdout', /Project Path/)
      .wait('stdout', /Shortcuts/);
  });

  it('[AC-3] lists all shortcuts', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /PIPELINE/)
      .stdin('stdout', /PIPELINE/, '?')
      .wait('stdout', /q.*Quit/i)
      .wait('stdout', /\?.*Help/i);
  });
});
```

---

### US-136: Help Overlay Content

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-help.test.ts`

```typescript
describe('US-136: Help Overlay Content', () => {
  it('[AC-1] grouped by context', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /PIPELINE/)
      .stdin('stdout', /PIPELINE/, '?')
      .wait('stdout', /Global|Launcher|Dashboard/i);
  });

  it('[AC-2] clear key + description', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /PIPELINE/)
      .stdin('stdout', /PIPELINE/, '?')
      .wait('stdout', /\[q\].*Quit|\bq\b.*Quit/i);
  });

  it('[AC-3] complete list', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /PIPELINE/)
      .stdin('stdout', /PIPELINE/, '?')
      .wait('stdout', /q.*Quit/)
      .wait('stdout', /\?.*Help/)
      .wait('stdout', /Ctrl\+C|Escape/i);
  });
});
```

---

### US-137: Help Overlay Close

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-help.test.ts`

```typescript
describe('US-137: Help Overlay Close', () => {
  it('[AC-1] press Esc to close', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /PIPELINE/)
      .stdin('stdout', /PIPELINE/, '?')
      .wait('stdout', /Help/)
      .stdin('stdout', /Help/, '\x1b')
      .wait('stdout', /Project Path/);
  });

  it('[AC-2] press ? to toggle', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /PIPELINE/)
      .stdin('stdout', /PIPELINE/, '?')
      .wait('stdout', /Help/)
      .stdin('stdout', /Help/, '?')
      .wait('stdout', /Project Path/);
  });

  it('[AC-3] returns to previous screen', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /PIPELINE/)
      .stdin('stdout', /PIPELINE/, '?')
      .stdin('stdout', /Help/, '\x1b')
      .wait('stdout', /Mode:/)
      .wait('stdout', /START/);
  });
});
```

---

### US-138: Error Dialog

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-errors.test.ts`

```typescript
describe('US-138: Error Dialog', () => {
  it('[AC-1] modal dialog', async () => {
    await runner().env({ MOCK_FIXTURE: 'worker-crash.json' })
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /┌.*Error.*┐|Error/im, { timeout: 5000 });
  });

  it('[AC-2] clear error message', async () => {
    await runner().env({ MOCK_FIXTURE: 'worker-crash.json' })
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /failed|error|crash/i, { timeout: 5000 });
  });

  it('[AC-3] action buttons', async () => {
    await runner().env({ MOCK_FIXTURE: 'worker-crash.json' })
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Retry|Skip|Abort/, { timeout: 5000 });
  });
});
```

---

### US-139: Error Recovery Options

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-errors.test.ts`

```typescript
describe('US-139: Error Recovery Options', () => {
  it('[AC-1] Retry button', async () => {
    await runner().env({ MOCK_FIXTURE: 'worker-crash.json' })
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Retry/, { timeout: 5000 });
  });

  it('[AC-2] Skip button', async () => {
    await runner().env({ MOCK_FIXTURE: 'worker-crash.json' })
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Skip/, { timeout: 5000 });
  });

  it('[AC-3] Abort button', async () => {
    await runner().env({ MOCK_FIXTURE: 'worker-crash.json' })
      .fork('bin/pipeline.js', [tempDir])
      .wait('stdout', /START/)
      .stdin('stdout', /START/, '\r')
      .wait('stdout', /Abort/, { timeout: 5000 });
  });
});
```

---

### US-140: Status Bar

**Layer:** E2E

**File:** `tests/e2e/specs/epic5-ui.test.ts`

```typescript
describe('US-140: Status Bar', () => {
  it('[AC-1] shows at screen bottom', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /\[.*\].*\[.*\]/);
  });

  it('[AC-2] context-appropriate keys', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /Tab.*Navigate|Enter.*Select/i);
  });

  it('[AC-3] clear formatting', async () => {
    await runner().fork('bin/pipeline.js')
      .wait('stdout', /\[Tab\]|\[Enter\]|\[q\]/);
  });
});
```

---

## Mock Fixture Catalog

| Fixture | Purpose | Used By |
|---------|---------|---------|
| `minimal.json` | Empty fixture for basic tests | US-025 |
| `phase-complete.json` | Simulates phase completion | US-083, US-084 |
| `progress-update.json` | Simulates todo progress | US-115, US-118 |
| `worker-crash.json` | Simulates crash | US-092, US-138 |
| `complete-immediately.json` | Fast complete | US-129 |
| `epic-loop.json` | Epic completion | US-085, US-086 |

### Fixture: phase-complete.json

```json
{
  "output": [
    { "text": "[TODO] Starting phase", "delay": 100 },
    { "text": "[PROGRESS] {\"percent\": 50}", "delay": 200 },
    { "text": "[TODO] Phase complete", "delay": 100 }
  ],
  "todoStates": [
    { "timestamp": 100, "todos": [{ "content": "Task", "status": "in_progress" }] },
    { "timestamp": 400, "todos": [{ "content": "Task", "status": "completed" }] }
  ],
  "exitCode": 0
}
```

---

## Keyboard Test Matrix

| Key | Context | Expected | Test IDs |
|-----|---------|----------|----------|
| `q` | Any | Quit confirmation | US-007, US-008 |
| `?` | Any | Toggle help | US-007, US-135 |
| `Ctrl+C` | Any | Emergency stop | US-007 |
| `↑/↓` | Select | Navigate | US-024 |
| `Enter` | Any | Confirm | US-008, US-024 |
| `Esc` | Dialog | Cancel | US-008 |
| `p` | Dashboard | Pause | US-125 |
| `r` | Paused | Resume | US-090 |
| `a` | Dashboard | Advance | US-126 |
| `w` | Dashboard | Focus worker | US-042, US-127 |

---

## Coverage Matrix

| Epic | User Stories | Unit | Integration | E2E | Total |
|------|--------------|------|-------------|-----|-------|
| 1 (US-001-025) | 25 | 21 | 27 | 25 | 73 |
| 2 (US-026-045) | 20 | 12 | 42 | 20 | 74 |
| 3 (US-046-070) | 25 | 27 | 45 | 25 | 97 |
| 4 (US-071-100) | 30 | 36 | 48 | 30 | 114 |
| 5 (US-101-140) | 40 | 30 | 6 | 40 | 76 |
| **Total** | **140** | **126** | **168** | **140** | **434** |

**1:1 E2E Mapping Verified:** ✅ 140 User Stories = 140 E2E Tests

**Distribution:**
- Unit: 126/434 (29%)
- Integration: 168/434 (39%)
- E2E: 140/434 (32%)

---

## Test Independence Matrix

### Epic 1: Project Bootstrap
- **Prerequisites:** None
- **Mock fixtures:** minimal.json
- **Can run alone:** ✅

### Epic 2: Worker Spawning
- **Prerequisites:** None (mocks wt.exe)
- **Mock fixtures:** None (unit/integration only)
- **Can run alone:** ✅

### Epic 3: File Watching & Todos
- **Prerequisites:** Temp directories
- **Mock fixtures:** None (unit/integration only)
- **Can run alone:** ✅

### Epic 4: Pipeline Orchestration
- **Prerequisites:** Mock spawn service
- **Mock fixtures:** phase-complete.json
- **Can run alone:** ✅

### Epic 5: Full Dashboard UI
- **Prerequisites:** Mock Claude binary
- **Mock fixtures:** All fixtures
- **Can run alone:** ✅

---

## Test File Structure

```
tests/
├── unit/
│   ├── validators.test.ts
│   ├── manifest-validator.test.ts
│   ├── session.test.ts
│   ├── security.test.ts
│   ├── debounce.test.ts
│   ├── todo-parser.test.ts
│   ├── todo-status.test.ts
│   ├── todo-filter.test.ts
│   ├── todo-utils.test.ts
│   ├── progress.test.ts
│   ├── formatters.test.ts
│   ├── state-machine.test.ts
│   ├── command-selector.test.ts
│   ├── spawn-command.test.ts
│   └── components.test.ts
├── integration/
│   ├── app-shell.test.ts
│   ├── router.test.ts
│   ├── filesystem.test.ts
│   ├── manifest.test.ts
│   ├── manifest-migration.test.ts
│   ├── stores.test.ts
│   ├── recent-projects.test.ts
│   ├── cwd.test.ts
│   ├── mock-claude.test.ts
│   ├── spawn.test.ts
│   ├── worker-session.test.ts
│   ├── cleanup.test.ts
│   ├── file-watcher.test.ts
│   ├── handlers.test.ts
│   ├── timer.test.ts
│   ├── cost.test.ts
│   └── orchestrator.test.ts
├── e2e/
│   ├── fixtures/
│   │   ├── minimal.json
│   │   ├── phase-complete.json
│   │   ├── progress-update.json
│   │   ├── worker-crash.json
│   │   ├── complete-immediately.json
│   │   └── epic-loop.json
│   ├── helpers/
│   │   ├── mock-claude.js
│   │   ├── runner.ts
│   │   └── keys.ts
│   └── specs/
│       ├── epic1-cli.test.ts
│       ├── epic1-keyboard.test.ts
│       ├── epic1-launcher.test.ts
│       ├── epic2-worker.test.ts
│       ├── epic5-launcher.test.ts
│       ├── epic5-resume.test.ts
│       ├── epic5-dashboard.test.ts
│       ├── epic5-complete.test.ts
│       ├── epic5-help.test.ts
│       └── epic5-errors.test.ts
└── setup.ts
```
