# OBS Recording Automation for Pipeline

**Created:** 2025-12-18
**Goal:** Automatically record pipeline phases/epics with OBS, creating separate recordings for each phase/epic.

---

## Overview

A Node.js script that integrates with the pipeline dashboard to control OBS recording:
- **Start recording** when a phase or epic begins
- **Stop recording** when phase/epic changes (10s delay before next recording)
- **Stop final recording** when pipeline completes

---

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   manifest.json     │────>│  obs-recorder.cjs   │────>│   OBS Studio    │
│   (watched)         │     │  (this script)      │     │   (WebSocket)   │
└─────────────────────┘     └─────────────────────┘     └─────────────────┘
         │                            │
         │ fs.watch()                 │ obs-websocket-js
         └────────────────────────────┘
```

---

## Implementation Plan

### Task 1: Project Setup

**File:** `lib/obs-recorder.cjs`

**Dependencies:**
```bash
npm install obs-websocket-js
```

**Configuration:**
```javascript
const CONFIG = {
  OBS_HOST: 'ws://localhost:4455',
  OBS_PASSWORD: process.env.OBS_PASSWORD || '',  // From OBS Tools > WebSocket settings
  DELAY_BETWEEN_RECORDINGS: 10000,  // 10 seconds
  MANIFEST_POLL_INTERVAL: 1000,     // 1 second
  RECORDING_PREFIX: 'Pipeline_',     // File naming prefix
};
```

---

### Task 2: OBS Connection Module

```javascript
const OBSWebSocket = require('obs-websocket-js').default;
const obs = new OBSWebSocket();

async function connectOBS() {
  try {
    await obs.connect(CONFIG.OBS_HOST, CONFIG.OBS_PASSWORD);
    console.log('[OBS] Connected to OBS Studio');
    return true;
  } catch (err) {
    console.error('[OBS] Connection failed:', err.message);
    return false;
  }
}

async function startRecording(label) {
  try {
    // Optional: Set output filename via SetProfileParameter or SetRecordDirectory
    await obs.call('StartRecord');
    console.log(`[OBS] Recording started: ${label}`);
    return true;
  } catch (err) {
    console.error('[OBS] Start recording failed:', err.message);
    return false;
  }
}

async function stopRecording() {
  try {
    const result = await obs.call('StopRecord');
    console.log('[OBS] Recording stopped, saved to:', result?.outputPath || 'default location');
    return result?.outputPath;
  } catch (err) {
    if (err.message.includes('not active')) {
      console.log('[OBS] No active recording to stop');
      return null;
    }
    console.error('[OBS] Stop recording failed:', err.message);
    return null;
  }
}

async function isRecording() {
  try {
    const status = await obs.call('GetRecordStatus');
    return status.outputActive;
  } catch (err) {
    return false;
  }
}
```

---

### Task 3: Manifest Watcher Module

```javascript
const fs = require('fs');
const path = require('path');

const PROJECT_PATH = path.resolve(process.argv[2] || process.cwd());
const MANIFEST_PATH = path.join(PROJECT_PATH, '.pipeline', 'manifest.json');

// State tracking
let lastPhaseStatuses = {};
let lastEpicStatuses = {};
let lastPipelineStatus = null;
let isTransitioning = false;  // Prevents overlapping transitions

