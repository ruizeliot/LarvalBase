# PRD — Multi-template Unity Refacto

**Version:** 1.0
**Date:** 2026-03-03
**Project:** test-8
**Path:** B — Existing codebase refactoring

---

## 1. Product Overview

### Vision
Transform a Unity 6 research prototype (monorepo with 3 VR/AR apps + 3 UPM packages) into a production-quality codebase. Focuses on PodDefinition (3D graph editor for supply chain modeling) and PodGab (AI voice assistant), with complete code cleanup, SDK modernization, test coverage, and improved UX.

### Target Users
- **Researchers** at IMT Mines Albi — build and manipulate supply chain models in 3D
- **Developers** — maintain and extend the codebase

### Platform Priority
**Desktop 3D first** → VR/Quest second. All features must work on desktop before VR adaptation.

### Platforms
- Unity desktop (Windows/Mac) — primary development target
- Meta Quest (VR mode) — immersive graph editing
- Meta Quest (MR mode) — passthrough with spatial anchoring

---

## 2. Technical Constraints

### Existing Codebase
See `codebase-analysis.md` for full analysis. Key constraints:
- **Unity 6** (6000.0.58f2), URP 17.0.4
- **Netcode for GameObjects 2.0** — server-authority multiplayer
- **Meta XR SDK 78** — Quest VR/MR support
- **3 UPM packages** (com.imt.xrmp, com.imt.utilities, com.imt.shared) — shared code
- **External services:** Gabriela (mines-albi.fr) for STT/LLM, n8n webhooks

### Development Tooling (MCP)
- **Unity MCP** (CoplayDev/unity-mcp) — Claude Code interacts with Unity editor via MCP
- **Meta XR SDK MCP** — Access to Meta Quest/Horizon documentation for VR/MR development

### Quality Targets
- **Test coverage:** 80%+
- **Compilation:** Zero errors on all standalone projects
- **Namespaces:** Unified `IMT.*` hierarchy
- **Dead code:** Zero tolerance

### Removed from Scope
- **ColorYourReality** — AR painting app removed from refactored copy
- **Auth multi-provider** — Deferred (Gabriela auth system in migration)

---

## 3. Non-Functional Requirements

### Performance
- Force-directed layout must remain smooth at 60fps for graphs up to 500 nodes (US51)
- No per-frame `FindObjectsOfType` or scene searches
- GC allocations minimized in hot paths (object pooling, pre-allocation)

### Accessibility
- Desktop-first ensures keyboard/mouse accessibility
- VR mode requires hand tracking + controller support
- UI must be readable in all 3 modes (Desktop/VR/MR)

### Responsive/Adaptive
- Canvas UI adapts between Desktop (mouse panels), VR (larger floating panels), and MR (minimal UI with spatial anchors)
- Input abstraction layer handles platform differences transparently

---

## 4. Visual References

### Mockup Files
All mockups are embedded in `app-mockup.html` (standalone, offline-viewable).

| Section | Mockup | Notes |
|---------|--------|-------|
| Cleanup & Foundation | cleanup-foundation.html | Technical schema, 4 panels |
| Input Abstraction | input-abstraction-mockup.html | 4 interactive tabs |
| Graph Core | graph-core-3d.html | Three.js 3D scene |
| Save/Load | mockup-save-load.html | 4-tab interface |
| Canvas UI | canvas-ui-v5.html | Pure HTML/CSS, world-space panels |
| Data Import | mockup-data-import.html | 4-tab interface |
| Voice Pipeline | mockup-voice-pipeline.html | 2-view settings/status |
| AI Entities | mockup-ai-entities.html | 2-view modes/objects |
| KPI & Causal Chain | mockup-kpi-causal.html | DAG graph + generation |
| PodDef ↔ PodGab | mockup-poddef-podgab.html | 3-view integration |
| Environments & MR | mockup-environments-mr.html | Mode switcher + settings |
| Multiplayer | mockup-multiplayer.html | 3-view lobby/session/perms |

**Note:** Mockup HTML files were posted in Discord threads but could not be downloaded (CDN 401). See `app-mockup.html` for placeholders with detailed descriptions.

---

## 5. Epic Breakdown

### Epic 0: Compilation Verification & Setup [MOD] — Size: S

**Source:** Transversal (US42) + MCP tooling
**Dependencies:** None — must be completed first
**Regression:** N/A (foundation)

| US | Description | Type |
|----|-------------|------|
| US-42 | Verify compilation of all standalone projects (PodDef, PodGab, XRMP) before any work | [MOD] |
| I0-1 | Set up Unity MCP (CoplayDev) for Claude Code development | [NEW] |
| I0-2 | Set up Meta XR SDK MCP for documentation access | [NEW] |

---

### Epic 1: Cleanup & Foundation [MOD] — Size: M

