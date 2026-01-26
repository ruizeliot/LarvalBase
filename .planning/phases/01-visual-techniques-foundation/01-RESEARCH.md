# Phase 1: Visual Techniques Foundation - Research

**Researched:** 2026-01-26
**Domain:** AI-driven visual brainstorming with real-time canvas updates
**Confidence:** HIGH

## Summary

This phase implements four core visual techniques (mind maps, matrices, affinity diagrams, flow diagrams) with real-time canvas updates. The existing `live-canvas-mcp` infrastructure provides a solid foundation with WebSocket-based communication, Excalidraw integration, and MCP tool registration already in place.

The primary challenge is **programmatic Excalidraw element generation** for each diagram type with proper layout algorithms. Excalidraw's `convertToExcalidrawElements` API (beta) provides a simplified skeleton format that significantly reduces element creation complexity. The existing codebase already converts server objects to Excalidraw elements, so this pattern extends naturally.

The user preferences system should use **Zustand with persist middleware** for localStorage persistence - this is the established React state management pattern for 2025-2026 and integrates well with the existing React viewer architecture.

**Primary recommendation:** Extend the existing MCP tools to add four high-level diagram generation tools (`create_mindmap`, `create_matrix`, `create_affinity_diagram`, `create_flow`), each producing Excalidraw element arrays via the skeleton API. Use a centralized layout module with algorithms for tree (mind maps), grid (matrices), cluster (affinity), and hierarchical (flows) layouts.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @excalidraw/excalidraw | ^0.17.0 | Canvas rendering | Already integrated, supports programmatic element creation |
| ws | ^8.16.0 | WebSocket server | Already integrated, handles real-time updates |
| @modelcontextprotocol/sdk | ^1.0.0 | MCP tools | Already integrated, tool registration pattern established |
| React | ^18.2.0 | UI framework | Already integrated in viewer |

### To Add
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | ^5.0.0 | User preferences state | Preferences system with localStorage persistence |
| mermaid | ^11.0.0 | Fallback diagram rendering | Already partial support via `render_mermaid` tool - useful for complex flows |

**Note:** The existing codebase already has Mermaid diagram support via `render_mermaid` tool. This can serve as fallback for complex flow diagrams.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom layout algorithms | dagre/elkjs | More sophisticated hierarchical layouts but adds dependency; custom is sufficient for initial scope |
| Zustand | React Context + localStorage | Context works but Zustand has better DevX for persistence and is the 2025 standard |
| Excalidraw | Fabric.js/Konva | Other canvas libraries exist but Excalidraw is already integrated and has good programmatic API |

**Installation:**
```bash
# Viewer additions
cd live-canvas-mcp/viewer
npm install zustand
```

## Architecture Patterns

### Recommended Project Structure
```
live-canvas-mcp/
├── src/
│   ├── tools/
│   │   ├── canvas.ts           # Existing low-level shape tools
│   │   ├── diagram.ts          # Existing Mermaid/ASCII tools
│   │   └── visualizations.ts   # NEW: High-level diagram generators
│   ├── layouts/                # NEW
│   │   ├── tree.ts            # Mind map layout (radial/tree)
│   │   ├── grid.ts            # Matrix layout (2x2 positioning)
│   │   ├── cluster.ts         # Affinity grouping layout
│   │   └── hierarchical.ts    # Flow diagram layout (DAG)
│   ├── elements/              # NEW
│   │   └── excalidraw.ts      # Excalidraw element skeleton builders
│   └── index.ts
└── viewer/
    └── src/
        ├── stores/            # NEW
        │   └── preferencesStore.ts  # Zustand store with persist
        └── components/
```

### Pattern 1: Excalidraw Element Skeleton Creation
**What:** Use `convertToExcalidrawElements` for simplified programmatic element generation
**When to use:** All diagram element creation
**Example:**
```typescript
// Source: https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/excalidraw-element-skeleton
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";

const skeletons = [
  {
    type: "rectangle",
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    backgroundColor: "#a5d8ff",
    label: { text: "Central Topic" }  // Auto-centers text
  },
  {
    type: "arrow",
    x: 300,
    y: 150,
    start: { type: "rectangle" },  // Bind to previous rectangle
    end: { type: "ellipse" },      // Bind to next element
  }
];

const elements = convertToExcalidrawElements(skeletons);
```

