# PRD — AI-XR Companion

**Version:** 1.0
**Date:** 2026-03-05
**Project:** unity-test

---

## 1. Product Vision

### Concept
AI-XR Companion is a Mixed Reality AI assistant for Meta Quest 3, built in Unity. Users interact with an embodied AI through real-time voice conversation (STT -> LLM -> TTS), on-demand visual analysis (camera capture -> VLM), and spatial presence (3D avatar, volumetric orb, or invisible mode).

### Positioning
Research/prototype MR AI companion demonstrating conversational AI embodied in spatial computing. Designed for developers and researchers exploring AI + XR integration.

### Target Audience
- XR researchers and developers at academic institutions (Mines d'Albi context)
- Developers prototyping AI-powered MR experiences
- Students exploring voice-AI + spatial computing intersection

### Core Value Proposition
A fully configurable, provider-agnostic AI assistant that lives in your mixed reality space — see it, talk to it, ask it to describe what you see, and customize every aspect of the pipeline.

---

## 2. Technical Constraints

| Constraint | Value |
|-----------|-------|
| Engine | Unity 6 (6000.x) |
| Render Pipeline | URP 17 |
| XR SDK | Meta OpenXR 2.0.1 |
| Target Device | Meta Quest 3 / 3S |
| Build Target | Android ARM64 |
| RAM Budget | ~4GB app maximum (12GB shared on Quest 3) |
| MCP | unity-mcp (editor only, stripped at runtime) |
| Config Storage | `StreamingAssets/ai-xr-config.json` |
| Debug Export | `/sdcard/AI-XR/debug-logs-{timestamp}.json` |
| Input Methods | Controller (triggers, thumbstick, Y button) + Hand Tracking (pinch, palm-up, open palm) |
| Fork Base | PodGab (Mines d'Albi) — AIManager, AIEntity, SmartObjects, MicrophoneRecorder, CameraFeedDisplay |

### Architecture
- **Editor-time:** MCP protocol via unity-mcp for AI-assisted development
- **Runtime:** Custom HTTP API for STT/LLM/TTS/VLM provider communication
- **Provider system:** 4 bricks (STT, LLM, TTS, Vision) x 3 slots each, manual selection
- **Pipeline:** Sequential (PTT -> Record -> STT -> LLM -> TTS -> Playback), no inter-stage streaming

---

## 3. Functional Specifications

### 3.1 Project Setup & MCP Integration
- Unity 6 project with URP 17, Meta OpenXR 2.0.1, Android ARM64
- unity-mcp editor panel for AI-assisted commands
- Hierarchy and Unity commands accessible through MCP protocol
- Connection status indicator (connected/disconnected/error)
- `#if UNITY_EDITOR` preprocessor guards strip MCP from runtime builds
- Config persisted in StreamingAssets between sessions

### 3.2 Provider System
- 4 provider bricks: STT, LLM, TTS, Vision
- Each brick has 3 configurable slots (e.g., Whisper / Deepgram / local)
- Manual slot selection — no automatic fallback
- Per-provider status: connected, disconnected, latency display
- Error popup with Retry/Dismiss
- Feature auto-disabled when all 3 slots of a brick fail
- Network cutoff: BRICK_NETWORK error code, dedicated handling
- All config in `StreamingAssets/ai-xr-config.json`

### 3.3 Voice Pipeline
- PTT activation: controller trigger OR hand pinch gesture
- Sequential pipeline: Record -> STT -> LLM -> TTS -> Playback
- 5 visual feedback states (color-coded orb):
  - Ready: green
  - Recording: red
  - Transcribing: yellow
  - Thinking: blue
  - Talking: purple
- Sliding window context: N=5 most recent messages sent to LLM
- PTT locked during processing (prevents new input)
- Anti-spam: recordings < 0.5s automatically ignored
- Per-stage elapsed timer visible during execution

### 3.4 Incarnation System
Three embodiment modes:
1. **Avatar RPM** — .glb mesh + OVRLipSync visemes + 3 animations (idle, talk, think)
2. **Orbe volumetrique** — Custom shader sphere + reactive particles + 4 state colors
3. **Invisible** — Dashed ground circle + monospace HUD + typewriter transcript

Each mode maps all 5 pipeline states with distinct visual feedback. Fade transition 0.3s between modes. Pipeline continues during switch (cosmetic only). Default: Orbe.

### 3.5 Vision On-Demand
- Trigger: controller Y button / open palm gesture
- Flow: passthrough capture -> WebCamTexture -> JPEG 80% -> VLM provider -> TTS description
- Viewfinder: crosshair + green brackets during aiming, white flash on capture
- Analyzing: indicator with elapsed timer
- Response: floating text above incarnation + TTS playback
- Cooldown: 5s ring progress, button grayed during cooldown
- VLM response injected as system message in LLM context
- No visual memory between captures
- Cancel during analysis: return to idle, no cooldown

### 3.6 XR Integration & Spatial
- Passthrough MR via OVRCameraRig
- Incarnation spawns at 2m facing user
- Grab & drag repositioning (OVRGrabbable), billboard Y-axis (always faces user)
- Spatial audio: simplified HRTF, logarithmic distance rolloff
- Single world anchor in PlayerPrefs (NOT OVRSpatialAnchor), fallback 2m on failure
- No plan detection or mesh scanning
- Guardian integration: auto pause pipeline on exit, auto resume on return

### 3.7 Settings UI (XR)
- Toggle: thumbstick press or palm-up gesture, fade 0.2s
- Tag-along lazy follow: 1.5m distance, 0.3m dead zone
- 5 tabs: Providers / Incarnation / Voice / Vision / XR
- Spatial controls: pinch toggle, pinch+drag slider, pinch+scroll dropdown, plus raycast controller
- Real-time application (no save/apply workflow)
- Provider tab: 4 bricks x 3 slots, radio select, status, latency
- Incarnation tab: mode selector with preview
- Voice tab: PTT sensitivity, context window N
- Vision tab: cooldown duration
- XR tab: audio distance, passthrough toggle, anchor reset

### 3.8 Debug & Monitoring
- Secret toggle: double grip simultane 2s hold
- Unity console logging: per-stage latency, requests/responses, errors
- Runtime HUD overlay (semi-transparent):
  - Pipeline state machine (highlighted current state)
  - Per-stage latency bars with p95 stats
  - Provider status (4 bricks, check/cross)
  - Scrollable logs (20 entries, 4 severity levels)
  - Performance gauges (FPS/Memory/CPU/GPU)
  - Network status + uptime
- Export: JSON to `/sdcard/AI-XR/debug-logs-{timestamp}.json`
- API keys sanitized (masked with ****) in exports

---

## 4. User Stories

### Epic 1 — Project Setup & MCP Integration

| ID | Story | Complexity |
|----|-------|-----------|
| US-1 | As a developer, I want to create a Unity 6 project configured with URP 17, Meta OpenXR 2.0.1, and Android ARM64 target so that I have a working Quest 3 build foundation. | S |
| US-2 | As a developer, I want unity-mcp integrated in the editor via a dedicated panel so that I can use AI-assisted commands during development. | M |
| US-3 | As a developer, I want hierarchy and Unity commands accessible through MCP so that I can manipulate the scene via AI. | M |
| US-4 | As a developer, I want a connection status indicator with clear error messages when MCP fails so that I know if the editor integration is working. | S |
| US-5 | As a developer, I want `#if UNITY_EDITOR` guards on all MCP code so that runtime builds on Quest are clean and MCP-free. | S |
| US-6 | As a developer, I want config persistence via StreamingAssets so that my settings survive between Unity sessions. | S |

**Edge Cases:**
| ID | Story |
|----|-------|
| US-1-EC1 | Missing Meta XR / URP package at import -> clear error message listing missing packages |
| US-2-EC1 | unity-mcp server not running -> panel shows "MCP disconnected" with retry button |
| US-3-EC1 | Network loss during MCP communication -> reconnection attempt with status feedback |
| US-6-EC1 | Config JSON corrupted -> regenerate with defaults + warning notification |
| US-6-EC2 | Config file deleted -> auto-regenerate with defaults on next load |

### Epic 2 — Provider System & Error Handling

| ID | Story | Complexity |
|----|-------|-----------|
| US-7 | As a user, I want to configure 4 provider bricks (STT/LLM/TTS/Vision) with 3 slots each so that I can choose my preferred AI services. | L |
| US-8 | As a user, I want per-provider status indicators (connected/disconnected/latency) so that I know which providers are healthy. | M |
| US-9 | As a user, I want error notification popups with Retry/Dismiss so that I can handle provider failures. | M |
| US-10 | As a user, I want features auto-disabled when all 3 slots of a brick fail so that the app degrades gracefully. | M |
| US-11 | As a user, I want network cutoff handling with BRICK_NETWORK error code so that I understand connectivity issues. | S |
| US-12 | As a user, I want provider config persisted in ai-xr-config.json so that my setup survives restarts. | S |
| US-37 | As a user, I want to re-enable a disabled provider slot after fixing the issue so that I can recover without restarting. | S |

**Edge Cases:**
| ID | Story |
|----|-------|
| US-7-EC1 | Invalid API key configured -> error on first call with "Invalid credentials" message |
| US-9-EC1 | Multiple rapid errors -> grouped into single notification instead of spam |
| US-9-EC2 | 3 failed retries -> slot auto-disabled with notification |
| US-11-EC1 | Network returns after cutoff -> slot stays disabled until manual re-enable |
| US-11-EC2 | Airplane mode -> auto health check triggers on all providers |

### Epic 3 — Voice Pipeline STT->LLM->TTS

| ID | Story | Complexity |
|----|-------|-----------|
| US-13 | As a user, I want to press trigger/pinch to start voice recording that flows through STT->LLM->TTS->playback so that I can have a conversation with the AI. | L |
| US-14 | As a user, I want 5 color-coded feedback states (green/red/yellow/blue/purple) so that I always know what the AI is doing. | M |
| US-15 | As a user, I want conversational context via sliding window (N=5) so that the AI remembers recent exchanges. | S |
| US-16 | As a user, I want PTT locked during processing so that I don't accidentally interrupt the pipeline. | S |
| US-17 | As a user, I want recordings shorter than 0.5s ignored so that accidental taps don't trigger the pipeline. | S |
| US-18 | As a user, I want per-stage elapsed timers so that I can see how long each step takes. | S |
| US-38 | As a user, I want to cancel the pipeline during STT/LLM processing so that I can abort a conversation turn. | M |

**Edge Cases:**
| ID | Story |
|----|-------|
| US-13-EC1 | Mic permission not granted -> clear "Microphone required" message before recording attempt |
| US-13-EC2 | STT provider timeout (15s) -> pipeline aborts cleanly with error message |
| US-14-EC1 | Pipeline state stuck for 30s -> auto-cancel with "Pipeline timeout" error |
| US-15-EC1 | Context exceeds token limit -> oldest messages truncated silently |
| US-16-EC1 | Rapid PTT presses during locked state -> visual "still processing" feedback |
| US-38-EC1 | Cancel during TTS playback -> immediately stops audio output |

### Epic 4 — Incarnation System

| ID | Story | Complexity |
|----|-------|-----------|
| US-19 | As a user, I want to choose between Avatar RPM, Orbe volumetrique, and Invisible modes so that I can pick my preferred AI embodiment. | L |
| US-20 | As a user, I want each incarnation mode to visually react to all 5 pipeline states so that the AI feels alive and responsive. | M |
| US-21 | As a user, I want a smooth 0.3s fade transition between modes with no pipeline interruption so that switching feels seamless. | M |

**Edge Cases:**
| ID | Story |
|----|-------|
| US-19-EC1 | Avatar .glb corrupted or > 50MB -> fallback to Orbe + "Avatar invalide" notification |
| US-19-EC2 | Avatar loading > 3s -> loading spinner + temporary Orbe mode |
| US-20-EC1 | Animation missing in .glb -> T-pose fallback + console warning |
| US-20-EC2 | LLM response > 500 chars in Invisible mode -> truncation with "..." + scroll |
| US-21-EC1 | Double switch < 0.5s -> skip to final mode, no intermediate transition |

### Epic 5 — Vision On-Demand

| ID | Story | Complexity |
|----|-------|-----------|
| US-22 | As a user, I want to press Y/open palm to capture what I see and get a voice description so that the AI can analyze my environment. | L |
| US-23 | As a user, I want a viewfinder with crosshair during aiming and a flash on capture so that I know when the photo is taken. | M |
| US-24 | As a user, I want the VLM response as floating text + TTS with a 5s cooldown so that I get visual and audio feedback. | M |
| US-39 | As a user, I want to cancel vision analysis mid-process so that I can abort without waiting. | S |

**Edge Cases:**
| ID | Story |
|----|-------|
| US-22-EC1 | Camera permission denied -> "Camera indisponible" message, feature disabled |
| US-22-EC2 | VLM timeout (15s) -> abort + "Analyse impossible, reessayez" |
| US-22-EC3 | JPEG > 4MB -> auto-compress before sending to VLM |
| US-24-EC1 | TTS fails after VLM success -> show text only (no audio) |
| US-24-EC2 | Button press during cooldown -> "Wait X seconds" feedback |
| US-39-EC1 | Cancel during analysis -> return to idle, no cooldown applied |

### Epic 6 — XR Integration & Spatial

| ID | Story | Complexity |
|----|-------|-----------|
| US-25 | As a user, I want passthrough MR with the incarnation spawning at 2m facing me so that the AI has a natural spatial presence. | M |
| US-26 | As a user, I want to grab and drag the incarnation to reposition it so that I can place it where I want. | M |
| US-27 | As a user, I want the incarnation to always face me (billboard Y-axis) so that it feels engaged. | S |
| US-28 | As a user, I want spatial 3D audio with distance rolloff so that the AI's voice feels spatially accurate. | M |
| US-29 | As a user, I want a lightweight world anchor (PlayerPrefs) so that the incarnation stays where I placed it between sessions. | M |
| US-30 | As a user, I want the pipeline to auto-pause when I leave the Guardian boundary and resume when I return so that the experience respects my play space. | S |

**Edge Cases:**
| ID | Story |
|----|-------|
| US-25-EC1 | Physical space < 2m -> incarnation clamped to available distance |
| US-26-EC1 | Hand tracking lost mid-grab -> drop at current position |
| US-26-EC2 | Drag outside boundary -> clamp to boundary edge |
| US-26-EC3 | Push too close -> minimum distance 0.3m enforced |
| US-29-EC1 | Saved anchor data corrupted -> fallback 2m default |
| US-30-EC1 | Outside Guardian > 60s -> auto-cancel active pipeline |

### Epic 7 — Settings UI XR

| ID | Story | Complexity |
|----|-------|-----------|
| US-31 | As a user, I want to open/close settings via thumbstick or palm-up gesture with a 0.2s fade so that access is quick and smooth. | M |
| US-32 | As a user, I want tag-along settings panel with tabbed navigation so that settings follow me and are well organized. | M |
| US-33 | As a user, I want spatial controls (pinch toggle, pinch+drag slider, pinch+scroll dropdown, plus raycast) so that I can configure everything with hands or controllers. | L |

**Edge Cases:**
| ID | Story |
|----|-------|
| US-31-EC1 | Palm-up false positive -> 1s cooldown after close, ignore gesture |
| US-31-EC2 | Open settings during active pipeline -> pipeline continues in background |
| US-32-EC1 | User turns 180 -> panel smooth orbit to maintain 1.5m in front |
| US-32-EC2 | Switch tabs -> return -> previous scroll position preserved |
| US-33-EC1 | Switch controller/hand mid-interaction -> seamless transition |
| US-33-EC2 | Slider drag beyond bounds -> clamped to min/max |

### Epic 8 — Debug & Monitoring

| ID | Story | Complexity |
|----|-------|-----------|
| US-34 | As a developer, I want to toggle debug overlay via double grip 2s so that I can access diagnostics without cluttering the UI. | M |
| US-35 | As a developer, I want a runtime HUD showing pipeline state, latency, provider status, logs, and performance gauges so that I can diagnose issues on-device. | L |
| US-36 | As a developer, I want to export debug logs as JSON to /sdcard/ so that I can analyze sessions offline. | M |
| US-40 | As a user, I want to cancel the pipeline (stop recording + stop TTS) so that I have full control over the interaction. | S |
| US-41 | As a developer, I want to clear debug logs so that I can start fresh monitoring. | S |

**Edge Cases:**
| ID | Story |
|----|-------|
| US-34-EC1 | Rapid cascade errors -> grouped into summary, not individual log entries |
| US-35-EC1 | HUD rendering > 1ms -> auto-reduce LOD to stay within budget |
| US-36-EC1 | API keys in logs -> sanitized with **** before export |
| US-36-EC2 | /sdcard/ full -> notification before export fails |
| US-36-EC3 | AI-XR folder doesn't exist -> auto-create before export |
| US-41-EC1 | Clear logs while export in progress -> blocked until export completes |

---

## 5. Epic Breakdown

| # | Epic | Section | Stories | Dependencies | Complexity | Status |
|---|------|---------|---------|-------------|-----------|--------|
| 1 | Project Setup & MCP Integration | Setup & MCP | US-1 to US-6 + 5 EC | None | M | TODO |
| 2 | Provider System & Error Handling | Provider System | US-7 to US-12, US-37 + 5 EC | Epic 1 | L | TODO |
| 3 | Voice Pipeline STT->LLM->TTS | Voice Pipeline | US-13 to US-18, US-38 + 6 EC | Epics 1, 2 | L | TODO |
| 4 | Incarnation System | Incarnation | US-19 to US-21 + 5 EC | Epic 3 | L | TODO |
| 5 | Vision On-Demand | Vision | US-22 to US-24, US-39 + 6 EC | Epics 2, 3 | L | TODO |
| 6 | XR Integration & Spatial | XR Spatial | US-25 to US-30 + 6 EC | Epic 3 | L | TODO |
| 7 | Settings UI XR | Settings UI | US-31 to US-33 + 6 EC | Epics 2-6 | L | TODO |
| 8 | Debug & Monitoring | Debug | US-34 to US-36, US-40, US-41 + 6 EC | All | M | TODO |

### Build Order

```
Epic 1 (Setup)
  |
  v
Epic 2 (Providers)
  |
  v
Epic 3 (Voice Pipeline)
  |
  +---------+---------+
  |         |         |
  v         v         v
Epic 4    Epic 5    Epic 6
(Incarn)  (Vision)  (XR)
  |         |         |
  +---------+---------+
            |
            v
      Epic 7 (Settings)
            |
            v
      Epic 8 (Debug)
```

Epics 4, 5, and 6 can be built in parallel once Epic 3 (Voice Pipeline) is complete. Each only needs the pipeline state machine and provider system, not each other.

---

## 6. Visual References

### Mockup Files
Individual mockup HTML files were created by Storm during brainstorm but are not available locally (Discord CDN URLs expired). The combined mockup was: `mockup-ai-xr-complete.html`.

See `app-mockup.html` for the navigable compilation (with placeholder notes where mockups are missing).

### Key Visual Concepts
- **Provider panel:** 4 bricks in column layout, 3 slots per brick with radio selection, status dot, latency bar
- **Voice pipeline:** Linear flow visualization with orb color transitions
- **Incarnation modes:** Side-by-side comparison of Avatar RPM / Orbe / Invisible
- **Settings panel:** Floating tag-along panel with 5 tabs, spatial controls
- **Debug HUD:** Semi-transparent overlay with state machine, latency bars, gauges, logs

---

## 7. Non-Functional Requirements

| Requirement | Target |
|------------|--------|
| Frame rate | 72 FPS minimum on Quest 3 |
| Pipeline latency | < 8s total (STT + LLM + TTS) |
| Memory usage | < 4GB total app footprint |
| Debug HUD overhead | < 1ms rendering budget |
| Config load time | < 500ms from StreamingAssets |
| Anchor restore | < 1s from PlayerPrefs |
| Settings panel follow | 0.3m dead zone, no visible jitter |
| Fade transitions | 0.2-0.3s consistent |
| Audio spatialization | Logarithmic rolloff, HRTF simplified |
| Export file size | Debug JSON < 50MB per session |
| Test coverage | 76 E2E tests (41 core + 35 edge cases) |

---

## 8. Testing Strategy

- **Every user story has at least 1 E2E test** (user mandate)
- **Unit tests** for all state machines, calculations, and logic
- **Integration tests** for provider communication, input handling, and persistence
- **Total:** 76 E2E tests across 41 core stories + 35 edge cases
- **Framework:** Unity Test Framework (EditMode + PlayMode)
- **Device testing:** Quest 3 hardware for XR-specific tests
