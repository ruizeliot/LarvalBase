# Pipeline Commands Reference

**Quick reference for all v4 pipeline commands**

---

## Interactive Brainstorming (Phase 0a)

### New Project Brainstorm
```bash
cd /home/claude/IMT/Pipeline-Office
./start-brainstorm.sh /home/claude/IMT/<project-name>
```

### New Feature Brainstorm (Existing Project)
```bash
cd /home/claude/IMT/Pipeline-Office
./start-brainstorm-feature.sh /home/claude/IMT/<project-name>
```

### Resume Stopped Brainstorm
```bash
cd /home/claude/IMT/Pipeline-Office
./resume-brainstorm.sh /home/claude/IMT/<project-name> <run-id>

# Example:
./resume-brainstorm.sh /home/claude/IMT/test2-pipeline-v3 20251124-151429
```

### Send Input to Running Brainstorm
```bash
# From another terminal while brainstorm is running
echo 'your message here' > /home/claude/IMT/<project-name>/.pipeline/.input

# Example:
echo 'Add user authentication' > /home/claude/IMT/test2-pipeline-v3/.pipeline/.input
```

### Stop Brainstorm Gracefully
```bash
# From another terminal while brainstorm is running
touch /home/claude/IMT/<project-name>/.pipeline/.stop

# Example:
touch /home/claude/IMT/test2-pipeline-v3/.pipeline/.stop
```

---

## Full Pipeline Orchestrators

### New Project Pipeline (Phases 0b → 1 → 2 → 3)
```bash
cd /home/claude/IMT/Pipeline-Office

# Start from 0b (default)
./start-pipeline.sh /home/claude/IMT/<project-name>

# Start from specific phase
./start-pipeline.sh /home/claude/IMT/<project-name> 2

# Examples:
./start-pipeline.sh /home/claude/IMT/test3-pipeline-v3
./start-pipeline.sh /home/claude/IMT/test3-pipeline-v3 2
```

**Note:** Run `start-brainstorm.sh` first for phase 0a.

### New Feature Pipeline (Phases 0b → 1 → 2 → 3)
```bash
cd /home/claude/IMT/Pipeline-Office

# Start from 0b (default)
./newFeature-pipeline.sh /home/claude/IMT/<project-name>

# Start from specific phase
./newFeature-pipeline.sh /home/claude/IMT/<project-name> 2

# Examples:
./newFeature-pipeline.sh /home/claude/IMT/test2-pipeline-v3
./newFeature-pipeline.sh /home/claude/IMT/test2-pipeline-v3 2
```

**Note:** Run `start-brainstorm-feature.sh` first for phase 0a.

---

## Individual Step Execution

### Run Single Step (New Project)
```bash
cd /home/claude/IMT/Pipeline-Office

# Syntax: ./run-step.sh <step> <project-path> <mode> [run-id] [epic]
./run-step.sh 0b /home/claude/IMT/<project-name> new
./run-step.sh 1 /home/claude/IMT/<project-name> new
./run-step.sh 2 /home/claude/IMT/<project-name> new
./run-step.sh 3 /home/claude/IMT/<project-name> new

# Example:
./run-step.sh 2 /home/claude/IMT/test3-pipeline-v3 new
```

### Run Single Step (Feature)
```bash
cd /home/claude/IMT/Pipeline-Office

./run-step.sh 0b /home/claude/IMT/<project-name> feature
./run-step.sh 1 /home/claude/IMT/<project-name> feature
./run-step.sh 2 /home/claude/IMT/<project-name> feature
./run-step.sh 3 /home/claude/IMT/<project-name> feature

# Example:
./run-step.sh 2 /home/claude/IMT/test2-pipeline-v3 feature
```

---

## Analysis Commands

### Analyze Single Step
```bash
cd /home/claude/IMT/Pipeline-Office

./analyze-step.sh <transcript-path>

# Example:
./analyze-step.sh /home/claude/IMT/test2-pipeline-v3/docs/metrics/2-20251124-120000-transcript.md
```

### Analyze Full Pipeline Run
```bash
cd /home/claude/IMT/Pipeline-Office

./analyze-pipeline.sh /home/claude/IMT/<project-name> <run-id>

# Example:
./analyze-pipeline.sh /home/claude/IMT/test2-pipeline-v3 20251124-173742
```

