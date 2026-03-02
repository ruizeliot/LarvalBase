# Codebase Analysis: Multi-template Unity Refactor

**Project:** Multi-template — Split Unity monorepo into 3 standalone VR/AR apps + 3 UPM packages
**Location:** `C:\Users\ahunt\Documents\Unity\Multi-template`
**Analysis Date:** 2026-03-02
**Analyzed By:** Claude Code (Opus 4.6)

---

## 1. Tech Stack & Dependencies

### Unity Version
- **Unity 6** (editor `6000.0.58f2`) — Unity 6.0 LTS
- **Render Pipeline:** URP 17.0.4
- **Target Platform:** Android (Meta Quest VR/AR headsets)
- **Color Space:** Linear, Stereo rendering

### Core Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `com.meta.xr.sdk.all` | 78.0.0 | Meta Quest XR SDK (full suite) |
| `com.unity.netcode.gameobjects` | 2.0.0 | Server-authority multiplayer networking |
| `com.unity.xr.interaction.toolkit` | 3.0.8 | XR hand/controller interactions |
| `com.unity.xr.arfoundation` | 6.1.1 | AR Foundation (surface detection) |
| `com.unity.xr.hands` | 1.5.0 | Hand tracking |
| `com.unity.xr.openxr` | 1.15.1 | OpenXR runtime |
| `com.unity.xr.meta-openxr` | 2.1.1 | Meta OpenXR extensions |
| `com.unity.services.vivox` | 16.7.0 | Voice chat |
| `com.unity.services.authentication` | 3.4.1 | Unity Gaming Services auth |
| `com.unity.services.multiplayer` | 1.1.0 | Relay/Lobby matchmaking |
| `com.unity.render-pipelines.universal` | 17.0.4 | URP rendering |
| `com.unity.cloud.gltfast` | 6.0.1 | glTF avatar loading (PodGab) |
| `com.unity.ai.inference` | 2.2.1 | On-device AI inference |
| `com.unity.burst` | 1.8.24 | SIMD compilation |
| `com.unity.inputsystem` | 1.14.2 | New Input System |
| `com.unity.nuget.newtonsoft-json` | 3.2.1 | JSON serialization |
| `com.unity.test-framework` | 1.5.1 | Unity Test Framework |
| `com.coplaydev.unitymcp` | git | Unity MCP (AI agent editor access) |

### Custom UPM Packages (local, in `Packages/`)

| Package | Scripts | Assembly | Purpose |
|---------|---------|----------|---------|
| `com.imt.xrmp` | 24 | `XRMP` | XR Multiplayer (lobby, voice, networked player, interactions) |
| `com.imt.utilities` | ~40 | `IMT.Utilities` | Common helpers (debug console, keyboard, object follow, XR utils) |
| `com.imt.shared` | ~157 | `IMT.Shared` | Shared AR/XR code (drawing, line rendering, scene management, anchors) |

### External Services (hardcoded URLs)
- **Gabriela STT:** `gabriela.mines-albi.fr/v2/sound-to-text/transcribe/`
- **Gabriela LLM (SSE):** `gabriela.mines-albi.fr/v3/gabriela/gabriela_streaming`
- **KPI Generator:** `gabcgi.mines-albi.fr:9003/example_to_kpis`
- **Causal Chain:** `gabriela.mines-albi.fr/v3/causal_chain/example_to_causal_chain`
- **n8n Webhooks:** `n8n.srv1039032.hstgr.cloud/webhook/` (transcription, answer, voice)

---

## 2. Architecture Overview

### Folder Structure

