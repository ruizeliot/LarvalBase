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

Same as v8.0 - create standard Tauri + React + Vite structure.

---

## Step 3: Tailwind with Strict Design Tokens

Same as v8.0 - configure Tailwind with design tokens from brainstorm-notes.md.

---

## Steps 4-5: Test Infrastructure (Unit, Integration, E2E)

Same as v8.0 - set up Vitest and WebdriverIO.

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

Same as v8.0 - set up wdio-image-comparison-service and axe-core.

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

Same as v8.0 but also include:
- Interaction helper usage in E2E tests
- **Edge cases from specs (2-5 per E2E from different categories)**
- Smoke test skeleton tests (marked as `.skip`)
- Onboarding tests if epic exists

---

## Steps 14-18: RED Verification

Same as v8.0 - verify all tests fail.

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