---

## Where to Find Outputs

### Transcripts (from orchestrators)
```
<project>/.pipeline/runs/<run-id>/
├── 0b-transcript.md                    # Phase 0b (new project)
├── 0b-feature-transcript.md            # Phase 0b (feature)
├── 1-transcript.md                     # Phase 1 (new project)
├── 1-feature-transcript.md             # Phase 1 (feature)
├── 2-epic-1-transcript.md              # Phase 2, Epic 1
├── 2-epic-2-transcript.md              # Phase 2, Epic 2
├── 2-feature-epic-8-transcript.md      # Phase 2, Epic 8 (feature)
├── 3-transcript.md                     # Phase 3 (new project)
├── 3-feature-transcript.md             # Phase 3 (feature)
└── metadata.json                       # Run metadata
```

### Manifest Snapshots (after each step)
```
<project>/.pipeline/runs/<run-id>/
├── 0b-manifest-snapshot.json
├── 1-manifest-snapshot.json
├── 2-epic-1-manifest-snapshot.json
└── 3-manifest-snapshot.json
```

### Brainstorm Transcripts (from start-brainstorm.sh)
```
<project>/.pipeline/runs/<run-id>/
└── 0a-transcript.md                    # New project brainstorm

<project>/.pipeline/runs/<run-id>/
└── 0a-feature-transcript.md            # Feature brainstorm
```

---

## Common Workflows

### Complete New Project Pipeline
```bash
cd /home/claude/IMT/Pipeline-Office

# 1. Interactive brainstorm
./start-brainstorm.sh /home/claude/IMT/my-new-project

# 2. Run automated pipeline
./start-pipeline.sh /home/claude/IMT/my-new-project

# 3. Analyze results
./analyze-pipeline.sh /home/claude/IMT/my-new-project <run-id>
```

### Add Feature to Existing Project
```bash
cd /home/claude/IMT/Pipeline-Office

# 1. Interactive feature brainstorm
./start-brainstorm-feature.sh /home/claude/IMT/my-project

# 2. Run automated feature pipeline
./newFeature-pipeline.sh /home/claude/IMT/my-project

# 3. Analyze results
./analyze-pipeline.sh /home/claude/IMT/my-project <run-id>
```

### Resume Failed Pipeline
```bash
cd /home/claude/IMT/Pipeline-Office

# If pipeline failed at phase 2, restart from there
./start-pipeline.sh /home/claude/IMT/my-project 2

# Or for feature pipeline
./newFeature-pipeline.sh /home/claude/IMT/my-project 2
```

---

## Direct Slash Commands (Not Recommended)

**These don't create transcripts. Use orchestrators instead.**

```bash
# In project directory
cd /home/claude/IMT/my-project

# New project phases
claude --dangerously-skip-permissions
/0b-pipeline-v4-technical
/1-pipeline-v4-bootstrap
/2-pipeline-v4-implementEpic
/3-pipeline-v4-finalize

# Feature phases
/0b-pipeline-v4-technical-feature
/1-pipeline-v4-bootstrap-feature
/2-pipeline-v4-implementEpic-feature
/3-pipeline-v4-finalize-feature
```

**Why not recommended:** Direct commands create checkpoints but no transcripts.

---

## Troubleshooting

### Find Latest Run ID
```bash
ls -lt /home/claude/IMT/<project-name>/.pipeline/runs/ | head -5

# Example:
ls -lt /home/claude/IMT/test2-pipeline-v3/.pipeline/runs/ | head -5
```

### View Current Run
```bash
cat /home/claude/IMT/<project-name>/.pipeline/current-run.txt
```

### Check Run Status
```bash
cat /home/claude/IMT/<project-name>/.pipeline/runs/<run-id>/metadata.json | jq '.status'
```

### View Manifest State
```bash
cat /home/claude/IMT/<project-name>/.pipeline/manifest.json | jq
```

### Check Which Epic AI is Working On
```bash
cat /home/claude/IMT/<project-name>/.pipeline/manifest.json | jq '.currentEpic, .epics[] | select(.status == "in-progress")'
```

---

**Last Updated:** 2025-11-24
**Pipeline Version:** v4