```
Multi-template/
├── Assets/                      # Original monorepo (preserved, still compilable)
│   ├── PodDefinition/           # PodDef scripts + scenes (18 scripts)
│   ├── Gab/                     # PodGab scripts + scenes (22 scripts)
│   ├── ColorYourReality/        # AR painting scripts (6 scripts)
│   ├── VRMPAssets/              # 8 app-specific networking scripts
│   ├── Scripts/                 # Colocation + Passthrough scripts
│   ├── XRI/                     # XR Interaction Toolkit config
│   ├── MetaXR/, Oculus/         # Meta SDK assets
│   ├── Ready Player Me/         # RPM avatar SDK assets
│   ├── MRTabletopAssets/        # MR template assets
│   ├── Scenes/                  # Root scenes (MR Template, PodGab AR/multi)
│   └── Resources/, Plugins/     # Runtime resources + native plugins
│
├── Packages/                    # Shared UPM packages
│   ├── com.imt.xrmp/            # XR Multiplayer package
│   ├── com.imt.utilities/       # Common utilities package
│   ├── com.imt.shared/          # Shared AR/XR code package
│   └── manifest.json            # Root package manifest
│
├── PodDefinition/               # Standalone project (nested)
│   ├── Assets/PodDefinition/    # App scripts + scenes
│   ├── Assets/VRMPAssets/       # App-specific networking
│   ├── Packages/manifest.json   # References shared packages via file:../../Packages/
│   └── ProjectSettings/         # Copied from root
│
├── PodGab/                      # Standalone project (nested)
│   ├── Assets/Gab/              # PodGab scripts + scenes
│   ├── Assets/PodDefinition/    # PodDef integration (duplicated)
│   ├── Packages/manifest.json
│   └── ProjectSettings/
│
├── ColorYourReality/            # Standalone project (nested)
│   ├── Assets/ColorYourReality/ # AR painting scripts + scenes
│   ├── Packages/manifest.json
│   └── ProjectSettings/
│
├── docs/                        # User stories + test specs
├── ProjectSettings/             # Root project settings
└── Library/, Logs/              # Unity cache (gitignored)
```

### Data Flow Between Apps & Packages

```
┌─────────────────────────────────────────────────────┐
│                    UPM Packages                      │
│                                                      │
│  com.imt.xrmp ──────► com.imt.utilities             │
│  (Lobby, Voice,        (Debug Console, Keyboard,     │
│   Network Player,       Object Follow, XRI Utils)    │
│   Interactions)                                      │
│       │                       │                      │
│       ▼                       ▼                      │
│  com.imt.shared ◄────────────┘                      │
│  (AR Manager, Drawing, Line Rendering, Anchors)      │
└──────┬──────────────┬────────────────┬──────────────┘
       │              │                │
       ▼              ▼                ▼
  PodDefinition    PodGab        ColorYourReality
  (Graph viz,      (AI voice,    (AR painting,
   Supply chain     Avatars,      Surface detect,
   modeling,        KPI gen,      Audio-reactive)
   Multiplayer)     Causal chain,
       │            PodDef integ.)
       │              │
       └──────────────┘
       PodGab imports PodDefinition
       (#if POD_RESEARCH — currently DEAD)
```

### Assembly Definition Graph

```
PodDefinition.asmdef ──► XRMP, IMT.Utilities, IMT.Shared, Unity.Netcode.Runtime, TMP, Newtonsoft
Gab.asmdef ────────────► XRMP, IMT.Utilities, IMT.Shared, PodDefinition, Unity.Netcode.Runtime, TMP, Newtonsoft
ColorYourReality.asmdef ► Meta.XR.MRUtilityKit, IMT.Utilities, IMT.Shared (no XRMP — non-networked)
XRMP.asmdef ───────────► Unity.Netcode.Runtime, Unity.Collections, XR Interaction Toolkit, XR Hands, InputSystem, Vivox, TMP
```

### Architectural Patterns
- **Singleton pattern:** `GameManager.Instance`, `XRINetworkGameManager.Instance`, `SoundManager.Instance`
- **Server-authority networking:** ServerRpc → server processes → ClientRpc broadcast (correctly structured)
- **Event-driven UI sync:** `CanvasManager.OnStructureSerialized` propagated via RPC
- **Compile-time feature flags:** `#if POD_RESEARCH`, `#if HAS_PARRELSYNC`, `#if HAS_MPPM`
- **Observer pattern:** `BindableVariable<T>` for connection state monitoring
- **UUID-based registries:** Node/Link tracking via `Dictionary<string, NetworkObject>`

---

## 3. Pages/Features Inventory

### PodDefinition — Networked 3D Graph Editor

**Purpose:** VR/AR multiplayer app for building supply chain models as 3D graphs.

