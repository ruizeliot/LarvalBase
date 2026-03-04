# AI-XR — Product Requirements Document

**Version:** 1.0
**Status:** Implementation-Ready
**Last Updated:** 2026-03-04

---

## 1. Project Overview

| Field | Value |
|-------|-------|
| **Name** | AI-XR |
| **Concept** | Assistant IA en realite mixte (XR) pour Meta Quest 3, construit dans Unity |
| **Interaction** | Vocal real-time via configurable STT -> LLM -> TTS pipeline |
| **Incarnation** | 3 modes — Avatar 3D (Ready Player Me), Orbe, Invisible |
| **Base** | Fork cible du projet PodGab existant (Mines d'Albi research project) |
| **Target User** | Developer |
| **Platform** | Meta Quest 3 / 3S only (V1) |
| **Dev Approach** | unity-mcp in editor, custom API at runtime on headset |

### 1.1 PodGab Legacy Code

The project forks from PodGab, an existing Mines d'Albi research project. The following existing classes are reusable or must be refactored:

| Class | Role | Reuse Strategy |
|-------|------|----------------|
| `AIManager` | Central AI orchestration | Refactor into provider-based pipeline |
| `AIEntity` | AI character representation | Extend for 3 incarnation modes |
| `SmartObjects` | Environment interaction | Keep as-is for spatial anchoring |
| `CameraFeedDisplay` | Camera texture display | Reuse for Vision On-Demand capture |
| `MicrophoneRecorder` | Audio capture | Reuse for STT input |
| `LocalLLMRequestHandler` | Local LLM calls | Wrap behind ILLMProvider interface |

---

## 2. Technical Constraints

### 2.1 Platform & Engine

- **Unity 6** (6000.x) + **URP 17** (Universal Render Pipeline)
- **Meta OpenXR 2.0.1** (NOT legacy Oculus SDK)
- **Quest 3 hardware**: Snapdragon XR2 Gen 2, **8 GB shared RAM** (rendering + HTTP + WebCamTexture)
- **Build target**: Android ARM64, OpenXR runtime

### 2.2 Architecture: Hybrid MCP + Custom API

| Context | Protocol | Usage |
|---------|----------|-------|
| **Editor / Dev** | MCP via `unity-mcp` | Hierarchy access, scene commands, build pipeline, prototyping |
| **Runtime / Headset** | Custom HTTP/REST API | STT, LLM, TTS, Vision provider calls from Quest 3 |

MCP is **not** available at runtime on device. All runtime provider calls use standard HTTP with `UnityWebRequest`.

### 2.3 Pipeline Model (V1)

**No streaming in V1.** The pipeline is sequential and blocking:

```
[Mic Input] → [Full STT] → [Full LLM] → [Full TTS] → [Audio Playback]
```

- Each step completes fully before the next begins
- **Latency budget**: 5-15 seconds for full cycle
- Latency mitigated by UX: thinking bubbles, animated dots, visible timer

### 2.4 Provider Architecture

**4 bricks, 3 slots each:**

| Brick | Interface | Cloud 1 (Primary) | Cloud 2 (Backup) | Local |
|-------|-----------|-------------------|-------------------|-------|
| **STT** | `ISTTProvider` | Whisper API | Deepgram | whisper.cpp |
| **LLM** | `ILLMProvider` | OpenAI GPT | Anthropic Claude | llama.cpp |
| **TTS** | `ITTSProvider` | ElevenLabs | OpenAI TTS | Piper |
| **Vision** | `IVisionProvider` | GPT-4V | Claude Vision | — |

**Rules:**
- **Manual selection only** — user picks which slot is active per brick
- **No auto-fallback** between providers (Cloud 1 does NOT auto-switch to Cloud 2)
- **Optional retry** on the currently active provider (toggle per brick)
- When all 3 slots for a brick fail, per-brick degradation activates (see US-3)

---

## 3. User Stories

### US-1: Provider Configuration

> As a developer, I want to independently configure providers for STT/LLM/TTS/Vision (3 slots each: Cloud 1, Cloud 2, Local) so that I can select the best provider for my use case.

**Acceptance Criteria:**
1. Settings UI displays 4 bricks (STT, LLM, TTS, Vision), each with 3 radio-selectable slots
2. Each slot shows: provider name, endpoint URL field, API key field (masked), status indicator (green/red/gray)
3. Active slot per brick is highlighted; only one slot active per brick at a time
4. Latency indicator per provider: last measured round-trip time displayed in ms
5. Auto-retry toggle per brick (on/off) — retries the **active** provider, does NOT switch slots
6. Configuration persists in `StreamingAssets/ai-xr-config.json` (survives builds)
7. Changes apply immediately without app restart

**Technical Notes:**
- Config schema:
```json
{
  "stt": {
    "activeSlot": "cloud1",
    "cloud1": { "provider": "whisper", "endpoint": "...", "apiKey": "...", "retry": true },
    "cloud2": { "provider": "deepgram", "endpoint": "...", "apiKey": "..." },
    "local": { "provider": "whisper_cpp", "modelPath": "..." }
  },
  "llm": { ... },
  "tts": { ... },
  "vision": { ... }
}
```
- Provider classes implement the corresponding interface and are resolved via a `ProviderRegistry` (factory pattern)
- All API keys stored locally only; never transmitted except to their respective endpoints

---

### US-2: Error Notification & Retry

> As a user, I want clear error notifications with error codes and Retry/Dismiss options so that I can understand and recover from provider failures.

**Acceptance Criteria:**
1. On provider failure, a floating notification panel appears in XR space (world-space Canvas, anchored near user)
2. Notification shows: error code (e.g., `STT_TIMEOUT`, `LLM_401`, `TTS_NETWORK`), human-readable message, provider name
3. Two buttons: **Retry** (re-sends same request to same active provider) and **Dismiss** (closes notification, triggers degradation if applicable)
4. Notification auto-dismisses after 15 seconds if no action (triggers degradation)
5. No auto-fallback: system does **not** switch to another slot automatically
6. Error codes follow pattern: `{BRICK}_{HTTP_CODE|ERROR_TYPE}` (e.g., `LLM_429`, `STT_TIMEOUT`, `TTS_NETWORK`)

**Technical Notes:**
- Error notification is a reusable `ErrorNotificationPanel` prefab with world-space Canvas
- Notification queue: max 3 visible simultaneously, FIFO

---

### US-3: Per-Brick Degradation

> As a user, I want the system to gracefully degrade per-brick when a provider fails so that I can still use other features.

**Degradation Matrix:**

| Brick | Degradation Behavior | Visual Indicator |
|-------|---------------------|------------------|
| **STT unavailable** | Virtual keyboard input appears (world-space `TMP_InputField`) | Mic icon crossed out, keyboard icon appears |
| **LLM unavailable** | Pre-recorded fallback message played via TTS: "I'm having trouble thinking right now. Please try again in a moment." | Brain icon crossed out |
| **TTS unavailable** | LLM response displayed as text on HUD (floating `TextMeshPro` panel) | Speaker icon crossed out |
| **Vision unavailable** | Vision feature disabled entirely, capture button grayed out | Eye icon crossed out |

**Acceptance Criteria:**
1. Each brick degrades independently — STT failure does not affect TTS
2. Degradation activates when: (a) user dismisses error notification, or (b) auto-dismiss timeout (15s), or (c) all 3 slots tried and failed
3. Degraded state persists until user manually retries or switches provider in settings
4. Degraded bricks show crossed-out icon in the status bar HUD

---

### US-4: Push-to-Talk Voice Conversation

> As a user, I want to hold a button (controller trigger or hand gesture) to speak, and receive a voiced AI response so that I can have natural conversations.

**Acceptance Criteria:**
1. PTT activation: right controller trigger (hold) OR hand gesture pinch-hold (thumb + index)
2. Recording starts on button down, stops on button up
3. Audio captured as PCM 16-bit 16kHz mono WAV (matches Whisper input format)
4. Full pipeline executes sequentially: STT → LLM → TTS → audio playback
5. **5 feedback states** with visual indicators:

| State | Visual | Audio |
|-------|--------|-------|
| **Ready** | Mic icon solid white | — |
| **Recording** | Ring pulse animation (expanding/contracting circle around mic), red dot | Soft "boop" start sound |
| **Transcribing** | Spinning dots around STT icon | — |
| **Thinking** | Animated dots (...) near incarnation, LLM icon pulses | — |
| **Talking** | Sound wave animation near incarnation mouth/center | AI voice plays via AudioSource |

6. PTT button is **disabled** during states 2-5 (anti-spam): trigger grayed out, hand gesture ignored
7. PTT re-enables only after audio playback completes (return to Ready state)
8. No timeout on any pipeline step — follows PodGab pattern
9. Minimum recording duration: 0.5s (ignore shorter presses to avoid accidental triggers)

**Technical Notes:**
- Reuse `MicrophoneRecorder` from PodGab, adapt for `ISTTProvider` interface
- Audio playback via `AudioSource` on the incarnation GameObject
- State machine: `ConversationStateMachine` with enum `{Ready, Recording, Transcribing, Thinking, Talking}`
- WAV encoding utility: `AudioClipToWav.Convert(AudioClip clip) -> byte[]`

---

### US-5: Conversational Context (Sliding Window)

> As a user, I want the AI to remember the last N messages of our conversation so that responses are contextually relevant.

**Acceptance Criteria:**
1. Sliding window of **N = 10** message pairs (user + assistant = 1 pair) by default
2. N configurable in settings (range: 1-50)
3. Messages outside the window are **not** sent to the LLM
4. Conversation history displayed in a scrollable world-space panel (optional toggle)
5. Messages outside the current window appear **faded** (50% opacity) in the history panel
6. History is **not** persisted between sessions — cleared on app restart
7. System prompt is always included (slot 0, never evicted from window)

**Technical Notes:**
- Data structure: `List<ConversationMessage>` with `role` (system/user/assistant), `content`, `timestamp`
- Window logic: always include system prompt + last N*2 messages (N pairs)
- Token estimation: rough char/4 estimate for display, actual token counting is provider-specific
- Context class: `ConversationContext` with `AddMessage()`, `GetWindowedMessages()`, `Clear()`

---

### US-6: Incarnation Mode Switch

> As a user, I want to choose between 3 incarnation modes (Avatar RPM / Orbe / Invisible) in the settings so that I can customize my AI assistant's appearance.

**Mode Specifications:**

#### Mode A: Avatar RPM
- **Mesh**: Ready Player Me `.glb` loaded at runtime via RPM Unity SDK
- **Lip sync**: Viseme-driven blend shapes from TTS audio (OVRLipSync or Oculus LipSync)
- **Animation**: Idle breathing, arm gestures (3 animation clips: idle, talking, thinking)
- **Positioning**: Spatial anchor, 1.5m in front of user at eye height
- **State mapping**: Thinking = hand on chin animation, Talking = lip sync + arm gestures, Idle = breathing

#### Mode B: Orbe
- **Visual**: Volumetric glowing sphere (shader-based, ~30cm diameter)
- **State colors**: Thinking = blue (#4A9EFF), Speaking = green (#4AFF7E), Listening = orange (#FFB84A), Idle = gray (#888888)
- **Effects**: Ambient particle system (small floating dots), glow intensity pulses with audio amplitude
- **Positioning**: Spatial anchor, 1.2m in front of user, 0.3m above eye height (floating)

#### Mode C: Invisible
- **Floor marker**: Dashed circle on floor (1m diameter, white dashed line shader)
- **HUD**: Monospace text panel (`TextMeshPro`, Courier New or JetBrains Mono)
- **Live transcript**: User speech appears in real-time, AI response types out character-by-character
- **Positioning**: Floor circle at spatial anchor point, HUD follows user gaze (billboard)

**Acceptance Criteria:**
1. Floating spatial selector panel in MR room (3 icons: avatar silhouette, orb, eye-with-slash)
2. Switch is **cosmetic only** — no impact on pipeline behavior
3. Current mode highlighted in selector; tap to switch
4. Smooth transition: current mode fades out (0.3s), new mode fades in (0.3s)
5. Mode persists in config between sessions
6. All 3 modes correctly reflect the 5 conversation states (Ready/Recording/Transcribing/Thinking/Talking)

**Technical Notes:**
- Base class: `IncarnationBase` (abstract) with virtual methods: `OnStateChanged(ConversationState)`, `OnAudioAmplitude(float)`, `SetPosition(Vector3, Quaternion)`
- Subclasses: `AvatarIncarnation`, `OrbeIncarnation`, `InvisibleIncarnation`
- `IncarnationManager` handles switching, holds reference to active incarnation
- RPM SDK: `ReadyPlayerMe.AvatarLoader` for `.glb` loading, cache locally after first load

---

### US-7: Vision On-Demand

> As a user, I want to trigger a "look at this" action that captures what I see, analyzes it with a VLM, and gives me a vocal response so that the AI can understand my environment.

**Acceptance Criteria:**
1. Trigger: A button (controller) or designated hand gesture
2. On trigger: crosshair overlay + green corner brackets appear in center of POV (world-space Canvas on head-locked layer)
3. After 0.5s hold: capture fires, brief white flash overlay (0.1s fade)
4. `WebCamTexture` frame captured and encoded as JPEG (quality 80)
5. Image sent as-is to VLM (active `IVisionProvider` slot) — **no quality check, no preprocessing, no compression beyond JPEG**
6. During VLM processing: thinking bubbles + timer (elapsed seconds) visible near incarnation
7. VLM response: text displayed as floating panel above incarnation + piped through TTS for voice
8. If VLM returns quality comment (e.g., "The image is too dark to analyze"), that IS the response — no client-side filtering

**Out of Scope (V1):**
- Visual memory (no image history sent to VLM)
- Temporal RAG (no time-series visual context)
- MR compositing (no blending captured image with virtual elements)
- Client-side redaction (no face blurring, no PII removal)

**Technical Notes:**
- Reuse `CameraFeedDisplay` from PodGab for `WebCamTexture` management
- Capture pipeline: `WebCamTexture.GetPixels32()` → `Texture2D` → `EncodeToJPG(80)` → `byte[]`
- VLM request payload: multipart form or base64 in JSON (provider-specific, abstracted by `IVisionProvider`)
- Response overlay: `VisionResponsePanel` prefab, auto-dismiss after 10s or on tap

---

### US-8: Unity MCP Editor Integration

> As a developer, I want unity-mcp integrated in the editor for prototyping without deploying so that I can iterate faster.

**Acceptance Criteria:**
1. `unity-mcp` package installed and configured in Unity Editor
2. MCP provides: hierarchy read/write, component inspection, scene commands, prefab instantiation
3. Build pipeline accessible via MCP: Editor → MCP Test → Android Build → APK Sign → Quest Deploy
4. MCP is **editor-only** — stripped from runtime builds (`#if UNITY_EDITOR` guards)
5. MCP connection status indicator in Editor toolbar (green/red dot)

**Build Pipeline Steps:**
1. **MCP Test**: Run play mode tests via MCP command
2. **Android Build**: `BuildPipeline.BuildPlayer()` with Android/ARM64 target, OpenXR
3. **APK Sign**: Sign with debug keystore (dev) or release keystore (prod)
4. **Quest Deploy**: `adb install -r` to connected Quest 3

**Technical Notes:**
- `unity-mcp` package: installed via Unity Package Manager (git URL or local)
- All MCP code wrapped in `#if UNITY_EDITOR` preprocessor directives
- Build automation: `Editor/BuildAutomation.cs` with static methods callable from MCP

---

### US-9: Spatial Anchor MR Setup

> As a user, I want the AI assistant anchored in my physical space with passthrough MR, hand tracking, and controller support so that the experience feels grounded.

**Acceptance Criteria:**
1. Scene uses `OVRCameraRig` (Meta OpenXR) as main camera rig
2. **Passthrough** enabled: full-color passthrough MR (not VR black background)
3. **Spatial anchor**: incarnation position saved via `OVRSpatialAnchor`, persists across sessions within same room
4. First launch: user points and taps to place incarnation, anchor created at that point
5. Subsequent launches: anchor auto-restored, incarnation appears at saved position
6. **Hand tracking**: 8 key joints rendered with green debug spheres (thumb tip, index tip, middle tip, ring tip, pinky tip, wrist, palm center, index knuckle) + ray from index finger
7. **Controller mapping:**

| Button | Action |
|--------|--------|
| Right Trigger (hold) | Push-to-Talk |
| A Button (press) | Vision capture |
| Grip (hold) | Grab/move incarnation |
| Left Thumbstick click | Open/close settings |
| B Button (press) | Toggle conversation history |

8. Hand gesture mapping:

| Gesture | Action |
|---------|--------|
| Pinch hold (thumb + index) | Push-to-Talk |
| Open palm face-forward | Vision capture |
| Grab (full fist near incarnation) | Move incarnation |

**Technical Notes:**
- `OVRCameraRig` prefab from Meta OpenXR package, NOT legacy `OVRManager`
- Passthrough: `OVRPassthroughLayer` component, `underlay` mode
- Spatial anchors: `OVRSpatialAnchor` with `SaveAsync()` / `LoadAsync()`
- Hand tracking: `OVRHand` + `OVRSkeleton` components, `OVRHandPrefab` for joint visualization
- Controller input: `OVRInput.Get(OVRInput.Button.PrimaryIndexTrigger)` etc.
- Scene setup: empty scene with `OVRCameraRig`, `OVRPassthroughLayer`, no skybox (clear color alpha=0)

---

## 4. Edge Cases

### EC-1: Total Provider Failure
**Trigger:** All 3 slots for a single brick fail (Cloud 1, Cloud 2, Local all return errors).
**Behavior:** Per-brick degradation activates automatically (see US-3 degradation matrix). Error notification shows "All providers failed for {brick}. Entering degraded mode."
**Recovery:** User must fix provider configuration in settings and manually retry.

### EC-2: Degraded Image Quality
**Trigger:** User sends blurry, dark, or obstructed image to VLM.
**Behavior:** No client-side quality check. VLM processes the image and responds accordingly (e.g., "The image is too dark to analyze" or "I can't make out the details"). Response is treated as normal — displayed as text and spoken via TTS.
**Rationale:** Client-side image quality detection is unreliable and adds complexity. VLMs handle this gracefully.

### EC-3: Long VLM Processing Time
**Trigger:** VLM takes >10 seconds to respond.
**Behavior:** Thinking bubbles animation + elapsed timer visible near incarnation. **No timeout** — request continues until completion or network failure. Timer shows seconds elapsed. Badge text: "Processing..." with no timeout indicator.
**Rationale:** VLM processing times vary widely; premature timeouts would frustrate users.

### EC-4: Request Spam (PTT During Processing)
**Trigger:** User attempts to activate Push-to-Talk while pipeline is already processing (states: Recording, Transcribing, Thinking, Talking).
**Behavior:** PTT button/gesture ignored. Controller trigger shows no response; hand pinch gesture not tracked for PTT. Visual indicator: mic icon grayed out with small spinner overlay. No error notification (not an error condition).

### EC-5: Network Failure Mid-Request
**Trigger:** Network connection drops during an active provider request.
**Behavior:** Request fails with `{BRICK}_NETWORK` error code. Error notification appears with Retry/Dismiss. **No auto-switch** to another provider. If user retries and network is still down, same error repeats. After dismiss, per-brick degradation activates.

---

## 5. Epic Breakdown

### Epic 1: Core Architecture & Provider System

| Field | Value |
|-------|-------|
| **Complexity** | S-M |
| **User Stories** | US-1, US-2, US-3 |
| **Dependencies** | None (foundation) |
| **Estimated Effort** | 2-3 weeks |

**Scope:**
- Provider interfaces: `ISTTProvider`, `ILLMProvider`, `ITTSProvider`, `IVisionProvider`
- `ProviderRegistry` — factory that resolves provider instances by brick + slot
- `ProviderConfig` — serializable config class, JSON persistence in `StreamingAssets/`
- Settings UI (world-space Canvas): 4 bricks, 3 slots each, radio select, status indicators
- `ErrorNotificationPanel` prefab: error code, message, Retry/Dismiss buttons, auto-dismiss timer
- Per-brick degradation system: `DegradationManager` with fallback behaviors per brick
- `StatusBarHUD`: persistent HUD showing brick health icons (solid/crossed-out)

**Key Classes:**

```
Assets/Scripts/
  Providers/
    Interfaces/
      ISTTProvider.cs        # Task<string> TranscribeAsync(byte[] audioWav)
      ILLMProvider.cs         # Task<string> CompleteAsync(List<Message> messages)
      ITTSProvider.cs         # Task<AudioClip> SynthesizeAsync(string text)
      IVisionProvider.cs      # Task<string> AnalyzeImageAsync(byte[] imageJpeg, string prompt)
    Registry/
      ProviderRegistry.cs     # GetProvider<T>(BrickType, SlotType) -> T
      ProviderConfig.cs       # JSON serialization, per-brick slot config
    Implementations/
      STT/
        WhisperAPIProvider.cs
        DeepgramProvider.cs
        WhisperLocalProvider.cs
      LLM/
        OpenAILLMProvider.cs
        ClaudeLLMProvider.cs
        LlamaLocalProvider.cs
      TTS/
        ElevenLabsProvider.cs
        OpenAITTSProvider.cs
        PiperLocalProvider.cs
      Vision/
        GPT4VisionProvider.cs
        ClaudeVisionProvider.cs
  Error/
    ErrorNotificationPanel.cs
    DegradationManager.cs
  UI/
    SettingsPanel.cs
    StatusBarHUD.cs
```

**Interface Definitions:**

```csharp
public interface ISTTProvider
{
    string ProviderName { get; }
    Task<string> TranscribeAsync(byte[] audioWav, CancellationToken ct = default);
    Task<bool> TestConnectionAsync();
}

public interface ILLMProvider
{
    string ProviderName { get; }
    Task<string> CompleteAsync(List<ConversationMessage> messages, CancellationToken ct = default);
    Task<bool> TestConnectionAsync();
}

public interface ITTSProvider
{
    string ProviderName { get; }
    Task<AudioClip> SynthesizeAsync(string text, CancellationToken ct = default);
    Task<bool> TestConnectionAsync();
}

public interface IVisionProvider
{
    string ProviderName { get; }
    Task<string> AnalyzeImageAsync(byte[] imageJpeg, string prompt, CancellationToken ct = default);
    Task<bool> TestConnectionAsync();
}
```

---

### Epic 2: Voice Pipeline (STT -> LLM -> TTS)

| Field | Value |
|-------|-------|
| **Complexity** | M |
| **User Stories** | US-4, US-5 |
| **Dependencies** | Epic 1 |
| **Estimated Effort** | 2-3 weeks |

**Scope:**
- `ConversationStateMachine`: 5-state FSM (Ready, Recording, Transcribing, Thinking, Talking)
- `VoicePipeline`: orchestrates STT -> LLM -> TTS sequential calls
- `MicrophoneInput`: wraps `MicrophoneRecorder` from PodGab, outputs PCM 16-bit 16kHz mono WAV
- `ConversationContext`: sliding window message history (N configurable, default 10 pairs)
- PTT input handling: controller trigger + hand gesture pinch detection
- Anti-spam: input disabled during processing states
- Audio playback: `AudioSource` on incarnation with amplitude callback for visual feedback
- 5 feedback state visuals (managed by incarnation, triggered by state machine events)

**Key Classes:**

```
Assets/Scripts/
  Pipeline/
    VoicePipeline.cs           # Orchestrates full STT->LLM->TTS cycle
    ConversationStateMachine.cs # FSM with state change events
    ConversationContext.cs      # Sliding window message list
    ConversationMessage.cs      # { Role, Content, Timestamp }
  Input/
    PTTController.cs            # Controller trigger + hand gesture detection
    MicrophoneInput.cs          # Wraps MicrophoneRecorder, outputs WAV bytes
  Audio/
    AudioClipToWav.cs           # AudioClip -> byte[] WAV conversion
    AudioPlayback.cs            # Plays TTS AudioClip, reports amplitude
```

**State Machine Transitions:**

```
Ready -> Recording        [PTT pressed]
Recording -> Transcribing [PTT released, audio >= 0.5s]
Recording -> Ready        [PTT released, audio < 0.5s (discard)]
Transcribing -> Thinking  [STT complete, text sent to LLM]
Thinking -> Talking       [LLM complete, response sent to TTS, audio playing]
Talking -> Ready          [Audio playback complete]
Any -> Ready              [Error + dismiss/timeout -> degradation handled]
```

---

### Epic 3: AI Incarnation System

| Field | Value |
|-------|-------|
| **Complexity** | M |
| **User Stories** | US-6 |
| **Dependencies** | Epic 2 (needs voice pipeline for state feedback and lip sync) |
| **Estimated Effort** | 2-3 weeks |

**Scope:**
- `IncarnationBase` abstract class with state/audio callbacks
- `AvatarIncarnation`: RPM .glb loading, OVRLipSync visemes, 3 animation clips
- `OrbeIncarnation`: shader-based glow sphere, 4-color state mapping, particle system
- `InvisibleIncarnation`: floor circle shader, monospace HUD, live transcript typewriter
- `IncarnationManager`: switching logic, fade transitions, persistence
- Floating spatial selector UI (3 icons, world-space Canvas)

**Key Classes:**

```
Assets/Scripts/
  Incarnation/
    IncarnationBase.cs         # Abstract: OnStateChanged, OnAudioAmplitude, SetPosition
    IncarnationManager.cs      # Switch logic, fade, active reference
    AvatarIncarnation.cs       # RPM loader, lip sync, animations
    OrbeIncarnation.cs         # Shader glow, color lerp, particles
    InvisibleIncarnation.cs    # Floor circle, HUD text, typewriter
  UI/
    IncarnationSelector.cs     # Floating spatial selector panel
```

---

### Epic 4: Vision On-Demand

| Field | Value |
|-------|-------|
| **Complexity** | S-M |
| **User Stories** | US-7 |
| **Edge Cases** | EC-2, EC-3 |
| **Dependencies** | Epic 1 (IVisionProvider), Epic 2 (TTS for voice response) |
| **Estimated Effort** | 1-2 weeks |

**Scope:**
- `VisionCapture`: WebCamTexture management, JPEG encoding, capture trigger
- Viewfinder UX: crosshair + green corners overlay, white flash on capture
- `VisionPipeline`: capture -> VLM -> text display + TTS
- `VisionResponsePanel`: floating text panel above incarnation, auto-dismiss
- Timer display during VLM processing

**Key Classes:**

```
Assets/Scripts/
  Vision/
    VisionCapture.cs           # WebCamTexture -> JPEG byte[] capture
    VisionPipeline.cs          # Orchestrates capture -> VLM -> TTS
    ViewfinderOverlay.cs       # Crosshair, green corners, flash
    VisionResponsePanel.cs     # Floating text result, auto-dismiss
```

**Capture Pipeline:**
```
[A Button / Palm Gesture] -> ViewfinderOverlay -> 0.5s hold -> Capture
  -> WebCamTexture.GetPixels32() -> Texture2D -> EncodeToJPG(80)
  -> IVisionProvider.AnalyzeImageAsync(jpeg, prompt)
  -> Display text + TTS playback
```

---

### Epic 5: XR Integration & MR Setup

| Field | Value |
|-------|-------|
| **Complexity** | M-L |
| **User Stories** | US-8, US-9 |
| **Edge Cases** | EC-1, EC-4, EC-5 |
| **Dependencies** | Epic 1 (provider system), integrates with Epics 2-4 incrementally |
| **Estimated Effort** | 3-4 weeks |

**Scope:**
- Scene setup: `OVRCameraRig`, `OVRPassthroughLayer` (underlay), clear alpha=0
- Spatial anchor system: `OVRSpatialAnchor` save/load for incarnation placement
- First-launch placement flow: point + tap to place incarnation
- Hand tracking: `OVRHand` + `OVRSkeleton`, 8 green debug joint spheres, index ray
- Controller input mapping (see US-9 table)
- Hand gesture mapping (see US-9 table)
- `unity-mcp` editor integration with `#if UNITY_EDITOR` guards
- Build automation: `BuildAutomation.cs` for Android/ARM64/OpenXR builds
- ADB deploy script

**Key Classes:**

```
Assets/Scripts/
  XR/
    XRSetup.cs                 # OVRCameraRig, passthrough, scene init
    SpatialAnchorManager.cs    # Save/load incarnation position
    PlacementFlow.cs           # First-launch point-and-tap placement
    HandTrackingVisuals.cs     # 8 joint spheres + index ray
    InputMapper.cs             # Unified input: controller + hand gesture -> actions
  Editor/
    BuildAutomation.cs         # #if UNITY_EDITOR, build + sign + deploy
    MCPEditorSetup.cs          # unity-mcp configuration
```

---

## 6. Build Order & Dependencies

```
Epic 1: Core Architecture & Provider System
  |
  v
Epic 2: Voice Pipeline (STT -> LLM -> TTS)
  |
  +---> Epic 3: Incarnation System (needs voice state feedback)
  |
  +---> Epic 4: Vision On-Demand (needs provider system + TTS)
  |
  +---> Epic 5: XR Integration (can start after Epic 1, integrates incrementally)
```

**Recommended execution:**
1. **Epic 1** — foundation, no dependencies
2. **Epic 2** — depends on Epic 1
3. **Epics 3, 4, 5** — can parallelize after Epic 2 is complete (3 needs voice states, 4 needs TTS, 5 can integrate incrementally)

---

## 7. Non-Functional Requirements

### 7.1 Performance
- **Memory**: Profile early. Quest 3 has 8 GB shared between OS, rendering, and app. Budget: ~2 GB for app, ~512 MB for WebCamTexture, ~256 MB for audio buffers
- **HTTP connections**: Max 2 concurrent UnityWebRequest (1 active pipeline + 1 vision)
- **Frame rate**: Target 72 FPS minimum (Quest 3 native). Incarnation rendering must not drop below 72 FPS
- **Shader complexity**: Orbe glow shader must be single-pass URP compatible, no multi-pass

### 7.2 Latency
- **Full voice cycle**: 5-15 seconds acceptable in V1
- **UX mitigation**: Thinking bubbles, animated dots, elapsed timer — user always knows the system is working
- **No timeouts**: Pipeline steps run to completion or network failure

### 7.3 Accessibility
- Push-to-Talk available via **both** controller trigger AND hand gesture (pinch)
- Vision capture available via **both** A button AND palm gesture
- All feedback states have **both** visual and (where applicable) audio indicators

### 7.4 Offline Capability
- Local provider slots (whisper.cpp, llama.cpp, Piper) enable fully offline operation
- Models must be pre-downloaded and stored in `StreamingAssets/Models/`
- App detects network status and shows indicator in status bar

### 7.5 Security
- API keys stored locally in `StreamingAssets/ai-xr-config.json` (device only)
- Keys never logged, never sent to any endpoint other than their provider
- No telemetry, no analytics in V1

### 7.6 Cost
- Cloud providers are pay-per-use; no subscription required
- Estimated cost per voice cycle: ~$0.01-0.05 (STT + LLM + TTS)
- Vision cycle: ~$0.01-0.03 per image
- Local providers: $0 (model download is one-time)

---

## 8. Project Structure

```
Assets/
  Scenes/
    MainScene.unity              # OVRCameraRig, passthrough, anchor
  Scripts/
    Providers/
      Interfaces/                # ISTTProvider, ILLMProvider, ITTSProvider, IVisionProvider
      Registry/                  # ProviderRegistry, ProviderConfig
      Implementations/
        STT/                     # WhisperAPI, Deepgram, WhisperLocal
        LLM/                     # OpenAI, Claude, LlamaLocal
        TTS/                     # ElevenLabs, OpenAITTS, Piper
        Vision/                  # GPT4V, ClaudeVision
    Pipeline/
      VoicePipeline.cs
      ConversationStateMachine.cs
      ConversationContext.cs
    Vision/
      VisionCapture.cs
      VisionPipeline.cs
      ViewfinderOverlay.cs
    Incarnation/
      IncarnationBase.cs
      IncarnationManager.cs
      AvatarIncarnation.cs
      OrbeIncarnation.cs
      InvisibleIncarnation.cs
    XR/
      XRSetup.cs
      SpatialAnchorManager.cs
      PlacementFlow.cs
      HandTrackingVisuals.cs
      InputMapper.cs
    Input/
      PTTController.cs
      MicrophoneInput.cs
    Audio/
      AudioClipToWav.cs
      AudioPlayback.cs
    Error/
      ErrorNotificationPanel.cs
      DegradationManager.cs
    UI/
      SettingsPanel.cs
      StatusBarHUD.cs
      IncarnationSelector.cs
      VisionResponsePanel.cs
  Prefabs/
    ErrorNotification.prefab
    ViewfinderOverlay.prefab
    VisionResponse.prefab
    IncarnationSelector.prefab
    Incarnations/
      AvatarRPM.prefab
      Orbe.prefab
      InvisibleMarker.prefab
  Shaders/
    OrbeGlow.shader              # Single-pass URP, 4-color state, glow pulse
    DashedCircle.shader          # Floor marker for Invisible mode
  StreamingAssets/
    ai-xr-config.json            # Provider configuration
    Models/                      # Local model files (whisper, llama, piper)
  Editor/
    BuildAutomation.cs
    MCPEditorSetup.cs
Packages/
  manifest.json                  # Meta OpenXR, RPM SDK, unity-mcp (editor only)
```

---

## 9. Visual References

| Mockup | Epic | File |
|--------|------|------|
| Core Architecture | Epic 1 | `mockups/mockup-core-architecture.html` |
| Voice Pipeline | Epic 2 | `mockups/mockup-voice-pipeline.html` |
| Incarnation System | Epic 3 | `mockups/mockup-incarnation.html` |
| Vision On-Demand | Epic 4 | `mockups/mockup-vision.html` |
| XR Integration | Epic 5 | `mockups/mockup-xr-integration.html` |
| Combined Immersive | All | `mockups/mockup-ai-xr-immersive.html` |
| Navigable Compilation | All | `app-mockup.html` |

---

## 10. Glossary

| Term | Definition |
|------|-----------|
| **Brick** | One of the 4 AI pipeline components: STT, LLM, TTS, Vision |
| **Slot** | One of 3 provider positions per brick: Cloud 1 (primary), Cloud 2 (backup), Local |
| **PTT** | Push-to-Talk — hold-to-record input method |
| **VLM** | Vision-Language Model — multimodal AI that accepts image + text |
| **RPM** | Ready Player Me — avatar platform providing .glb character models |
| **Viseme** | Mouth shape corresponding to a phoneme, used for lip sync |
| **Spatial Anchor** | OVR feature that saves a 3D position relative to the physical room |
| **Passthrough** | Quest feature showing real-world camera feed as background (MR mode) |
| **URP** | Universal Render Pipeline — Unity's lightweight renderer for mobile/XR |
| **MCP** | Model Context Protocol — editor-time integration for AI-assisted development |
| **Degradation** | Fallback behavior when a brick's provider is unavailable |
