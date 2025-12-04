# Counter Desktop App - Brainstorm Notes

**Date:** 2025-12-04
**Status:** Complete

## Core Concept

A minimal desktop counter application built with Tauri. Serves as a pipeline test app to validate the Tauri desktop development workflow.

## Target Users

Developers testing the Tauri desktop pipeline.

## Features

### Counter Display
- Shows current counter value
- Starts at 0 on each launch
- Centered in the window

### Counter Controls
- Decrement button (-): Decreases counter by 1
- Reset button: Resets counter to 0
- Increment button (+): Increases counter by 1
- Buttons arranged horizontally: [ - ] [Reset] [ + ]

## Tech Stack

- **Framework:** Tauri v2
- **Frontend:** React + TypeScript
- **Bundler:** Vite
- **Backend:** Rust (Tauri core)
- **Testing:** WebdriverIO + Mocha (Tauri E2E)

## UI Mockup

```
┌─────────────────────────────────┐
│         Counter App             │
├─────────────────────────────────┤
│                                 │
│            [ 0 ]                │
│                                 │
│    [ - ]   [Reset]   [ + ]      │
│                                 │
└─────────────────────────────────┘
```

## Navigation Flow

Single view - no navigation required.

```
[App Launch] → [Counter View]
```

## Scope

### In Scope (v1)
- Single window application
- Counter display showing current value
- Increment button (+1)
- Decrement button (-1)
- Reset button (back to 0)
- Minimal clean UI
- No persistence (fresh start each launch)

### Out of Scope (future)
- Persistence between sessions
- Configurable step size
- Multiple counters
- Keyboard shortcuts
- Dark mode / themes
- Min/max limits

## Notes

- This is a pipeline test app, intentionally minimal
- All counter logic handled in React state (no Rust backend commands needed for v1)
