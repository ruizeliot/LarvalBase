/**
 * Hierarchical Layout Algorithm for Flow Diagrams
 *
 * A DAG-based layout algorithm that positions nodes in levels (layers).
 * Designed for flow diagrams with start/end nodes, process steps, and decisions.
 *
 * This is a pure function module - no side effects, no state.
 * Input: flow nodes and edges
 * Output: positioned nodes and edges with connection points
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Input flow node structure
 */
export interface FlowNode {
  id: string;
  label: string;
  type: 'start' | 'end' | 'process' | 'decision';
}

/**
 * Input flow edge structure
 */
export interface FlowEdge {
  from: string;
  to: string;
  label?: string;  // e.g., "Yes", "No" for decision branches
}

/**
 * Node with calculated position and size
 */
export interface PositionedFlowNode {
  id: string;
  label: string;
  type: FlowNode['type'];
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Edge with calculated start/end points
 */
export interface PositionedFlowEdge {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  // Start/end points calculated from node positions
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/**
 * Complete layout result
 */
export interface FlowLayoutResult {
  nodes: PositionedFlowNode[];
  edges: PositionedFlowEdge[];
  bounds: { width: number; height: number };
}

/**
 * Layout configuration options
 */
export interface FlowLayoutOptions {
  /** X coordinate of layout start. Default: 400 */
  startX?: number;
  /** Y coordinate of layout start. Default: 50 */
  startY?: number;
  /** Flow direction: TB (top-to-bottom) or LR (left-to-right). Default: 'TB' */
  direction?: 'TB' | 'LR';
  /** Gap between levels. Default: 100 */
  levelGap?: number;
  /** Gap between nodes at same level. Default: 60 */
  nodeGap?: number;
  /** Default node width. Default: 140 */
  nodeWidth?: number;
  /** Default node height. Default: 60 */
  nodeHeight?: number;
}

// =============================================================================
// Internal Types
// =============================================================================

/**
 * Internal node with calculated level
 */
interface LayoutNode {
  id: string;
  label: string;
  type: FlowNode['type'];
  level: number;
  x: number;
  y: number;
}

// =============================================================================
// Layout Algorithm
// =============================================================================

/**
 * Calculate the layout for a flow diagram
 *
 * Algorithm (simplified topological layout):
 * 1. Find start nodes (no incoming edges)
 * 2. Assign levels using BFS from start nodes (level = longest path from any start)
 * 3. Group nodes by level
 * 4. Position nodes within each level, centered horizontally
 * 5. Calculate edge start/end points
 * 6. Return positioned nodes and edges
 *
 * @param nodes - The flow nodes
 * @param edges - The flow edges connecting nodes
 * @param options - Layout configuration
 * @returns Positioned nodes and edges with connection points
 *
 * @example
 * const result = layoutFlow(
 *   [
 *     { id: "start", label: "Begin", type: "start" },
 *     { id: "check", label: "Is Valid?", type: "decision" },
 *     { id: "process", label: "Process", type: "process" },
 *     { id: "end", label: "Done", type: "end" }
 *   ],
 *   [
 *     { from: "start", to: "check" },
 *     { from: "check", to: "process", label: "Yes" },
 *     { from: "check", to: "end", label: "No" },
 *     { from: "process", to: "end" }
 *   ]
 * );
 */
export function layoutFlow(
  nodes: FlowNode[],
  edges: FlowEdge[],
  options: FlowLayoutOptions = {}
): FlowLayoutResult {
  // Apply defaults
  const config = {
    startX: options.startX ?? 400,
    startY: options.startY ?? 50,
    direction: options.direction ?? 'TB',
    levelGap: options.levelGap ?? 100,
    nodeGap: options.nodeGap ?? 60,
    nodeWidth: options.nodeWidth ?? 140,
    nodeHeight: options.nodeHeight ?? 60,
  };

  // Handle empty input
  if (nodes.length === 0) {
    return { nodes: [], edges: [], bounds: { width: 0, height: 0 } };
  }

  // Build adjacency lists
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  for (const node of nodes) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }

  for (const edge of edges) {
    outgoing.get(edge.from)?.push(edge.to);
    incoming.get(edge.to)?.push(edge.from);
  }

  // Find start nodes (no incoming edges, or explicitly typed as 'start')
  const startNodes = nodes.filter(
    n => n.type === 'start' || (incoming.get(n.id)?.length ?? 0) === 0
  );

  // If no start nodes found, use the first node
  if (startNodes.length === 0) {
    startNodes.push(nodes[0]);
  }

  // Assign levels using BFS (longest path from any start)
  const levels = assignLevels(nodes, startNodes, outgoing);

  // Group nodes by level
  const levelGroups = new Map<number, LayoutNode[]>();
  let maxLevel = 0;

  for (const node of nodes) {
    const level = levels.get(node.id) ?? 0;
    maxLevel = Math.max(maxLevel, level);

    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }

