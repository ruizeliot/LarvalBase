---
name: 3-new-pipeline-desktop-v9.0
description: Phase 3 - Create Tauri desktop skeleton with failing multi-layer tests (RED state)
---

# Phase 3: Bootstrap (Multi-Layer Test Infrastructure)

**Base Rules:** See `worker-base-desktop-v9.0.md` for shared worker rules.

**Purpose:** Create Tauri desktop app skeleton with all tests failing (RED state)
**Input:** `docs/user-stories.md`, `docs/test-specs.md`
**Output:** Tauri app skeleton + Unit + Integration + E2E tests (all failing)
**Mode:** Autonomous (no user interaction)


---

## ⛔ FORBIDDEN PATTERNS (Gate 1 Checks This)

**The orchestrator runs Gate 1 after Phase 3. If these patterns are found, your work will be REJECTED.**

### E2E Tests MUST Use Real WebdriverIO Actions

| ❌ FORBIDDEN (Synthetic Events) | ✅ REQUIRED (Real Actions) |
|--------------------------------|---------------------------|
| `browser.execute(() => { el.dispatchEvent(new MouseEvent) })` | `$('selector').click()` |
| `browser.execute(() => { el.dispatchEvent(new DragEvent) })` | `$('source').dragAndDrop($('target'))` |
| `browser.execute(() => { el.dispatchEvent(new KeyboardEvent) })` | `browser.keys(['Enter'])` |
| `browser.execute(() => { new DataTransfer() })` | Use WebdriverIO's native drag-drop |

**Detection:** Orchestrator greps for `browser.execute` + `DragEvent|MouseEvent|KeyboardEvent|dispatchEvent|DataTransfer`

---

## Startup: Initialize Todos

```
TodoWrite([
  { content: "1. Read docs and run pre-flight checks", status: "in_progress", activeForm: "Reading docs" },
  { content: "2. Create Tauri project skeleton", status: "pending", activeForm: "Creating skeleton" },
  { content: "3. Set up Tailwind with strict design tokens", status: "pending", activeForm: "Setting up Tailwind" },
  { content: "4. Set up Vitest (Unit + Integration)", status: "pending", activeForm: "Setting up Vitest" },
  { content: "5. Set up WebdriverIO + tauri-driver (E2E)", status: "pending", activeForm: "Setting up WebdriverIO" },
  { content: "6. Create interaction test helpers", status: "pending", activeForm: "Creating interaction helpers" },
  { content: "7. Set up Visual Testing (screenshots + a11y)", status: "pending", activeForm: "Setting up Visual Testing" },
  { content: "8. Create smoke test skeleton", status: "pending", activeForm: "Creating smoke test" },
  { content: "9. Create onboarding component skeletons (if needed)", status: "pending", activeForm: "Creating onboarding skeletons" },
  { content: "10. Implement Unit tests from specs", status: "pending", activeForm: "Implementing Unit tests" },
  { content: "11. Implement Integration tests from specs", status: "pending", activeForm: "Implementing Integration tests" },
  { content: "12. Implement E2E tests from specs", status: "pending", activeForm: "Implementing E2E tests" },
  { content: "13. Implement Visual tests from specs", status: "pending", activeForm: "Implementing Visual tests" },
  { content: "14. RED CHECK: Run Unit tests (100% failing)", status: "pending", activeForm: "Verifying Unit RED" },
  { content: "15. RED CHECK: Run Integration tests (100% failing)", status: "pending", activeForm: "Verifying Integration RED" },
  { content: "16. BUILD: Run tauri build", status: "pending", activeForm: "Building Tauri app" },
  { content: "17. VALIDATE: Launch .exe (no crash)", status: "pending", activeForm: "Validating launch" },
  { content: "18. RED CHECK: Run E2E + Visual tests (100% failing)", status: "pending", activeForm: "Verifying E2E RED" },
  { content: "19. Create .pipeline/manifest.json", status: "pending", activeForm: "Creating manifest" },
  { content: "20. Git commit bootstrap", status: "pending", activeForm: "Committing" }
])
```

---

## CRITICAL: 100% RED State Required

**ALL tests at ALL LAYERS must fail.**

