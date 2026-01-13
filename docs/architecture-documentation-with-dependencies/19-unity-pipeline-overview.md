# Unity Pipeline Overview

**Created:** 2026-01-12
**Status:** Design Draft
**Stack:** Unity + Meta XR SDK

---

## Overview

The Unity pipeline is a specialized mode for developing **VR/AR/XR applications** using Unity and the Meta XR SDK. Unlike the desktop (Tauri) pipeline which produces standalone desktop apps, this pipeline targets Meta Quest devices.

### Stack Comparison

| Aspect | Desktop (Tauri) | Unity (Meta XR) |
|--------|-----------------|-----------------|
| **Framework** | Tauri v2 | Unity 6+ |
| **Backend** | Rust | C# |
| **Frontend** | React/TypeScript | Unity UI / UGUI / UI Toolkit |
| **Build Target** | Windows/Mac/Linux | Meta Quest (Android) |
| **Test Framework** | Jest + WebdriverIO | Unity Test Framework |
| **MCP Server** | N/A | unity-mcp + Meta MQDH MCP |
| **Package Manager** | npm + cargo | Unity Package Manager (UPM) |

---

## Architecture

### MCP Integration

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Claude Code   │────▶│   Unity MCP      │────▶│  Unity Editor   │
│   (Orchestrator)│     │   (CoplayDev)    │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                                               │
         │              ┌──────────────────┐             │
         └─────────────▶│   Meta MQDH MCP  │─────────────┘
                        │   (Docs + Debug) │
                        └──────────────────┘
```

### MCP Servers

| Server | Purpose | Tools Provided |
|--------|---------|----------------|
| **unity-mcp** | Editor control | GameObject management, scripts, prefabs, scenes, tests |
| **Meta MQDH MCP** | Documentation + debugging | XR SDK docs search, troubleshooting, 3D asset library |

---

## Phase Structure

### Phase 1: Brainstorm & User Stories (Interactive)

**Same as desktop pipeline**, but with XR-specific considerations:

- VR interaction patterns (gaze, hand tracking, controllers)
- Spatial UI design (world-space vs screen-space)
- Comfort considerations (locomotion, field of view)
- Meta Quest hardware constraints

**Output:** `docs/user-stories.md`, `docs/brainstorm-notes.md`

### Phase 2: Technical Specifications (Autonomous)

**Key differences from desktop:**

| Desktop | Unity |
|---------|-------|
| E2E test specs (WebdriverIO) | Unity Test Framework specs |
| npm packages | UPM packages |
| Tauri capabilities | Android permissions + XR capabilities |

**Required sections:**
- Meta XR SDK packages needed
- Interaction SDK components
- Passthrough/MR requirements
- Controller bindings
- Test specifications (EditMode + PlayMode)

**Output:** `docs/test-specs.md` (Unity Test Framework format)

### Phase 3: Bootstrap/Skeleton (Autonomous)

**Key differences from desktop:**

1. **Project Setup**
   - Create Unity project (or use template)
   - Import Meta XR SDK packages via UPM
   - Configure XR Plugin Management
   - Set up Android build settings

2. **Scene Structure**
   - Create main scene with XR rig
   - Set up OVRCameraRig or Meta XR Interaction SDK rig
   - Configure passthrough (if MR app)

3. **Test Setup**
   - Create EditMode test assembly
   - Create PlayMode test assembly
   - Write failing tests (RED state)

**Output:** Unity project with failing tests

### Phase 4: Implementation (Autonomous - Free Zone)

**Same structure as desktop (Fixed Start → Free Zone → Fixed End)**

Uses Unity MCP tools:
- `manage_gameobject` - Create/modify GameObjects
- `manage_script` - Write C# scripts
- `manage_prefabs` - Create prefabs
- `run_tests` - Execute Unity tests
- `read_console` - Check for errors

**Epic loop:** Implement until tests pass (max 20 iterations)

### Phase 5: Quality & Build (Autonomous)

**Key differences from desktop:**

1. **Build for Quest**
   - Android APK build
   - App signing
   - Manifest configuration

2. **Quality Checks**
   - Performance profiling (72/90 FPS target)
   - Memory usage validation
   - APK size check

3. **Deployment**
   - Install to Quest via ADB
   - Meta Quest Developer Hub integration

---

## Unity MCP Tools Reference

### Scene & GameObject Management

| Tool | Description |
|------|-------------|
| `manage_gameobject` | Create, modify, delete GameObjects |
| `manage_scene` | Load, save, create scenes |
| `execute_menu_item` | Run Unity menu commands |
| `manage_prefabs` | Create and instantiate prefabs |

### Script Management

| Tool | Description |
|------|-------------|
| `manage_script` | Read, write, edit C# scripts |
| `script_apply_edits` | Apply targeted edits to scripts |
| `manage_shader` | Create and modify shaders |

### Asset Management

| Tool | Description |
|------|-------------|
| `manage_asset` | Import, move, delete assets |
| `resource_tools` | Access Unity resources |

### Testing & Debugging

| Tool | Description |
|------|-------------|
| `run_tests` | Execute EditMode/PlayMode tests |
| `read_console` | Get Unity console logs |
| `manage_editor` | Control editor state (play/pause/stop) |

---

## Meta XR SDK Components

### Core Packages

| Package | Purpose |
|---------|---------|
| `com.meta.xr.sdk.core` | Core XR functionality |
| `com.meta.xr.sdk.interaction` | Hand tracking, controllers, interactables |
| `com.meta.xr.sdk.interaction.ovr` | OVR-specific interaction components |
| `com.meta.xr.sdk.platform` | Meta platform services |
| `com.meta.xr.sdk.audio` | Spatial audio |

### Common Components

| Component | Purpose |
|-----------|---------|
| `OVRCameraRig` | VR camera setup |
| `OVRManager` | XR settings and configuration |
| `OVRHand` | Hand tracking |
| `OVRControllerHelper` | Controller visualization |
| `OVRPassthroughLayer` | Mixed reality passthrough |
| `OVRGrabber` / `OVRGrabbable` | Basic grab interaction |

### Interaction SDK (Recommended)

| Component | Purpose |
|-----------|---------|
| `XRInteractionGroup` | Interaction management |
| `HandGrabInteractor` | Hand grab interactions |
| `PokeInteractor` | Poke/touch interactions |
| `RayInteractor` | Ray-based interactions |
| `Grabbable` | Makes objects grabbable |
| `PokeInteractable` | Makes UI pokeable |

---

## Test Framework

### Unity Test Framework Structure

```
Assets/
├── Tests/
│   ├── EditMode/
│   │   ├── EditModeTests.asmdef
│   │   └── ScriptTests.cs
│   └── PlayMode/
│       ├── PlayModeTests.asmdef
│       └── InteractionTests.cs
```

### Test Types

| Type | When to Use | Runs In |
|------|-------------|---------|
| **EditMode** | Script logic, data validation | Editor (no Play) |
| **PlayMode** | Runtime behavior, interactions | Play mode |

### Example Test Structure

```csharp
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

