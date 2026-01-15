# Worker Base Rules: Desktop (Tauri v2)

**Stack:** Desktop
**Framework:** Tauri v2
**Frontend:** React + TypeScript
**Backend:** Rust
**Test Framework:** Jest/Vitest + WebdriverIO

---

## Package Management

### Frontend (npm)
```bash
npm install [package]
```

### Backend (cargo)
```bash
cd src-tauri
cargo add [package]
```

### Common Tauri Packages

| Feature | npm Package | cargo Package |
|---------|-------------|---------------|
| File Dialog | @tauri-apps/plugin-dialog | tauri-plugin-dialog |
| File System | @tauri-apps/plugin-fs | tauri-plugin-fs |
| Notifications | @tauri-apps/plugin-notification | tauri-plugin-notification |
| Shell/URLs | @tauri-apps/plugin-shell | tauri-plugin-shell |
| Store/Prefs | @tauri-apps/plugin-store | tauri-plugin-store |
| Clipboard | @tauri-apps/plugin-clipboard-manager | tauri-plugin-clipboard-manager |

---

## Capabilities (Permissions)

**Location:** `src-tauri/capabilities/default.json`

```json
{
  "permissions": [
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:allow-read",
    "fs:allow-write",
    "notification:allow-notify"
  ]
}
```

---

## Test Framework

### E2E Tests (WebdriverIO)

**Location:** `tests/e2e/*.spec.ts`

```typescript
describe('Feature Name', () => {
  it('should do something', async () => {
    // Real WebdriverIO actions
    await $('[data-testid="button"]').click();
    await $('[data-testid="input"]').setValue('text');
    await $('[data-testid="source"]').dragAndDrop($('[data-testid="target"]'));

    // Assert on UI
    const text = await $('[data-testid="result"]').getText();
    expect(text).toBe('expected');
  });
});
```

### Unit Tests (Jest/Vitest)

**Location:** `src/__tests__/*.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../utils';

describe('myFunction', () => {
  it('calculates correctly', () => {
    expect(myFunction(2, 3)).toBe(5);
  });
});
```

### Integration Tests (Tauri Commands)

**Location:** `src-tauri/src/tests/*.rs` or `tests/integration/*.spec.ts`

```typescript
import { invoke } from '@tauri-apps/api/core';

describe('Tauri Commands', () => {
  it('reads file via Rust backend', async () => {
    const content = await invoke('read_file', { path: '/test/file.json' });
    expect(content).toBeDefined();
  });
});
```

---

## Forbidden Patterns

### NO Mocking Tauri APIs

```typescript
// ❌ FORBIDDEN
jest.mock('@tauri-apps/plugin-dialog', () => ({
  open: () => Promise.resolve('/fake/path.json')
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: () => Promise.resolve('{"fake": "data"}')
}));

// ✅ REQUIRED - Use real APIs
import { open } from '@tauri-apps/plugin-dialog';
const path = await open({ filters: [{ name: 'JSON', extensions: ['json'] }] });
```

### NO Synthetic Events in E2E

```typescript
// ❌ FORBIDDEN
browser.execute(() => {
  element.dispatchEvent(new MouseEvent('click'));
});
browser.execute(() => {
  store.addItem({ name: 'fake' });
});

// ✅ REQUIRED - Real WebdriverIO actions
await $('[data-testid="add-btn"]').click();
```

### NO Test-Only Code Paths

```typescript
// ❌ FORBIDDEN
if (process.env.NODE_ENV === 'test') {
  return mockData;
}

// ✅ REQUIRED - Same code path always
const data = await invoke('get_data');
```

---

## Integration Extraction Table

Use this when scanning user stories:

| Story Contains | Implies Integration |
|----------------|---------------------|
| "opens file", "browse" | @tauri-apps/plugin-dialog + tauri-plugin-dialog |
| "saves file", "export" | @tauri-apps/plugin-dialog + @tauri-apps/plugin-fs |
| "drag file into app" | @tauri-apps/plugin-fs |
| "notifications", "alert" | @tauri-apps/plugin-notification |
| "open link", "browser" | @tauri-apps/plugin-shell |
| "preferences", "settings" | @tauri-apps/plugin-store |
| "copy", "paste" | @tauri-apps/plugin-clipboard-manager |

---

## Build Commands

```bash
# Development
npm run tauri dev

# Build
npm run tauri build

# Run tests
npm test                    # Unit tests
npm run test:e2e           # E2E tests
```

---

## File Structure

```
project/
├── src/                    # React frontend
│   ├── components/
│   ├── hooks/
│   ├── __tests__/         # Unit tests
│   └── App.tsx
├── src-tauri/             # Rust backend
│   ├── src/
│   │   └── lib.rs
│   ├── capabilities/
│   │   └── default.json
│   └── Cargo.toml
├── tests/
│   └── e2e/               # WebdriverIO tests
├── docs/
│   ├── brainstorm-notes.md
│   ├── user-stories.md
│   └── functionality-specs.md
└── .pipeline/
    └── manifest.json
```
