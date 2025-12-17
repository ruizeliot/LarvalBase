# Implicit UI Control Stories Checklist

**Purpose:** User stories that should ALWAYS be generated for desktop apps, even if the user doesn't explicitly request them.

**Why:** Users think about features ("I want to create nodes") but forget to specify HOW they interact ("by dragging from palette"). This leads to bugs where the E2E tests pass (using synthetic events) but real user interactions fail.

---

## Category 1: Drag & Drop Interactions

If the app has any draggable elements, include:

```markdown
### US-CTRL-DD-001: Drag from palette to canvas
**As a** user
**I want** to drag items from a palette/toolbar onto a canvas/workspace
**So that** I can add new elements using natural mouse interaction

**Acceptance Criteria:**
- [E2E] User can click and hold on palette item
- [E2E] Visual feedback shows during drag (cursor change, ghost element)
- [E2E] Drop target highlights when hovering over valid drop zone
- [E2E] Element is created at drop position when released
- [E2E] Invalid drop zones reject the drop (element returns/disappears)

### US-CTRL-DD-002: Drag to reorder items
**As a** user
**I want** to drag items to reorder them in a list
**So that** I can organize items according to my preference

**Acceptance Criteria:**
- [E2E] User can click and hold on list item
- [E2E] Visual placeholder shows drop position
- [E2E] Item moves to new position on release
- [E2E] Order persists after reordering

### US-CTRL-DD-003: Drag to connect nodes
**As a** user
**I want** to drag from one node's port to another
**So that** I can create connections between elements

**Acceptance Criteria:**
- [E2E] User can drag from output port
- [E2E] Visual line follows cursor during drag
- [E2E] Connection created when dropped on valid input port
- [E2E] Invalid connections are rejected with feedback
```

---

## Category 2: Click Interactions

For any clickable UI elements:

```markdown
### US-CTRL-CLK-001: Single click selects item
**As a** user
**I want** to click an item to select it
**So that** I can perform actions on that item

**Acceptance Criteria:**
- [E2E] Single click selects the item
- [E2E] Selected item shows visual highlight (border, background)
- [E2E] Clicking elsewhere deselects the item
- [E2E] Clicking another item changes selection

### US-CTRL-CLK-002: Double-click opens item
**As a** user
**I want** to double-click an item to open/edit it
**So that** I can quickly access item details

**Acceptance Criteria:**
- [E2E] Double-click opens edit mode or detail view
- [E2E] Single click does NOT trigger double-click action

### US-CTRL-CLK-003: Right-click shows context menu
**As a** user
**I want** to right-click items to see available actions
**So that** I can quickly access item-specific operations

**Acceptance Criteria:**
- [E2E] Right-click shows context menu
- [E2E] Context menu contains relevant actions
- [E2E] Clicking menu item performs action
- [E2E] Clicking outside closes menu
```

---

## Category 3: Keyboard Interactions

For keyboard-accessible apps:

```markdown
### US-CTRL-KB-001: Keyboard navigation works
**As a** user
**I want** to navigate the app using keyboard only
**So that** I can use the app efficiently without mouse

**Acceptance Criteria:**
- [E2E] Tab moves focus to next interactive element
- [E2E] Shift+Tab moves focus to previous element
- [E2E] Enter activates focused button/link
- [E2E] Escape closes modals/menus
- [E2E] Focus is visible on all interactive elements

### US-CTRL-KB-002: Common shortcuts work
**As a** user
**I want** standard keyboard shortcuts to work
**So that** I can work efficiently using muscle memory

**Acceptance Criteria:**
- [E2E] Ctrl+S saves current work (if applicable)
- [E2E] Ctrl+Z undoes last action (if applicable)
- [E2E] Ctrl+Y or Ctrl+Shift+Z redoes (if applicable)
- [E2E] Delete/Backspace removes selected item
- [E2E] Ctrl+A selects all (where applicable)

### US-CTRL-KB-003: Arrow keys navigate within components
**As a** user
**I want** arrow keys to work within lists, grids, and trees
**So that** I can navigate quickly without reaching for mouse

**Acceptance Criteria:**
- [E2E] Up/Down arrows move through list items
- [E2E] Left/Right arrows expand/collapse tree nodes
- [E2E] Arrow navigation wraps or stops at boundaries
```

---

## Category 4: Form Interactions

For any forms or inputs:

```markdown
### US-CTRL-FORM-001: Text input accepts keyboard input
**As a** user
**I want** to type in text fields
**So that** I can enter data

**Acceptance Criteria:**
- [E2E] Clicking text field focuses it
- [E2E] Typed characters appear in field
- [E2E] Backspace deletes characters
- [E2E] Selection and copy/paste work

### US-CTRL-FORM-002: Form validation provides feedback
**As a** user
**I want** to see validation errors clearly
**So that** I can correct mistakes

**Acceptance Criteria:**
- [E2E] Invalid fields show error styling
- [E2E] Error messages explain what's wrong
- [E2E] Errors clear when corrected
- [E2E] Submit is prevented with invalid data
```