function readManifest() {
  try {
    const content = fs.readFileSync(MANIFEST_PATH, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

function getRecordingLabel(type, id, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  if (type === 'phase') {
    return `Phase${id}_${name}_${timestamp}`;
  } else if (type === 'epic') {
    return `Epic${id}_${name}_${timestamp}`;
  }
  return `Pipeline_${timestamp}`;
}
```

---

### Task 4: State Transition Logic

```javascript
async function handleTransition(newType, newId, newName) {
  if (isTransitioning) {
    console.log('[RECORDER] Transition already in progress, queuing...');
    return;
  }

  isTransitioning = true;

  try {
    // 1. Stop current recording if active
    if (await isRecording()) {
      console.log('[RECORDER] Stopping current recording...');
      await stopRecording();

      // 2. Wait 10 seconds before starting new recording
      console.log(`[RECORDER] Waiting ${CONFIG.DELAY_BETWEEN_RECORDINGS / 1000}s before next recording...`);
      await sleep(CONFIG.DELAY_BETWEEN_RECORDINGS);
    }

    // 3. Start new recording with label
    const label = getRecordingLabel(newType, newId, newName);
    console.log(`[RECORDER] Starting recording for: ${label}`);
    await startRecording(label);

  } finally {
    isTransitioning = false;
  }
}

async function checkStateTransitions() {
  const manifest = readManifest();
  if (!manifest) return;

  // Check pipeline complete
  if (manifest.status === 'complete' && lastPipelineStatus !== 'complete') {
    console.log('[RECORDER] Pipeline complete - stopping final recording');
    await stopRecording();
    lastPipelineStatus = manifest.status;
    return;
  }
  lastPipelineStatus = manifest.status;

  // Check phase transitions
  if (manifest.phases) {
    for (const [phase, data] of Object.entries(manifest.phases)) {
      const currentStatus = data.status;
      const previousStatus = lastPhaseStatuses[phase];

      // Phase started
      if (currentStatus === 'running' && previousStatus !== 'running') {
        const phaseName = PHASE_NAMES[phase] || `Phase${phase}`;
        console.log(`[RECORDER] Phase ${phase} (${phaseName}) started`);
        await handleTransition('phase', phase, phaseName);
      }

      // Phase completed (triggers stop, but next phase will start new recording)
      if (currentStatus === 'complete' && previousStatus === 'running') {
        console.log(`[RECORDER] Phase ${phase} completed`);
        // Don't stop here - let the next phase start handle the transition
      }

      lastPhaseStatuses[phase] = currentStatus;
    }
  }

  // Check epic transitions (Phase 4)
  if (manifest.epics && manifest.epics.length > 0) {
    for (const epic of manifest.epics) {
      const currentStatus = epic.status;
      const previousStatus = lastEpicStatuses[epic.id];

      // Epic started
      if (currentStatus === 'running' && previousStatus !== 'running') {
        console.log(`[RECORDER] Epic ${epic.id} (${epic.name}) started`);
        await handleTransition('epic', epic.id, epic.name.replace(/\s+/g, '_'));
      }

      lastEpicStatuses[epic.id] = currentStatus;
    }
  }
}
```

---

### Task 5: Recording Metadata (Optional Enhancement)

Store recording info in manifest for later reference:

```javascript
async function updateManifestRecording(type, id, recordingPath) {
  const manifest = readManifest();
  if (!manifest) return;

  if (!manifest.recordings) {
    manifest.recordings = [];
  }

  manifest.recordings.push({
    type,
    id,
    path: recordingPath,
    startedAt: new Date().toISOString(),
  });

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}
```

---

### Task 6: Main Entry Point

```javascript
const PHASE_NAMES = {
  '1': 'Brainstorm',
  '2': 'Technical',
  '3': 'Bootstrap',
  '4': 'Implement',
  '5': 'Finalize'
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('[OBS-RECORDER] Starting...');
  console.log('[OBS-RECORDER] Project:', PROJECT_PATH);
  console.log('[OBS-RECORDER] Manifest:', MANIFEST_PATH);

  // Connect to OBS
  const connected = await connectOBS();
  if (!connected) {
    console.error('[OBS-RECORDER] Failed to connect to OBS. Exiting.');
    process.exit(1);
  }

  // Initialize state from current manifest
  const manifest = readManifest();
  if (manifest) {
    lastPipelineStatus = manifest.status;
    if (manifest.phases) {
      for (const [phase, data] of Object.entries(manifest.phases)) {
        lastPhaseStatuses[phase] = data.status;
      }
    }
    if (manifest.epics) {
      for (const epic of manifest.epics) {
        lastEpicStatuses[epic.id] = epic.status;
      }
    }
    console.log('[OBS-RECORDER] Initialized state from manifest');
  }

  // Start polling loop
  console.log('[OBS-RECORDER] Watching for state transitions...');
  setInterval(checkStateTransitions, CONFIG.MANIFEST_POLL_INTERVAL);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[OBS-RECORDER] Shutting down...');
    if (await isRecording()) {
      await stopRecording();
    }
    obs.disconnect();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('[OBS-RECORDER] Fatal error:', err);
  process.exit(1);
});
```

---

### Task 7: Dashboard Integration (Optional)

Add OBS status indicator to dashboard-v3.cjs:

```javascript
// In render() function, add OBS status line:
const obsStatus = await getOBSStatus();  // Check via file or shared state
const obsLine = obsStatus.recording
  ? C.red + '● REC' + C.reset + ' ' + obsStatus.currentLabel
  : C.dim + '○ OBS Standby' + C.reset;
lines.push(line('  ' + obsLine, W));
```

---

### Task 8: Launch Script Integration

Create `spawn-obs-recorder.ps1`:

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath
)

$scriptPath = "C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office\lib\obs-recorder.cjs"

Start-Process -FilePath "node" -ArgumentList $scriptPath, $ProjectPath -NoNewWindow
```

---

## File Structure

```
Pipeline-Office/
├── lib/
│   ├── dashboard-v3.cjs      # Existing
│   ├── obs-recorder.cjs      # NEW - Main OBS automation script
│   └── spawn-obs-recorder.ps1 # NEW - PowerShell launcher
└── package.json              # Add obs-websocket-js dependency
```

---

## OBS Setup Requirements

1. **Enable WebSocket Server** in OBS:
   - Tools → WebSocket Server Settings
   - Enable WebSocket server
   - Note the port (default: 4455)
   - Set a password (recommended)

2. **Configure Recording Settings** in OBS:
   - Settings → Output → Recording
   - Set output path (e.g., `C:\Users\ahunt\Videos\Pipeline\`)
   - Set filename format (e.g., `%CCYY-%MM-%DD_%hh-%mm-%ss`)

3. **Set OBS_PASSWORD** environment variable:
   ```bash
   export OBS_PASSWORD="your_obs_websocket_password"
   ```

---

## Usage

### Standalone Mode
```bash
cd "/c/Users/ahunt/Documents/IMT Claude/Pipeline-Office"
node lib/obs-recorder.cjs "/c/Users/ahunt/Documents/IMT Claude/your-project"
```

### With Dashboard (Recommended)
Run in a separate terminal alongside the dashboard:
```bash
# Terminal 1: Dashboard
node lib/dashboard-v3.cjs "/path/to/project"

# Terminal 2: OBS Recorder
node lib/obs-recorder.cjs "/path/to/project"
```

### Orchestrator Integration (Future)
Add to orchestrator's spawn logic to auto-start OBS recorder with dashboard.

---

## Event Flow Example

```
Time    Event                           OBS Action
──────────────────────────────────────────────────────────
0:00    Pipeline starts, Phase 1 runs   → StartRecord (Phase1_Brainstorm_...)
15:00   Phase 1 complete                (no action yet)
15:00   Phase 2 starts                  → StopRecord, wait 10s, StartRecord
15:10   (10s delay)                     → StartRecord (Phase2_Technical_...)
45:00   Phase 2 complete                (no action yet)
45:00   Phase 3 starts                  → StopRecord, wait 10s, StartRecord
...
2:00:00 Pipeline complete               → StopRecord (final)
```

---

## Error Handling

| Error | Handling |
|-------|----------|
| OBS not running | Exit with error, prompt user to start OBS |
| WebSocket auth failed | Exit with error, show password hint |
| Recording already active | Stop first, then proceed |
| Manifest not found | Wait and retry (project not initialized yet) |
| OBS disconnected mid-session | Attempt reconnect every 5s |

---

## Future Enhancements

1. **Filename Customization**: Use OBS's SetProfileParameter to set recording filenames per phase/epic
2. **Scene Switching**: Automatically switch OBS scenes per phase (e.g., show phase name overlay)
3. **Streaming Support**: Option to stream instead of/in addition to recording
4. **Notification Sounds**: Play sound on recording start/stop
5. **Recording Manifest**: Write recording file paths back to manifest for easy reference

---

## Sources

- [obs-websocket-js on npm](https://www.npmjs.com/package/obs-websocket-js)
- [OBS WebSocket GitHub](https://github.com/obsproject/obs-websocket)
- [OBS WebSocket Node.js Guide](https://ndiesslin.com/blog/OBS-websocket/)