| Layer | Expected | Why Failures Prove RED |
|-------|----------|------------------------|
| Unit | 100% failing | Functions don't exist |
| Integration | 100% failing | Tauri commands don't exist |
| E2E | 100% failing | UI flow doesn't work |
| Visual | 100% failing | No baselines, no styled components |
| Smoke | 100% failing | No clickable elements work |

---

## Step 1: Pre-Flight Checks

```bash
cat docs/brainstorm-notes.md
cat docs/user-stories.md
cat docs/test-specs.md

# Check for onboarding epic
grep -i "onboarding" docs/user-stories.md
```

---

## Step 2: Create Tauri Project Skeleton

### Project Structure
```
project/
├── src/                      # React frontend
├── src-tauri/                # Tauri backend (Rust)
│   ├── capabilities/default.json
│   └── tauri.conf.json
├── tests/                    # Unit + Integration (Vitest)
├── e2e/                      # E2E (WebdriverIO)
└── package.json
```

### Tauri 2.0 Capabilities (CRITICAL)
Create `src-tauri/capabilities/default.json` with specific permissions.

### Frontend Must Call Real Tauri Commands
```typescript
// ✅ CORRECT - fails if command not implemented
const newValue = await invoke<number>('increment_counter');

// ❌ WRONG - uses setTimeout mock
setTimeout(() => setCount(count + 1), 100);
```

---

## Step 3: Tailwind with Strict Design Tokens

**CRITICAL: Use design tokens from brainstorm-notes.md. No arbitrary values allowed.**

### Create tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    // STRICT: Only these colors allowed
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      // Primary palette (from brainstorm-notes.md)
      primary: {
        50: '#EEF2FF',
        100: '#E0E7FF',
        500: '#6366F1',
        600: '#4F46E5',
        700: '#4338CA',
        900: '#312E81',
      },
      // Neutral palette
      neutral: {
        50: '#FAFAFA',
        100: '#F5F5F5',
        200: '#E5E5E5',
        300: '#D4D4D4',
        400: '#A3A3A3',
        500: '#737373',
        600: '#525252',
        700: '#404040',
        800: '#262626',
        900: '#171717',
      },
      // Semantic
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
      white: '#FFFFFF',
      black: '#000000',
    },
    // STRICT: Only 4px grid spacing
    spacing: {
      0: '0',
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      5: '20px',
      6: '24px',
      8: '32px',
      10: '40px',
      12: '48px',
      16: '64px',
    },
    // STRICT: Limited border radius
    borderRadius: {
      none: '0',
      sm: '4px',
      DEFAULT: '6px',
      md: '8px',
      lg: '12px',
      full: '9999px',
    },
    // Typography
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
    },
    fontSize: {
      xs: ['12px', { lineHeight: '16px' }],
      sm: ['14px', { lineHeight: '20px' }],
      base: ['16px', { lineHeight: '24px' }],
      lg: ['18px', { lineHeight: '28px' }],
      xl: ['20px', { lineHeight: '28px' }],
      '2xl': ['24px', { lineHeight: '32px' }],
    },
    extend: {},
  },
  plugins: [],
}
```

### Create ESLint Rule for Arbitrary Values

Add to `eslint.config.js`:

```javascript
// Add rule to catch arbitrary Tailwind values
{
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value=/\\[#[0-9a-fA-F]+\\]/]',
        message: 'Arbitrary color values not allowed. Use design tokens.',
      },
      {
        selector: 'Literal[value=/\\[\\d+px\\]/]',
        message: 'Arbitrary spacing values not allowed. Use design tokens.',
      },
    ],
  },
}
```

Add npm script: `"lint:styles": "eslint src --ext .tsx,.ts"`

---

## Step 4: Vitest (Unit + Integration)

- vitest.config.ts with jsdom environment
- tests/setup.ts with Tauri mocks
- npm scripts: test:unit, test:integration

---

## Step 5: WebdriverIO + tauri-driver (E2E)

### Create e2e/minimize-devtools.ps1

**CRITICAL: DevTools window must be minimized during E2E tests.**

```powershell
# Minimize DevTools window during E2E tests
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WindowMinimizer {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    public const int SW_MINIMIZE = 6;
    public static int minimizedCount = 0;

    public static bool EnumWindowCallback(IntPtr hWnd, IntPtr lParam) {
        if (!IsWindowVisible(hWnd)) return true;
        StringBuilder title = new StringBuilder(512);
        GetWindowText(hWnd, title, 512);
        string titleStr = title.ToString();
        if (titleStr.Contains("msedgewebview2.exe") || titleStr.Contains("DevTools")) {
            ShowWindow(hWnd, SW_MINIMIZE);
            minimizedCount++;
        }
        return true;
    }

    public static int MinimizeDevTools() {
        minimizedCount = 0;
        EnumWindows(EnumWindowCallback, IntPtr.Zero);
        return minimizedCount;
    }
}
"@
[WindowMinimizer]::MinimizeDevTools() | Out-Null
```

### Create e2e/wdio.conf.js

**CRITICAL: Use this EXACT config with DevTools minimizer:**

```javascript
import os from 'os';
import path from 'path';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, '..', 'src-tauri', 'target', 'release', '[APP_NAME].exe');
const minimizeScript = path.join(__dirname, 'minimize-devtools.ps1');

