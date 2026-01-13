# Unity MCP Setup Guide

**Created:** 2026-01-12
**Status:** Active
**Server:** CoplayDev/unity-mcp v7.0.0

---

## Overview

The Unity MCP server bridges Claude Code with Unity Editor, enabling natural language control of game development tasks. This document covers installation, configuration, and troubleshooting.

---

## Architecture

```
┌─────────────────┐     STDIO      ┌──────────────────┐    WebSocket    ┌─────────────────┐
│   Claude Code   │───────────────▶│   Unity MCP      │◀───────────────▶│  Unity Editor   │
│   (or Desktop)  │                │   Server (uv)    │                 │  (Plugin)       │
└─────────────────┘                └──────────────────┘                 └─────────────────┘
```

**Components:**
1. **Claude Code** - Sends MCP tool calls via STDIO
2. **Unity MCP Server** - Python server translating MCP to Unity commands
3. **Unity Plugin** - Editor extension receiving WebSocket commands

---

## Prerequisites

### Required Software

| Software | Version | Check Command |
|----------|---------|---------------|
| Python | 3.10+ | `python --version` |
| uv | Latest | `uv --version` |
| Unity | 2021.3+ (6.0+ recommended) | Unity Hub |
| Git | Any | `git --version` |

### Install uv (if needed)

```bash
# Windows (PowerShell)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
```

---

## Installation

### Step 1: Clone the Repository

```bash
cd C:\Unity
git clone https://github.com/CoplayDev/unity-mcp.git
cd unity-mcp
```

### Step 2: Install Unity Package

In Unity Editor:

1. Open **Window > Package Manager**
2. Click **+** > **Add package from git URL...**
3. Enter: `https://github.com/CoplayDev/unity-mcp.git`
4. Click **Add**

**Alternative (manifest.json):**

Edit `Packages/manifest.json`:
```json
{
  "dependencies": {
    "com.coplay.unity-mcp": "https://github.com/CoplayDev/unity-mcp.git"
  }
}
```

### Step 3: Configure Claude Desktop/Code