### Pattern 2: Tree Layout for Mind Maps
**What:** Recursive tree positioning with configurable branching
**When to use:** Mind map generation
**Example:**
```typescript
interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

function layoutTree(root: TreeNode, options: {
  startX: number;
  startY: number;
  levelGap: number;    // Vertical space between levels
  siblingGap: number;  // Horizontal space between siblings
}): LayoutResult {
  // Reingold-Tilford style algorithm
  // 1. Post-order: assign x positions bottom-up
  // 2. Pre-order: propagate shifts top-down
  // Returns array of positioned nodes with connections
}
```

### Pattern 3: Grid Layout for Matrices
**What:** Fixed 2x2 or NxM grid with labeled quadrants
**When to use:** Matrix/prioritization diagram generation
**Example:**
```typescript
interface MatrixCell {
  row: number;     // 0-indexed
  col: number;
  items: string[];
}

function layoutMatrix(
  cells: MatrixCell[],
  labels: { top: string[]; left: string[] },
  options: { cellWidth: number; cellHeight: number; gap: number }
): LayoutResult {
  // Fixed grid positioning
  // x = col * (cellWidth + gap)
  // y = row * (cellHeight + gap)
}
```

### Pattern 4: Cluster Layout for Affinity Diagrams
**What:** Group items into visually distinct clusters
**When to use:** Affinity diagram generation
**Example:**
```typescript
interface Cluster {
  id: string;
  label: string;
  items: string[];
}

function layoutClusters(
  clusters: Cluster[],
  options: {
    packingAlgorithm: 'grid' | 'circular';  // Start with grid
    clusterPadding: number;
    itemGap: number;
  }
): LayoutResult {
  // Simple grid packing of clusters
  // Items within cluster arranged in column
}
```

### Pattern 5: Hierarchical Layout for Flows
**What:** DAG layout with consistent flow direction
**When to use:** Flow diagram generation
**Example:**
```typescript
interface FlowNode {
  id: string;
  label: string;
  type: 'start' | 'end' | 'process' | 'decision';
}
interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}

function layoutFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  direction: 'TB' | 'LR'
): LayoutResult {
  // Topological sort for layer assignment
  // Position nodes within layers
  // Route edges with minimal crossings
}
```

### Pattern 6: Zustand Store with Persistence
**What:** User preferences stored in localStorage, hydrated on load
**When to use:** User preferences system
**Example:**
```typescript
// Source: https://github.com/pmndrs/zustand
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  proactivity: 'low' | 'medium' | 'high';  // How often AI draws
  animationSpeed: 'instant' | 'fast' | 'smooth';
  defaultComplexity: 'minimal' | 'moderate' | 'detailed';
  preferredDiagramStyle: 'clean' | 'hand-drawn';
  setProactivity: (level: 'low' | 'medium' | 'high') => void;
  // ... other setters
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      proactivity: 'medium',
      animationSpeed: 'fast',
      defaultComplexity: 'moderate',
      preferredDiagramStyle: 'hand-drawn',
      setProactivity: (level) => set({ proactivity: level }),
    }),
    { name: 'canvas-preferences' }  // localStorage key
  )
);
```

### Anti-Patterns to Avoid
- **Direct Excalidraw element construction:** Don't manually create full `ExcalidrawElement` objects with all 20+ properties. Use skeleton API.
- **Blocking WebSocket broadcasts:** Don't do synchronous heavy computation before broadcasting updates.
- **Stateful layout modules:** Layout functions should be pure - input data, output positions.
- **Hardcoded magic numbers:** All spacing, sizing values should come from configurable options.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Element ID generation | UUID generation | Excalidraw's built-in seed + `regenerateIds: true` | Excalidraw handles ID uniqueness and collision avoidance |
| Text wrapping in shapes | Manual text width calculation | Excalidraw's `label` property in skeletons | Auto-wraps and positions text within container |
| Arrow routing between shapes | Custom path calculation | Excalidraw's arrow binding (`start.id`, `end.id`) | Excalidraw handles connection points and routing |
| Complex flow layouts | Full DAG layout algorithm | Mermaid.js via existing `render_mermaid` | For complex flows, Mermaid already works; custom layout for simple cases |
| State persistence | Manual localStorage | Zustand persist middleware | Handles serialization, hydration, migrations |