let tauriDriver;
let exit = false;
let minimizeInterval;

// Minimize DevTools windows (silent mode)
function minimizeDevTools() {
  try {
    execSync(`powershell -ExecutionPolicy Bypass -File "${minimizeScript}"`, { stdio: 'ignore' });
  } catch (e) { /* ignore */ }
}

export const config = {
  host: '127.0.0.1',
  port: 4444,
  specs: ['./specs/*.e2e.js'],
  maxInstances: 1,
  capabilities: [{
    maxInstances: 1,
    'tauri:options': { application: appPath },
  }],
  reporters: ['spec'],
  framework: 'mocha',
  mochaOpts: { ui: 'bdd', timeout: 60000 },
  beforeSession: () => {
    tauriDriver = spawn(
      path.resolve(os.homedir(), '.cargo', 'bin', 'tauri-driver'),
      [],  // NO arguments - auto-detects msedgedriver
      { stdio: [null, process.stdout, process.stderr] }
    );
    tauriDriver.on('error', (e) => { console.error(e); process.exit(1); });
    tauriDriver.on('exit', (c) => { if (!exit) process.exit(1); });

    // Minimize DevTools aggressively - every 50ms for first 10s, then every 2s
    minimizeDevTools();
    minimizeInterval = setInterval(minimizeDevTools, 50);
    setTimeout(() => {
      if (minimizeInterval) clearInterval(minimizeInterval);
      minimizeInterval = setInterval(minimizeDevTools, 2000);
    }, 10000);
  },
  afterSession: () => {
    exit = true;
    if (minimizeInterval) clearInterval(minimizeInterval);
    tauriDriver?.kill();
  },
};
```

**Replace [APP_NAME] with app name from tauri.conf.json.**

**DO NOT add:** browserName, webviewOptions, --native-driver flag

- npm script: test:e2e

---

## Step 6: Create Interaction Test Helpers (NEW in v9.0)

**CRITICAL: These helpers ensure E2E tests use REAL interactions.**

Create `e2e/helpers/interactions.js`:

```javascript
/**
 * Interaction Test Helpers
 *
 * These helpers ensure all E2E tests use REAL WebdriverIO actions,
 * not synthetic events or direct store calls.
 *
 * Gate 1 will reject tests that don't use these patterns.
 */

/**
 * Drag from palette to canvas at specific coordinates
 * @param {string} paletteSelector - Selector for palette item
 * @param {number} x - X coordinate on canvas
 * @param {number} y - Y coordinate on canvas
 */
export async function dragFromPalette(paletteSelector, x, y) {
  const paletteItem = await $(paletteSelector);
  const canvas = await $('[data-testid="canvas"]');

  // Get canvas location for coordinate calculation
  const canvasLoc = await canvas.getLocation();

  // Perform real drag operation
  await paletteItem.dragAndDrop(canvas, {
    duration: 100,
    x: x - canvasLoc.x,
    y: y - canvasLoc.y
  });
}

/**
 * Move existing element on canvas by delta
 * @param {string} elementSelector - Selector for element to move
 * @param {number} deltaX - Pixels to move horizontally
 * @param {number} deltaY - Pixels to move vertically
 */
