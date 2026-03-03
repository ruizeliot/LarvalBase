# Brainstorm Notes — Multi-template Unity Refacto

**Project:** test-8 (Multi-template Unity Refactor)
**Date:** 2026-03-03
**User:** Anthony Hunt
**Facilitator:** Pipeline Manager Bot (v11)
**Path:** B — Existing codebase refactoring

---

## 1. Concept & Positioning

**What:** Complete refactoring of a Unity 6 monorepo containing three VR/AR applications (PodDefinition, PodGab, ColorYourReality) and three shared UPM packages (com.imt.xrmp, com.imt.utilities, com.imt.shared) into clean, standalone projects.

**Goal:** Produce a production-quality codebase from the current research prototype — fix code quality issues, modernize SDK dependencies, add test coverage, and improve the development workflow.

**Repository:** https://gitlab.mines-albi.fr/anthony.hunt/Test-MCP-Unity
**Local path:** `C:\Users\ahunt\Documents\Unity\Multi-template`

**Key constraint:** This is a **refacto pure** — no new features beyond what's described in the user stories. The first run focuses on cleaning up and restructuring.

---

## 2. Codebase Analysis Summary

A full codebase analysis was performed (see `codebase-analysis.md`). Key findings:

### Tech Stack
- **Unity 6** (6000.0.58f2), URP 17.0.4, Android/Quest target
- Meta XR SDK 78, NGO 2.0, XR Interaction Toolkit 3.0.8, AR Foundation 6.1.1
- Vivox 16.7.0 (voice), Unity Auth 3.4.1, glTFast 6.0.1 (avatars)
- External services: Gabriela (STT/LLM), n8n webhooks, KPI generator

### Architecture
- 3 apps (PodDefinition, PodGab, ColorYourReality) + 3 UPM packages
- Singleton pattern, server-authority networking, event-driven UI sync
- Assembly definitions with proper dependency chains

### Code Quality Issues (14 found)
- **HIGH:** SSL bypass (`AcceptAllCertificates`), per-frame `FindObjectsOfType`, reflection on private fields, dead `#if POD_RESEARCH` code
- **MEDIUM:** 414 lines dead V1 code, duplicate scripts, mismatched enums, namespace chaos, duplicate manifest keys
- **LOW:** Placeholder scripts, stale workarounds, UI hidden by position offset, hardcoded values

### Test Coverage: 0%
- Unity Test Framework installed but completely unused
- No Edit Mode or Play Mode test assemblies exist

### Completed Work (Epics 1-3)
- Setup, UPM package extraction, and app splitting already done (15/28 original stories)
- Remaining: Epics 4-7 (SDK migration, backend update, code quality, testing)

---

## 3. Scope Decisions

### Kept (Modify/Improve)
- **PodDefinition** — 3D graph editor for supply chain models. Refactored + improved layout, save/load, canvas UI, data import.
- **PodGab** — AI voice assistant. Refactored + improved voice pipeline, AI entities, KPI/causal chain, integration with PodDef.
- **Transversal** — Code quality cleanup, environments/MR, multiplayer improvements.

### Removed
- **ColorYourReality** — AR painting app. Removed from the refactored copy. Reasoning: not part of the core PodDefinition/PodGab workflow, adds complexity without value for the refacto scope.
- **Auth multi-provider** — Deferred. Gabriela is migrating its auth system, so building a new auth layer now would be wasted effort.

### Constraints
- **Desktop 3D first** → VR/Quest second. Build and test desktop functionality before VR adaptation.
- **Platforms:** Quest (VR/MR) + Unity desktop
- **Cleanup technique:** Priority HAUTE — namespaces, dead code, performance fixes before feature work.
- **Tests:** 80%+ coverage target
- **MCP tooling:** Development via Unity MCP (CoplayDev) + Meta XR SDK MCP for documentation access.

---

## 4. References & External Dependencies

### MCP Servers (Development Tooling)
- **Unity MCP** (CoplayDev/unity-mcp) — Bridge for Claude Code to interact with Unity editor: manage assets, control scenes, edit scripts
- **Meta XR SDK MCP** (Meta Horizon docs) — Documentation server for Quest/VR/MR development

