# Pod Definition Desktop v7 - Comprehensive Brainstorm Notes

## Step 1: Deep Understanding of pod-def-research

**Source of Truth:** `C:\Users\ahunt\Documents\IMT Claude\pod-def-research`

---

## 1. THE SIX NODE TYPES

### Sphere Nodes (KPI Layer)

| Type | Color | Scale | Size | Purpose |
|------|-------|-------|------|---------|
| **Elementary** | Blue-cyan gradient | 0.75 | 75px | Base metric with targets + composer formula |
| **Complex** | Red #FF0000 | 1.0 | 100px | Composite KPI aggregating others |
| **Potentiality** | Magenta #FF00FF | 0.5 | 50px | Future state/scenario outcome |

### Diamond Nodes (Causal Layer)

| Type | Color | Scale | Size | Purpose |
|------|-------|-------|------|---------|
| **Component** | Gold #D4A017 | 0.75 | 75px | Supply chain entity |
| **Potential** | Blue #0000FF | 0.5 | 50px | Possible state/capability |
| **Sensitivity** | Green #00AA00 | 0.3 | 30px | Sensitivity analysis point (NO LABEL) |

### Node Properties

**Elementary Node (Most Complex):**
```typescript
{
  id, type: 'elementary', label, description, position,
  data: {
    targets: [
      { name: string, value: number, tn: number, tnPlus1: number,
        overrides: [{ value, tn, tnPlus1 }] }
    ],
    composer: [
      { prefix: 'min'|'max'|'sum'|'avrg', parameter: string, operator?: '+'|'-'|'*'|'/' }
    ]
  }
}
```

**Other Nodes:** Only label + description (no special properties)

**Sensitivity Exception:** Has NO label field - only description

---

## 2. THE SIX EDGE TYPES

| Type | Color | Animation | Properties | Valid Connections |
|------|-------|-----------|------------|-------------------|
| **Coefficient** | Gray #888 | None (solid) | value (0-1) | Complex→Complex, Complex→Elementary |
| **ExistenceCondition** | Green #00AA00 | Dotted animated | conditions[] | Component→Potential |
| **Affectation** | Blue #0088FF | Dotted animated | (none) | Potential→Sensitivity |
| **SensitivityCondition** | Magenta #FF00FF | Dotted animated | conditions[] | Sensitivity→Component |
| **Generation** | Orange #FFAA00 | Dotted animated | (none) | Sensitivity→Potentiality |
| **Actuality** | Yellow #FFFF00 | Dotted static | conditions[] | Potentiality→Component |

### Condition Structure (for condition edges)
```typescript
{
  parameter: string,
  operator: '<' | '<=' | '>' | '>=' | '=' | '!=',
  value: string,
  logicOperator?: 'AND' | 'OR'  // connects to next condition
}
```

---

## 3. CONNECTION RULES (STRICT)

```
Source          → Target         = Edge Type (auto-assigned)
─────────────────────────────────────────────────────────────
Complex         → Complex        = Coefficient
Complex         → Elementary     = Coefficient
Component       → Potential      = ExistenceCondition
Potential       → Sensitivity    = Affectation
Sensitivity     → Component      = SensitivityCondition
Sensitivity     → Potentiality   = Generation
Potentiality    → Component      = Actuality
```

**All other combinations are INVALID.**

---

## 4. VISUAL RENDERING

### Node Shapes
- **Spheres:** `border-radius: 50%` (circles)
- **Diamonds:** `rotate(45deg)` on squares, text counter-rotated -45deg

### Selection Effects
- Border: 2px #2563eb (blue)
- Box shadow: `0 0 0 3px #2563eb40, 0 4px 12px rgba(0,0,0,0.3)`
- Scale: 1.05x enlargement

### Edge Gradients
- Calculated from source→target node colors
- Angle based on edge direction: `Math.atan2(targetY - sourceY, targetX - sourceX)`
- SVG `<linearGradient>` with unique ID per edge