**Source:** Cleanup & Foundation section
**Dependencies:** Epic 0
**Regression:** Must not break: existing compilation of standalone projects

| US | Description | Type |
|----|-------------|------|
| US-39 | Migrate all scripts to unified `IMT.*` namespace hierarchy (IMT.PodDefinition, IMT.PodGab, IMT.XRMP, IMT.Core, IMT.Shared) | [MOD] |
| US-40 | Remove dead code: SaveLoad V1 (414 lines), placeholder scripts, NGO 1.9.1 workarounds, obsolete Editor scripts | [MOD] |
| US-41 | Fix performance hotspots: cache `FindObjectsOfType` at `Start()`, replace per-frame searches with events/dirty flags, minimize GC allocations | [MOD] |

---

### Epic 2: Input Abstraction [MOD] — Size: M

**Source:** Input Abstraction section
**Dependencies:** Epic 1
**Regression:** Must not break: existing XR interactions, desktop controls

| US | Description | Type |
|----|-------------|------|
| US-10 | Implement `VRInputProvider` with optimized Quest grab/poke/pinch via Meta SDK hand tracking | [MOD] |
| US-11 | Implement `DesktopInputProvider` with mouse/keyboard interactions (WASD, click, scroll) | [MOD] |
| US-12 | Create `IInputProvider` interface + `PlatformDetector` + `InputProviderFactory` for auto-detection and seamless desktop ↔ VR switching | [NEW] |

---

### Epic 3: Graph Core [MOD] — Size: M

**Source:** Graph Core section
**Dependencies:** Epic 1
**Regression:** Must not break: existing node/link CRUD, multiplayer sync

| US | Description | Type |
|----|-------------|------|
| US-1 | Improve force-directed layout for smoother, more stable 3D positioning | [MOD] |
| US-2 | Add adjustable parameters (force strength, spacing, gravity, damping) via UI sliders | [NEW] |
| US-3 | Add node position locking — toggle to fix a node's position while layout auto-arranges others | [NEW] |
| US-50 | Empty graph state — show onboarding message when graph has 0 nodes | [NEW] |
| US-51 | Massive graph optimization (500+ nodes) — LOD/culling for performance | [NEW] |
| US-52 | Orphan link detection — auto-detect and warn when source/target node is deleted | [NEW] |

---

### Epic 4: Save/Load [MOD] — Size: M

**Source:** Save/Load section
**Dependencies:** Epic 3 (graph data model)
**Regression:** Must not break: existing save/load functionality

| US | Description | Type |
|----|-------------|------|
| US-4 | Redesign save/load with structured, versionable format (JSON/YAML) | [MOD] |
| US-5 | Add export/import between users — JSON, YAML, Bundle .zip, temporary sharing link for async collaboration | [NEW] |
| US-6 | Implement auto-save with configurable frequency (1-30 min), retention (3-50 snapshots), crash recovery | [NEW] |
| US-53 | Corrupted save handling — graceful error with recovery option (last known good state) | [NEW] |
| US-54 | Save version mismatch — migration system for saves from older versions | [NEW] |
| US-55 | Concurrent edit conflict — detection and merge/override choice | [NEW] |

---

### Epic 5: Canvas UI [MOD] — Size: L

**Source:** Canvas UI section
**Dependencies:** Epic 2 (input abstraction), Epic 3 (graph core)
**Regression:** Must not break: existing node/link editing

| US | Description | Type |
|----|-------------|------|
| US-7 | World-space property panel floating next to selected node — name, type, Transform XYZ, connections, Edit/Link/Delete buttons. Panel follows node. | [NEW] |
| US-8 | Adaptive UI for 3 modes: Desktop (camera-oriented panels), VR (larger glow panels with hand indicators), MR (semi-transparent, spatial anchors, minimal UI) | [NEW] |
| US-9 | Immediate visual feedback — hover highlight, animated pulse on selection, confirmation flash on modification, contextual toolbar above selected node | [NEW] |

---

### Epic 6: Data Import [MOD] — Size: M

**Source:** Data Import section
**Dependencies:** Epic 3 (graph data model)
**Regression:** Must not break: existing engine data import

| US | Description | Type |
|----|-------------|------|
| US-13 | Import from predefined formats (Excel template, JSON schema, CSV with headers) with strict conventions and downloadable templates | [MOD] |
| US-14 | Visual mapping table: source columns → target node/link fields, auto-detection, real-time color-coded validation (valid/warning/error/unmapped) | [NEW] |
| US-15 | Decoupled import system with strict validation (JSON Schema), clear error messages, import log with progress bar | [MOD] |
| US-61 | Partial import failure — import successful items, report failures, offer retry for failed items | [NEW] |
| US-62 | Duplicate detection on import — flag duplicates with merge/skip/replace options | [NEW] |

