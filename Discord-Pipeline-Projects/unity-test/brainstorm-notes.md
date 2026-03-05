# AI-XR Companion — Brainstorm Notes

**Project:** unity-test (AI-XR Companion)
**Date:** 2026-03-05
**Participants:** Anthony Hunt (user), Manager (agent), Storm (mockup agent), NoteBot (summary agent)
**Mode:** Draft & Review (all 8 epics drafted sequentially, reviewed globally)

---

## 1. Concept Summary & Positioning

**Concept:** AI-XR Companion is a Mixed Reality AI assistant for Meta Quest 3, built in Unity. It provides real-time voice interaction via a configurable STT -> LLM -> TTS pipeline, vision-on-demand capabilities, and three incarnation modes (3D avatar, volumetric orb, invisible).

**Positioning:** A research/prototype MR AI assistant that demonstrates conversational AI embodied in spatial computing. Targets Quest 3/3S hardware with passthrough MR.

**Base/Fork:** Targeted fork of PodGab project (Mines d'Albi) — reuses AIManager, AIEntity, SmartObjects, CameraFeedDisplay, MicrophoneRecorder components.

**Architecture:** Hybrid MCP (editor-time) + custom HTTP API (runtime XR). Four provider "bricks" (STT/LLM/TTS/Vision) with 3 configurable slots each.

---

## 2. Technical Constraints & Platform

- **Engine:** Unity 6 (6000.x)
- **Render Pipeline:** URP 17
- **XR SDK:** Meta OpenXR 2.0.1
- **Target Hardware:** Meta Quest 3 / 3S
- **Build Target:** Android ARM64
- **RAM Budget:** ~4GB max for app (Quest 3 has 12GB shared GPU/CPU)
- **Input:** Controller (triggers, thumbstick) + Hand Tracking (pinch, palm-up gestures)
- **MCP Integration:** unity-mcp (https://github.com/CoplayDev/unity-mcp) for editor, stripped via `#if UNITY_EDITOR` guards in runtime builds
- **Config Storage:** `StreamingAssets/ai-xr-config.json` (persists between sessions)
- **Debug Export:** `/sdcard/AI-XR/debug-logs-{timestamp}.json`

---

## 3. References & Prior Work

- **PodGab (Mines d'Albi):** Fork base providing core AI architecture (AIManager, AIEntity, SmartObjects, MicrophoneRecorder, CameraFeedDisplay)
- **unity-mcp:** GitHub package for Unity editor MCP integration — required prerequisite for editor-side AI commands
- **Meta OpenXR SDK:** Passthrough, hand tracking, spatial anchors, Guardian system
- **OVRLipSync:** Lip sync for RPM avatars (viseme-based)
- **Ready Player Me (RPM):** Avatar .glb format for 3D incarnation mode
- **Cloud Providers:** Whisper API (STT), OpenAI/Claude (LLM), ElevenLabs (TTS), GPT-4V/Claude Vision/LLaVA (VLM)

---

## 4. Brainstorm Process

### Step 1 — Concept & Research
- Concept defined: MR AI companion with voice pipeline and spatial presence
- Platform confirmed: Quest 3/3S with Unity 6
- Architecture decided: hybrid MCP (editor) / HTTP (runtime)
- Fork base identified: PodGab

### Step 2A — Epic Breakdown
- 8 epics / 36 user stories initially defined
- Build order established: 1 -> 2 -> 3 -> 4/5/6 (parallel) -> 7 -> 8

### Step 2B — Mockup Drafting (Draft & Review mode)
- All 8 epic mockups drafted by Storm sequentially
- Individual HTML mockups posted as Discord attachments in section threads
- Combined mockup (mockup-ai-xr-complete.html) created and posted
- User validated with global "A" approval

### Step 3A — Validation
- User stories verified: 41 core (36 original + 5 completeness-pair additions: US-37 through US-41)
- Edge cases deep-dive: 35 edge-case stories added across all 8 epics
- Testing strategy: 76 E2E tests total (41 core + 35 edge cases)
- User preference: "every US must have an E2E test, and as many tests as possible"

### Step 3B — Technical Discussion
- Pipeline latency: estimated 3-8s cumulative on Quest (STT->LLM->TTS)
- Hybrid architecture: two code paths to maintain (MCP editor vs HTTP runtime)
- Quest 3 memory: 12GB shared, ~4GB app budget
- URP 17 + Meta OpenXR 2.0.1 combination: recent but not extensively battle-tested
- All technical constraints accepted by user

---

## 5. Section-by-Section Decisions

### Epic 1 — Project Setup & MCP Integration (US-1 through US-6)

**Decisions:**
- Unity 6 with URP 17 and Meta OpenXR 2.0.1, Android ARM64 target
- unity-mcp integration in editor via dedicated panel
- Hierarchy & Unity commands accessible through MCP
- Connection status indicator with clear error message on MCP failure
- `#if UNITY_EDITOR` guards to strip MCP from runtime builds
- Config persistence via StreamingAssets between Unity sessions
- Hybrid architecture: MCP in editor, custom HTTP API at runtime

**Options Considered & Rejected:**
- Single architecture (MCP everywhere): Rejected because MCP requires editor context, not available at runtime on Quest
- Full auto-configuration: Rejected in favor of explicit config with clear feedback

**Edge Cases (5):**
1. Package manquant — missing Meta XR / URP package at import
2. MCP non lance — unity-mcp server not running when panel opens
3. Perte WiFi reconnexion — network loss during MCP communication
4. JSON corrompu fallback — config file corrupted, needs regeneration
5. Fichier supprime regeneration — deleted config file auto-regenerated with defaults

**Testing Strategy:**
- US-1: E2E (project -> build Quest ARM64 succeeds with URP + OpenXR), Unit (settings validation)
- US-2: E2E (open panel -> MCP connection), Integration (MCP server mock)
- US-3: E2E (hierarchy commands via MCP), Unit (command parsing)
- US-4: E2E (disconnect MCP -> error message displayed), Unit (status state machine)
- US-5: E2E (build without MCP references in runtime), Unit (preprocessor guard verification)
- US-6: E2E (change config -> restart -> config preserved), Unit (JSON serialization)

**Mockup:** 6 spatial panels in Unity 6 editor view. Mockup file not available locally (CDN expired).

---

### Epic 2 — Provider System & Error Handling (US-7 through US-12)

**Decisions:**
- 4 provider bricks (STT/LLM/TTS/Vision) x 3 slots each, configured independently
- **Manual selection only** — no automatic fallback between slots
- Per-provider status indicators: connected/disconnected/latency
- Error notification popup with Retry/Dismiss actions
- Feature auto-disabled when all 3 slots of a brick fail
- Network cutoff handling with dedicated BRICK_NETWORK error code
- Config persisted in `StreamingAssets/ai-xr-config.json`
- Retry only on active provider (not automatic slot switching)
- Simplified degradation model: error -> notification + feature off

**Options Considered & Rejected:**
- Automatic fallback between slots: Rejected — user wanted explicit manual control
- Complex degradation with partial functionality: Rejected in favor of binary on/off per brick

**Edge Cases (5):**
1. API key invalide — invalid key configured, error on first call
2. Erreurs groupees — multiple rapid errors grouped into single notification
3. Retry 3x -> disable slot — after 3 failed retries, slot auto-disabled
4. Reactivation reseau -> re-disable — network returns but slot stays disabled until manual re-enable
5. Mode avion -> auto health check — airplane mode triggers health check on all providers

**Testing Strategy:**
- US-7: E2E (configure 3 slots -> switch active -> correct provider used), Unit (slot state management)
- US-8: E2E (provider connected -> green, disconnect -> red), Unit (debounce latency, health check)
- US-9: E2E (trigger error -> popup appears -> Retry -> success), Unit (popup merge logic)
- US-10: E2E (fail all 3 slots -> feature disabled), Unit (degradation state machine)
- US-11: E2E (cut network -> BRICK_NETWORK error displayed), Integration (network mock)
- US-12: E2E (change config -> restart -> preserved), Unit (JSON schema validation)

**Mockup:** 7 spatial panels. Mockup file not available locally.

---

### Epic 3 — Voice Pipeline STT->LLM->TTS (US-13 through US-18)

**Decisions:**
- **Sequential pipeline** (no streaming between stages): PTT -> Mic -> STT -> LLM -> TTS -> Playback
- Dual input: controller trigger + hand pinch for PTT activation
- 5 feedback states with color-coded orbs: Ready (green), Recording (red), Transcribing (yellow), Thinking (blue), Talking (purple)
- Conversational context via sliding window (N=5 messages)
- PTT locked during processing (no new input until pipeline completes)
- Anti-spam guard: recordings < 0.5s ignored
- Per-stage elapsed timer visible during pipeline execution
- Active stage highlighting during pipeline execution

**Options Considered & Rejected:**
- Streaming between stages (e.g., streaming STT -> LLM): Rejected for simplicity and reliability on Quest
- Continuous listening (no PTT): Rejected — PTT provides clear user intent signal
- Larger context window: N=5 chosen as balance between context quality and API costs

**Edge Cases (6):**
1. Micro permission — Android mic permission not granted, clear message before recording
2. STT timeout 15s — provider timeout mid-transcription, pipeline stops cleanly
3. State stuck 30s — pipeline stage stuck for 30s, auto-cancel with error
4. Context overflow truncation — context exceeds token limit, oldest messages truncated
5. PTT spam feedback — rapid PTT presses during locked state, visual feedback "still processing"
6. Cancel TTS stop audio — cancel during TTS playback immediately stops audio

**Testing Strategy:**
- US-13: E2E (trigger press -> record -> STT -> LLM -> TTS -> audio played), Unit (silence detection, permission check), Integration (mic -> mock STT)
- US-14: E2E (launch pipeline -> verify each orb color in sequence), Unit (state machine transitions, timeout guards)
- US-15: E2E (6 exchanges -> verify only last 5 in context), Unit (sliding window logic)
- US-16: E2E (try PTT during processing -> locked feedback), Unit (lock state management)
- US-17: E2E (quick press < 0.5s -> ignored, no pipeline), Unit (duration threshold)
- US-18: E2E (timer visible and incrementing during each stage), Unit (timer accuracy)

**Mockup:** 7 spatial panels showing full pipeline flow. Mockup file not available locally.

---

### Epic 4 — Incarnation System (US-19 through US-21)

**Decisions:**
- **3 incarnation modes only** (no custom modes):
  1. **Avatar RPM:** Mesh .glb + OVRLipSync visemes + 3 animations (idle, talk, think)
  2. **Orbe volumetrique:** Shader sphere + reactive particles + 4 state colors
  3. **Invisible:** Dashed ground circle + monospace HUD + typewriter transcript
- Full 5-state reaction matrix per mode (Ready/Recording/Transcribing/Thinking/Talking) — each mode has distinct visual feedback
- Cosmetic fade transition 0.3s between modes
- Pipeline preserved during mode switch (no interruption)
- Default mode: Orbe (lightest weight)

**Options Considered & Rejected:**
- Custom/user-created incarnation modes: Rejected — 3 predefined modes cover all use cases
- Pipeline interruption on mode switch: Rejected — transition is purely cosmetic
- Instant switch (no fade): Rejected — 0.3s fade provides smoother UX

**Edge Cases (5):**
1. GLB corrompu fallback Orbe — corrupted/oversized avatar (.glb > 50MB) -> fallback to Orbe + warning "Avatar invalide"
2. Chargement > 3s spinner — avatar loading > 3s -> spinner + temporary Orbe mode
3. Animation manquante T-pose — missing animation in .glb -> T-pose fallback + console warning
4. Texte > 500 chars truncation — LLM response > 500 chars in Invisible mode -> truncation with "..." + scroll
5. Double switch rapide skip — rapid double switch (< 0.5s) -> skip to final mode, no intermediate transition

**Testing Strategy:**
- US-19: E2E (select each mode -> verify visual appearance), Unit (asset loading, fallback logic)
- US-20: E2E (trigger each pipeline state in each mode -> correct visual), Unit (reaction matrix state mapping)
- US-21: E2E (switch mode during pipeline -> fade transition + pipeline continues), Unit (fade timer, state preservation)

**Mockup:** 3 incarnation modes side-by-side in MR space. Mockup file not available locally.

---

### Epic 5 — Vision On-Demand (US-22 through US-24)

**Decisions:**
- **On-demand only** (no continuous stream)
- Trigger: controller Y button / open palm gesture
- Capture flow: passthrough capture -> WebCamTexture -> JPEG 80% quality -> VLM provider (GPT-4V/Claude Vision/LLaVA) -> description vocale TTS
- Viewfinder UI: crosshair + green brackets during aiming, white flash on capture
- Analyzing indicator with elapsed timer
- Response: floating text above incarnation + TTS playback
- Cooldown: 5s ring progress (button grayed out during cooldown)
- **No visual memory between captures** — each capture is independent
- **No client-side quality check** — whatever is captured gets sent
- VLM response injected as system message in LLM context

**Options Considered & Rejected:**
- Continuous video stream to VLM: Rejected — too expensive and bandwidth-heavy on Quest
- Visual memory (remembering previous captures): Rejected for simplicity in V1
- Client-side image quality check: Rejected — VLM handles vague/dark images gracefully
- Cancel during analysis resets cooldown: No — cancel means no cooldown applied

**Edge Cases (6):**
1. Camera non autorisee — passthrough camera permission denied -> "Camera indisponible" message
2. VLM timeout 15s — provider timeout during analysis -> abort + "Analyse impossible, reessayez"
3. JPEG > 4MB auto-compression — image exceeds VLM size limit -> auto-compress before sending
4. TTS echec texte seul — TTS fails after VLM success -> show text only (no audio)
5. Cooldown feedback — button press during cooldown -> visual feedback "wait X seconds"
6. Cancel pas de cooldown — cancel during analysis -> return to idle, no cooldown applied

**Completeness-pair stories added:**
- US-38: Cancel pipeline STT
- US-39: Cancel vision analysis

**Testing Strategy:**
- US-22: E2E (press Y -> capture -> VLM -> text + TTS), Unit (JPEG compression, permission check)
- US-23: E2E (viewfinder visible during aim, flash on capture), Unit (viewfinder state, timer)
- US-24: E2E (text displayed above incarnation + TTS plays + cooldown ring), Unit (cooldown timer, text truncation)

**Mockup:** 6 spatial panels showing capture flow. Mockup file not available locally.

---

### Epic 6 — XR Integration & Spatial (US-25 through US-30)

**Decisions:**
- Passthrough MR via OVRCameraRig, incarnation spawns at 2m facing user
- Grab & drag repositioning via OVRGrabbable, re-orient after drop (billboard Y-axis)
- Gaze direction: incarnation always faces user (billboard Y-axis rotation)
- Spatial audio 3D: simplified HRTF, logarithmic distance rolloff with expansion rings visualization
- **Single lightweight world anchor** stored in PlayerPrefs (NOT OVRSpatialAnchor)
- **No plan detection or mesh scanning**
- Fallback: 2m default position on anchor failure
- Boundary guardian integration: auto pause pipeline on exit, auto resume on return

**Options Considered & Rejected:**
- OVRSpatialAnchor (full spatial anchor API): Rejected — too complex for a single anchor, PlayerPrefs simpler
- Plan detection / mesh scanning: Rejected — unnecessary for single floating incarnation
- Full HRTF spatialization: Rejected in favor of simplified HRTF for performance
- Multiple anchor save/load: Rejected — single anchor sufficient for V1

**Edge Cases (6):**
1. Espace < 2m clamp — physical space < 2m in front -> incarnation clamped to available distance
2. Tracking loss drop — hand tracking lost mid-grab -> drop at current position
3. Drag hors boundary clamp — drag incarnation outside boundary -> clamp to boundary edge
4. Distance 0 clamp 0.3m — push incarnation too close -> minimum distance 0.3m enforced
5. Anchor corrompu fallback — saved anchor data corrupted -> fallback 2m default position
6. Hors Guardian > 60s cancel — outside Guardian boundary > 60s -> auto-cancel pipeline

**Testing Strategy:**
- US-25: E2E (launch app -> passthrough active -> incarnation visible at 2m), Unit (distance clamp, permission check)
- US-26: E2E (grab incarnation -> move -> release -> position saved), Unit (boundary clamp, input priority)
- US-27: E2E (walk around incarnation -> always faces user), Unit (lerp rotation, Y-axis lock)
- US-28: E2E (spatial audio volume changes with distance), Unit (HRTF calculation, rolloff curve)
- US-29: E2E (save position -> restart -> position restored), Unit (PlayerPrefs persistence)
- US-30: E2E (exit guardian -> pipeline paused -> return -> resumed), Unit (guardian event handling)

**Mockup:** 6 spatial panels showing MR scene. Mockup file not available locally.

---

### Epic 7 — Settings UI XR (US-31 through US-33)

**Decisions:**
- Open/close via thumbstick press or palm-up gesture, fade 0.2s transition
- Tag-along lazy follow at 1.5m distance, dead zone 0.3m anti-jitter
- Tabbed navigation: Providers / Incarnation / Voice / Vision / XR
- Spatial controls adapted for both hand tracking and controller:
  - Toggle: pinch (hand) / trigger (controller)
  - Slider: pinch+drag (hand) / thumbstick (controller)
  - Dropdown: pinch+scroll (hand) / thumbstick scroll (controller)
  - Plus raycast controller support
- Provider config: 4 bricks x 3 slots with radio select, status, latency
- Incarnation mode selector with preview
- Voice settings: PTT sensitivity, context window N
- Vision settings: cooldown duration
- XR settings: audio distance, passthrough, anchor reset

**Options Considered & Rejected:**
- Fixed position panel (world-locked): Rejected — tag-along provides better UX in MR
- Dockable/resizable panel: Rejected — too complex for V1, fixed size sufficient
- Save/Apply workflow: Rejected — changes apply in real-time for immediate feedback

**Edge Cases (6):**
1. Palm-up false positive cooldown — hand open for grab triggers settings -> 1s cooldown after close
2. Settings pendant pipeline — open settings during active pipeline -> settings opens, pipeline continues in background
3. Rotation 180 smooth orbit — user turns 180 -> panel smoothly orbits to maintain 1.5m in front
4. Tab state preserve — switch tabs -> return -> previous scroll position preserved
5. Switch controller/hand seamless — switch input mid-interaction -> seamless transition
6. Slider clamp bounds — slider drag beyond min/max -> clamped to bounds

**Testing Strategy:**
- US-31: E2E (thumbstick -> open settings -> thumbstick -> close), Unit (gesture detection, fade timer)
- US-32: E2E (navigate all tabs, scroll content), Unit (tab state management, lazy follow math)
- US-33: E2E (toggle switch + drag slider + select dropdown with hands and controller), Unit (hit box tolerance, input mode switch)

**Mockup:** 5 spatial panels showing floating settings panel. Mockup file not available locally.

---

### Epic 8 — Debug & Monitoring (US-34 through US-36)

**Decisions:**
- Toggle debug overlay via **secret combo**: double grip simultane 2s hold
- Logs pipeline in Unity console: latency per stage, requests/responses, errors
- Runtime HUD overlay showing:
  - Pipeline state machine (current state highlighted)
  - Per-stage latency bars with p95 stats (REC/STT/LLM/TTS/PLAY)
  - Provider status (4 bricks check/cross)
  - Scrollable logs (20 entries, INFO/WARN/ERR/DBG levels)
  - Performance gauges (FPS/Memory/CPU/GPU)
  - Network status + uptime
- Export JSON button -> `/sdcard/AI-XR/debug-logs-{timestamp}.json`
- HUD is semi-transparent to not obstruct MR view

**Options Considered & Rejected:**
- Debug always visible in dev builds: Rejected — secret combo keeps it hidden even in dev, avoids cluttering demos
- External debug tool (web dashboard): Rejected — on-device debug is more practical for XR testing
- Simple text log only: Rejected — visual HUD with gauges provides faster diagnosis

**Completeness-pair stories added:**
- US-40: Cancel pipeline annuler l'enregistrement et TTS
- US-41: Clear logs pendant debug

**Edge Cases (6):**
1. Erreurs cascade groupage — rapid cascade errors grouped into summary instead of flooding HUD
2. HUD > 1ms auto-LOD — if HUD rendering exceeds 1ms budget, auto-reduce detail (LOD)
3. API keys sanitize — debug export sanitizes API keys (masked with ****)
4. Stockage plein notification — /sdcard/ full -> notification before export fails
5. Dossier creation auto — AI-XR folder doesn't exist -> auto-create before export
6. Clear pendant export bloque — clear logs while export in progress -> blocked until export completes

**Testing Strategy:**
- US-34: E2E (double grip 2s -> overlay appears -> double grip 2s -> disappears), Unit (combo detection, hold timer)
- US-35: E2E (trigger pipeline -> HUD shows state, latency, provider status), Unit (state machine rendering, log scrolling, LOD logic)
- US-36: E2E (fill logs -> export -> verify valid JSON on /sdcard/), Unit (directory creation, API key sanitization, file size check)

**Mockup:** 7 semi-transparent spatial panels. Mockup file not available locally.

---

## 6. Cross-Section Impacts & Dependencies

| Epic | Depends On | Impacts |
|------|-----------|---------|
| E1 (Setup) | None | All other epics |
| E2 (Providers) | E1 | E3, E5, E7, E8 |
| E3 (Voice Pipeline) | E1, E2 | E4, E5, E6, E7, E8 |
| E4 (Incarnation) | E3 | E6, E7 |
| E5 (Vision) | E2, E3 | E7 |
| E6 (XR Spatial) | E3 | E7 |
| E7 (Settings UI) | E2, E3, E4, E5, E6 | E8 |
| E8 (Debug) | All | None |

**Key coupling points:**
- Provider system (E2) is used by Voice (E3) and Vision (E5) — provider brick abstraction must be stable before either
- Pipeline state machine (E3) drives incarnation reactions (E4) — state enum must be shared
- Spatial positioning (E6) affects incarnation display (E4) — coordinate system shared
- Settings UI (E7) configures everything from E2-E6 — must be built last among features
- Debug (E8) monitors all systems — needs stable interfaces from all epics

---

## 7. Open Questions & Deferred Decisions

1. **Avatar library:** No avatar selection/import UI specified — only default RPM avatar in V1. Custom avatar import deferred to V2.
2. **Local providers:** Local STT/LLM/TTS options mentioned (e.g., LLaVA for VLM) but no specific local model integration spec. Deferred to per-provider implementation.
3. **Multi-language support:** Not discussed — pipeline language depends on provider configuration.
4. **Cloud cost management:** Pay-per-use providers (Whisper, OpenAI, ElevenLabs, GPT-4V) — no budget cap or usage tracking in V1.
5. **OVRLipSync SDK version compatibility:** Mentioned as potential concern with current Quest SDK — to validate early in Epic 4.
6. **Quest 1/2 support:** Not targeted — Quest 3/3S only. Passthrough MR not available on Quest 1.

---

## 8. Testing Strategy Summary

- **Total tests:** 76 E2E tests (41 core US + 35 edge cases)
- **User mandate:** "Every US must have an E2E test, and as many tests as possible"
- **Per-US coverage:** E2E (mandatory) + Unit tests + Integration tests where applicable
- **Test environment:** Unity Test Framework + device testing on Quest 3
