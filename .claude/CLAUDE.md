# Pipeline-Office

**Pipeline Version:** 11.0
**Architecture:** Orchestrator + Dashboard + Workers

## Structure

| Directory | Purpose |
|-----------|---------|
| `lib/` | Orchestrator, process spawning, dashboard, analyzer |
| `live-canvas-mcp/` | Live Canvas MCP server (TypeScript/ESM) |
| `claude-md/` | Phase-specific instruction templates |
| `Discord-Pipeline-Projects/` | Active project workspaces |
| `docs/` | Architecture docs, brainstorm facilitator reference |

## Brainstorm Phase

Phase 1 brainstorm instructions are available via skills (`interactive-brainstorm`) and archived in `docs/phase-1-brainstorm-facilitator.md`. They are NOT loaded here to conserve context.

## Code Patterns

- **CommonJS** (`.cjs`) with `'use strict'` headers
- **Event-driven** architecture with typed `EVENTS` constants
- **State machine** pattern for orchestrator flow
- **Handler pattern** - `.handle(context)` method per handler module

## Quick Reference

- Entry point: `lib/orchestrator/runner.cjs`
- Dashboard: `lib/dashboard-runner-v11.cjs`
- Tests: `npm test`
- Start: `/orchestrator` command in a project directory