| Feature | Description |
|---------|-------------|
| **Node Creation** | Spawn 6 node types: Elementary (white, KPI), Complex (red, composite KPI), Component (green, supply chain actor), Potential (blue, possible state), Sensitivity (magenta, sensitivity point), Potentiality (yellow, future outcome) |
| **Link Creation** | Connect nodes with typed links: Coefficient, ExistenceCondition, Affectation, SensitivityCondition, Generation, Actuality |
| **Rules Engine** | `RulesDefinition` validates link compatibility (which node types can connect) |
| **Graph Layout** | `PhysicsManager` provides force-directed automatic layout |
| **Save/Load** | JSON serialization of full graph state (nodes, links, positions, properties) |
| **Canvas UI** | Dynamic per-node/per-link property editing panels |
| **Multiplayer** | Real-time multi-user collaboration via Netcode (node CRUD, link modifications, UI state sync) |
| **Engine Data** | Load supply chain engine data from JSON (components, relations, BOM, inventory) |
| **XR Interaction** | Hand tracking grab/poke + controller point/select for nodes |

**Scenes:** `Pod def.unity` (main), `SampleScene.unity`
**Key Scripts:** `GameManager.cs` (singleton hub), `NodeManager.cs` (per-node behavior), `LinkManager.cs` (per-link behavior), `SpawnManager.cs` (networked spawning), `SaveLoadGraph.cs` (JSON persistence), `RulesDefinition.cs` (link rules), `CanvasManager.cs` (dynamic UI), `PhysicsManager.cs` (force layout), `LoadEngineData.cs` (supply chain data import)

### PodGab — AI Voice Assistant

**Purpose:** VR AI assistant with voice interaction, speech-to-text, LLM response, TTS, and animated avatars. Can generate KPI trees and causal chains from natural language.

| Feature | Description |
|---------|-------------|
| **Voice Recording** | Microphone capture via `RecordingManager` + `MicrophoneRecorder` |
| **Speech-to-Text** | Gabriela service transcription (mines-albi.fr) |
| **LLM Response** | SSE streaming from Gabriela, with n8n/Groq fallback URLs configured |
| **Text-to-Speech** | Audio response playback with avatar lip-sync |
| **Avatar System** | Ready Player Me (RPM) avatar loading + IK animation |
| **KPI Generation** | Voice → KPI tree via `gabcgi.mines-albi.fr` |
| **Causal Chain** | Voice → causal chain graph via Gabriela |
| **Smart Objects** | Interactive scene objects responding to AI context |
| **Graph Integration** | Bridge to PodDefinition graph (via `#if POD_RESEARCH` — currently dead code) |
| **Auth** | JWT authentication to Gabriela service |
| **Local LLM** | Fallback for on-device inference (configured, untested) |

**Scenes:** 6 scenes (MR Template, PodGab AR, PodGab multi, + 3 more)
**Key Scripts:** `AIManager.cs` (central hub, all URLs), `RecordingManager.cs`, `MicrophoneRecorder.cs`, `GabRequestHandler.cs` (SSE streaming), `AIEntity.cs` (per-avatar state), `AuthManager.cs` (JWT), `SmartObject.cs`, `PodDefinitionHandler.cs` (graph bridge), `LocalLLMRequestHandler.cs`

### ColorYourReality — AR Painting App

**Purpose:** AR passthrough app for painting on real-world surfaces detected by Meta MRUK.

| Feature | Description |
|---------|-------------|
| **Surface Detection** | Meta MRUK `EffectMesh` detects walls, floors, ceilings |
| **Material Painting** | `MaterialSwitcher` cycles through paint materials |
| **Transparency Control** | `SceneMeshIntensitySlider` adjusts material opacity via `MaterialPropertyBlock` |
| **Audio Reactivity** | `MicLoudnessController` modulates paint intensity based on ambient sound level |
| **Mesh Visibility** | `EffectMeshVisibilityController` manages surface mesh show/hide |