export async function moveElement(elementSelector, deltaX, deltaY) {
  const element = await $(elementSelector);
  const location = await element.getLocation();

  // Calculate target position
  const targetX = location.x + deltaX;
  const targetY = location.y + deltaY;

  // Use action API for precise control
  await browser.actions([
    browser.action('pointer')
      .move({ origin: element })
      .down()
      .pause(50)
      .move({ x: targetX, y: targetY, origin: 'viewport' })
      .pause(50)
      .up()
  ]);
}

/**
 * Click every element matching selector
 * @param {string} selector - Selector for elements to click
 * @returns {number} - Number of elements clicked
 */
export async function clickAll(selector) {
  const elements = await $$(selector);
  let clickedCount = 0;

  for (const element of elements) {
    if (await element.isClickable()) {
      await element.click();
      clickedCount++;
      await browser.pause(100); // Brief pause between clicks
    }
  }

  return clickedCount;
}

/**
 * Connect two nodes by dragging from output to input port
 * @param {string} outputSelector - Selector for output port
 * @param {string} inputSelector - Selector for input port
 */
export async function connectNodes(outputSelector, inputSelector) {
  const outputPort = await $(outputSelector);
  const inputPort = await $(inputSelector);

  await outputPort.dragAndDrop(inputPort, { duration: 100 });
}

/**
 * Type into input with proper clearing
 * @param {string} selector - Input selector
 * @param {string} text - Text to type
 */
export async function typeInto(selector, text) {
  const input = await $(selector);
  await input.click();
  await input.clearValue();
  await input.setValue(text);
}

/**
 * Press keyboard shortcut
 * @param {string[]} keys - Array of keys (e.g., ['Control', 'z'] for undo)
 */
export async function pressKeys(keys) {
  await browser.keys(keys);
}

/**
 * Select element and verify selection
 * @param {string} selector - Element to select
 */
export async function selectElement(selector) {
  const element = await $(selector);
  await element.click();

  // Verify selection state changed
  const isSelected = await element.getAttribute('data-selected');
  return isSelected === 'true';
}

/**
 * Deselect by clicking canvas background
 */
export async function deselectAll() {
  const canvas = await $('[data-testid="canvas"]');
  await canvas.click({ x: 10, y: 10 }); // Click empty area
}

/**
 * Cancel current operation (mid-drag, dialog, etc.)
 */
export async function cancelOperation() {
  await browser.keys(['Escape']);
}
```

---

## Step 7: Visual Testing Infrastructure

### Install Visual Testing Dependencies

```bash
npm install -D wdio-image-comparison-service @axe-core/webdriverio
```

### Update wdio.conf.js for Visual Testing

Add to the config:

```javascript
import { join } from 'path';

// Add to services array
services: [
  ['image-comparison', {
    baselineFolder: join(__dirname, 'baselines'),
    formatImageName: '{tag}',
    screenshotPath: join(__dirname, 'screenshots'),
    savePerInstance: true,
    autoSaveBaseline: true,  // Creates baselines on first run
    blockOutStatusBar: true,
    blockOutToolBar: true,
  }],
],
```

### Create e2e/baselines/ Directory

```bash
mkdir -p e2e/baselines
echo "# Visual Baselines\nGenerated during Phase 4 implementation." > e2e/baselines/README.md
```

### Create Visual Test Helper

Create `e2e/helpers/visual.js`:

```javascript
import AxeBuilder from '@axe-core/webdriverio';

/**
 * Take a full page screenshot and compare to baseline
 * @param {string} name - Screenshot name (without extension)
 * @param {number} threshold - Max allowed diff percentage (default 0.1)
 */
export async function checkVisualBaseline(name, threshold = 0.1) {
  await browser.pause(500); // Wait for animations
  const diff = await browser.checkFullPageScreen(name);
  expect(diff).toBeLessThan(threshold);
}

/**
 * Run accessibility audit and assert no violations
 */
export async function checkAccessibility() {
  const results = await new AxeBuilder({ client: browser }).analyze();
  const violations = results.violations;

  if (violations.length > 0) {
    console.error('Accessibility violations:', JSON.stringify(violations, null, 2));
  }

  expect(violations).toHaveLength(0);
}

/**
 * Check that an element has visible hover state
 */
export async function checkHoverState(selector) {
  const element = await $(selector);
  const defaultBg = await element.getCSSProperty('background-color');

  await element.moveTo();
  await browser.pause(100);

  const hoverBg = await element.getCSSProperty('background-color');
  expect(hoverBg.value).not.toBe(defaultBg.value);
}

