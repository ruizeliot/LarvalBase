# Pod Definition Desktop v7 - User Stories

**Generated:** 2025-12-15
**Source:** docs/brainstorm-notes.md
**Rule:** Each story = 1 E2E test

---

## Epic 1: App Shell & Tauri Foundation

### 1.1 App Launch
**As a** user
**I want** the app to launch and display the main window
**So that** I can start working on my pod definition graph

**Acceptance Criteria:**
- App window appears with title "Pod Definition"
- Window has minimize, maximize, close buttons
- Window is resizable

**E2E Test:** `should launch app with correct window title`

---

### 1.2 Menu Bar
**As a** user
**I want** a native menu bar with standard menus
**So that** I can access all app functions

**Acceptance Criteria:**
- Menu bar visible at top
- File menu with: New, Open, Save, Save As, Recent Files, Exit
- Edit menu with: Undo, Redo, Cut, Copy, Paste, Select All, Delete
- View menu with: Zoom In, Zoom Out, Reset Zoom, Toggle Minimap
- Graph menu with: Import Unity Data
- Multiplayer menu with: Host Session, Join Session, Disconnect
- Help menu with: About

**E2E Test:** `should display menu bar with all menus`

---

### 1.3 Three-Panel Layout
**As a** user
**I want** a three-panel layout (toolbar, canvas, property panel)
**So that** I have organized workspace for graph editing

**Acceptance Criteria:**
- Top toolbar visible
- Center canvas area takes majority of space
- Right property panel visible (320px min width)
- Status bar at bottom

**E2E Test:** `should display three-panel layout structure`

---

### 1.4 Status Bar
**As a** user
**I want** a status bar showing graph statistics
**So that** I can see node/edge counts at a glance

**Acceptance Criteria:**
- Status bar at bottom of window
- Shows "Nodes: X" count
- Shows "Edges: X" count
- Shows connection status area

**E2E Test:** `should display status bar with node and edge counts`

---

## Epic 2: Graph Canvas

### 2.1 Canvas Display
**As a** user
**I want** an infinite canvas for my graph
**So that** I have unlimited space for nodes and edges

**Acceptance Criteria:**
- Canvas fills center area
- Canvas has subtle grid background
- Canvas is interactive (not static)

**E2E Test:** `should display interactive canvas with grid`

---

### 2.2 Canvas Pan
**As a** user
**I want** to pan the canvas by dragging
**So that** I can navigate large graphs

**Acceptance Criteria:**
- Click and drag on empty canvas pans view
- Pan works smoothly without lag
- View position persists until changed

**E2E Test:** `should pan canvas on drag`

---

### 2.3 Canvas Zoom
**As a** user
**I want** to zoom in and out of the canvas
**So that** I can see details or overview

**Acceptance Criteria:**
- Mouse wheel zooms in/out
- Zoom controls visible in corner
- Zoom range: 25% to 200%
- Zoom centered on cursor position

**E2E Test:** `should zoom canvas with mouse wheel`

---

### 2.4 Minimap
**As a** user
**I want** a minimap showing the full graph
**So that** I can orient myself in large graphs

**Acceptance Criteria:**
- Minimap in bottom-left corner
- Shows all nodes as dots
- Current viewport highlighted
- Click on minimap navigates to that area

**E2E Test:** `should display minimap with viewport indicator`

---

### 2.5 Canvas Deselect
**As a** user
**I want** to click empty canvas to deselect all
**So that** I can clear my selection quickly

**Acceptance Criteria:**
- Click on empty canvas deselects all nodes and edges
- Property panel shows "Nothing selected"

**E2E Test:** `should deselect all on canvas click`

---

## Epic 3: Node System

### 3.1 Node Toolbar
**As a** user
**I want** a toolbar with 6 node type buttons
**So that** I can create different node types

**Acceptance Criteria:**
- Toolbar shows 6 buttons: Complex, Elementary, Component, Potential, Sensitivity, Potentiality
- Each button has distinct icon/color matching node type
- Buttons have tooltips with node type name

**E2E Test:** `should display node toolbar with 6 node types`

---

### 3.2 Create Complex Node
**As a** user
**I want** to create a Complex node (red sphere)
**So that** I can add composite KPI nodes to my graph

**Acceptance Criteria:**
- Click Complex button, then click canvas
- Red circular node appears at click position
- Node is 100px diameter
- Node shows default label "Complex"