**Scenes:** `ColorYourReality.unity`, `ColorYourReality 2.unity`
**Key Scripts:** `EffectMeshVisibilityController.cs`, `MaterialSwitcher.cs`, `MicLoudnessController.cs`, `SceneMeshIntensitySlider.cs`, `StripEffectMeshMaterials.cs` (+ duplicate `StripEffectMeshMaterials1.cs`)

---

## 4. Code Quality Observations

### Positives
- **Null safety:** Consistent null checks throughout (`if (node == null) return;`)
- **XML documentation:** Good `///` summary comments on public APIs in XRMP package
- **Safe iteration:** Reverse-loop for removal during iteration (`for (int i = list.Count - 1; i >= 0; i--)`)
- **Property caching:** Reflection cache for Outline property access (`OutlineWidthPropCache`)
- **Network serialization:** Proper `INetworkSerializable` structs (`NodeSyncData`, `LinkSyncData`)
- **Version compat guards:** `#if UNITY_2023_1_OR_NEWER` for deprecated API migration
- **Coroutine timing:** 1-frame delay in load to allow Netcode despawns to complete
- **SSE streaming:** Correctly parsed with buffer management in `GabRequestHandler`
- **MaterialPropertyBlock usage:** `SceneMeshIntensitySlider` avoids material instance duplication

### Anti-Patterns & Issues

| Severity | Issue | Location |
|----------|-------|----------|
| **HIGH** | `AcceptAllCertificates` — skips ALL SSL validation | `AuthManager.cs` |
| **HIGH** | `FindObjectsOfType<>()` called every `Update()` frame — O(n) scene search 60x/sec | `MicLoudnessController.cs` |
| **HIGH** | Private field accessed via reflection (`lastJsonPayload`) — breaks silently on rename | `SaveLoadGraph.cs` → `LoadEngineData` |
| **HIGH** | `#if POD_RESEARCH` define never set in any standalone manifest — all graph integration code is dead | `PodDefinitionHandler.cs` |
| **MEDIUM** | 414 lines of V1 code commented out (dead code bloat) | `SaveLoadGraph.cs` |
| **MEDIUM** | `FindFirstObjectByType<>()` called 3× in `Start()` per node spawn | `NodeManager.cs` |
| **MEDIUM** | Duplicate scripts: `StripEffectMeshMaterials.cs` + `StripEffectMeshMaterials1.cs` | `ColorYourReality/` |
| **MEDIUM** | Mismatched enums: `AIManager.AIServiceConfiguration` vs `AIEntity.AIServiceConfiguration` | PodGab |
| **MEDIUM** | All asmdefs declare `rootNamespace` but scripts use global namespace — misleading | All projects |
| **MEDIUM** | Duplicate manifest key `com.unity.modules.unitywebrequest` — may cause parse error | `PodDefinition/manifest.json` |
| **LOW** | `REPLACEPLAYERSLOTWITHTHISSCRIPT.cs` — placeholder file in production package | `com.imt.shared` |
| **LOW** | `USE_FORCED_BYTE_SERIALIZATION` targets NGO 1.9.1 but project uses 2.0.0 — dead workaround | `com.imt.xrmp` |
| **LOW** | UI hidden by `position = new Vector3(0, -5000, 0)` instead of `SetActive(false)` | `GameManager.cs` |
| **LOW** | Hardcoded `SphereCollider.radius` with comment `"because stupid mesh"` | `NodeManager.cs` |
| **LOW** | Package.json version mismatches (declares NGO 1.9.1, manifest uses 2.0.0) | `com.imt.xrmp/package.json` |

### Test Coverage
- **Current coverage: 0%** — No test files exist anywhere in the project
- `com.unity.test-framework 1.5.1` is installed in all manifests but unused
- No Edit Mode or Play Mode test assemblies have been created
- Unity MCP `run_tests` is configured but has nothing to run

---

## 5. Pain Points & Tech Debt (Epics 4–7)

### Epic 4: SDK Migration — NOT STARTED