public class GrabInteractionTests
{
    [UnityTest]
    public IEnumerator ObjectCanBeGrabbed()
    {
        // Arrange
        var grabbable = CreateGrabbableObject();
        var hand = CreateHandInteractor();

        // Act
        hand.AttemptGrab(grabbable);
        yield return new WaitForSeconds(0.1f);

        // Assert
        Assert.IsTrue(grabbable.IsGrabbed);
    }
}
```

---

## Differences from Desktop Pipeline

### What's Different

| Aspect | Desktop | Unity |
|--------|---------|-------|
| **Build command** | `npm run tauri build` | Unity Build Pipeline |
| **Test runner** | `npm test` / `wdio` | Unity Test Runner |
| **Hot reload** | Tauri dev server | Unity domain reload |
| **Debugging** | Browser DevTools | Unity Console + MQDH |
| **Package install** | `npm install` / `cargo add` | UPM Add Package |

### What's the Same

- Phase structure (1-5)
- Brainstorm process
- User story format
- Test-driven approach (RED → GREEN)
- Review loops with Haiku
- Progress tracking via manifest
- Todo-based orchestration

---

## File Structure

### Unity Project

```
<project>/
├── Assets/
│   ├── Scripts/
│   │   └── *.cs
│   ├── Prefabs/
│   │   └── *.prefab
│   ├── Scenes/
│   │   └── *.unity
│   ├── Tests/
│   │   ├── EditMode/
│   │   └── PlayMode/
│   └── Resources/
├── Packages/
│   └── manifest.json
├── ProjectSettings/
│   └── *.asset
├── docs/
│   ├── brainstorm-notes.md
│   ├── user-stories.md
│   └── test-specs.md
└── .pipeline/
    └── manifest.json
```

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Unity | 6.0+ (2023.3+) | Game engine |
| Unity Hub | Latest | Project management |
| Meta XR SDK | Latest | XR functionality |
| Meta Quest Developer Hub | 6.2.1+ | Debugging + MCP |
| Android SDK | API 32+ | Quest builds |
| Python | 3.10+ | Unity MCP server |
| uv | Latest | Python package manager |

### MCP Servers

| Server | Installation |
|--------|--------------|
| unity-mcp | `uv run --directory <path> server.py` |
| Meta MQDH MCP | Built into MQDH 6.2.1+ |

---

## Implementation Status

| Component | Status |
|-----------|--------|
| Unity MCP configuration | ✅ Fixed |
| Meta MQDH MCP | ❌ Needs MQDH installation |
| Phase commands (1-5) | ❌ Not created |
| Worker base rules | ❌ Not created |
| Test framework templates | ❌ Not created |

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-12 | Initial design draft |
