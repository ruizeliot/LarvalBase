# Mandatory Standards for Desktop Apps

**Version:** v11
**Created:** 2026-01-09
**Stack:** Tauri v2 + React + TypeScript

---

## Overview

These standards are **mandatory** for all desktop apps built with this pipeline. The AI enforces them even if the user doesn't ask for them.

**Why mandatory?**
- AI is not good at visual design decisions
- These standards are objectively measurable
- They prevent common failures in production
- They ensure professional-quality output

---

## 1. Accessibility (A11y) Standards

**Source:** [WCAG 2.1 Level AA](https://www.w3.org/TR/WCAG21/), [Microsoft Accessibility Checklist](https://learn.microsoft.com/en-us/windows/apps/design/accessibility/accessibility-checklist)

### Keyboard Navigation (MANDATORY)

| Requirement | Description | Detection |
|-------------|-------------|-----------|
| All interactive elements focusable | Buttons, links, inputs reachable via Tab | E2E: navigate entire app with keyboard only |
| Logical tab order | Focus order matches visual layout | Manual verification |
| Focus indicators visible | Clear visual indication of focused element | CSS check: `:focus` styles exist |
| Keyboard activation | Enter/Space activates buttons and links | E2E: activate all buttons with Enter |
| Escape closes modals | Esc key closes dialogs and menus | E2E: open modal, press Esc |
| Arrow key navigation | Arrow keys work in lists, menus, tabs | E2E: navigate lists with arrows |

**Detection Command:**
```bash
# Check for focus styles in CSS/Tailwind
grep -rn ":focus\|focus:" src --include="*.css" --include="*.tsx"
```

### Screen Reader Support (MANDATORY)

| Requirement | Description | Detection |
|-------------|-------------|-----------|
| aria-label on icon buttons | Buttons with only icons need labels | grep for buttons without text |
| aria-label on inputs | Inputs without visible labels need aria-label | grep for inputs without labels |
| Semantic HTML | Use button, nav, main, header, not div | grep for div with onClick |
| Alt text on images | All images have alt attribute | grep for img without alt |

**Detection Commands:**
```bash
# Icon buttons without aria-label
grep -rn "<button[^>]*>[[:space:]]*<.*Icon" src --include="*.tsx" | grep -v "aria-label"

# Clickable divs (should be buttons)
grep -rn "<div[^>]*onClick" src --include="*.tsx"

# Images without alt
grep -rn "<img[^>]*/>" src --include="*.tsx" | grep -v "alt="
```

### Visual Accessibility (MANDATORY)

| Requirement | Description | Detection |
|-------------|-------------|-----------|
| Contrast ratio 4.5:1 | Text readable against background | axe-core automated check |
| No color-only information | Don't rely solely on color to convey meaning | Manual review |
| Text scalable | UI works at 200% zoom | Manual test at 200% zoom |
| High contrast support | App usable in high contrast mode | Test with OS high contrast |

**Automated Check (Phase 5):**
```bash
# Install axe-core for React
npm install @axe-core/react --save-dev

# Add to app entry point (dev mode only)
import React from 'react';
import ReactDOM from 'react-dom';
if (process.env.NODE_ENV !== 'production') {
  import('@axe-core/react').then(axe => {
    axe.default(React, ReactDOM, 1000);
  });
}
```

---

## 2. Completeness Pairs

**Every action must have its inverse implemented together.**

| Action | Required Pair |
|--------|---------------|
| Add / Create | Delete / Remove |
| Open / Expand | Close / Collapse |
| Show | Hide |
| Enable | Disable |
| Connect | Disconnect |
| Select | Deselect |
| Start | Stop / Pause |
| Zoom in | Zoom out |
| Lock | Unlock |
| Pin | Unpin |
| Undo | Redo |
| Favorite | Unfavorite |

**Enforcement by Phase:**

| Phase | What to Check |
|-------|---------------|
| Phase 1 | Brainstorm includes both actions in mockups |
| Phase 2 | User stories exist for both halves |
| Phase 3 | E2E tests cover both halves |
| Phase 4 | Implementation includes both halves |
| Phase 5 | Smoke test confirms both halves work |

---

## 3. Edge Case Matrix

**Every feature must handle edge cases.**

| Category | Edge Cases |
|----------|------------|
| **Empty state** | No items, first item, single item |
| **Boundaries** | Min value, max value, at limit |
| **Invalid input** | Empty string, special chars, too long |
| **Rapid actions** | Double-click, spam clicks, drag cancel |
| **Interruption** | Action during loading, mid-drag escape |
| **State conflicts** | Delete while editing, move while drag |

**Enforcement:**
- Phase 3: Test specs include 2+ edge cases per test
- Phase 4: Implementation handles edge cases
- Phase 5: Smoke test covers edge cases

---

## 4. No Placeholder Rule

**If it looks interactive, it MUST be interactive.**

### Forbidden Patterns

```tsx
// FORBIDDEN - Empty handlers
onClick={() => {}}
onDragStart={() => {}}
onChange={() => {}}

// FORBIDDEN - Console.log placeholders
onClick={() => console.log('TODO')}

// FORBIDDEN - Alert placeholders
onClick={() => alert('Not implemented')}

// FORBIDDEN - Buttons without handlers
<button>Edit</button>  // No onClick

// FORBIDDEN - Menu promises without delivery
aria-haspopup="menu"  // With no actual menu
```

**Detection Commands (run before every commit):**
```bash
# Empty handlers
grep -rn "onClick={() => {}}" src --include="*.tsx"
grep -rn "onChange={() => {}}" src --include="*.tsx"
grep -rn "onDragStart={() => {}}" src --include="*.tsx"

# Console.log placeholders
grep -rn "onClick={() => console" src --include="*.tsx"

# Buttons without onClick
grep -rn "<button[^>]*>[^<]*</button>" src --include="*.tsx" | grep -v "onClick"
```

---

## 5. No Mocking Rule

**Real functionality only. No fakes.**

### Forbidden Patterns

```tsx
// FORBIDDEN - Mocking system APIs
jest.mock('@tauri-apps/plugin-dialog')
jest.mock('@tauri-apps/plugin-fs')
vi.mock('@tauri-apps/api')

// FORBIDDEN - Test-only code paths
if (process.env.NODE_ENV === 'test') { ... }
if (import.meta.env.MODE === 'test') { ... }

// FORBIDDEN - Hardcoded mock data in production
const mockData = { nodes: [], edges: [] };
```

**The Rule:** If a test cannot pass without a mock, the feature is not implemented. Fix the implementation.

**Detection Commands:**
```bash
# Mocking Tauri APIs
grep -rn "jest.mock.*tauri\|vi.mock.*tauri" src --include="*.ts" --include="*.tsx"

# Test-only code paths
grep -rn "NODE_ENV.*test\|MODE.*test" src --include="*.ts" --include="*.tsx"
```

---

## 6. No Synthetic Events in E2E

**E2E tests must use real user actions.**

### Forbidden Patterns

```javascript
// FORBIDDEN - Synthetic events
browser.execute(() => { el.dispatchEvent(new MouseEvent(...)) })
browser.execute(() => { el.dispatchEvent(new DragEvent(...)) })

// FORBIDDEN - Direct store/API access
browser.execute(() => { store.addNode(...) })
browser.execute(() => { window.__app__.doAction() })
```

### Required Patterns

```javascript
// REQUIRED - Real WebdriverIO actions
$('selector').click()
$('source').dragAndDrop($('target'))
$('input').setValue('text')
browser.keys(['Enter'])
browser.keys(['Escape'])
```

---

## 7. Production-Condition E2E Testing

**Tests must run against release builds in Phase 5.**

### Why This Matters

| Dev Mode | Production Mode |
|----------|-----------------|
| Debug assertions enabled | Debug assertions disabled |
| DevTools available | DevTools unavailable |
| WebView may behave differently | Actual user experience |
| Some interactions (drag-drop) may work differently | Real behavior |

### Configuration (Phase 5)

```javascript
// wdio.conf.js for production testing
export const config = {
  capabilities: [{
    'tauri:options': {
      // Use RELEASE build, not debug
      application: '../src-tauri/target/release/app'
    }
  }],

  onPrepare: () => {
    // Build release binary before tests
    spawnSync("npm", ["run", "tauri", "build"])
  }
}
```

---

## 8. Test Cheating Detection

**Tests must verify original requirements, not easier substitutes.**

### What is Test Cheating?

When a test fails:
1. ❌ Change test to verify something easier
2. ❌ Implement the easier thing
3. ❌ Declare success

**This is cheating.** The original requirement was never implemented.

### The Rule

| Allowed | Forbidden |
|---------|-----------|
| Fix implementation to pass the test | Change what the test verifies |
| Fix typos/bugs in test code | Change "wheel zoom" test to "keyboard zoom" |
| Modify test AND impl for SAME thing | Modify test AND impl for DIFFERENT thing |

### Self-Check

Before committing, ask:
1. "Does my test still verify the ORIGINAL requirement?"
2. "Am I testing what the user story says, or something easier?"

---

## 9. Agent Skills Usage (MANDATORY)

**Workers MUST explicitly invoke skills using the Skill tool.**

### Why Skills Are Mandatory

Skills are external files containing specialized knowledge, techniques, and patterns. They:
- Provide current, maintained best practices
- Contain domain-specific expertise (Tauri, TDD, debugging)
- Offer structured approaches to complex problems
- Are NOT auto-triggered in autonomous mode

### The Skill Triggering Problem

**Skills trigger on USER MESSAGES only.**

```
Interactive Mode:
  User: "Help me build a Tauri app"
        ↓
  Claude detects "Tauri" → auto-loads tauri skill

Autonomous Mode (Pipeline):
  User: "/4-new-pipeline-desktop"  ← ONE message
        ↓
  Worker runs alone              ← NO more user messages
        ↓
  Skills NEVER auto-trigger      ← Problem!
```

### The Solution: Explicit Invocation

Workers must use the `Skill` tool to invoke skills at specified points:

```
Skill tool → tauri                    (invoke for Tauri patterns)
Skill tool → test-driven-development  (invoke for TDD discipline)
Skill tool → systematic-debugging     (invoke when stuck)
Skill tool → e2e-rapid-fix           (invoke for E2E failures)
```

### Skills by Phase

| Phase | Required Skills | When to Invoke |
|-------|-----------------|----------------|
| **Phase 1** | `brainstorming`, `tauri` | Start, Todo 3 |
| **Phase 2** | `tauri` | Todo 1 |
| **Phase 3** | `tauri`, `test-driven-development`, `integration-test-setup` | Todos 1, 3, 6 |
| **Phase 4** | `tauri`, `test-driven-development`, `systematic-debugging`, `e2e-rapid-fix`, `react-component-generator`, `tailwind-class-optimizer`, `verification-before-completion` | Todos 1, 3, 4 (as needed), 8 |
| **Phase 5** | `tauri`, `verification-before-completion`, `bottleneck-identifier`, `secret-scanner` | Todos 1, 3, 7, 9 |

### Skill Invocation Rules

1. **Invoke at specified todo** - Each phase document lists when to invoke
2. **Invoke BEFORE starting the work** - Skills inform the approach
3. **Re-invoke if needed** - Skills can be invoked multiple times
4. **In Free Zone (Phase 4 Todo 4)** - Invoke skills as situations arise

### Forbidden

- Skipping skill invocation because "I know this already"
- Using training data instead of current skill content
- Not invoking skills in autonomous mode

---

## Summary: Enforcement by Phase

| Phase | Mandatory Checks | Required Skills |
|-------|------------------|-----------------|
| **Phase 1** | Mockups include keyboard navigation hints, completeness pairs visible | `brainstorming`, `tauri` |
| **Phase 2** | Stories exist for a11y, completeness pairs, edge cases | `tauri` |
| **Phase 3** | Tests include a11y checks, edge cases, both pair halves | `tauri`, `test-driven-development`, `integration-test-setup` |
| **Phase 4** | Detection commands pass, no placeholders, no mocks, a11y implemented | `tauri`, `test-driven-development`, `systematic-debugging`, `e2e-rapid-fix`, `react-component-generator`, `tailwind-class-optimizer`, `verification-before-completion` |
| **Phase 5** | Production E2E passes, axe-core clean, keyboard navigation works, smoke test complete | `tauri`, `verification-before-completion`, `bottleneck-identifier`, `secret-scanner` |

---

## Tools

| Tool | Purpose | Phase |
|------|---------|-------|
| **axe-core** | Automated a11y testing | 4, 5 |
| **eslint-plugin-jsx-a11y** | A11y linting | 4 |
| **grep detection commands** | Find violations | 4, 5 |
| **WebdriverIO keyboard tests** | Keyboard navigation | 4, 5 |
| **Release build E2E** | Production-condition testing | 5 |

---

## Agent Skills Reference

| Skill | Purpose | Phases |
|-------|---------|--------|
| **tauri** | Tauri v2 APIs, patterns, plugin usage | 1, 2, 3, 4, 5 |
| **brainstorming** | Design refinement, Socratic questioning | 1 |
| **test-driven-development** | TDD cycle, RED-GREEN-REFACTOR | 3, 4 |
| **integration-test-setup** | Test infrastructure, fixtures | 3 |
| **systematic-debugging** | Root cause analysis, debugging strategies | 4 |
| **e2e-rapid-fix** | E2E failure patterns, WebdriverIO fixes | 4 |
| **react-component-generator** | React patterns, component structure | 4 |
| **tailwind-class-optimizer** | Tailwind best practices, responsive design | 4 |
| **verification-before-completion** | Pre-commit quality checks | 4, 5 |
| **bottleneck-identifier** | Performance analysis, optimization | 5 |
| **secret-scanner** | Security scan for exposed credentials | 5 |

**How to Invoke:** `Skill tool → skill-name`