---

## Category 5: Canvas/Workspace Interactions

For apps with a canvas or 2D workspace:

```markdown
### US-CTRL-CANVAS-001: Pan canvas with mouse
**As a** user
**I want** to pan the canvas by dragging
**So that** I can navigate large workspaces

**Acceptance Criteria:**
- [E2E] Middle-click drag pans the canvas
- [E2E] Or: Space+drag pans the canvas
- [E2E] Canvas content moves opposite to drag direction
- [E2E] Pan position persists

### US-CTRL-CANVAS-002: Zoom canvas with scroll wheel
**As a** user
**I want** to zoom in/out using scroll wheel
**So that** I can see details or overview

**Acceptance Criteria:**
- [E2E] Scroll up zooms in
- [E2E] Scroll down zooms out
- [E2E] Zoom centers on cursor position
- [E2E] Zoom has min/max limits

### US-CTRL-CANVAS-003: Select multiple items with marquee
**As a** user
**I want** to draw a selection box to select multiple items
**So that** I can operate on groups of items

**Acceptance Criteria:**
- [E2E] Click and drag on empty space starts marquee
- [E2E] Items within marquee are selected on release
- [E2E] Shift+marquee adds to existing selection
```

---

## Category 6: Window & App Controls

For desktop (Tauri/Electron) apps:

```markdown
### US-CTRL-WIN-001: Window controls work
**As a** user
**I want** minimize, maximize, and close buttons to work
**So that** I can manage the application window

**Acceptance Criteria:**
- [E2E] Minimize button minimizes to taskbar
- [E2E] Maximize button toggles fullscreen
- [E2E] Close button closes the app (with save prompt if needed)

### US-CTRL-WIN-002: Window is resizable
**As a** user
**I want** to resize the window by dragging edges
**So that** I can fit the app to my workspace

**Acceptance Criteria:**
- [E2E] Dragging edges resizes window
- [E2E] Minimum size is enforced
- [E2E] Content adapts to new size
```

---

## Category 7: UI States

For robust UX:

```markdown
### US-CTRL-STATE-001: Loading states are visible
**As a** user
**I want** to see loading indicators during async operations
**So that** I know the app is working

**Acceptance Criteria:**
- [E2E] Loading spinner/skeleton shows during data fetch
- [E2E] UI is non-interactive during critical loads
- [E2E] Loading state clears when complete

### US-CTRL-STATE-002: Empty states provide guidance
**As a** user
**I want** to see helpful empty states
**So that** I know what to do when there's no data

**Acceptance Criteria:**
- [E2E] Empty list shows "No items" message
- [E2E] Empty state suggests action (e.g., "Create your first...")
- [E2E] Empty state includes call-to-action button

### US-CTRL-STATE-003: Error states are recoverable
**As a** user
**I want** to see clear error messages with recovery options
**So that** I can fix problems without losing work

**Acceptance Criteria:**
- [E2E] Errors show human-readable message
- [E2E] Errors suggest recovery action
- [E2E] Retry button works for transient errors
```

---

## How to Use This Checklist

### In Phase 1 (Brainstorm)

1. After defining the main user stories, review this checklist
2. For each category, ask: "Does this app have this type of interaction?"
3. If yes, add the relevant implicit stories to the user stories document
4. Mark them as "Implicit Control Stories" so they're clearly identified

### Selection Guide

| If your app has... | Include stories from... |
|-------------------|-------------------------|
| Palette/Toolbar + Canvas | Category 1 (Drag & Drop) |
| Clickable items | Category 2 (Click) |
| Any interactive elements | Category 3 (Keyboard) |
| Forms or inputs | Category 4 (Form) |
| Canvas/2D workspace | Category 5 (Canvas) |
| Desktop window (Tauri/Electron) | Category 6 (Window) |
| Any data loading | Category 7 (UI States) |

### Minimum Required

**ALWAYS include at minimum:**
- US-CTRL-KB-001 (Keyboard navigation)
- US-CTRL-STATE-002 (Empty states)
- US-CTRL-STATE-003 (Error states)

These apply to virtually every app.

---

## Why This Matters

**Bug Example (this prompted creating this checklist):**

- User story: "User can add nodes to canvas"
- E2E test: `addNode('production')` - calls store method directly
- Result: Test passes, but real drag-and-drop is broken

**With implicit stories:**

- User story: "User can add nodes to canvas"
- Implicit story: "User can drag palette item to canvas" (US-CTRL-DD-001)
- E2E test: Actually performs drag-and-drop with real mouse events
- Result: Bug caught in E2E, not by user

---

**Last Updated:** 2025-12-17
**Prompted By:** Tauri dragDropEnabled bug in test-gates project