---

### Epic 7: Voice Pipeline [MOD] — Size: L

**Source:** Voice Pipeline section
**Dependencies:** Epic 1
**Regression:** Must not break: existing Gabriela STT/LLM/TTS

| US | Description | Type |
|----|-------------|------|
| US-16 | STT fallback chain: cloud primary (Gabriela) → cloud secondary → local (Whisper), auto-switching | [MOD] |
| US-17 | `ISTTProvider` interface for pluggable STT providers | [NEW] |
| US-18 | Multi-service LLM support: Gabriela, n8n, local, each with specialized capabilities | [MOD] |
| US-19 | `ILLMProvider` interface with decoupled STT/LLM/TTS architecture | [NEW] |
| US-20 | Settings menu to choose each layer (STT/LLM/TTS) independently | [NEW] |
| US-21 | Speech-to-speech support (Mochi) as alternative to STT→LLM→TTS pipeline | [NEW] |
| US-24 | `ITTSProvider` interface for pluggable TTS providers | [NEW] |
| US-32 | LLM fallback: auto-switch if Gabriela down → Groq/n8n/local | [NEW] |
| US-37 | Local LLM via Unity AI Inference for offline mode (degraded but functional) | [NEW] |
| US-38 | Local LLM implements `ILLMProvider`, interchangeable with cloud | [NEW] |
| US-49 | Platform-adaptive local LLM: light model (Phi/Gemma) on Quest, performant model on desktop, auto-selected | [NEW] |
| US-56 | All providers down — graceful degradation with user notification | [NEW] |
| US-57 | Mid-sentence provider switch — seamless transition without losing context | [NEW] |
| US-58 | High latency detection — auto-switch to faster provider | [NEW] |

---

### Epic 8: AI Entities [MOD] — Size: M

**Source:** AI Entities section
**Dependencies:** Epic 7 (voice pipeline for TTS)
**Regression:** Must not break: existing avatar system

| US | Description | Type |
|----|-------------|------|
| US-22 | 3 incarnation modes: Avatar RPM (lip-sync + anims), Abstract Orb (floating, reactive), No Avatar (voice-only) | [MOD] |
| US-23 | Mode-adapted interactions per incarnation | [NEW] |
| US-25 | `IAIEntity` interface per incarnation mode | [NEW] |
| US-33 | AI reads Smart Object properties: Unity auto-detected (mass, position) + custom designer properties | [MOD] |
| US-34 | Designer adds abstract properties (key/value) to Smart Objects without coding | [NEW] |
| US-35 | Standardized Smart Object system auto-exposing Unity components + custom dictionary | [NEW] |
| US-59 | Avatar loading failure — fallback to Orb mode with notification | [NEW] |
| US-60 | Smart Object property conflict — priority rules for auto-detected vs custom | [NEW] |

---

### Epic 9: KPI & Causal Chain [MOD] — Size: M

**Source:** KPI & Causal Chain section
**Dependencies:** Epic 3 (graph core), Epic 7 (voice pipeline)
**Regression:** Must not break: existing KPI generation

| US | Description | Type |
|----|-------------|------|
| US-26 | Interactive KPI/causal chain graphs: clickable DAG, zoom/pan, node selection with detail view | [MOD] |
| US-27 | Post-generation modification: edit labels, values, targets, connections | [NEW] |
| US-28 | Inject generated graph into PodDefinition with before/after comparison | [NEW] |

---

### Epic 10: PodDef ↔ PodGab Integration [MOD] — Size: L

**Source:** PodDef ↔ PodGab Integration section
**Dependencies:** Epic 3 (graph core), Epic 7 (voice pipeline), Epic 9 (KPI)
**Regression:** Must not break: existing PodGab chat

| US | Description | Type |
|----|-------------|------|
| US-29 | Voice commands for graph CRUD: create/modify/delete nodes and links by voice | [NEW] |
| US-30 | AI reads and comments on existing graph: structure analysis, issue detection, suggestions | [NEW] |
| US-31 | Decoupled event system (replace `#if POD_RESEARCH`) — integration always active and testable | [MOD] |

---

### Epic 11: Environments & MR [MOD] — Size: L

**Source:** Environments & MR section
**Dependencies:** Epic 2 (input abstraction), Epic 5 (canvas UI)
**Risk:** Moderate (MR passthrough is Quest-specific)
**Regression:** Must not break: existing VR scenes

| US | Description | Type |
|----|-------------|------|
| US-43 | Desktop mode: classic 3D virtual world with free camera, grid floor, skybox | [MOD] |
| US-44 | Quest MR mode: switch VR ↔ MR (passthrough), virtual objects anchored to real surfaces | [NEW] |
| US-45 | Customizable virtual environments in VR mode (Office/Space/Forest/Abstract) with lighting presets | [NEW] |