    levelGroups.get(level)!.push({
      id: node.id,
      label: node.label,
      type: node.type,
      level,
      x: 0,
      y: 0,
    });
  }

  // Position nodes within each level
  const positionedNodes: PositionedFlowNode[] = [];

  for (let level = 0; level <= maxLevel; level++) {
    const nodesAtLevel = levelGroups.get(level) || [];
    const levelWidth = nodesAtLevel.length * config.nodeWidth +
                       (nodesAtLevel.length - 1) * config.nodeGap;

    // Calculate starting position for this level (centered)
    let currentX: number;
    let currentY: number;

    if (config.direction === 'TB') {
      currentX = config.startX - levelWidth / 2;
      currentY = config.startY + level * (config.nodeHeight + config.levelGap);
    } else {
      // Left-to-right
      currentX = config.startX + level * (config.nodeWidth + config.levelGap);
      currentY = config.startY - levelWidth / 2;
    }

    for (const node of nodesAtLevel) {
      // Adjust size for decision nodes (diamonds are typically taller)
      const nodeWidth = node.type === 'decision' ? config.nodeWidth : config.nodeWidth;
      const nodeHeight = node.type === 'decision' ? config.nodeHeight : config.nodeHeight;

      positionedNodes.push({
        id: node.id,
        label: node.label,
        type: node.type,
        x: config.direction === 'TB' ? currentX : currentX,
        y: config.direction === 'TB' ? currentY : currentX,
        width: nodeWidth,
        height: nodeHeight,
      });

      if (config.direction === 'TB') {
        currentX += config.nodeWidth + config.nodeGap;
      } else {
        currentY += config.nodeHeight + config.nodeGap;
      }
    }
  }

  // Fix the LR positioning bug - use currentY properly
  if (config.direction === 'LR') {
    // Reposition for LR mode
    const nodesById = new Map(positionedNodes.map(n => [n.id, n]));

    for (let level = 0; level <= maxLevel; level++) {
      const nodesAtLevel = levelGroups.get(level) || [];
      const levelHeight = nodesAtLevel.length * config.nodeHeight +
                         (nodesAtLevel.length - 1) * config.nodeGap;

      const levelX = config.startX + level * (config.nodeWidth + config.levelGap);
      let currentY = config.startY - levelHeight / 2;

      for (const node of nodesAtLevel) {
        const positioned = nodesById.get(node.id);
        if (positioned) {
          positioned.x = levelX;
          positioned.y = currentY;
          currentY += config.nodeHeight + config.nodeGap;
        }
      }
    }
  }

  // Create positioned edges with connection points
  const positionedEdges: PositionedFlowEdge[] = [];
  const nodeMap = new Map(positionedNodes.map(n => [n.id, n]));

  for (const edge of edges) {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);

    if (!fromNode || !toNode) continue;

    // Calculate connection points based on direction
    let startX: number, startY: number, endX: number, endY: number;

    if (config.direction === 'TB') {
      // Connect from bottom of source to top of target
      startX = fromNode.x + fromNode.width / 2;
      startY = fromNode.y + fromNode.height;
      endX = toNode.x + toNode.width / 2;
      endY = toNode.y;
    } else {
      // Connect from right of source to left of target
      startX = fromNode.x + fromNode.width;
      startY = fromNode.y + fromNode.height / 2;
      endX = toNode.x;
      endY = toNode.y + toNode.height / 2;
    }

    positionedEdges.push({
      id: `edge-${edge.from}-${edge.to}`,
      fromId: edge.from,
      toId: edge.to,
      label: edge.label,
      startX,
      startY,
      endX,
      endY,
    });
  }

  // Calculate bounds
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const node of positionedNodes) {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x + node.width);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y + node.height);
  }

  return {
    nodes: positionedNodes,
    edges: positionedEdges,
    bounds: {
      width: maxX - minX,
      height: maxY - minY,
    },
  };
}

/**
 * Assign levels to nodes using BFS (longest path from start nodes)
 */
function assignLevels(
  nodes: FlowNode[],
  startNodes: FlowNode[],
  outgoing: Map<string, string[]>
): Map<string, number> {
  const levels = new Map<string, number>();

  // Initialize all nodes to level 0
  for (const node of nodes) {
    levels.set(node.id, 0);
  }

  // BFS to assign levels (longest path wins)
  const queue = startNodes.map(n => n.id);
  const visited = new Set<string>();

  while (queue.length > 0) {
    const nodeId = queue.shift()!;

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const currentLevel = levels.get(nodeId) ?? 0;
    const children = outgoing.get(nodeId) ?? [];

    for (const childId of children) {
      // Use longest path (max level)
      const existingLevel = levels.get(childId) ?? 0;
      levels.set(childId, Math.max(existingLevel, currentLevel + 1));

      if (!visited.has(childId)) {
        queue.push(childId);
      }
    }
  }

  return levels;
}
