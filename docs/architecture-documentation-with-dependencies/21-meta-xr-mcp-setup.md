# Meta XR MCP Setup Guide

**Created:** 2026-01-12
**Status:** Pending Installation
**Server:** Meta Quest Developer Hub (MQDH) MCP

---

## Overview

Meta provides an official MCP server as part of the Meta Quest Developer Hub (MQDH). This enables AI assistants like Claude to:

- Search Meta XR SDK documentation
- Access debugging and troubleshooting tools
- Use Meta's 3D asset library
- Streamline XR development workflows

---

## Architecture

```
┌─────────────────┐     STDIO      ┌──────────────────┐     ┌─────────────────┐
│   Claude Code   │───────────────▶│   MQDH MCP       │────▶│  Meta Docs      │
│   (or Desktop)  │                │   Server         │     │  3D Assets      │
└─────────────────┘                └──────────────────┘     │  Debug Tools    │
                                          │                 └─────────────────┘
                                          │
                                          ▼
                                   ┌──────────────────┐
                                   │  Meta Quest      │
                                   │  Device (ADB)    │
                                   └──────────────────┘
```

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| **MQDH Version** | 6.2.1 or later |
| **Operating System** | Windows 10/11, macOS |
| **Meta Account** | Developer account required |
| **Quest Device** | Optional (for device debugging) |

---

## Installation

### Step 1: Download MQDH

1. Go to [Meta Quest Developer Hub Downloads](https://developers.meta.com/horizon/documentation/unity/ts-mqdh-download-tools/)
2. Download version 6.2.1 or later
3. Install the application

### Step 2: Enable MCP in MQDH

1. Open Meta Quest Developer Hub
2. Go to **Settings** (gear icon)
3. Select **AI Tools** tab
4. Enable **MCP Server**

### Step 3: Configure Claude

**One-Click Install (Recommended):**

MQDH provides one-click install links for:
- Cursor
- VS Code

Click the appropriate link in MQDH's AI Tools settings.

**Manual Configuration:**

The MCP server executable is located within MQDH's installation directory.

**Claude Desktop** (`%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "meta-xr": {
      "command": "<MQDH_INSTALL_PATH>/mcp-server.exe",
      "args": []
    }
  }
}
```

> **Note:** The exact path depends on where MQDH is installed. Check the AI Tools tab in MQDH for the correct path.

---

## Available Tools

### Documentation Access

| Tool | Description |
|------|-------------|
| `search_docs` | Search Meta XR SDK documentation |
| `get_api_reference` | Get API details for specific classes/methods |
| `get_sample_code` | Retrieve code samples |

### Debugging

| Tool | Description |
|------|-------------|
| `device_logs` | Get logs from connected Quest device |
| `performance_metrics` | CPU/GPU/memory usage |
| `troubleshoot` | AI-powered troubleshooting suggestions |

### 3D Asset Library

| Tool | Description |
|------|-------------|
| `search_assets` | Search Meta's 3D asset library |
| `download_asset` | Download assets to project |
| `preview_asset` | Get asset metadata and preview |

---

## Integration with Unity MCP

Both MCP servers can run simultaneously:

```json
{
  "mcpServers": {
    "unity": {
      "command": "uv",
      "args": ["run", "--directory", "C:\\Unity\\unity-mcp\\Server", "server.py"]
    },
    "meta-xr": {
      "command": "<MQDH_INSTALL_PATH>/mcp-server.exe",
      "args": []
    }
  }
}
```

**Use Cases:**

| Task | MCP Server |
|------|------------|
| Create GameObjects | unity |
| Write C# scripts | unity |
| Look up XR SDK docs | meta-xr |
| Debug Quest performance | meta-xr |
| Import 3D assets | meta-xr |
| Run Unity tests | unity |

---

## Alternative: Meta XR Unity MCP Extension

Meta also provides a separate **Unity-specific MCP extension** for scene manipulation:

- [Meta XR Unity MCP Extension Documentation](https://developers.meta.com/horizon/documentation/unity/unity-mcp-extension/)

This extension allows modifying Unity scenes via text prompts, specifically optimized for XR development.

### Features

- Scene object manipulation
- XR component configuration
- Interaction SDK setup
- Passthrough configuration

### Installation

1. Import via UPM from Meta's package registry
2. Configure in Unity project settings

---

## Meta XR SDK Quick Reference

### Core Packages

| Package | UPM Name | Purpose |
|---------|----------|---------|
| Core SDK | `com.meta.xr.sdk.core` | Basic XR functionality |
| Interaction SDK | `com.meta.xr.sdk.interaction` | Hand/controller interactions |
| Platform SDK | `com.meta.xr.sdk.platform` | Meta platform services |
| Audio SDK | `com.meta.xr.sdk.audio` | Spatial audio |

### Installation via UPM

Add Meta's scoped registry to `Packages/manifest.json`:

```json
{
  "scopedRegistries": [
    {
      "name": "Meta XR SDK",
      "url": "https://npm.developer.oculus.com/",
      "scopes": ["com.meta.xr"]
    }
  ],
  "dependencies": {
    "com.meta.xr.sdk.core": "69.0.0",
    "com.meta.xr.sdk.interaction": "69.0.0"
  }
}
```

---

## Troubleshooting

### MQDH Not Detecting Quest

1. Enable Developer Mode on Quest
2. Connect via USB and authorize
3. Check ADB connection: `adb devices`

### MCP Server Not Starting

1. Ensure MQDH version is 6.2.1+
2. Check AI Tools settings are enabled
3. Restart MQDH
4. Check Windows Firewall isn't blocking

### Claude Not Connecting

1. Verify path to MCP server executable
2. Check MQDH is running
3. Restart Claude Desktop/Code
4. Check logs for connection errors

---

## Current Status

| Component | Status |
|-----------|--------|
| MQDH Installation | ❌ Needs installation |
| MCP Server Configuration | ❌ Pending MQDH install |
| Unity Integration | ✅ Ready (unity-mcp working) |

### Action Required

1. Download and install MQDH 6.2.1+
2. Enable MCP in AI Tools settings
3. Update Claude config with correct path
4. Test connection

---

## Resources

- [Meta Quest Developer Hub](https://developers.meta.com/horizon/documentation/unity/ts-mqdh/)
- [Enable AI Tools with MCP](https://developers.meta.com/horizon/documentation/unity/ts-mqdh-mcp)
- [Meta XR Unity MCP Extension](https://developers.meta.com/horizon/documentation/unity/unity-mcp-extension/)
- [Meta XR SDK Documentation](https://developers.meta.com/horizon/documentation/unity/)

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-12 | Initial setup guide (pending installation) |
