# Phase 5: Quality Agent

**Version:** v11 (In Progress)
**Created:** 2026-01-09
**Status:** Under Review

---

## Overview

Phase 5 performs final quality assurance and prepares the application for deployment.

```
┌─────────────────────┐
│  Implemented App    │
│  (All tests GREEN)  │
└─────────────────────┘
          │
          ▼
   ┌─────────────┐
   │   Quality   │
   │ (Autonomous)│
   └─────────────┘
          │
          ▼
┌─────────────────────┐
│  Production-Ready   │
│    Application      │
└─────────────────────┘
```

**Input:** Implemented application (all tests passing from Phase 4)
**Output:** Production-ready application, README, deployment artifacts
**Mode:** Autonomous

**References:** [14-mandatory-standards.md](./14-mandatory-standards.md)

---

## Agent Skills (Invoke with Skill tool)

**CRITICAL: Skills are NOT auto-triggered in autonomous mode. You MUST explicitly invoke them.**

Phase 5 performs quality assurance. These skills help verify production readiness.

| Skill Name | Invoke When | What It Provides |
|------------|-------------|------------------|
| `tauri` | **Todo 1** (Before running production tests) | Tauri v2 build configuration, release settings |
| `verification-before-completion` | **Todo 3** (Before smoke tests) | Pre-release quality checklist |
| `bottleneck-identifier` | **Todo 7** (During Nielsen heuristic check) | Performance analysis, UX optimization |
| `secret-scanner` | **Todo 9** (Before final build) | Security scan for exposed credentials |

### How to Invoke

```
Skill tool → tauri                        (invoke before production tests)
Skill tool → verification-before-completion (invoke before smoke tests)
Skill tool → bottleneck-identifier        (invoke during UX review)
Skill tool → secret-scanner              (invoke before final build)
```

### Why Manual Invocation is Required

Skills trigger on **user messages only**. In autonomous phases, the worker receives ONE user message (the phase command) then works alone. Without explicit invocation, skills are never loaded.

---

## Mandatory Standards Enforcement

The Quality Agent performs final verification of all mandatory standards:

| Standard | Verification Method |
|----------|---------------------|
| **Keyboard Navigation** | Smoke test: navigate entire app using only Tab/Enter/Space |
| **Focus Indicators** | Visual inspection: verify visible focus on all elements |
| **Screen Reader** | Run axe-core: check for a11y violations |
| **Production E2E** | Run WebdriverIO against RELEASE build, not dev mode |
| **Detection Commands** | Re-run all detection commands from Phase 4 |

---

## Built-in Capabilities

These are capabilities the agent uses within todos (not external Agent Skills):

| Capability | Description | When to Use |
|------------|-------------|-------------|
| **Smoke Testing** | Systematically test all UI interactions | Todo 3 |
| **UX Review** | Evaluate against Nielsen heuristics | Todo 7 |
| **Build** | Run Tauri build process | Todo 9 |
| **Documentation** | Write clear README and docs | Todo 11 |

---

## Todos

### Todo 1: Run full test suite (PRODUCTION BUILD)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Verify all tests pass against production build |
| **What agent does** | Builds release binary, then runs Vitest (unit) and WebdriverIO (E2E) against it |
| **Rules** | Tests run against RELEASE build, not dev mode. All tests must pass. Zero failures, zero skipped. |
| **Output** | Test report with pass/fail counts |
| **Capabilities** | None |
| **Agent Skills** | `Skill tool → tauri` (invoke for build configuration) |
| **Effort** | 5% |

**Production E2E Configuration:**
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

**Why Production Builds?**

| Dev Mode | Production Mode |
|----------|-----------------|
| Debug assertions enabled | Debug assertions disabled |
| DevTools available | DevTools unavailable |
| WebView may behave differently | Actual user experience |
| Some interactions (drag-drop) may work differently | Real behavior |

---

### Todo 2: VERIFY: No regressions

| Aspect | Detail |
|--------|--------|
| **Purpose** | Independent verification of test results |
| **What agent does** | Spawns Haiku reviewer with checklist |
| **Haiku checks** | All tests pass? No skipped tests? No flaky tests? Coverage meets threshold? |
| **Pass threshold** | Score >= 95 |
| **On fail** | Fix issues and retry (max 3 attempts), then escalate |
| **Capabilities** | Review Loop |
| **Agent Skills** | - |
| **Effort** | 5% |