### Dotted Animation
- Pattern: `strokeDasharray: '8 4'` (8px dash, 4px gap)
- SVG `<animate>` element shifts dashOffset 0 → -12 over 0.5s
- Repeats infinitely

---

## 5. PROPERTY PANEL

### Node Editors by Type

| Node Type | Label Editor | Special Editors |
|-----------|--------------|-----------------|
| Elementary | Text input | TargetEditor, ComposerFieldEditor |
| Complex | Text input | None |
| Component | ComboBox (with component suggestions) | None |
| Potential | Text input | None |
| Sensitivity | **NONE** | None |
| Potentiality | Text input | None |

### Edge Editors by Type

| Edge Type | Properties |
|-----------|------------|
| Coefficient | Slider + Number (0-1 range) |
| ExistenceCondition | ConditionFieldEditor (with AND/OR) |
| Affectation | Read-only |
| SensitivityCondition | ConditionFieldEditor (with AND/OR) |
| Generation | Read-only |
| Actuality | ConditionFieldEditor (without AND/OR) |

### ComposerFieldEditor
- Builds formulas like: `sum Fsweden.capacity + max Atlanta.capacity`
- Each field has: prefix dropdown + parameter (with autocomplete) + operator
- Parameters come from imported Unity data

### ConditionFieldEditor
- Builds conditions like: `supplier_status = active AND delivery_time <= 5`
- Each condition has: parameter + operator (<, <=, >, >=, =, !=) + value
- Logic operators (AND/OR) connect multiple conditions

### TargetEditor
- Array of targets with expandable overrides
- Each target: name, value, tn, tnPlus1
- Each override: value, tn, tnPlus1 (no name)

---

## 6. UNITY DATA IMPORT

### Format
```json
{
  "components": [{ "id": "uuid", "name": "A-Atlanta", "role": "Maker", "parameters": {} }],
  "relations": [{ "id": "uuid", "type": "order", "source": "uuid", "target": "uuid", "parameters": { "product_id": "uuid" } }]
}
```

### Generated Parameters
Relations generate parameters in format: `"ComponentName.relationType (ProductName)"`
Example: `"A-Atlanta.order (eSkate)"`

### Usage
- Component node labels: dropdown with component names
- ComposerFieldEditor: autocomplete with generated parameters
- ConditionFieldEditor: autocomplete with generated parameters

### Sample Data
"Rich Kids" e-skateboard supply chain: 25 components, 50+ relations

---

## 7. STATE MANAGEMENT

### Zustand Stores