**Claude Desktop** (`%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "unity": {
      "command": "C:\\Users\\ahunt\\.local\\bin\\uv.exe",
      "args": [
        "run",
        "--directory",
        "C:\\Unity\\unity-mcp\\Server",
        "server.py"
      ],
      "env": {
        "DISABLE_TELEMETRY": "true"
      }
    }
  }
}
```

**Claude Code** (`.claude/settings.json` in project):

```json
{
  "mcpServers": {
    "unity": {
      "command": "uv",
      "args": ["run", "--directory", "C:\\Unity\\unity-mcp\\Server", "server.py"],
      "env": {
        "DISABLE_TELEMETRY": "true"
      }
    }
  }
}
```

### Step 4: Start the Server

1. Open Unity Editor with your project
2. Go to **Tools > MCP Unity > Server Window**
3. Click **Start Server**
4. Verify "WebSocket server running on port 8090" appears

---

## Available Tools

### GameObject Management

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `manage_gameobject` | Create, modify, delete objects | "Create a cube at position (0, 1, 0)" |
| `select_gameobject` | Select objects in hierarchy | "Select the Main Camera" |
| `update_gameobject` | Change name, tag, layer, active | "Rename Player to MainPlayer" |

### Scene Management

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `manage_scene` | Load, save, create scenes | "Create a new scene called Level2" |
| `execute_menu_item` | Run Unity menu commands | "Execute File/Save" |

### Script Management

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `manage_script` | Read, write, edit C# scripts | "Create a PlayerController script" |
| `script_apply_edits` | Apply targeted code changes | "Add a Jump() method to PlayerController" |

### Prefab & Asset Management

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `manage_prefabs` | Create and modify prefabs | "Create a prefab from the Player object" |
| `manage_asset` | Import, move, delete assets | "Move enemy.png to Sprites folder" |
| `manage_shader` | Create and edit shaders | "Create a holographic shader" |

### Testing & Debugging

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `run_tests` | Execute Unity tests | "Run all EditMode tests" |
| `read_console` | Get console output | "Show me the last 20 console logs" |
| `manage_editor` | Control play/pause/stop | "Enter play mode" |

---

## Resources (Read-Only)

The MCP server also provides resources for querying Unity state:

| Resource URI | Description |
|--------------|-------------|
| `unity://menu-items` | List all available menu items |
| `unity://scenes-hierarchy` | Current scene structure |
| `unity://gameobject/{id}` | Detailed component info |
| `unity://packages` | Installed UPM packages |
| `unity://assets` | Asset database |
| `unity://tests/{testMode}` | Available tests |

---

## Configuration Options

### Server Window Settings

| Setting | Default | Description |
|---------|---------|-------------|
| **Port** | 8090 | WebSocket server port |
| **Timeout** | 10s | Connection timeout |
| **Allow Remote** | false | Bind to 0.0.0.0 for remote access |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DISABLE_TELEMETRY=true` | Opt out of usage analytics |
| `LOG_LEVEL=DEBUG` | Enable detailed logging |
| `UNITY_HOST=<ip>` | Override Unity host (for WSL2) |

---

## Troubleshooting

### Server Won't Start

**Symptom:** MCP server fails to start in Claude

**Solutions:**
1. Check `uv` is installed: `uv --version`
2. Verify path in config is correct
3. Check Python version: `python --version` (needs 3.10+)
4. Run manually to see errors:
   ```bash
   cd C:\Unity\unity-mcp\Server
   uv run server.py
   ```

### Unity Not Connecting

**Symptom:** Server running but Unity not responding

**Solutions:**
1. Open **Tools > MCP Unity > Server Window**
2. Click **Start Server** if not running
3. Check port isn't in use: `netstat -an | findstr 8090`
4. Send a console log to force reconnection

### Play Mode Disconnects

**Symptom:** Connection lost when entering Play mode

**Cause:** Unity domain reload resets the plugin

**Solution:** Disable domain reload:
1. Go to **Edit > Project Settings > Editor**
2. Find **Enter Play Mode Settings**
3. Uncheck **Reload Domain**

### WSL2 Networking Issues

**Symptom:** Node.js in WSL2 can't connect to Unity on Windows

**Solutions:**
1. Enable WSL2 mirrored networking
2. Or set `UNITY_HOST` environment variable to Windows IP:
   ```json
   "env": {
     "UNITY_HOST": "172.x.x.x"
   }
   ```

### Wrong Port

**Symptom:** Server running on different port than configured

**Solution:** Check Unity Server Window and update config to match port

---

## Testing the Connection

### Quick Test

1. Start Unity with Server Window open
2. In Claude, ask: "List all GameObjects in the current scene"
3. Should return hierarchy of objects

### Verification Commands

```
"What Unity version is running?"
"List installed packages"
"Show console logs"
"Select the Main Camera"
```

---

## Alternative Implementations

If CoplayDev/unity-mcp doesn't work, consider:

### CoderGamester/mcp-unity (Node.js)

```json
{
  "mcpServers": {
    "unity": {
      "command": "node",
      "args": ["C:\\path\\to\\mcp-unity\\Server~\\build\\index.js"]
    }
  }
}
```

Requires: Node.js 18+, different Unity package

### IvanMurzak/Unity-MCP (Binary)

```json
{
  "mcpServers": {
    "unity": {
      "command": "C:\\path\\to\\unity-mcp-server.exe",
      "args": ["port=8090", "client-transport=stdio"]
    }
  }
}
```

Features: Works in compiled games, 50+ tools

---

## Current Configuration

**Location:** `C:\Users\ahunt\AppData\Roaming\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "unity": {
      "command": "C:\\Users\\ahunt\\.local\\bin\\uv.exe",
      "args": [
        "run",
        "--directory",
        "C:\\Unity\\unity-mcp\\Server",
        "server.py"
      ],
      "env": {
        "DISABLE_TELEMETRY": "true"
      }
    }
  }
}
```

**Server Location:** `C:\Unity\unity-mcp\Server`
**Version:** 7.0.0

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-12 | Initial setup guide, fixed configuration |