**Review Loop Protocol:**
```
Worker completes task
       |
Spawns Haiku reviewer with checklist
       |
Reviewer scores (0-100)
       |
Score >= 95?
    YES -> Proceed to next todo
    NO  -> Fix issues, retry (max 3 attempts)
           -> If 3 failures -> ESCALATE to human
```

---

### Todo 3: Run smoke tests on all UI elements

| Aspect | Detail |
|--------|--------|
| **Purpose** | Verify every interactive element works |
| **What agent does** | Systematically clicks every button, opens every panel, triggers every action in the app |
| **Rules** | Use mockups from brainstorm-notes.md as checklist. Every element must respond correctly. |
| **Output** | Smoke test report listing each element tested |
| **Capabilities** | Smoke Testing |
| **Agent Skills** | `Skill tool → verification-before-completion` (invoke before smoke tests) |
| **Effort** | 15% |

**Smoke Test Checklist:**
- [ ] Every button clicks and responds
- [ ] Every input accepts text
- [ ] Every panel opens and closes
- [ ] Every menu item works
- [ ] Every drag interaction works
- [ ] Every keyboard shortcut works

---

### Todo 4: VERIFY: Smoke coverage

| Aspect | Detail |
|--------|--------|
| **Purpose** | Independent verification that all UI elements were tested |
| **What agent does** | Spawns Haiku reviewer with checklist |
| **Haiku checks** | All mockup elements tested? No elements skipped? All interactions respond? |
| **Pass threshold** | Score >= 95 |
| **On fail** | Fix issues and retry (max 3 attempts), then escalate |
| **Capabilities** | Review Loop |
| **Agent Skills** | - |
| **Effort** | 5% |

---

### Todo 5: Run axe-core accessibility audit

| Aspect | Detail |
|--------|--------|
| **Purpose** | Verify accessibility compliance with automated tooling |
| **What agent does** | Runs axe-core against all major screens, collects violations |
| **Rules** | Zero critical/serious violations allowed. Minor violations documented. |
| **Output** | Accessibility audit report |
| **Capabilities** | None |
| **Agent Skills** | - |
| **Effort** | 5% |

**axe-core Integration:**
```bash
# Install axe-core for React
npm install @axe-core/react --save-dev
```

```tsx
// Add to app entry point (dev mode only)
import React from 'react';
import ReactDOM from 'react-dom';
if (process.env.NODE_ENV !== 'production') {
  import('@axe-core/react').then(axe => {
    axe.default(React, ReactDOM, 1000);
  });
}
```

**What axe-core Checks:**
- Color contrast (WCAG 2.1 Level AA)
- Missing alt text on images
- Missing aria-labels on interactive elements
- Keyboard accessibility issues
- Invalid ARIA attributes

---

### Todo 6: VERIFY: Accessibility compliance

| Aspect | Detail |
|--------|--------|
| **Purpose** | Independent verification of a11y audit results |
| **What agent does** | Spawns Haiku reviewer with checklist |
| **Haiku checks** | Zero critical violations? Zero serious violations? Minor issues documented? Keyboard navigation works? |
| **Pass threshold** | Score >= 95 |
| **On fail** | Fix issues and retry (max 3 attempts), then escalate |
| **Capabilities** | Review Loop |
| **Agent Skills** | - |
| **Effort** | 5% |

---

### Todo 7: Check Nielsen heuristics

| Aspect | Detail |
|--------|--------|
| **Purpose** | Verify UX quality meets usability standards |
| **What agent does** | Reviews app against Nielsen's 10 usability heuristics |
| **Output** | Heuristic compliance report |
| **Capabilities** | UX Review |
| **Agent Skills** | `Skill tool → bottleneck-identifier` (invoke for performance analysis) |
| **Effort** | 10% |

**Nielsen's 10 Usability Heuristics:**

