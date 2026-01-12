# File Locations

**Created:** 2026-01-08

---

## Single Source of Truth

All CLAUDE.md content lives in `Pipeline-Office/claude-md/`:

```
claude-md/
├── orchestrator.md      # Orchestrator instructions
├── _worker-base.md      # Shared worker rules (all phases)
├── supervisor.md        # Supervisor instructions
├── phase-1.md           # Phase 1: Brainstorm
├── phase-2.md           # Phase 2: Technical specs
├── phase-3.md           # Phase 3: Bootstrap
├── phase-4.md           # Phase 4: Implement
└── phase-5.md           # Phase 5: Finalize
```

---

## Loading Rules

| Component | Source | Destination |
|-----------|--------|-------------|
| Orchestrator | `claude-md/orchestrator.md` | `project/.claude/CLAUDE.md` |
| Worker | `claude-md/phase-N.md` + `claude-md/_worker-base.md` | `project/.claude/CLAUDE.md` |
| Supervisor | `claude-md/supervisor.md` | `project/.claude/CLAUDE.md` |

---

## Spawn Script Behavior

**spawn-worker.ps1:**
```powershell
$claudeMdSource = "$pipelineOffice\claude-md\phase-$PhaseNumber.md"
$workerBaseSource = "$pipelineOffice\claude-md\_worker-base.md"

Copy-Item $claudeMdSource $claudeMdDest
Add-Content $claudeMdDest (Get-Content $workerBaseSource)
```

**spawn-supervisor.ps1:**
```powershell
$supervisorMdSource = "$pipelineOffice\claude-md\supervisor.md"
Copy-Item $supervisorMdSource $claudeMdDest
```

---

## No Extra CLAUDE.md Files

- `Pipeline-Office/.claude/CLAUDE.md` should NOT exist (or be empty)
- `~/.claude/commands/worker-base*.md` should NOT be used
- `lib/supervisor-claude.md` should NOT be used

All content comes from `claude-md/` folder only.