| Gap | Impact | Complexity |
|-----|--------|------------|
| **XR Interaction Toolkit → Meta Interaction SDK** | XRI is a Unity generic SDK; Meta SDK is Quest-optimized with better hand tracking, poke/pinch support. Current XRI works but isn't optimal. | HIGH — touches every interactable in all 3 apps + XRMP package |
| **Unity Gaming Services → Meta Networking** | Currently uses Unity Relay/Lobby for matchmaking. Meta's peer-to-peer would remove cloud dependency and reduce latency. | HIGH — rewires entire multiplayer stack (AuthenticationManager, LobbyManager, connection flow) |
| **MRUK → Depth API (ColorYourReality)** | MRUK requires room pre-scan. Depth API enables real-time surface detection without setup on Quest 3. | MEDIUM — isolated to ColorYourReality, ~6 scripts affected |

### Epic 5: Backend Update — NOT STARTED

| Gap | Impact | Complexity |
|-----|--------|------------|
| **No automatic fallback** | If Gabriela (mines-albi.fr) goes down, PodGab has no working AI. n8n URLs exist in code but no switching logic. | MEDIUM — need config toggle + health check + automatic failover |
| **Hardcoded URLs** | All service URLs are hardcoded in `AIManager.cs`. No runtime configuration or environment switching. | LOW — extract to ScriptableObject or config file |
| **Dead POD_RESEARCH bridge** | `PodDefinitionHandler.cs` contains the voice→graph integration code behind a define that's never set in standalone builds. | LOW — just needs the define added to PodGab's asmdef |

### Epic 6: Code Quality — NOT STARTED

| Gap | Impact | Complexity |
|-----|--------|------------|
| **Namespace chaos** | 3 packages + 3 apps all effectively use global namespace despite declaring root namespaces in asmdefs. Creates collision risk and confusing IntelliSense. | MEDIUM — mechanical but touches ~200+ files |
| **Security: SSL bypass** | `AcceptAllCertificates` in `AuthManager.cs` is a dev-only hack left in production code. | LOW — remove or guard behind `#if UNITY_EDITOR` |
| **Performance: per-frame scene search** | `FindObjectsOfType` in `MicLoudnessController.Update()` — will degrade with scene complexity. | LOW — cache on Start(), invalidate on spawn/destroy |
| **Dead code** | 414 lines commented V1 in `SaveLoadGraph.cs`, `REPLACEPLAYERSLOTWITHTHISSCRIPT.cs`, stale NGO 1.9.1 workaround | LOW — delete |
| **Duplicate scripts** | `StripEffectMeshMaterials.cs` + `StripEffectMeshMaterials1.cs` | LOW — delete duplicate |
| **Fragile reflection** | `SaveLoadGraph` → `LoadEngineData` private field access | MEDIUM — expose via public method or event |

### Epic 7: Testing — NOT STARTED

| Gap | Impact | Complexity |
|-----|--------|------------|
| **Zero test coverage** | No automated tests exist. All verification is manual in-editor/on-device. | HIGH — need to create test infrastructure from scratch |
| **No test assemblies** | Edit Mode and Play Mode test asmdefs don't exist in any project | LOW — scaffold creation |
| **Target: 70% coverage** | From 0% to 70% is a massive jump. User stories define progressive targets: 20% → 40% → 60% → 70%+ | HIGH — 5 stories worth of test writing |
| **Networked code testing** | Netcode `NetworkBehaviour` testing requires special setup (host/client simulation) | HIGH — complex test infrastructure |

### Compilation Verification — INCOMPLETE

The CLAUDE.md explicitly notes: **"Needs verification: Open each project in Unity editor to confirm compilation."** None of the 3 standalone projects have been opened in Unity to verify they actually compile. This is a blocking risk for all subsequent epics.

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Epics** | 7 (28 user stories) |
| **Completed** | Epics 1–3 (15 stories) — Setup, UPM extraction, app splitting |
| **Remaining** | Epics 4–7 (13 stories) — SDK migration, backend, code quality, testing |
| **Total C# Scripts** | ~250+ across 3 apps + 3 packages |
| **Test Coverage** | 0% |
| **Critical Risks** | Compilation unverified, SSL bypass in production, dead POD_RESEARCH code, no fallback backend |
| **Biggest Effort** | Epic 4 (SDK migration — touches every interactable) and Epic 7 (testing from 0% → 70%) |

---

*Generated by Claude Code — 2026-03-02*