| # | Heuristic | What to Check |
|---|-----------|---------------|
| 1 | Visibility of system status | Loading indicators, progress bars, state feedback |
| 2 | Match between system and real world | Familiar terms, logical order, real-world conventions |
| 3 | User control and freedom | Undo, redo, cancel, escape routes |
| 4 | Consistency and standards | Same words/actions mean same things throughout |
| 5 | Error prevention | Confirmations, constraints, smart defaults |
| 6 | Recognition over recall | Visible options, contextual help, clear labels |
| 7 | Flexibility and efficiency | Shortcuts, customization, accelerators |
| 8 | Aesthetic and minimalist design | No clutter, relevant info only, clean layout |
| 9 | Help users recognize and recover from errors | Clear error messages, solutions, non-destructive |
| 10 | Help and documentation | Searchable, task-focused, concise |

---

### Todo 8: VERIFY: UX quality

| Aspect | Detail |
|--------|--------|
| **Purpose** | Independent verification of UX compliance |
| **What agent does** | Spawns Haiku reviewer with checklist |
| **Haiku checks** | Major heuristic violations? User feedback visible? Error states handled? Consistent styling? |
| **Pass threshold** | Score >= 95 |
| **On fail** | Fix issues and retry (max 3 attempts), then escalate |
| **Capabilities** | Review Loop |
| **Agent Skills** | - |
| **Effort** | 5% |

---

### Todo 9: Run Tauri build

| Aspect | Detail |
|--------|--------|
| **Purpose** | Verify application builds successfully |
| **What agent does** | Runs `npm run tauri build` for current platform |
| **Rules** | Build must complete without errors. Output binary must be functional. |
| **Output** | Built application binary |
| **Capabilities** | Build |
| **Agent Skills** | `Skill tool → secret-scanner` (invoke before final build) |
| **Effort** | 10% |

**Build Commands:**
```bash
# Development build (for testing)
npm run tauri dev

# Production build (for release)
npm run tauri build
```

---

### Todo 10: VERIFY: Build succeeds

| Aspect | Detail |
|--------|--------|
| **Purpose** | Independent verification of build quality |
| **What agent does** | Spawns Haiku reviewer with checklist |
| **Haiku checks** | Build completed? No warnings treated as errors? Binary runs? App opens correctly? |
| **Pass threshold** | Score >= 95 |
| **On fail** | Fix issues and retry (max 3 attempts), then escalate |
| **Capabilities** | Review Loop |
| **Agent Skills** | - |
| **Effort** | 5% |

---

### Todo 11: Generate README

| Aspect | Detail |
|--------|--------|
| **Purpose** | Create user-facing documentation |
| **What agent does** | Writes README.md with: project description, features, installation, usage, development setup |
| **Rules** | Based on brainstorm-notes.md and user-stories.md. Clear, concise, accurate. |
| **Output** | README.md |
| **Capabilities** | Documentation |
| **Agent Skills** | - |
| **Effort** | 10% |

**README Structure:**
```markdown
# [App Name]

[One-line description]

## Features

- [Feature 1 from epics]
- [Feature 2 from epics]
- ...

## Installation

[How to install the built app]

## Usage

[How to use the app - key workflows]

## Development

[How to set up dev environment]

## License

[License info]
```

---

### Todo 12: VERIFY: Documentation complete

| Aspect | Detail |
|--------|--------|
| **Purpose** | Independent verification of documentation |
| **What agent does** | Spawns Haiku reviewer with checklist |
| **Haiku checks** | README exists? Installation instructions work? Features match implementation? No broken links? |
| **Pass threshold** | Score >= 95 |
| **On fail** | Fix issues and retry (max 3 attempts), then escalate |
| **Capabilities** | Review Loop |
| **Agent Skills** | - |
| **Effort** | 5% |

---

### Todo 13: Final commit

| Aspect | Detail |
|--------|--------|
| **Purpose** | Save final state with version tag |
| **What agent does** | Creates conventional commit, adds version tag |
| **Format** | `chore: finalize v1.0.0` with summary of all epics |
| **Rules** | All tests pass. Build succeeds. Documentation complete. |
| **Output** | Git commit + tag |
| **Capabilities** | None |
| **Agent Skills** | - |
| **Effort** | 5% |