**Key insight:** Excalidraw's skeleton API handles ~80% of the element construction complexity. Don't fight it - work with the skeleton format.

## Common Pitfalls

### Pitfall 1: Rapid updateScene Calls Causing Flicker
**What goes wrong:** Multiple sequential `updateScene()` calls within one frame cause visual flicker and potential state inconsistency.
**Why it happens:** Each call triggers a re-render; batching is not automatic.
**How to avoid:** Batch all element updates into a single `updateScene()` call per logical operation. Collect all elements, then update once.
**Warning signs:** Visual flicker when diagrams appear; "jumping" elements.

### Pitfall 2: Element IDs Not Persisting Across Updates
**What goes wrong:** Updating a diagram regenerates element IDs, causing Excalidraw to treat them as new elements instead of updates.
**Why it happens:** Default `regenerateIds: true` in `convertToExcalidrawElements`.
**How to avoid:** For updates, use `{ regenerateIds: false }` and maintain consistent IDs in your data model.
**Warning signs:** Elements duplicate instead of updating; undo history breaks.

### Pitfall 3: WebSocket Message Ordering
**What goes wrong:** Canvas updates arrive out of order, causing visual glitches.
**Why it happens:** Network latency variations; multiple rapid updates.
**How to avoid:** Include sequence numbers in messages; client-side re-ordering buffer if needed.
**Warning signs:** Occasional "ghost" elements; diagrams that complete then regress.

### Pitfall 4: Layout Algorithm Performance
**What goes wrong:** Diagram generation takes >100ms, causing noticeable lag.
**Why it happens:** O(n^2) or worse algorithms in layout calculation.
**How to avoid:** Keep initial implementation simple (grid-based); optimize only if measured performance issue. Most diagrams will have <50 nodes.
**Warning signs:** User-visible delay between request and diagram appearance.

### Pitfall 5: Preferences Not Syncing to Server
**What goes wrong:** AI doesn't respect user preferences because they're only stored client-side.
**Why it happens:** Zustand persist only affects browser; MCP server doesn't see it.
**How to avoid:** Send preferences with canvas state requests OR add a preferences sync endpoint. Include preferences in WebSocket messages when relevant.
**Warning signs:** AI behavior doesn't change despite preference updates.

### Pitfall 6: Hardcoded Diagram Sizing
**What goes wrong:** Diagrams look cramped or too spread out depending on content size.
**Why it happens:** Fixed spacing values don't adapt to data volume.
**How to avoid:** Make spacing proportional to content count; include min/max bounds.
**Warning signs:** 3-item diagram looks sparse; 20-item diagram is unreadable.

## Code Examples

### MCP Tool Definition for Mind Map
```typescript
// Source: Existing canvas.ts pattern in live-canvas-mcp/src/tools/
{
  name: "create_mindmap",
  description: "Create a mind map visualization on the canvas with a central topic and branches",
  inputSchema: {
    type: "object" as const,
    properties: {
      centralTopic: {
        type: "string",
        description: "The central concept of the mind map"
      },
      branches: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            children: {
              type: "array",
              items: { type: "string" }
            }
          }
        },
        description: "First-level branches with optional sub-branches"
      },
      style: {
        type: "object",
        properties: {
          layout: {
            type: "string",
            enum: ["radial", "tree-right", "tree-down"],
            description: "Layout direction"
          }
        }
      }
    },
    required: ["centralTopic"]
  }
}
```

