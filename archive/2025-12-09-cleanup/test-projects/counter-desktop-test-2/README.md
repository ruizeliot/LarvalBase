# Counter Desktop App

A minimal desktop counter application built with Tauri 2.0, React, and TypeScript.

## Features

- Login screen with username/password authentication
- Counter display with increment, decrement, and reset functionality
- Clean, minimal UI

## Development

### Prerequisites

- Node.js 18+
- Rust (stable)
- Tauri CLI: `npm install -g @tauri-apps/cli`
- tauri-driver: `cargo install tauri-driver`

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run tauri dev
```

### Build for Production

```bash
npm run tauri build
```

The built executable will be in `src-tauri/target/release/`.

## E2E Testing

E2E tests use WebdriverIO with tauri-driver to test the real built application.

### Install E2E Dependencies

```bash
cd e2e && npm install
```

### Run E2E Tests

First, build the app, then run tests:

```bash
npm run tauri build
npm run test:e2e
```

## Project Structure

```
counter-desktop-app/
├── src/                    # React frontend
│   ├── components/
│   │   ├── LoginView.tsx
│   │   └── CounterView.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── src-tauri/              # Tauri backend (Rust)
│   ├── src/
│   │   ├── lib.rs
│   │   └── main.rs
│   ├── capabilities/
│   └── tauri.conf.json
├── e2e/                    # WebdriverIO E2E tests
│   ├── specs/
│   │   ├── epic1-login.e2e.js
│   │   └── epic2-counter.e2e.js
│   └── wdio.conf.js
└── docs/                   # Design documents
    ├── brainstorm-notes.md
    ├── user-stories.md
    └── e2e-test-specs.md
```

## License

MIT
