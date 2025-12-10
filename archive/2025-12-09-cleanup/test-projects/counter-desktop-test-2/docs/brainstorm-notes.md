# Counter Desktop App - Brainstorm Notes

**Date:** 2025-12-04
**Status:** Complete

## Core Concept

A minimal desktop counter application built with Tauri. Includes a simple login screen before accessing the counter. Serves as a pipeline test app to validate the Tauri desktop development workflow.

## Target Users

Developers testing the Tauri desktop pipeline.

## Features

### Login
- Simple login screen with username/password fields
- Basic validation (non-empty fields)
- Login button to authenticate
- Hardcoded credentials for simplicity (user/pass)
- Error message for invalid credentials
- Redirects to counter view on successful login

### Counter Display
- Shows current counter value
- Starts at 0 on each login session
- Large, centered display

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

## UI Mockups

### Login View
```
┌─────────────────────────────────────────────────────────────┐
│                      Counter App                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                        Welcome                              │
│                                                             │
│                      Username                               │
│                 ┌─────────────────────┐                     │
│                 │                     │                     │
│                 └─────────────────────┘                     │
│                                                             │
│                      Password                               │
│                 ┌─────────────────────┐                     │
│                 │ ••••••••••••        │                     │
│                 └─────────────────────┘                     │
│                                                             │
│                      [ Login ]                              │
│                                                             │
│                 Invalid credentials!                        │
│                 (error message area)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Counter View
```
┌─────────────────────────────────────────────────────────────┐
│                      Counter App                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                                                             │
│                         42                                  │
│                    (large display)                          │
│                                                             │
│                                                             │
│         [ - ]        [ Reset ]        [ + ]                 │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Navigation Flow

```
                    ┌────────────┐
                    │ App Launch │
                    └─────┬──────┘
                          │
                          ▼
                    ┌────────────┐
                    │ Login View │
                    └─────┬──────┘
                          │
                    (on success)
                          │
                          ▼
                   ┌──────────────┐
                   │ Counter View │
                   └──────────────┘
```

## Scope

### In Scope (v1)
- Login screen with username/password
- Hardcoded credentials (user: "user", pass: "pass")
- Single window application
- Counter display showing current value
- Increment button (+1)
- Decrement button (-1)
- Reset button (back to 0)
- Minimal clean UI
- No persistence (fresh start each launch)

### Out of Scope (future)
- Real authentication
- User registration
- Persistence between sessions
- Configurable step size
- Multiple counters
- Keyboard shortcuts
- Dark mode / themes
- Min/max limits

## Notes

- This is a pipeline test app, intentionally minimal
- Login uses hardcoded credentials for simplicity
- All counter logic handled in React state (no Rust backend commands needed for v1)