### WebSocket Broadcast with Excalidraw Elements
```typescript
// Source: Existing broadcast pattern in live-canvas-mcp/src/server/websocket.ts
function broadcastDiagramUpdate(elements: ExcalidrawElement[], diagramId: string) {
  broadcast({
    type: "diagram_elements_update",
    fromAI: true,
    diagramId,
    elements,  // Full Excalidraw element array
    action: "replace"  // or "append" for progressive updates
  });
}
```

### Client-Side Element Application
```typescript
// Source: Existing pattern in WhiteboardPanel.tsx
// Handle diagram elements from AI
if (msg.type === 'diagram_elements_update' && msg.fromAI) {
  const newElements = msg.elements as ExcalidrawElement[];
  if (msg.action === 'replace') {
    // Replace all AI-generated elements
    const userElements = excalidrawApi.getSceneElements()
      .filter(el => !aiElementIds.has(el.id));
    excalidrawApi.updateScene({
      elements: [...userElements, ...newElements]
    });
    // Track new AI element IDs
    aiElementIds = new Set(newElements.map(el => el.id));
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual ExcalidrawElement construction | `convertToExcalidrawElements` skeleton API | Excalidraw 0.15+ (2024) | 80% less boilerplate |
| `commitToHistory` parameter | `captureUpdate` with `CaptureUpdateAction` enum | Excalidraw 0.18.0 (March 2025) | Different undo/redo behavior |
| UMD bundle | ESM only | Excalidraw 2025 | Better tree-shaking |
| React Context for preferences | Zustand + persist | 2024-2025 adoption | Simpler persistence, better DevX |

**Deprecated/outdated:**
- `excalidrawRef`: Removed in v0.17.0, use `excalidrawAPI` prop callback instead (viewer already does this correctly)
- `commitToHistory: boolean`: Replaced with `captureUpdate: CaptureUpdateActionType` in v0.18.0

## Open Questions

1. **Progressive drawing animation**
   - What we know: CONTEXT.md says AI has discretion on animation style
   - What's unclear: Best technique for smooth progressive reveal (element-by-element vs property animation)
   - Recommendation: Start with batch updates; animation is enhancement for later

2. **Semantic trigger detection**
   - What we know: Triggers should be semantic, not keyword-based (per CONTEXT.md)
   - What's unclear: How AI determines "this is a good moment for a mind map"
   - Recommendation: This is AI prompt engineering, not code architecture - document trigger patterns in system prompt

3. **Diagram complexity bounds**
   - What we know: AI has discretion on complexity
   - What's unclear: What's the practical limit before layouts break down
   - Recommendation: Implement with configurable max nodes; test with 5, 10, 20, 50 items

## Sources

### Primary (HIGH confidence)
- [Excalidraw Element Skeleton API](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/excalidraw-element-skeleton) - programmatic element creation
- [Excalidraw API Methods](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api) - updateScene, getSceneElements
- [Excalidraw v0.18.0 Release](https://github.com/excalidraw/excalidraw/releases/tag/v0.18.0) - CaptureUpdateAction changes
- [Zustand GitHub](https://github.com/pmndrs/zustand) - persist middleware documentation
- Existing `live-canvas-mcp` codebase - architecture patterns

### Secondary (MEDIUM confidence)
- [Mermaid Mindmap Syntax](https://mermaid.js.org/syntax/mindmap.html) - reference for mindmap structure
- [Mermaid Flowchart Syntax](https://mermaid.js.org/syntax/flowchart.html) - reference for flow diagram structure
- [D3 Tree Layout](https://d3js.org/d3-hierarchy/tree) - Reingold-Tilford algorithm reference
- [WebSocket Architecture Best Practices (Ably)](https://ably.com/topic/websocket-architecture-best-practices) - batching and synchronization patterns

### Tertiary (LOW confidence)
- Various DEV.to and Medium articles on Zustand patterns (verified against official docs)
- AI data visualization trends articles (general principles, not specific implementations)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing codebase confirms stack, Excalidraw docs verified
- Architecture: HIGH - patterns directly from existing code and official documentation
- Pitfalls: MEDIUM - some from official docs, some from general WebSocket/canvas experience
- Layout algorithms: MEDIUM - standard algorithms but implementation details are estimations

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (30 days - stable technologies)
