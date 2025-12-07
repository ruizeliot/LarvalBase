# Pipeline v7

A TUI (Terminal User Interface) application for automated development pipeline orchestration, built with Ink v5 and React.

## Features

- **Interactive TUI**: Beautiful terminal interface built with Ink v5
- **Pipeline Orchestration**: Automated 5-phase development workflow
- **Worker Management**: Spawn and monitor Claude Code workers
- **Real-time Progress**: Live progress tracking with todo list synchronization
- **Cost & Duration Tracking**: Monitor spending and time via ccusage integration
- **Resume Support**: Interrupt and resume pipelines at any point
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Installation

```bash
npm install -g @imt/pipeline
```

Or install from source:

```bash
git clone https://gitlab.com/imt/pipeline-v7.git
cd pipeline-v7
npm install
npm run build
npm link
```

## Usage

### Start a New Pipeline

```bash
pipeline /path/to/project
```

### Resume an Existing Pipeline

```bash
pipeline resume /path/to/project
```

### CLI Options

```bash
pipeline --help          # Show help
pipeline --version       # Show version (7.0.0)
pipeline --test-mode     # Run in test mode (no raw mode)
```

## Pipeline Phases

| Phase | Name | Description |
|-------|------|-------------|
| 1 | Brainstorm | Interactive user story creation |
| 2 | Technical | E2E test specs and tech stack definition |
| 3 | Bootstrap | Create skeleton app with failing tests (RED) |
| 4 | Implement | Code until all tests pass (GREEN) - loops per epic |
| 5 | Finalize | Polish, documentation, and deployment |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Navigate between fields |
| `Enter` | Confirm/Select |
| `Escape` | Cancel/Go back |
| `?` | Show help overlay |
| `q` | Quit (with confirmation) |
| `f` | Toggle fullscreen worker view |
| `p` | Pause pipeline |
| `r` | Resume paused pipeline |

## Architecture

```
src/
├── cli.tsx              # CLI entry point
├── components/          # Ink components (Box, Text, Input, etc.)
├── screens/             # Screen components (Launcher, Split, Complete)
├── stores/              # State management (Manifest, Session, Todo, Cost)
├── services/            # Core services
│   ├── filesystem.ts    # File operations
│   ├── process.ts       # Worker spawning
│   ├── cost.ts          # Cost/duration tracking
│   └── orchestrator.ts  # Pipeline orchestration
└── hooks/               # React hooks (useInput, useApp, useFocus)
```

## Development

### Build

```bash
npm run build
```

### Run in Development

```bash
npm run dev
```

### Run Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run E2E tests only
npm run test:e2e
```

### Test Coverage

The project includes comprehensive test coverage:
- **117 E2E tests** covering all 8 epics
- Mock Claude system for testing without real API calls
- Fixture-based test scenarios

## Project Structure

The project is organized into 8 epics:

1. **TUI Framework** (30 stories) - Ink v5 components and hooks
2. **Test Infrastructure** (40 stories) - Mock Claude, fixtures, helpers
3. **State Management** (47 stories) - Zustand-like stores
4. **Filesystem Service** (34 stories) - File operations and watching
5. **Process Service** (29 stories) - Worker spawning and management
6. **Cost Service** (22 stories) - Cost and duration tracking
7. **Pipeline Orchestrator** (36 stories) - Phase and epic management
8. **UI Screens** (48 stories) - Launcher, Split View, Complete screens

## Configuration

Pipeline state is stored in `.pipeline/manifest.json` within each project directory:

```json
{
  "version": "7.0.0",
  "project": {
    "name": "my-project",
    "path": "/path/to/project",
    "type": "terminal",
    "mode": "new"
  },
  "currentPhase": 4,
  "phases": { ... },
  "workers": [],
  "cost": { "total": 12.34, "byPhase": {} },
  "duration": { "total": 3600, "byPhase": {} }
}
```

## Requirements

- Node.js >= 18
- npm >= 8
- Claude Code CLI (for actual pipeline execution)
- ccusage (optional, for cost tracking)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `USE_MOCK_CLAUDE` | Set to `true` for testing without real Claude |
| `MOCK_CLAUDE_FIXTURE` | Path to fixture file for mock Claude |
| `PIPELINE_SESSION_ID` | Session ID passed to workers |
| `PIPELINE_PROJECT_PATH` | Project path passed to workers |
| `PIPELINE_PHASE` | Current phase passed to workers |

## License

MIT

## Author

IMT (Immersive Media Technologies)

## Related

- [Pipeline v6](https://gitlab.com/imt/pipeline-office) - Previous shell-based version
- [Ink](https://github.com/vadimdemedes/ink) - React for CLIs
- [Claude Code](https://claude.ai/claude-code) - AI coding assistant