**E2E Test:** `should create Complex node on canvas`

---

### 3.3 Create Elementary Node
**As a** user
**I want** to create an Elementary node (blue-cyan sphere)
**So that** I can add base metric nodes to my graph

**Acceptance Criteria:**
- Click Elementary button, then click canvas
- Blue-cyan gradient circular node appears
- Node is 75px diameter
- Node shows default label "Elementary"

**E2E Test:** `should create Elementary node on canvas`

---

### 3.4 Create Potentiality Node
**As a** user
**I want** to create a Potentiality node (magenta sphere)
**So that** I can add future state nodes to my graph

**Acceptance Criteria:**
- Click Potentiality button, then click canvas
- Magenta circular node appears
- Node is 50px diameter
- Node shows default label "Potentiality"

**E2E Test:** `should create Potentiality node on canvas`

---

### 3.5 Create Component Node
**As a** user
**I want** to create a Component node (gold diamond)
**So that** I can add supply chain entity nodes to my graph

**Acceptance Criteria:**
- Click Component button, then click canvas
- Gold diamond-shaped node appears
- Node is 75px (rotated square)
- Node shows default label "Component"

**E2E Test:** `should create Component node on canvas`

---

### 3.6 Create Potential Node
**As a** user
**I want** to create a Potential node (blue diamond)
**So that** I can add capability nodes to my graph

**Acceptance Criteria:**
- Click Potential button, then click canvas
- Blue diamond-shaped node appears
- Node is 50px (rotated square)
- Node shows default label "Potential"

**E2E Test:** `should create Potential node on canvas`

---

### 3.7 Create Sensitivity Node
**As a** user
**I want** to create a Sensitivity node (green diamond, no label)
**So that** I can add sensitivity analysis points to my graph

**Acceptance Criteria:**
- Click Sensitivity button, then click canvas
- Green diamond-shaped node appears
- Node is 30px (smallest)
- Node has NO visible label (only description in props)

**E2E Test:** `should create Sensitivity node without label`

---

### 3.8 Node Selection
**As a** user
**I want** to select a node by clicking it
**So that** I can edit its properties