### External Services (Runtime)
- **Gabriela STT:** `gabriela.mines-albi.fr/v2/sound-to-text/transcribe/`
- **Gabriela LLM (SSE):** `gabriela.mines-albi.fr/v3/gabriela/gabriela_streaming`
- **KPI Generator:** `gabcgi.mines-albi.fr:9003/example_to_kpis`
- **Causal Chain:** `gabriela.mines-albi.fr/v3/causal_chain/example_to_causal_chain`
- **n8n Webhooks:** `n8n.srv1039032.hstgr.cloud/webhook/` (transcription, answer, voice)

### SDK Dependencies
- Meta XR SDK 78 (interaction, hand tracking, passthrough)
- Unity Netcode for GameObjects 2.0 (multiplayer)
- Ready Player Me (avatar system)
- Unity AI Inference 2.2.1 (local LLM)

---

## 5. Section-by-Section Decisions

### 5.1 — Cleanup & Foundation (US39-42)

**Thread:** Cleanup & Foundation
**Mode:** Fast (C) — Storm mockup direct, validated without modifications
**Mockup:** Technical schema with 4 panels (dark, green/red/orange)

**Decisions:**
- **US39 — Namespaces:** Target `IMT.*` hierarchy:
  - `IMT.PodDefinition` (Models, Controllers, Serialization)
  - `IMT.PodGab` (Networking, UI, Audio)
  - `IMT.XRMP` (Interactions, Avatars, Sync)
  - `IMT.Core` (Utils, Extensions, Config)
  - `IMT.Shared` (Data, Interfaces)
  - All scripts migrate to this unified convention.

- **US40 — Dead code removal:**
  - REMOVE: SaveLoad V1 (414 lines), placeholder scripts (`REPLACEPLAYERSLOTWITHTHISSCRIPT.cs`), NGO 1.9.1 workarounds, obsolete Editor scripts
  - KEEP: Active verified code only

- **US41 — Performance hotspots:**
  - CRITICAL (blocking): `FindObjectsOfType` at runtime → cache at `Start()` or use static registries (never per-frame). Per-frame searches in `Update` → replace with events/dirty flags.
  - MEDIUM: GC allocations in loops → pre-allocate, object pools. String concatenation in logs → guard with `#if DEBUG` or LogLevel.

- **US42 — Compilation workflow:** 5 sequential steps with blocking gates:
  1. Open each standalone project (PodDef, PodGab, XRMP)
  2. Verify 0 console errors
  3. Build Player PC Standalone
  4. Run EditMode + PlayMode tests (100% pass)
  5. WebGL/Android builds (if applicable)

**Rejected alternatives:** None — straightforward technical cleanup.

---

### 5.2 — Input Abstraction (US10-12)

**Thread:** Input Abstraction
**Mode:** Fast (C) — Storm mockup direct, validated without modifications
**Mockup:** 4 interactive tabs (Architecture, Interactions, Platform Switch, Bindings)

**Decisions:**
- **Architecture:** Common interface `IInputProvider` with methods: `GetGrab()`, `GetPoke()`, `GetPinch()`, `GetPointer()`, `GetMove()`, `GetLook()`
- **2 implementations:**
  - `DesktopInputProvider` — mouse/keyboard (WASD movement, mouse look, left click for grab/poke/select, scroll wheel)
  - `VRInputProvider` — Meta SDK hand tracking (Hand Grab, Index Poke, Pinch, Controller Stick locomotion + snap turn)
- **Auto-detection:** `PlatformDetector` checks `XRSettings.isDevicePresent` → `InputProviderFactory` instantiates the correct provider
- **Consumer pattern:** ObjectManipulator, UIInteraction, PlayerController only know `IInputProvider` — zero direct hardware dependency

**Key design choice:** Strategy pattern for input providers. Classic, well-understood in Unity. Consumers are completely decoupled from platform specifics.

**Rejected alternatives:** None — the Strategy pattern was the obvious choice for desktop ↔ VR abstraction.

**Cross-section dependency:** Must synchronize with Canvas UI (US7-9) so UI interactions also go through the abstraction layer, avoiding code duplication.

---

### 5.3 — Graph Core (US1-3 + existing node/link types)