/**
 * Check that an element has visible focus ring
 */
export async function checkFocusState(selector) {
  const element = await $(selector);
  await element.click();
  await browser.keys(['Tab']);

  const boxShadow = await element.getCSSProperty('box-shadow');
  const outline = await element.getCSSProperty('outline');

  // Either box-shadow or outline should be visible
  const hasFocusIndicator =
    (boxShadow.value && boxShadow.value !== 'none') ||
    (outline.value && outline.value !== 'none' && !outline.value.includes('0px'));

  expect(hasFocusIndicator).toBe(true);
}
```

### Add npm Scripts

```json
{
  "scripts": {
    "test:visual": "npm run test:e2e -- --spec './e2e/specs/visual.e2e.js'",
    "test:a11y": "npm run test:e2e -- --spec './e2e/specs/accessibility.e2e.js'"
  }
}
```

---

## Step 8: Create Smoke Test Skeleton (NEW in v9.0)

**CRITICAL: Smoke test verifies EVERY interactive element works.**

Create `e2e/specs/smoke.e2e.js`:

```javascript
/**
 * Smoke Test Skeleton
 *
 * This test clicks EVERY button, menu item, and interactive element
 * to ensure nothing is a placeholder.
 *
 * Gate 2 in Phase 5 requires this test to pass.
 */

import { clickAll } from '../helpers/interactions.js';