**Acceptance Criteria:**
- Click on node selects it
- Selected node has blue border (2px #2563eb)
- Selected node has shadow glow
- Selected node scales to 1.05x
- Property panel shows node properties

**E2E Test:** `should select node on click with visual feedback`

---

### 3.9 Multi-Select Nodes
**As a** user
**I want** to select multiple nodes with Ctrl+Click
**So that** I can operate on groups

**Acceptance Criteria:**
- Ctrl+Click adds node to selection
- Multiple nodes show selection styling
- Property panel shows "X nodes selected"

**E2E Test:** `should multi-select nodes with Ctrl+Click`

---

### 3.10 Delete Node
**As a** user
**I want** to delete selected nodes with Delete key
**So that** I can remove unwanted nodes

**Acceptance Criteria:**
- Select node(s), press Delete or Backspace
- Node(s) removed from canvas
- Connected edges also removed
- Node count updates in status bar

**E2E Test:** `should delete selected nodes with Delete key`

---

### 3.11 Drag Node
**As a** user
**I want** to drag nodes to reposition them
**So that** I can arrange my graph layout

**Acceptance Criteria:**
- Click and drag node moves it
- Node position updates in real-time
- Position persists after release

**E2E Test:** `should drag node to new position`

---

## Epic 4: Edge System

### 4.1 Create Coefficient Edge
**As a** user
**I want** to connect Complex to Complex/Elementary
**So that** I can create Coefficient relationships

**Acceptance Criteria:**
- Drag from Complex node handle to Complex or Elementary
- Gray solid edge created automatically
- Edge type "Coefficient" assigned

**E2E Test:** `should create Coefficient edge from Complex to Elementary`

---

### 4.2 Create ExistenceCondition Edge
**As a** user
**I want** to connect Component to Potential
**So that** I can create ExistenceCondition relationships

**Acceptance Criteria:**
- Drag from Component to Potential
- Green dotted animated edge created
- Edge type "ExistenceCondition" assigned

**E2E Test:** `should create ExistenceCondition edge from Component to Potential`

---

### 4.3 Create Affectation Edge
**As a** user
**I want** to connect Potential to Sensitivity
**So that** I can create Affectation relationships

**Acceptance Criteria:**
- Drag from Potential to Sensitivity
- Blue dotted animated edge created
- Edge type "Affectation" assigned

**E2E Test:** `should create Affectation edge from Potential to Sensitivity`

---

### 4.4 Create SensitivityCondition Edge
**As a** user
**I want** to connect Sensitivity to Component
**So that** I can create SensitivityCondition relationships

**Acceptance Criteria:**
- Drag from Sensitivity to Component
- Magenta dotted animated edge created
- Edge type "SensitivityCondition" assigned

**E2E Test:** `should create SensitivityCondition edge from Sensitivity to Component`

---

### 4.5 Create Generation Edge
**As a** user
**I want** to connect Sensitivity to Potentiality
**So that** I can create Generation relationships

**Acceptance Criteria:**
- Drag from Sensitivity to Potentiality
- Orange dotted animated edge created
- Edge type "Generation" assigned

**E2E Test:** `should create Generation edge from Sensitivity to Potentiality`

---

### 4.6 Create Actuality Edge
**As a** user
**I want** to connect Potentiality to Component
**So that** I can create Actuality relationships

**Acceptance Criteria:**
- Drag from Potentiality to Component
- Yellow dotted static edge created
- Edge type "Actuality" assigned

**E2E Test:** `should create Actuality edge from Potentiality to Component`

---

### 4.7 Invalid Connection Rejected
**As a** user
**I want** invalid connections to be rejected
**So that** I maintain graph integrity

**Acceptance Criteria:**
- Attempt to connect invalid pair (e.g., Elementary to Complex)
- Connection rejected
- Visual feedback (red flash or tooltip)
- No edge created

**E2E Test:** `should reject invalid edge connection`

---

### 4.8 Edge Gradient Color
**As a** user
**I want** edges to show gradient from source to target color
**So that** I can visually trace connections

**Acceptance Criteria:**
- Edge color transitions from source node color to target node color
- Gradient direction follows edge path

**E2E Test:** `should display edge with gradient coloring`

---

### 4.9 Edge Animation
**As a** user
**I want** dotted edges to animate
**So that** I can see flow direction

**Acceptance Criteria:**
- Dotted edges (ExistenceCondition, Affectation, SensitivityCondition, Generation) animate
- Dash pattern moves along edge path
- Animation is smooth and continuous

**E2E Test:** `should animate dotted edge dash pattern`

---

### 4.10 Edge Selection
**As a** user
**I want** to select edges by clicking
**So that** I can edit their properties

**Acceptance Criteria:**
- Click on edge selects it
- Selected edge has visual highlight
- Property panel shows edge properties

**E2E Test:** `should select edge on click`

---

### 4.11 Delete Edge
**As a** user
**I want** to delete selected edges
**So that** I can remove unwanted connections

**Acceptance Criteria:**
- Select edge, press Delete
- Edge removed from canvas
- Edge count updates in status bar

**E2E Test:** `should delete selected edge with Delete key`

---

## Epic 5: Property Panel

### 5.1 Panel Display
**As a** user
**I want** the property panel on the right side
**So that** I can see and edit properties

**Acceptance Criteria:**
- Panel visible on right side
- Minimum width 320px
- Shows "Select a node or edge" when nothing selected

**E2E Test:** `should display property panel on right side`

---

### 5.2 Node Properties Header
**As a** user
**I want** to see node type and info in property panel
**So that** I know what I'm editing

**Acceptance Criteria:**
- Header shows node type icon and name
- Shows node ID (small, for reference)

**E2E Test:** `should show node type in property panel header`

---

### 5.3 Edit Node Label
**As a** user
**I want** to edit node labels in property panel
**So that** I can name my nodes

**Acceptance Criteria:**
- Text input for label (all nodes except Sensitivity)
- Changes update node on canvas in real-time
- Sensitivity nodes show no label field

**E2E Test:** `should edit node label in property panel`

---

### 5.4 Edit Node Description
**As a** user
**I want** to edit node descriptions
**So that** I can document nodes

**Acceptance Criteria:**
- Textarea for description (all nodes)
- Multi-line text supported

**E2E Test:** `should edit node description in property panel`

---

### 5.5 Elementary Target Editor
**As a** user
**I want** to edit targets for Elementary nodes
**So that** I can define metrics

**Acceptance Criteria:**
- TargetEditor visible for Elementary nodes only
- Can add/remove targets
- Each target has: name, value, tn, tnPlus1
- Can expand target to see/edit overrides
- Overrides have: value, tn, tnPlus1

**E2E Test:** `should edit Elementary node targets`

---

### 5.6 Elementary Composer Editor
**As a** user
**I want** to build composer formulas for Elementary nodes
**So that** I can define calculations

**Acceptance Criteria:**
- ComposerFieldEditor visible for Elementary nodes only
- Can add/remove formula fields
- Each field has: prefix dropdown (min/max/sum/avrg), parameter input, operator (+/-/*//)
- Formula preview shown

**E2E Test:** `should edit Elementary node composer formula`

---

### 5.7 Component Label Combobox
**As a** user
**I want** to select component names from Unity data
**So that** I can link to imported entities

**Acceptance Criteria:**
- Component node label is combobox, not text input
- Dropdown shows imported component names
- Can type to filter
- Can enter custom value if not in list

**E2E Test:** `should select Component label from combobox`

---

### 5.8 Coefficient Slider
**As a** user
**I want** to edit Coefficient edge value with slider
**So that** I can set weight (0-1)

**Acceptance Criteria:**
- Slider visible for Coefficient edges
- Range 0.0 to 1.0
- Number input for precise value
- Default value 1.0

**E2E Test:** `should edit Coefficient edge value with slider`

---

### 5.9 Condition Editor
**As a** user
**I want** to edit conditions for condition edges
**So that** I can define logical rules

**Acceptance Criteria:**
- ConditionFieldEditor for ExistenceCondition, SensitivityCondition, Actuality edges
- Can add/remove condition rows
- Each row has: parameter, operator (<, <=, >, >=, =, !=), value
- AND/OR connector between rows (except Actuality)

**E2E Test:** `should edit edge conditions with condition editor`

---

### 5.10 Read-Only Edge Display
**As a** user
**I want** read-only edges to show their type
**So that** I know what type they are

**Acceptance Criteria:**
- Affectation and Generation edges show type label
- No editable fields
- Shows source and target node names

**E2E Test:** `should display read-only edge properties`

---

## Epic 6: File Management

### 6.1 Save Graph
**As a** user
**I want** to save my graph to a .poddef file
**So that** I can persist my work

**Acceptance Criteria:**
- Ctrl+S or File > Save opens native save dialog
- Default extension .poddef
- File saved in v0.0.2 format
- Title bar shows filename after save

**E2E Test:** `should save graph to .poddef file`

---

### 6.2 Load Graph
**As a** user
**I want** to load a .poddef file
**So that** I can resume previous work

**Acceptance Criteria:**
- Ctrl+O or File > Open opens native open dialog
- Filter for .poddef files
- Graph loaded into canvas
- Title bar shows filename

**E2E Test:** `should load graph from .poddef file`

---

### 6.3 New Graph
**As a** user
**I want** to create a new empty graph
**So that** I can start fresh

**Acceptance Criteria:**
- Ctrl+N or File > New
- If unsaved changes, prompt to save first
- Canvas cleared
- Title shows "Untitled"

**E2E Test:** `should create new graph with unsaved changes warning`

---

### 6.4 Recent Files
**As a** user
**I want** to see and open recent files
**So that** I can quickly access past work

**Acceptance Criteria:**
- File > Recent Files shows last 10 files
- Click opens that file
- List persists across app restarts
- Missing files show as disabled

**E2E Test:** `should show recent files in File menu`

---

### 6.5 Auto-Save
**As a** user
**I want** my graph auto-saved periodically
**So that** I don't lose work on crash

**Acceptance Criteria:**
- Auto-save triggers 2 seconds after last change
- Saves to localStorage
- On app start, offer to restore if auto-save exists
- Clear auto-save after manual save

**E2E Test:** `should auto-save graph to localStorage`

---

### 6.6 Unsaved Changes Indicator
**As a** user
**I want** to see when I have unsaved changes
**So that** I know to save before closing

**Acceptance Criteria:**
- Title bar shows asterisk (*) when unsaved
- Asterisk clears after save

**E2E Test:** `should show asterisk in title for unsaved changes`

---

### 6.7 Migration on Load
**As a** user
**I want** old file formats to load correctly
**So that** my legacy files still work

**Acceptance Criteria:**
- v0.0.1 and v1.0.0 files auto-migrated
- Migration adds targets/composer to Elementary nodes
- Migration normalizes edge conditions

**E2E Test:** `should migrate v0.0.1 file to v0.0.2 on load`

---

## Epic 7: Unity Data Import

### 7.1 Import Dialog
**As a** user
**I want** to import Unity JSON data
**So that** I can use supply chain entities

**Acceptance Criteria:**
- Graph > Import Unity Data opens dialog
- Native file picker for .json
- Success message on import

**E2E Test:** `should open import dialog from menu`

---

### 7.2 Parse Unity Data
**As a** user
**I want** imported JSON parsed correctly
**So that** components and relations are available

**Acceptance Criteria:**
- Parse components[]: id, name, role, parameters
- Parse relations[]: id, type, source, target, parameters
- Generate parameter strings from relations
- Store in unityDataStore

**E2E Test:** `should parse Unity JSON data correctly`

---

### 7.3 Component Autocomplete
**As a** user
**I want** component names in dropdown
**So that** I can quickly select entities

**Acceptance Criteria:**
- After import, Component label combobox shows component names
- Names sorted alphabetically
- Shows role in parentheses

**E2E Test:** `should show imported components in combobox`

---

### 7.4 Parameter Autocomplete
**As a** user
**I want** parameter suggestions in formula editors
**So that** I can reference imported data

**Acceptance Criteria:**
- ComposerFieldEditor parameter field has autocomplete
- ConditionFieldEditor parameter field has autocomplete
- Shows "ComponentName.relationType (ProductName)" format

**E2E Test:** `should show imported parameters in autocomplete`

---

## Epic 8: Edit Operations

### 8.1 Undo
**As a** user
**I want** to undo my last action
**So that** I can fix mistakes

**Acceptance Criteria:**
- Ctrl+Z or Edit > Undo
- Reverts last action (add/delete/update node/edge)
- Works for up to 100 actions
- Undo disabled when nothing to undo

**E2E Test:** `should undo last action with Ctrl+Z`

---

### 8.2 Redo
**As a** user
**I want** to redo an undone action
**So that** I can restore changes

**Acceptance Criteria:**
- Ctrl+Y or Edit > Redo
- Re-applies undone action
- Redo disabled when nothing to redo
- Redo stack cleared on new action

**E2E Test:** `should redo undone action with Ctrl+Y`

---

### 8.3 Copy Nodes
**As a** user
**I want** to copy selected nodes
**So that** I can duplicate them

**Acceptance Criteria:**
- Ctrl+C copies selected nodes
- Also copies edges between selected nodes
- Stores in clipboard (memory, not system)

**E2E Test:** `should copy selected nodes to clipboard`

---

### 8.4 Paste Nodes
**As a** user
**I want** to paste copied nodes
**So that** I can create duplicates

**Acceptance Criteria:**
- Ctrl+V pastes from clipboard
- Pasted nodes get new IDs
- Position offset +50px from original
- Pasted nodes are selected

**E2E Test:** `should paste nodes with new IDs and offset`

---

### 8.5 Cut Nodes
**As a** user
**I want** to cut selected nodes
**So that** I can move them

**Acceptance Criteria:**
- Ctrl+X copies and deletes selected nodes
- Can paste after cut

**E2E Test:** `should cut selected nodes`

---

### 8.6 Select All
**As a** user
**I want** to select all nodes
**So that** I can operate on entire graph

**Acceptance Criteria:**
- Ctrl+A selects all nodes
- Property panel shows "X nodes selected"

**E2E Test:** `should select all nodes with Ctrl+A`

---

### 8.7 Escape Deselect
**As a** user
**I want** Escape to deselect all
**So that** I can quickly clear selection

**Acceptance Criteria:**
- Escape key deselects all nodes and edges
- Property panel shows "Nothing selected"

**E2E Test:** `should deselect all with Escape key`

---

## Epic 9: P2P Multiplayer

### 9.1 Host Session
**As a** user
**I want** to host a P2P session
**So that** others can join my graph

**Acceptance Criteria:**
- Multiplayer > Host Session
- Prompts for display name
- Starts local signaling
- Shows invite code (8 characters)
- Status bar shows "Hosting"

**E2E Test:** `should start P2P host session with invite code`

---

### 9.2 Join Session
**As a** user
**I want** to join an existing session
**So that** I can collaborate on a graph

**Acceptance Criteria:**
- Multiplayer > Join Session
- Prompts for invite code and display name
- Connects to host
- Receives full graph sync
- Status bar shows "Connected"

**E2E Test:** `should join P2P session with invite code`

---

### 9.3 User Presence
**As a** user
**I want** to see who else is connected
**So that** I know my collaborators

**Acceptance Criteria:**
- Footer shows colored circles for each user
- Hover shows username
- 8-color palette for differentiation
- Updates when users join/leave

**E2E Test:** `should show connected users in footer`

---

### 9.4 Sync Node Creation
**As a** user
**I want** new nodes to sync to peers
**So that** we see the same graph

**Acceptance Criteria:**
- Create node locally
- Node appears on all connected peers
- Position and properties match

**E2E Test:** `should sync node creation to peers`

---

### 9.5 Sync Node Updates
**As a** user
**I want** node changes to sync to peers
**So that** edits are shared

**Acceptance Criteria:**
- Edit node properties
- Changes appear on peers
- Includes label, description, targets, composer

**E2E Test:** `should sync node updates to peers`

---

### 9.6 Sync Node Position
**As a** user
**I want** node drags to sync to peers
**So that** layout changes are shared

**Acceptance Criteria:**
- Drag node
- Position updates on peers in real-time
- Batched for performance during drag

**E2E Test:** `should sync node position to peers`

---

### 9.7 Sync Node Deletion
**As a** user
**I want** deleted nodes to sync to peers
**So that** removals are shared

**Acceptance Criteria:**
- Delete node locally
- Node removed on all peers
- Connected edges also removed

**E2E Test:** `should sync node deletion to peers`

---

### 9.8 Sync Edge Operations
**As a** user
**I want** edge changes to sync to peers
**So that** connections are shared

**Acceptance Criteria:**
- Create/update/delete edges syncs to peers
- Includes all edge properties

**E2E Test:** `should sync edge operations to peers`

---

### 9.9 Sync Unity Import
**As a** user
**I want** imported Unity data to sync to peers
**So that** autocomplete is shared

**Acceptance Criteria:**
- Import Unity JSON
- Data syncs to all peers
- Autocomplete updated for everyone

**E2E Test:** `should sync Unity data import to peers`

---

### 9.10 Sync Graph Load
**As a** user
**I want** loaded graphs to sync to peers
**So that** everyone sees the same file

**Acceptance Criteria:**
- Load .poddef file
- Entire graph syncs to peers
- Replaces their current graph

**E2E Test:** `should sync graph load to peers`

---

### 9.11 Soft Locks
**As a** user
**I want** to see who is editing what
**So that** I avoid conflicts

**Acceptance Criteria:**
- When user selects node, others see indicator
- Shows "Alice is editing" near node
- Clears when user deselects
- Does not block editing (soft lock)

**E2E Test:** `should show soft lock indicator on peer selection`

---

### 9.12 Local Save in Session
**As a** user
**I want** to save my own copy during session
**So that** I can keep my version

**Acceptance Criteria:**
- Save works normally during P2P session
- Each user saves to their own file
- Does not affect other users

**E2E Test:** `should save local copy during P2P session`

---

### 9.13 Disconnect
**As a** user
**I want** to disconnect from session
**So that** I can work offline

**Acceptance Criteria:**
- Multiplayer > Disconnect
- Cleanly disconnects from peers
- Keeps local graph state
- Status bar shows "Disconnected"

**E2E Test:** `should disconnect from P2P session`

---

## Summary

| Epic | Stories | E2E Tests |
|------|---------|-----------|
| 1. App Shell | 4 | 4 |
| 2. Graph Canvas | 5 | 5 |
| 3. Node System | 11 | 11 |
| 4. Edge System | 11 | 11 |
| 5. Property Panel | 10 | 10 |
| 6. File Management | 7 | 7 |
| 7. Unity Data Import | 4 | 4 |
| 8. Edit Operations | 7 | 7 |
| 9. P2P Multiplayer | 13 | 13 |
| **Total** | **72** | **72** |

---

*Each user story maps to exactly one E2E test.*
*Ready for Phase 2: Test Specifications*