| Store | Purpose | Persistence |
|-------|---------|-------------|
| graphStore | Nodes, edges, selection, metadata | Manual (localStorage) |
| userStore | Authentication, session | Zustand persist |
| unityDataStore | Imported components/parameters | Memory only |
| presenceStore | Active users, connection status | Memory only |
| lockStore | Soft locks (who's editing what) | Memory only |

### Undo/Redo History
- Action-based journaling (not state snapshots)
- Actions: ADD_NODE, DELETE_NODE, UPDATE_NODE, ADD_EDGE, DELETE_EDGE, UPDATE_EDGE, PASTE, CUT
- Each entry stores "before" and "after" states
- Max 100 entries

### Clipboard
- In-memory ref (not system clipboard)
- Copy includes nodes + connecting edges
- Paste remaps IDs, offsets position +50px

---

## 8. FILE FORMAT (v0.0.2)

```json
{
  "version": "0.0.2",
  "graphName": "Supply Chain Model",
  "graphDescription": "Optional description",
  "nodes": [...],
  "edges": [...],
  "metadata": {
    "created": "2025-12-15T10:30:00.000Z",
    "modified": "2025-12-15T14:45:23.000Z",
    "author": "John Smith"
  }
}
```

### Auto-Save
- Debounced: 2 seconds after last change
- Immediate on page unload (beforeunload event)
- localStorage key: `poddefinition_autosave`

### Migration
- v0.0.1/v1.0.0 → v0.0.2 automatic
- Adds targets[], composer[] to Elementary nodes
- Standardizes condition edges to conditions[]

---

## 9. MULTIPLAYER SYSTEM

### Room Management
- Create room: name, description, password (optional), max_users (default 10)
- 8-character invite codes
- Rooms auto-cleanup after 10 minutes empty

### WebSocket Events

**Graph Operations:**
- node-added / remote-node-added
- node-updated / remote-node-updated
- node-deleted / remote-node-deleted
- node-position-updated / remote-node-position-updated
- node-positions-batch / remote-node-positions-batch (batched for drag)
- edge-added / remote-edge-added
- edge-updated / remote-edge-updated
- edge-deleted / remote-edge-deleted

**Special:**
- unity-data-imported / remote-unity-data-imported
- physics-toggled / remote-physics-toggled
- graph-loaded / remote-graph-loaded

### Conflict Handling
- Currently: Last-Write-Wins (no explicit conflict resolution)
- Rate limiting: Token bucket (100 tokens, 50/second refill)

### Locks
- Soft locks (UI feedback only, not enforced)
- Shows "X is editing this" but doesn't prevent edits

### Presence
- 8-color palette for user avatars
- 60-second heartbeat
- Active users displayed in corner

---

## 10. KEYBOARD SHORTCUTS

| Shortcut | Action |
|----------|--------|
| Delete/Backspace | Delete selection |
| Ctrl+C | Copy nodes + connecting edges |
| Ctrl+V | Paste (new IDs, +50px offset) |
| Ctrl+X | Cut |
| Ctrl+A | Select all |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+S | Save |
| Ctrl+N | New graph |
| Ctrl+O | Open graph |
| Escape | Deselect all |

---

## 11. UI LAYOUT

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Logo | Graph Name | Save | Load | New | Import     │
├─────────────────────────────────────────────────────────────┤
│  Node Creation Bar: [Complex] [Elementary] [Component]      │
│                     [Potential] [Sensitivity] [Potentiality]│
├─────────────────────────────────────────────────────────────┤
│                           │                                 │
│                           │         Property Panel          │
│      Graph Canvas         │         (320-800px)             │
│      (React Flow)         │         - Label                 │
│      - Nodes              │         - Description           │
│      - Edges              │         - Type-specific         │
│      - Minimap            │           editors               │
│      - Controls           │                                 │
│                           │                                 │
├─────────────────────────────────────────────────────────────┤
│  Footer: Status | Node Count | Edge Count | Keyboard Hint   │
│  Active Users: [A] [B] [C]                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 12. TECHNICAL STACK (pod-def-research)

- **Frontend:** React 19, TypeScript, Vite
- **Graph:** React Flow (xyflow) 12
- **State:** Zustand
- **Backend:** Express, Socket.IO, SQLite
- **Styling:** Tailwind CSS
- **Testing:** Jest (unit), Cypress (E2E)

---

## 13. KNOWN ISSUES / TECHNICAL DEBT

### Large Files
- useGraphSync.ts (22KB) - needs splitting
- useKeyboardShortcuts.ts (19KB) - history mixed with keyboard

### Incomplete Features
- Multiplayer UI not fully integrated
- MCP server not wired to UI
- No PNG/SVG/PDF export
- Settings menu mostly stubs

### Performance Limits
- >500 nodes may slow down
- No virtualization for large graphs

---

## V7 DESKTOP SCOPE (CONFIRMED)

### Decision: FULL FEATURE PARITY

**Everything from pod-def-research is essential:**
- ✅ All 6 node types (Elementary, Complex, Potentiality, Component, Potential, Sensitivity)
- ✅ All 6 edge types with strict connection rules
- ✅ All property panel editors (Target, Composer, Condition)
- ✅ Unity data import with autocomplete
- ✅ Save/Load .poddef files (v0.0.2 format with migration)
- ✅ Undo/Redo (action-based journaling)
- ✅ All keyboard shortcuts
- ✅ Auto-save to localStorage
- ✅ Recent files list
- ✅ Multiplayer sync

### Key Change: P2P Instead of Server-Based

**REMOVED:**
- ❌ Login/authentication system
- ❌ User accounts (userStore)
- ❌ Central server with rooms
- ❌ Password-protected rooms
- ❌ Server-side SQLite database

**REPLACED WITH:**
- ✅ Peer-to-peer (P2P) multiplayer
- ✅ Direct WebRTC connections between peers
- ✅ One user "hosts" (becomes signaling point)
- ✅ Others join via invite code/IP
- ✅ No authentication required - just usernames

### P2P Architecture

```
┌─────────────┐         ┌─────────────┐
│   Host PC   │◄───────►│  Peer PC    │
│  (Tauri)    │  WebRTC │  (Tauri)    │
│             │         │             │
│ - Full graph│ sync    │ - Full graph│
│ - Signaling │◄───────►│ - Connect   │
└─────────────┘         └─────────────┘
       ▲                       ▲
       │      WebRTC           │
       └───────────────────────┘
              Peer PC 2
```

**Sync Events (same as original):**
- node-added, node-updated, node-deleted
- node-position-updated, node-positions-batch
- edge-added, edge-updated, edge-deleted
- unity-data-imported, graph-loaded

**Presence:**
- Username + color (8-color palette)
- Soft locks (UI feedback)
- Active users display

### Technical Stack (v7 Desktop)

| Layer | Technology |
|-------|------------|
| Framework | **Tauri 2.x** (Rust backend) |
| Frontend | React 18+, TypeScript, Vite |
| Graph | React Flow (xyflow) 12 |
| State | Zustand |
| P2P | **WebRTC** (via simple-peer or peerjs) |
| Styling | Tailwind CSS |
| Testing | Vitest (unit), WebdriverIO (E2E) |

### Stores (Simplified)

| Store | Purpose | Notes |
|-------|---------|-------|
| graphStore | Nodes, edges, selection, metadata | Same as original |
| ~~userStore~~ | ~~Authentication~~ | **REMOVED** |
| unityDataStore | Imported components/parameters | Same |
| presenceStore | Active users, connection status | P2P-adapted |
| lockStore | Soft locks | Same |
| roomStore | **NEW** P2P connection state | Host/join logic |

---

## UI LAYOUT (CONFIRMED)

Same as original web layout - classic three-panel:

```
┌──────────────────────────────────────────────────────────────────┐
│  Menu Bar: File | Edit | View | Graph | Multiplayer | Help       │
├──────────────────────────────────────────────────────────────────┤
│  Toolbar: [Complex][Elementary][Component][Potential]            │
│           [Sensitivity][Potentiality]  │ Import │ Host │ Join    │
├──────────────────────────────────────────────────────────────────┤
│                                    │                              │
│                                    │      Property Panel          │
│         Graph Canvas               │      (320px min)             │
│         (React Flow)               │      ─────────────           │
│         - 6 node types             │      Label: [____]           │
│         - 6 edge types             │      Description:            │
│         - Minimap                  │      [____________]          │
│         - Controls                 │      Type-specific:          │
│                                    │      [editors...]            │
│                                    │                              │
├──────────────────────────────────────────────────────────────────┤
│  Status │ Nodes: 12 │ Edges: 8 │ P2P: Connected (3 users)        │
│  Active Users: [Alice 🔵] [Bob 🟢] [Carol 🟡]                    │
└──────────────────────────────────────────────────────────────────┘
```

**Multiplayer UI Changes:**
- "Host Session" button → starts P2P host, shows invite code
- "Join Session" button → enter invite code/IP to connect
- No login/logout - just enter display name on first join
- Connection status in footer

---

## EPICS DEFINITION

### Epic 1: App Shell & Tauri Foundation
**Goal:** Basic desktop app structure with native integration

- Tauri 2.x project setup with React/Vite
- Window management (title, minimize, maximize, close)
- Native menu bar (File, Edit, View, Graph, Multiplayer, Help)
- Three-panel layout structure (toolbar, canvas, property panel)
- Status bar footer
- Basic Tailwind styling

**Deliverable:** Empty shell app with menus that launches and closes properly

---

### Epic 2: Graph Canvas
**Goal:** React Flow canvas with pan/zoom/minimap

- React Flow integration
- Infinite canvas with pan and zoom
- Minimap in corner
- Zoom controls
- Grid background (optional)
- Canvas click handling (deselect)

**Deliverable:** Empty interactive canvas ready for nodes

---

### Epic 3: Node System
**Goal:** All 6 node types with creation/selection/deletion

- 6 custom node components:
  - Elementary (blue-cyan sphere, 75px)
  - Complex (red sphere, 100px)
  - Potentiality (magenta sphere, 50px)
  - Component (gold diamond, 75px)
  - Potential (blue diamond, 50px)
  - Sensitivity (green diamond, 30px, NO LABEL)
- Node creation toolbar (6 buttons)
- Click-to-create on canvas
- Single and multi-selection
- Delete with Delete/Backspace key
- Node dragging with position updates
- Selection visual effects (border, shadow, scale)

**Deliverable:** Can create, select, move, and delete all 6 node types

---

### Epic 4: Edge System
**Goal:** All 6 edge types with auto-assignment and validation

- 6 custom edge components:
  - Coefficient (gray, solid, value 0-1)
  - ExistenceCondition (green, dotted animated, conditions[])
  - Affectation (blue, dotted animated, no props)
  - SensitivityCondition (magenta, dotted animated, conditions[])
  - Generation (orange, dotted animated, no props)
  - Actuality (yellow, dotted static, conditions[])
- Edge creation by dragging from node handle
- **Auto-assignment:** Edge type determined by source→target combination
- **Strict validation:** Invalid combinations rejected with feedback
- Gradient coloring (source→target colors)
- Animated dotted lines (SVG dashOffset animation)
- Edge selection and deletion

**Deliverable:** Can create valid edges between nodes, invalid connections blocked

---

### Epic 5: Property Panel
**Goal:** Full property editing for all node/edge types

- Collapsible property panel (right side, 320px min)
- **Node editors by type:**
  - All: Description textarea
  - Elementary: Label + TargetEditor + ComposerFieldEditor
  - Complex: Label only
  - Component: Label with combobox (suggestions from Unity data)
  - Potential: Label only
  - Sensitivity: NO label editor (description only)
  - Potentiality: Label only
- **Edge editors by type:**
  - Coefficient: Slider + number input (0-1)
  - ExistenceCondition: ConditionFieldEditor with AND/OR
  - Affectation: Read-only type display
  - SensitivityCondition: ConditionFieldEditor with AND/OR
  - Generation: Read-only type display
  - Actuality: ConditionFieldEditor (no AND/OR)
- **Special editors:**
  - TargetEditor: Array of targets with overrides
  - ComposerFieldEditor: prefix + parameter + operator formula builder
  - ConditionFieldEditor: parameter + operator + value + logic

**Deliverable:** Full property editing matching pod-def-research functionality

---

### Epic 6: File Management
**Goal:** Save/Load with native dialogs and recent files

- Save graph to .poddef file (Tauri native save dialog)
- Load graph from .poddef file (Tauri native open dialog)
- File format v0.0.2 with metadata
- Migration from v0.0.1/v1.0.0 on load
- New graph (with unsaved changes warning)
- Recent files list (stored in localStorage)
- Recent files in File menu
- Auto-save to localStorage (debounced 2s)
- Restore auto-save on app start
- Unsaved changes indicator in title bar

**Deliverable:** Complete file management with native feel

---

### Epic 7: Unity Data Import
**Goal:** Import supply chain data for autocomplete

- Import dialog (Tauri native open dialog, .json filter)
- Parse Unity JSON format:
  - components[]: id, name, role, parameters
  - relations[]: id, type, source, target, parameters
- Generate parameter strings: "ComponentName.relationType (ProductName)"
- Store in unityDataStore (Zustand)
- Wire to Component label combobox
- Wire to ComposerFieldEditor autocomplete
- Wire to ConditionFieldEditor autocomplete
- Sync imported data to peers (P2P)

**Deliverable:** Import JSON, see autocomplete suggestions in editors

---

### Epic 8: Edit Operations
**Goal:** Undo/redo, clipboard, keyboard shortcuts

- **Undo/Redo system:**
  - Action-based journaling (not snapshots)
  - Actions: ADD_NODE, DELETE_NODE, UPDATE_NODE, ADD_EDGE, DELETE_EDGE, UPDATE_EDGE, PASTE, CUT
  - Store before/after states
  - Max 100 history entries
- **Clipboard:**
  - Copy selected nodes + connecting edges
  - Paste with new IDs and +50px offset
  - Cut (copy + delete)
- **Keyboard shortcuts:**
  - Delete/Backspace: Delete selection
  - Ctrl+C: Copy
  - Ctrl+V: Paste
  - Ctrl+X: Cut
  - Ctrl+A: Select all
  - Ctrl+Z: Undo
  - Ctrl+Y: Redo
  - Ctrl+S: Save
  - Ctrl+N: New
  - Ctrl+O: Open
  - Escape: Deselect

**Deliverable:** Full edit operations with keyboard shortcuts

---

### Epic 9: P2P Multiplayer
**Goal:** Peer-to-peer collaboration without server

- **roomStore** for P2P state:
  - connectionStatus: disconnected | hosting | joining | connected
  - peers: Map of connected users
  - localUser: { id, name, color }
- **Host session:**
  - Start local WebSocket server (Tauri sidecar or WebRTC signaling)
  - Generate 8-character invite code
  - Display "Hosting on [code]" in UI
- **Join session:**
  - Enter invite code or IP:port
  - Connect via WebRTC
  - Receive full graph sync on connect
- **Real-time sync events:**
  - node-added, node-updated, node-deleted
  - node-position-updated, node-positions-batch
  - edge-added, edge-updated, edge-deleted
  - unity-data-imported, graph-loaded
- **Presence:**
  - 8-color palette for user avatars
  - Active users display in footer
  - 60-second heartbeat
- **Soft locks:**
  - "X is editing this" UI indicator
  - Not enforced (last-write-wins)
- **Local save:** Each user can save their own copy

**Deliverable:** Multiple users can collaborate on same graph in real-time

---

## EPIC DEPENDENCY GRAPH

```
Epic 1 (Shell) ──────────────────────────────────────────┐
     │                                                    │
     ▼                                                    │
Epic 2 (Canvas) ─────────────────────────────────────────┤
     │                                                    │
     ├──────────────┬───────────────┐                     │
     ▼              ▼               │                     │
Epic 3 (Nodes)  Epic 4 (Edges)      │                     │
     │              │               │                     │
     └──────┬───────┘               │                     │
            ▼                       ▼                     │
      Epic 5 (Props)          Epic 6 (Files)              │
            │                       │                     │
            ├───────────────────────┤                     │
            ▼                       │                     │
      Epic 7 (Import)               │                     │
            │                       │                     │
            └───────────────────────┤                     │
                                    ▼                     │
                              Epic 8 (Edit)               │
                                    │                     │
                                    ▼                     │
                              Epic 9 (P2P) ◄──────────────┘
```

**Order recommendation:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

---

*Checkpoint: Step 7 - Epics defined*
*Next: Verify epic independence, generate user stories*