**Commit Format:**
```
chore: finalize v1.0.0

Epics completed:
- Epic 1: [Name] (X stories)
- Epic 2: [Name] (X stories)
- Epic 3: [Name] (X stories)

Total: X stories, X E2E tests, all passing

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Tagging:**
```bash
git tag -a v1.0.0 -m "Release v1.0.0"
```

---

### Todo 14: VERIFY: Deployment ready

| Aspect | Detail |
|--------|--------|
| **Purpose** | Final verification that everything is ready |
| **What agent does** | Spawns Haiku reviewer with checklist |
| **Haiku checks** | All phases complete? All tests pass? Build works? Docs exist? Git tagged? A11y audit clean? |
| **Pass threshold** | Score >= 95 |
| **On fail** | Fix issues and retry (max 3 attempts), then escalate |
| **Capabilities** | Review Loop |
| **Agent Skills** | - |
| **Effort** | 5% |

---

## Summary Table

| # | Todo Name | Capabilities | Agent Skills | Effort |
|---|-----------|--------------|--------------|--------|
| 0 | **Phase Start** | - | - | - |
| 1 | Run full test suite (PRODUCTION BUILD) | None | `Skill tool → tauri` | 5% |
| 2 | VERIFY: No regressions | Review Loop | - | 5% |
| 3 | Run smoke tests on all UI elements | Smoke Testing | `Skill tool → verification-before-completion` | 10% |
| 4 | VERIFY: Smoke coverage | Review Loop | - | 5% |
| 5 | Run axe-core accessibility audit | None | - | 5% |
| 6 | VERIFY: Accessibility compliance | Review Loop | - | 5% |
| 7 | Check Nielsen heuristics | UX Review | `Skill tool → bottleneck-identifier` | 10% |
| 8 | VERIFY: UX quality | Review Loop | - | 5% |
| 9 | Run Tauri build | Build | `Skill tool → secret-scanner` | 5% |
| 10 | VERIFY: Build succeeds | Review Loop | - | 5% |
| 11 | Generate README | Documentation | - | 10% |
| 12 | VERIFY: Documentation complete | Review Loop | - | 5% |
| 13 | Final commit | None | - | 5% |
| 14 | VERIFY: Deployment ready | Review Loop | - | 5% |
| | **Total** | | | **100%** |

---

## Flow Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 5: QUALITY AGENT                              │
└───────────────────────────────────────────────────────────────────────────────┘

  Todo 1          Todo 2
    │               │
    ▼               ▼
┌───────┐      ┌─────────┐
│ Tests │ ──▶  │ VERIFY: │
│RELEASE│      │no regres│◀─── Haiku Review
└───────┘      └────┬────┘
                    │
                    ▼
┌───────┐      ┌─────────┐
│ Smoke │ ──▶  │ VERIFY: │
│ tests │      │coverage │◀─── Haiku Review
└───────┘      └────┬────┘
  Todo 3            │
                    ▼
┌───────┐      ┌─────────┐
│axe-   │ ──▶  │ VERIFY: │
│ core  │      │a11y OK  │◀─── Haiku Review
└───────┘      └────┬────┘
  Todo 5            │
                    ▼
┌───────┐      ┌─────────┐
│Nielsen│ ──▶  │ VERIFY: │
│heurist│      │UX qualit│◀─── Haiku Review
└───────┘      └────┬────┘
  Todo 7            │
                    ▼
┌───────┐      ┌─────────┐
│ Tauri │ ──▶  │ VERIFY: │
│ build │      │build OK │◀─── Haiku Review
└───────┘      └────┬────┘
  Todo 9            │
                    ▼
┌───────┐      ┌─────────┐
│README │ ──▶  │ VERIFY: │
│ docs  │      │docs OK  │◀─── Haiku Review
└───────┘      └────┬────┘
  Todo 11           │
                    ▼
┌───────┐      ┌─────────┐
│ Final │ ──▶  │ VERIFY: │
│commit │      │ready    │◀─── Haiku Review
└───────┘      └────┬────┘
  Todo 13           │
                    ▼
            Production Ready
```

---

## Status

Under Review - Ready for implementation as agent CLAUDE.md