---

### Epic 12: Multiplayer [MOD] — Size: L

**Source:** Multiplayer section
**Dependencies:** Epic 2 (input abstraction), Epic 11 (environments)
**Risk:** Moderate (spatial anchor sync is complex)
**Regression:** Must not break: existing UGS networking

| US | Description | Type |
|----|-------------|------|
| US-46 | Colocation mode: same physical room, MR, see real hands/positions via spatial anchors | [NEW] |
| US-47 | Remote user joins via avatar (Quest or desktop), participates in same session | [MOD] |
| US-48 | Unified network system with auto-detection of colocation vs remote mode | [NEW] |
| US-63 | Player disconnect mid-edit — lock changes, notify others, offer unlock after timeout | [NEW] |
| US-64 | Platform mismatch handling — Quest MR + desktop 3D in same session | [NEW] |
| US-65 | Host migration — seamless transfer if host disconnects | [NEW] |

---

### Epic 13: Testing [NEW] — Size: L

**Source:** Transversal (test coverage target 80%+)
**Dependencies:** All other epics (test as you build)
**Regression:** N/A

| US | Description | Type |
|----|-------------|------|
| T-1 | Create Edit Mode and Play Mode test assemblies for all projects | [NEW] |
| T-2 | Unit tests for Graph Core (node/link CRUD, rules engine, layout) — target 80% | [NEW] |
| T-3 | Unit tests for Save/Load (serialization, deserialization, migration, corruption recovery) | [NEW] |
| T-4 | Unit tests for Voice Pipeline (provider switching, fallback chain, interface contracts) | [NEW] |
| T-5 | Integration tests for PodDef ↔ PodGab (event bus, voice commands, graph manipulation) | [NEW] |
| T-6 | Play Mode tests for multiplayer (host/client simulation, sync, disconnect handling) | [NEW] |

**Note:** Testing should be done incrementally with each epic, not as a final phase. The test epic captures the infrastructure and coverage targets.

---

## 6. Epic Dependency Graph

```
Epic 0 (Compilation + MCP Setup)
  └─► Epic 1 (Cleanup & Foundation)
       ├─► Epic 2 (Input Abstraction)
       │    ├─► Epic 5 (Canvas UI)
       │    ├─► Epic 11 (Environments & MR)
       │    │    └─► Epic 12 (Multiplayer)
       │    └───────────────┘
       ├─► Epic 3 (Graph Core)
       │    ├─► Epic 4 (Save/Load)
       │    ├─► Epic 5 (Canvas UI)
       │    ├─► Epic 6 (Data Import)
       │    └─► Epic 9 (KPI & Causal Chain)
       │         └─► Epic 10 (PodDef ↔ PodGab)
       └─► Epic 7 (Voice Pipeline)
            ├─► Epic 8 (AI Entities)
            ├─► Epic 9 (KPI & Causal Chain)
            └─► Epic 10 (PodDef ↔ PodGab)

Epic 13 (Testing) — parallel with all epics
```

---

## 7. Recommended Build Order

Based on dependencies, risk assessment, and the "desktop first" constraint:

1. **Epic 0** — Compilation & MCP setup (S) — **foundation**
2. **Epic 1** — Cleanup & Foundation (M) — **unblocks everything**
3. **Epic 3** — Graph Core (M) — **core data model**
4. **Epic 2** — Input Abstraction (M) — **enables UI work**
5. **Epic 4** — Save/Load (M) — **depends on graph core**
6. **Epic 5** — Canvas UI (L) — **depends on input + graph**
7. **Epic 6** — Data Import (M) — **depends on graph core**
8. **Epic 7** — Voice Pipeline (L) — **complex, independent**
9. **Epic 8** — AI Entities (M) — **depends on voice**
10. **Epic 9** — KPI & Causal Chain (M) — **depends on graph + voice**
11. **Epic 10** — PodDef ↔ PodGab (L) — **depends on most things**
12. **Epic 11** — Environments & MR (L) — **at-risk, later**
13. **Epic 12** — Multiplayer (L) — **at-risk, last**

Testing (Epic 13) runs incrementally throughout.

---

## 8. Summary

| Metric | Value |
|--------|-------|
| **Epics** | 14 (0-13) |
| **User Stories** | 65 + 6 test stories = 71 |
| **Complexity** | 4S + 6M + 4L |
| **[NEW] features** | 46 |
| **[MOD] features** | 25 |
| **Risk areas** | Voice Pipeline, Environments & MR, Multiplayer |
| **Platform priority** | Desktop → VR → MR |
| **Test target** | 80%+ coverage |
| **MCP tooling** | Unity MCP + Meta XR SDK MCP |

---

*Generated by Claude Code — 2026-03-03*
