# Worker Startup Process

**Created:** 2026-01-08

---

## Overview

When orchestrator spawns a worker, the worker should start with minimal injection.

---

## CLAUDE.md Loading

Worker's CLAUDE.md is prepared by spawn script:
1. Copy `claude-md/phase-N.md` to `project/.claude/CLAUDE.md`
2. Append `claude-md/_worker-base.md` to the same file

The phase-N.md file contains:
- Full phase instructions
- Todo list to initialize
- Phase-specific rules

---

## Startup Injection

Since CLAUDE.md already contains complete phase instructions, inject only:

```
BEGIN
```

This triggers the worker to start executing based on CLAUDE.md content.

---

## Worker Initialization

When worker starts:
1. Reads CLAUDE.md (loaded automatically by Claude Code)
2. Receives "BEGIN" message
3. Initializes todo list from phase instructions
4. Begins first task
