# Live Canvas Integration Testing Guide

## Prerequisites

1. Start Whisper server:
   ```bash
   cd whisper-server && python server.py
   # Verify: curl http://localhost:5000/health
   ```

2. Start Live Canvas server:
   ```bash
   cd live-canvas-mcp && node dist/index.js
   # Verify: curl http://localhost:3456/api/status
   ```

3. Open browser to http://localhost:3456

---

## Test 5.1: Voice → TUI Flow

### Steps
1. Open Live Canvas in browser
2. Click and hold microphone button
3. Speak clearly (English or French)
4. Release button
5. Verify transcript appears in input field

### Expected Results
- Audio recording indicator shows while holding
- "Transcribing..." shows after release
- Transcribed text appears in input field
- Text can be edited before sending

### API Test
```bash
# Check Whisper is responding
curl http://localhost:5000/health
# Expected: {"status":"ok","model":"base","model_loaded":true}
```

---

## Test 5.2: Drawing → TUI Flow

### Steps
1. Draw something on the Excalidraw whiteboard
2. Type a message in the input field
3. Check "Whiteboard" checkbox
4. Click Send

### Expected Results
- WebSocket message sent with:
  - type: "user_input"
  - message: your typed text
  - whiteboard: base64 PNG image
- If Claude PID is set, message injected to Claude

### API Test
```bash
# Check status (includes object count)
curl http://localhost:3456/api/status
# Expected: {"status":"ok","viewers":1,"notesLength":N,"objectCount":N,...}
```

---

## Test 5.3: Notes Sync

### Steps (Canvas → File)
1. Edit notes in the left panel
2. Wait 1-2 seconds (debounced)
3. Check that `docs/brainstorm-notes.md` updated

### Steps (File → Canvas)
1. Edit `docs/brainstorm-notes.md` directly
2. Check that notes panel updates in browser

### API Test
```bash
# Set notes
curl -X POST http://localhost:3456/api/notes \
  -H "Content-Type: application/json" \
  -d '{"content": "# Test Notes\n- Item 1", "append": false}'

# Get notes
curl http://localhost:3456/api/notes
# Expected: {"content":"# Test Notes\n- Item 1"}

# Append notes
curl -X POST http://localhost:3456/api/notes \
  -H "Content-Type: application/json" \
  -d '{"content": "\n- Item 2", "append": true}'
```

---

## Test 5.4: AI → Canvas Updates

### Steps
1. Start a brainstorm session with Interactive Mode
2. Describe something that should be visualized
3. Claude should update the canvas via MCP tools

### Expected Results
- Notes panel updates with brainstorm progress
- Whiteboard shows diagrams/mockups (if Claude draws)

### API Test
```bash
# Update notes (simulating AI)
curl -X POST http://localhost:3456/api/notes \
  -H "Content-Type: application/json" \
  -d '{"content": "\n\n## AI Added This\n- New idea from Claude", "append": true}'
```

---

## Test 5.5: Full Flow Test

### Prerequisites
1. New project directory with `.pipeline/manifest.json`
2. Run: `claude-brainstorm` from that directory

### Steps
1. Answer "Desktop (Tauri)" when asked about stack
2. Answer "Yes - Voice + Live Canvas" for Interactive Mode
3. Whisper server should start (or already running)
4. Browser should open to Live Canvas
5. Use voice to describe your app idea
6. Draw a rough layout on whiteboard
7. Send with Whiteboard checked
8. Claude should respond with refined design

### Expected Results
- Voice transcription works (EN or FR)
- Whiteboard image reaches Claude
- Claude analyzes and responds
- Notes panel updates with brainstorm progress

---

## Test 5.6: Error Handling

### Whisper Offline
1. Stop Whisper server
2. Try to record audio
3. Expected: Error message shown in UI

### Canvas Disconnected
1. Stop Live Canvas server
2. Check browser behavior
3. Expected: "Disconnected" status shown

### Invalid Claude PID
```bash
curl -X POST http://localhost:3456/api/inject/raw \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "targetPid": 99999}'
# Expected: {"success":false,"error":"...AttachConsole failed..."}
```

---

## Quick Verification Commands

```bash
# Check all services
echo "=== Whisper ===" && curl -s http://localhost:5000/health
echo "=== Live Canvas ===" && curl -s http://localhost:3456/api/status
echo "=== Notes ===" && curl -s http://localhost:3456/api/notes
echo "=== Inject PID ===" && curl -s http://localhost:3456/api/inject/pid
```