describe('Smoke Test - Click Everything', () => {

  beforeEach(async () => {
    // Reset app state before each test group
  });

  describe('Menu Bar', () => {
    // TODO: Add tests for each menu item
    // These will be filled in during Phase 4

    it.skip('File menu items all work', async () => {
      // Click File menu
      // Click each menu item
      // Verify action occurred or dialog opened
    });

    it.skip('Edit menu items all work', async () => {
      // Click Edit menu
      // Click each menu item
      // Verify action occurred
    });

    it.skip('View menu items all work', async () => {
      // Click View menu
      // Click each menu item
      // Verify view changed
    });

    it.skip('Help menu items all work', async () => {
      // Click Help menu
      // Click each menu item
      // Verify dialog/action
    });
  });

  describe('Toolbar Buttons', () => {
    it.skip('all toolbar buttons respond to click', async () => {
      const clickedCount = await clickAll('[data-testid^="toolbar-"]');
      expect(clickedCount).toBeGreaterThan(0);
    });
  });

  describe('Palette Items', () => {
    it.skip('all palette items are draggable', async () => {
      const items = await $$('[data-testid^="palette-"]');

      for (const item of items) {
        // Verify draggable attribute
        const draggable = await item.getAttribute('draggable');
        expect(draggable).toBe('true');
      }
    });
  });

  describe('Dialogs', () => {
    it.skip('all dialogs can be opened and closed', async () => {
      // Settings dialog
      // Help dialog
      // New project dialog
      // etc.
    });
  });

  describe('Keyboard Navigation', () => {
    it.skip('Tab navigates through interactive elements', async () => {
      await browser.keys(['Tab']);
      const focused = await browser.getActiveElement();
      expect(focused).toBeDefined();
    });

    it.skip('Escape closes open dialogs', async () => {
      // Open a dialog first
      await browser.keys(['Escape']);
      // Verify dialog closed
    });
  });

  describe('Completeness Pairs', () => {
    // TODO: Verify both halves of each pair work

    it.skip('Add and Delete nodes both work', async () => {
      // Add node
      // Delete node
    });

    it.skip('Place and Move nodes both work', async () => {
      // Place node via drag-drop
      // Move existing node
    });

    it.skip('Connect and Disconnect nodes both work', async () => {
      // Connect two nodes
      // Disconnect them
    });

    it.skip('Open and Close panels both work', async () => {
      // Open panel
      // Close panel
    });
  });

  describe('Edge Cases', () => {
    it.skip('double-click is handled gracefully', async () => {
      // Double-click on button
      // Verify no duplicate action
    });

    it.skip('Escape cancels drag operation', async () => {
      // Start dragging
      // Press Escape
      // Verify cancelled
    });

    it.skip('rapid clicks do not break UI', async () => {
      // Click button 10 times rapidly
      // Verify app still responsive
    });
  });
});
```

**NOTE:** Tests are `it.skip` in bootstrap phase. Phase 4 removes `.skip` as features are implemented.

---

## Step 9: Create Onboarding Component Skeletons (NEW in v9.0)

**Check if Onboarding epic exists in user-stories.md. If yes, create skeletons.**

### Check for Onboarding Level

```bash
# Check manifest for onboarding decision (set in Phase 1)
cat .pipeline/manifest.json | jq -r '.onboardingLevel // "minimal"'
```

### If Minimal Onboarding:

Create `src/components/EmptyState.tsx`:

```tsx
interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ message, actionLabel, onAction }: EmptyStateProps) {
  // TODO: Implement empty state with guidance
  return (
    <div data-testid="empty-state">
      <p>{message}</p>
      {actionLabel && onAction && (
        <button onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
```

Create `src/components/Tooltip.tsx`:

```tsx
interface TooltipProps {
  content: string;
  shortcut?: string;
  children: React.ReactNode;
}

export function Tooltip({ content, shortcut, children }: TooltipProps) {
  // TODO: Implement tooltip on hover
  return (
    <div data-tooltip={content} data-shortcut={shortcut}>
      {children}
    </div>
  );
}
```

Create `src/components/HelpDialog.tsx`:

```tsx
interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
  if (!isOpen) return null;

  // TODO: Implement keyboard shortcuts dialog
  return (
    <div data-testid="help-dialog" role="dialog">
      <h2>Keyboard Shortcuts</h2>
      {/* TODO: List shortcuts grouped by category */}
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

### If Full Tutorial:

Also create `src/components/Tutorial.tsx`:

```tsx
interface TutorialProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function Tutorial({ isOpen, onComplete, onSkip }: TutorialProps) {
  if (!isOpen) return null;

  // TODO: Implement step-by-step tutorial with highlights
  return (
    <div data-testid="tutorial-overlay">
      <h1>Welcome!</h1>
      {/* TODO: Tutorial steps with UI element highlights */}
      <button onClick={onSkip}>Skip</button>
      <button onClick={onComplete}>Next</button>
    </div>
  );
}
```

Create `src/stores/tutorialStore.ts`:

```typescript
interface TutorialState {
  currentStep: number;
  isFirstLaunch: boolean;
  completedSteps: number[];
}

// TODO: Implement tutorial state management
// - Detect first launch via localStorage
// - Track step progress
// - Mark completion
```

---

## Steps 10-13: Implement Tests

Convert specs from `docs/test-specs.md` to actual test files:
- Unit tests in `tests/unit/`
- Integration tests in `tests/integration/`
- E2E tests in `e2e/specs/`
- Visual tests in `e2e/specs/visual.e2e.js` and `e2e/specs/accessibility.e2e.js`

**v9.0 Requirements:**
- Use interaction helpers in E2E tests
- **Include 2-5 edge cases per E2E from different categories**
- Smoke test skeleton tests (marked as `.skip`)
- Onboarding tests if epic exists

### Visual Test Implementation

Create `e2e/specs/visual.e2e.js`:

```javascript
import { checkVisualBaseline, checkHoverState, checkFocusState } from '../helpers/visual.js';

describe('Visual Quality', () => {
  describe('VIS-E2E-002: Visual Baseline', () => {
    it('dashboard matches baseline', async () => {
      // Navigate to dashboard
      await checkVisualBaseline('dashboard');
    });
  });

  describe('VIS-E2E-003: Interactive States', () => {
    it('primary button has visible hover state', async () => {
      await checkHoverState('[data-testid="primary-button"]');
    });

    it('primary button has visible focus ring', async () => {
      await checkFocusState('[data-testid="primary-button"]');
    });
  });
});
```

Create `e2e/specs/accessibility.e2e.js`:

```javascript
import { checkAccessibility } from '../helpers/visual.js';

describe('VIS-E2E-004: Accessibility', () => {
  it('dashboard passes WCAG AA contrast', async () => {
    // Navigate to dashboard
    await checkAccessibility();
  });
});
```

---

## Steps 14-18: RED Verification

### Steps 14-15: Unit + Integration RED
```bash
npm run test:unit      # Expected: 100% failing
npm run test:integration  # Expected: 100% failing
```

### Step 16: Build
```bash
npm run tauri build
```

### Step 17: Validate Launch
Launch .exe, verify no crash.

### Step 18: E2E + Visual RED
```bash
npm run test:e2e  # Expected: 100% failing (includes visual tests)
```

**Visual tests will fail because:**
- No baselines exist yet (created in Phase 4)
- No styled components exist
- Accessibility audit will find contrast issues in unstyled UI

---

## Step 19: Update Manifest

**Include onboarding level from Phase 1:**

```bash
# Read existing manifest and update it
ONBOARDING=$(cat ".pipeline/manifest.json" | jq -r '.phases["1"].onboardingDecision // "minimal"')

cat ".pipeline/manifest.json" | jq "
  .currentPhase = \"4\" |
  .currentEpic = 1 |
  .onboardingLevel = \"$ONBOARDING\" |
  .phases[\"3\"].status = \"complete\" |
  .phases[\"3\"].completedAt = (now | todate) |
  .phases[\"3\"].interactionHelpers = true |
  .phases[\"3\"].smokeTestSkeleton = true |
  .phases[\"4\"] = (.phases[\"4\"] // {}) |
  .phases[\"4\"].status = \"pending\" |
  .phases[\"4\"].looping = true
" > /tmp/manifest.json && mv /tmp/manifest.json ".pipeline/manifest.json"
```

---

## Step 20: Git Commit

```bash
git add .
git commit -m "bootstrap: project skeleton with failing multi-layer tests

Test infrastructure:
- Unit: X specs (Vitest)
- Integration: X specs (Vitest)
- E2E: X specs + 2-5 edge cases each (WebdriverIO + tauri-driver)
- Visual: 4 specs (screenshots + accessibility)
- Smoke: skeleton ready (all .skip)

v9.0 Additions:
- Interaction test helpers (e2e/helpers/interactions.js)
- Smoke test skeleton (e2e/specs/smoke.e2e.js)
- Onboarding component skeletons

Design system:
- Tailwind configured with strict design tokens
- ESLint rule for arbitrary value rejection

RED State verified: X failing, 0 passing

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

---

## Completion Output

```
════════════════════════════════════════════════════════════════
Phase 3 Complete
════════════════════════════════════════════════════════════════

📊 Multi-Layer Test Infrastructure:
   Unit: X specs
   Integration: Y specs
   E2E: Z specs (+ 2-5 edge cases each)
   Visual: 4 specs (VIS-E2E-001 to VIS-E2E-004)
   Smoke: skeleton ready

🆕 v9.0 Infrastructure:
   Interaction helpers: e2e/helpers/interactions.js ✓
   Smoke test skeleton: e2e/specs/smoke.e2e.js ✓
   Onboarding skeletons: [Minimal/Full/None] ✓

🎨 Design System:
   Tailwind tokens: configured ✓
   Arbitrary value lint: enabled ✓

✅ RED State Verified:
   Unit: X failing, 0 passing ✓
   Integration: Y failing, 0 passing ✓
   E2E: Z failing, 0 passing ✓
   Visual: 4 failing, 0 passing ✓

✅ Build: SUCCESS
✅ App Launch: NO CRASH
✅ Git Commit: CREATED

Ready for Phase 4: Implement
════════════════════════════════════════════════════════════════
```

---

## Phase-Specific Rules

### You Must (Phase 3)
- Create minimal working skeleton
- Set up Tailwind with strict design tokens
- Set up ESLint rule to reject arbitrary Tailwind values
- Set up ALL test layers (Unit, Integration, E2E, Visual)
- **Create interaction test helpers (e2e/helpers/interactions.js)**
- **Create smoke test skeleton (e2e/specs/smoke.e2e.js)**
- **Create onboarding component skeletons (if epic exists)**
- Verify 100% RED at ALL layers
- Build and validate app launches
- Create manifest with epic loops and onboarding level

### You Must NOT (Phase 3)
- Skip any test layer
- Have any tests passing
- Use placeholder tests
- Use arbitrary Tailwind values in skeleton
- **Skip interaction helpers - E2E tests must use them**
- **Skip smoke test skeleton**
- **Skip onboarding skeletons if epic exists**

---

**Execute now. Create skeleton, implement tests, verify RED, commit.**