**Thread:** Graph Core
**Mode:** Visual-first (A) → mockup in Three.js 3D
**Mockup:** Three.js 3D scene with 12 nodes, 14 links, force-directed layout, camera orbit

**Decisions:**
- **Mockup technology:** Three.js 3D instead of HTML 2D. Anthony explicitly requested 3D representation because PodDefinition is a 3D editor — a 2D mockup "is not imaginative like in a Unity environment."
  - First attempt: 2D HTML mockup → REJECTED ("not great, it will be in 3D in Unity")
  - Second attempt: Three.js 3D → VALIDATED
- **3D Scene:** 12 spherical nodes with glow/emissive, 6 color-coded types:
  - Elementary (blue), Complex (violet), Component (green), Potential (orange), Sensitivity (red), Potentiality (yellow)
- **14 directional links** with arrows, 6 link types: Hierarchical, Composition, Dependency, Sensitivity, Association, Flux
- **Force-directed layout 3D** in real-time with sliders: force, spacing, gravity, damping (US1-2)
- **Node locking 🔒** — toggle by click to fix position during layout (US3)
- **Interactions:** Orbital camera (rotate/zoom/pan), 3D drag & drop, hover highlight, selection with animated pulse
- **Side panel:** Node properties (type, XYZ coordinates live, typed connections), metadata
- **Style:** Dark theme (#0a0e17), grid floor, fog, background particles

**Elements preserved:** 6 node types + 6 link types + rules engine (unchanged from existing code)

**Rejected alternatives:**
- 2D HTML mockup — rejected by user, not representative of 3D editor
- Babylon.js — considered but Three.js chosen for simplicity
- React Three Fiber — too complex for a one-shot mockup
- CSS 3D transforms — not truly 3D

---

### 5.4 — Save/Load (US4-6)

**Thread:** Save/Load
**Mode:** Fast (C) — Storm mockup direct, validated at first mockup
**Mockup:** 4-tab interface (Saves List, Export/Import, Auto-save, History)

**Decisions:**
- **US4 — Structured format:** JSON/YAML save management interface. Save list shows name, version, size, date. Buttons: Load, Diff, Delete. Integrated search.
- **US5 — Export/import:** Dedicated panel with drag & drop for import (.json/.yaml). Export as JSON, YAML, Bundle .zip, or temporary sharing link for async collaboration.
- **US6 — Auto-save:** Activatable toggle, configurable frequency (1-30 min), retention (3-50 snapshots), automatic crash save, save on Play Mode. Choice of serialization format (JSON/YAML).
- **History:** Git-style diff viewer (colored additions/deletions), chronological timeline with AUTO/MANUAL/CRASH tags.
- **Design:** Dark dev-tool style (sober, functional), 4 navigable tabs, CSS animations, mobile-responsive.

**Feasibility:** RAS — standard JSON/YAML save/load, diff viewer achievable with existing libs, classic Unity auto-save pattern.

---

### 5.5 — Canvas UI (US7-9)

**Thread:** Canvas UI
**Mode:** Visual-first (A) → multiple iterations (v1 → v5)
**Mockup:** Pure HTML/CSS (v5 — final validated version)

**Decisions:**
- **World-space UI** — All panels are IN the 3D scene, attached to objects. NOT side panels or fixed overlays.
  - This was the core design decision, requiring 5 iterations to get right.
- **Node selection** → floating property panel NEXT TO the selected node (world-space, billboard toward camera):
  - Editable name, colored type, Transform XYZ, typed connections (5 types), Edit/Link/Delete buttons
  - Panel follows the node when it moves
- **Contextual toolbar** — icon bar floating ABOVE the selected node (Select, Move, Add Node, Link, Delete)
- **Link selection** → small panel AT THE MIDDLE of the link: link type (dropdown), direction, weight, Reverse/Delete buttons
- **3D tooltips** on hover — bubble near the hovered object (name, type, coordinates)
- **3 modes with toggle:**
  - 🖥 Desktop — world-space panels oriented to camera
  - 🥽 VR — panels with reinforced glow, hand indicators, immersive style
  - 🌐 MR — passthrough, semi-transparent, reduced fog, hidden grid, spatial anchors, minimal UI
- **Style:** Glassmorphism with backdrop blur, subtle border `rgba(123,140,255)`, clear sections (Transform, Connections, Actions)

**Iteration history (5 versions):**
1. **v1** — Classic web-app layout with side panels → REJECTED ("not imaginative like in a Unity environment, what about the MR view? We need Three.js")
2. **v2** — Three.js 3D but still with HTML overlay panels → REJECTED ("still looking like web app, it needs to be rendering on top of a node or a link")
3. **v3** — Three.js with CSS3DRenderer world-space panels → Touch/click not working on mobile
4. **v3.1-v3.2** — Touch event fixes → Still not working
5. **v4** — Static Three.js demo with always-visible panels → Rendered as black screen (WebGL headless limitation)
6. **v5** — Pure HTML/CSS simulating 3D with glassmorphism → VALIDATED

**Rejected alternatives:**
- Side panels (classic web UI) — explicitly rejected as "not representative of a 3D editor"
- Three.js with overlay HTML — rejected as "still looking like web app"
- Three.js interactive — mobile compatibility issues with CSS3DRenderer

**Feasibility note:** World-space UI with CSS3DRenderer showed pointer-events problems in HTML mockup. In Unity, the approach will be different (UI Toolkit or UGUI on world-space Canvas), so this specific problem won't apply.

---

### 5.6 — Data Import (US13-15)

**Thread:** Data Import
**Mode:** Fast (C) — Storm mockup direct, validated without modifications
**Mockup:** 4-tab interface (File Upload, Mapping Preview, Import Log, History)

**Decisions:**
- **US13 — Import formats:** Drag & drop zone, format selector (Excel .xlsx, JSON .json, CSV .csv). Downloadable Excel template. Recent imports visible in side panel.
- **US14 — Visual mapping:** Interactive mapping table: source columns → target node/link fields (Node.ID, Node.Label, Node.Type, Node.Position, Link.SourceRef, Link.Weight, Node.Metadata). Auto-detection with "auto" tags. Real-time color-coded validation: green (valid), yellow (warning — unresolved refs), red (error — type mismatch), blue (unmapped). Example: 8/12 mapped. Auto-detect All + Reset Mapping buttons.
- **US15 — Validation system:** Import Log with timestamped entries (success/warning/error/info). Animated progress bar with cancel option. Final summary: successful imports, warnings, errors, duration. Clear error messages (e.g., "duplicate node_id", "3 unresolved refs", "type coerced from string to boolean").
- **Import history:** Past imports with status badges (success green, partial yellow, failed red). Metadata: filename, row count, nodes/links created, duration, date.
- **Design:** Dark dev-tool theme (#0a0e17), 4 tabs, 3D perspective panel, hover animations/transitions.

**Feasibility:** RAS — standard Excel/JSON/CSV import, visual mapping doable with classic parsing libs (SheetJS for Excel, native for JSON/CSV). JSON Schema validation in Unity = straightforward.

---

### 5.7 — Voice Pipeline (US16-21, US24, US32, US37-38, US49)

**Thread:** Voice Pipeline
**Mode:** Fast (batch) — Storm mockup direct as part of final 6 sections
**Mockup:** 2-view interface (Provider Settings, Live Status)

**Decisions:**
- **3 independent columns:** STT / LLM / TTS, each with its own provider cards
- **Providers per layer:**
  - STT: Gabriela (cloud primary), Whisper (local fallback)
  - LLM: Gabriela (cloud primary), Groq/n8n (cloud secondary), local (Unity AI Inference)
  - TTS: Gabriela (cloud primary), local fallback
- **Fallback chain visualization** — automatic switching when primary is down
- **Speech-to-Speech Mochi toggle** — alternative to the STT→LLM→TTS pipeline
- **Live Status view:** Active provider per layer, latency metrics, animated waveform, pipeline flow diagram
- **Settings menu:** Choose each layer independently (US20)
- **Interface abstraction:** `ISTTProvider`, `ILLMProvider`, `ITTSProvider` (US17, US19, US24)
- **Platform-adaptive local LLM:** Light model (Phi/Gemma) on Quest, performant model on desktop, auto-selected by platform (US49)

**Feasibility:** Most complex section. 3 layers × multiple providers × auto-fallback + speech-to-speech = lots of integration. External APIs (Gabriela, Groq) can change without notice. Local LLM on Quest limited by RAM. **Recommendation: plan as later epic.**

---

### 5.8 — AI Entities (US22-23, US25, US33-35)

**Thread:** AI Entities
**Mode:** Fast (batch) — Storm mockup direct
**Mockup:** 2-view interface (Incarnation Modes, Smart Objects)

**Decisions:**
- **3 incarnation modes** (US22):
  - 🧑 Avatar RPM — Ready Player Me avatar with lip-sync + animations
  - 🔮 Abstract Orb — floating, reactive orb
  - 👻 No Avatar — voice-only, invisible
- **Mode-adapted interactions** (US23) — each mode has its own interaction methods and platform specs
- **IAIEntity interface** (US25) — per-incarnation mode interface
- **Smart Objects panel** (US33-35):
  - List of scene objects with exposed properties
  - Unity properties (mass, transform, collider) auto-detected
  - Custom designer key/value pairs (no coding required)
  - AI context view: what the AI "sees" — accessible Smart Object properties in real-time

---

### 5.9 — KPI & Causal Chain (US26-28)

**Thread:** KPI & Causal Chain
**Mode:** Fast (batch) — Storm mockup direct
**Mockup:** Interactive graph (DAG) with generation toolbar

**Decisions:**
- **Interactive graph (DAG)** — clickable nodes (root/KPI/cause/effect), zoom/pan (US26)
- **Generation toolbar** — text prompt + Generate KPI / Generate Causal Chain buttons
- **Node detail panel** — edit label, value, target, view connections (US27)
- **Inject to PodDef button** — inject generated graph directly into PodDefinition (US28)
- **Before/After comparison** — generated state vs edited state with diff indicators

---

### 5.10 — PodDef ↔ PodGab Integration (US29-31)

**Thread:** PodDef ↔ PodGab Integration
**Mode:** Fast (batch) — Storm mockup direct
**Mockup:** 3-view interface (Voice → Graph, Command Log, Graph Analysis)

**Decisions:**
- **Voice → Graph panel** (US29): Split view — PodGab chat (left) + PodDef graph responding live (right), event bus visualization
- **Command Log** (US29-30): Voice → action mapping with statuses (executed, failed, clarification needed)
- **Graph Analysis** (US30): AI commentary on current graph — structure analysis, issues detected, suggestions, statistics
- **Event system** (US31): Decoupled via event bus — no more `#if POD_RESEARCH` preprocessor directive. Integration always active and testable.

---

### 5.11 — Environments & MR (US43-45)

**Thread:** Environments & MR
**Mode:** Fast (batch) — Storm mockup direct
**Mockup:** Mode switcher with live viewport + settings

**Decisions:**
- **Mode switcher:** Desktop 3D / Quest VR / Quest MR — with live viewport switching
- **Desktop (US43):** Classic 3D viewport with grid floor, floating graph nodes, free camera
- **VR (US45):** Immersive space environment with stars, customizable environments (Office/Space/Forest/Abstract)
- **MR (US44):** Passthrough with spatial anchor indicators, virtual objects anchored to real surfaces
- **Settings:** Environment picker, lighting presets, audio toggle, MR-specific controls

**Feasibility:** MR passthrough is platform-specific (Quest 3+). Spatial anchors require careful testing. **Recommendation: plan as later epic.**

---

### 5.12 — Multiplayer (US46-48)

**Thread:** Multiplayer
**Mode:** Fast (batch) — Storm mockup direct
**Mockup:** 3-view interface (Lobby, Session, Permissions)

**Decisions:**
- **Lobby (US46-48):** Room list with participant counts, mode badges (Colocated/Remote/Mixed), join/create room
- **Session:** Connected users with platform badges (Quest/Desktop), voice indicators, hand tracking, latency. Auto-detection panel (colocation via network + spatial anchors). Spatial anchor sync status.
- **Permissions:** Host controls grid — per-user toggles for edit/delete/import/voice/view
- **Two multiplayer scenarios:**
  - US46: Colocation (same physical room, MR mode, see real hands/positions)
  - US47: Remote user joins via avatar (Quest or desktop)
  - US48: Same network system, auto-detection of mode

**Feasibility:** Multiplayer sync (especially colocation with spatial anchors) is technically complex. **Recommendation: plan as later epic.**

---

## 6. Edge Cases (US50-65)

Added during validation phase. Anthony chose to include ALL edge cases as user stories:

### Graph Core
- **US50:** Empty state — onboarding message when graph has 0 nodes
- **US51:** Massive graph (500+ nodes) — performance optimization + LOD/culling
- **US52:** Orphan link — auto-detection + warning with option to remove or reconnect

### Save/Load
- **US53:** Corrupted save — graceful error with recovery option (last known good state)
- **US54:** Version mismatch — migration system for saves from older versions
- **US55:** Concurrent edit conflict — detection and merge/override choice

### Voice Pipeline
- **US56:** All providers down — graceful degradation with user notification
- **US57:** Mid-sentence provider switch — seamless transition without losing context
- **US58:** High latency detection — automatic switch to lower-quality but faster provider

### AI Entities
- **US59:** Avatar loading failure — fallback to Orb mode with notification
- **US60:** Smart Object property conflict — priority rules when Unity auto-detected and custom properties overlap

### Data Import
- **US61:** Partial import failure — import what succeeded, report what failed, offer retry
- **US62:** Duplicate detection — flag duplicate nodes/links on import with merge/skip/replace options

### Multiplayer
- **US63:** Player disconnect mid-edit — lock their changes, notify others, offer unlock after timeout
- **US64:** Platform mismatch — Quest user in MR, desktop user in 3D, same session works
- **US65:** Host migration — if host disconnects, seamless transfer to another participant

---

## 7. Cross-Section Dependencies & Impacts

| From | To | Impact |
|------|-----|--------|
| Cleanup & Foundation (US39-42) | ALL sections | Must complete first — namespace migration affects every file |
| Input Abstraction (US10-12) | Canvas UI (US7-9) | UI interactions must go through IInputProvider |
| Graph Core (US1-3) | Canvas UI, Save/Load, Data Import | Core data model shared |
| PodDef ↔ PodGab (US29-31) | Graph Core, Voice Pipeline | Depends on both being functional |
| Environments & MR (US43-45) | Multiplayer (US46-48) | MR colocation depends on environment mode |
| Voice Pipeline (US16-21) | AI Entities (US22-25) | TTS provider feeds avatar lip-sync |

---

## 8. Technical Feasibility Assessment

### No Risk
- Save/Load, Canvas UI, Data Import, Cleanup & Foundation, Input Abstraction, Graph Core
- KPI & Causal Chain, PodDef ↔ PodGab Integration, AI Entities

### Moderate Risk (plan as later epics)
- **Voice Pipeline** — 3 layers × multiple providers × auto-fallback + speech-to-speech = complex integration
- **Environments & MR** — MR passthrough is Quest-specific, spatial anchors need careful testing
- **Multiplayer sync** — Colocation with spatial anchor synchronization is technically non-trivial

**Recommendation (validated by Anthony):** Keep all features in scope but plan the 3 at-risk zones as **last epics** — core project works even if they take longer.

---

## 9. Open Questions / Deferred Decisions

- **Auth system:** Deferred — Gabriela is migrating its authentication. Will design new auth when the new system is stable.
- **LLM model selection:** "We'll see which model works" — no firm commitment on specific Phi/Gemma model for Quest.
- **ColorYourReality future:** Removed from refacto scope. May be revisited as a separate project later.

---

## 10. Final Statistics

| Metric | Value |
|--------|-------|
| Total User Stories | 65 (49 original + 16 edge cases) |
| Sections | 12 |
| Mockups Validated | 12 (all sections) |
| PodDefinition US | 15 |
| PodGab US | 23 |
| Transversal US | 11 + 16 edge cases |
| Removed | ColorYourReality, Auth multi-provider |
| MCP Constraints | Unity MCP (dev), Meta XR SDK MCP (docs) |
| Platform Priority | Desktop 3D first → VR/Quest second |
| Test Coverage Target | 80%+ |

---

*Compiled by Claude Code — 2026-03-03*
