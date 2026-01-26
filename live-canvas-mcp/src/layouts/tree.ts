/**
 * Tree Layout Algorithm for Mind Maps
 *
 * A simplified Reingold-Tilford style algorithm that positions nodes
 * in a tree structure without overlap. Designed for mind maps with
 * a central node and radiating branches.
 *
 * This is a pure function module - no side effects, no state.
 * Input: tree data structure
 * Output: positioned nodes with connection information
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Input tree node structure
 */
export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
}

/**
 * Node with calculated position and size
 */
export interface PositionedNode {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parentId?: string;
}

/**
 * Connection between two nodes
 */
export interface NodeConnection {
  fromId: string;
  toId: string;
}

/**
 * Complete layout result
 */
export interface LayoutResult {
  nodes: PositionedNode[];
  connections: NodeConnection[];
}

/**
 * Layout configuration options
 */
export interface LayoutOptions {
  /** X coordinate of root node center. Default: 400 */
  startX?: number;
  /** Y coordinate of root node center. Default: 300 */
  startY?: number;
  /** Vertical gap between levels. Default: 120 */
  levelGap?: number;
  /** Horizontal gap between siblings. Default: 40 */
  siblingGap?: number;
  /** Default node width. Default: 160 */
  nodeWidth?: number;
  /** Default node height. Default: 60 */
  nodeHeight?: number;
}

// =============================================================================
// Internal Types
// =============================================================================

/**
 * Internal node with calculated subtree width
 */
interface LayoutNode {
  id: string;
  label: string;
  children: LayoutNode[];
  subtreeWidth: number;
  x: number;
  y: number;
  parentId?: string;
}

// =============================================================================
// Layout Algorithm
// =============================================================================

/**
 * Calculate the layout for a tree structure
 *
 * Algorithm (simplified Reingold-Tilford):
 * 1. Calculate subtree widths recursively (bottom-up)
 * 2. Position root at startX, startY
 * 3. Position children centered below parent, spaced by subtree widths
 * 4. Recurse for each child's subtree
 *
 * @param root - The root node of the tree
 * @param options - Layout configuration
 * @returns Positioned nodes and their connections
 *
 * @example
 * const tree: TreeNode = {
 *   id: "root",
 *   label: "Main Topic",
 *   children: [
 *     { id: "c1", label: "Branch 1", children: [
 *       { id: "c1a", label: "Leaf 1" },
 *       { id: "c1b", label: "Leaf 2" }
 *     ]},
 *     { id: "c2", label: "Branch 2" }
 *   ]
 * };
 *
 * const result = layoutTree(tree, { levelGap: 100 });
 * // result.nodes contains positioned nodes
 * // result.connections contains parent-child links
 */
export function layoutTree(
  root: TreeNode,
  options: LayoutOptions = {}
): LayoutResult {
  // Apply defaults
  const config = {
    startX: options.startX ?? 400,
    startY: options.startY ?? 100,
    levelGap: options.levelGap ?? 120,
    siblingGap: options.siblingGap ?? 40,
    nodeWidth: options.nodeWidth ?? 160,
    nodeHeight: options.nodeHeight ?? 60,
  };

  // Build internal tree with subtree widths
  const layoutRoot = buildLayoutTree(root, config);

  // Position nodes starting from root
  positionNode(layoutRoot, config.startX, config.startY, config);

  // Collect results
  const nodes: PositionedNode[] = [];
  const connections: NodeConnection[] = [];

  collectResults(layoutRoot, nodes, connections, config);

  return { nodes, connections };
}

/**
 * Build internal tree structure with calculated subtree widths
 */
function buildLayoutTree(
  node: TreeNode,
  config: { nodeWidth: number; siblingGap: number }
): LayoutNode {
  const children = (node.children || []).map((child) =>
    buildLayoutTree(child, config)
  );

  // Calculate subtree width
  let subtreeWidth: number;
  if (children.length === 0) {
    // Leaf node - width is just the node itself
    subtreeWidth = config.nodeWidth;
  } else {
    // Parent node - width is sum of children subtrees plus gaps
    subtreeWidth = children.reduce((sum, child) => sum + child.subtreeWidth, 0);
    subtreeWidth += (children.length - 1) * config.siblingGap;
    // Ensure parent is at least as wide as itself
    subtreeWidth = Math.max(subtreeWidth, config.nodeWidth);
  }

  return {
    id: node.id,
    label: node.label,
    children,
    subtreeWidth,
    x: 0,
    y: 0,
  };
}

/**
 * Position a node and its children recursively
 */
function positionNode(
  node: LayoutNode,
  centerX: number,
  topY: number,
  config: { levelGap: number; siblingGap: number; nodeWidth: number }
): void {
  // Position this node centered at centerX
  node.x = centerX - config.nodeWidth / 2;
  node.y = topY;

  if (node.children.length === 0) {
    return;
  }

  // Calculate starting X for first child
  // Children are distributed across the subtree width, centered under parent
  const totalChildrenWidth =
    node.children.reduce((sum, child) => sum + child.subtreeWidth, 0) +
    (node.children.length - 1) * config.siblingGap;

  let childX = centerX - totalChildrenWidth / 2;
  const childY = topY + config.levelGap;

  // Position each child
  for (const child of node.children) {
    child.parentId = node.id;

    // Child center is at the middle of its subtree width
    const childCenterX = childX + child.subtreeWidth / 2;

    positionNode(child, childCenterX, childY, config);

    // Move to next child position
    childX += child.subtreeWidth + config.siblingGap;
  }
}

/**
 * Collect positioned nodes and connections from the tree
 */
function collectResults(
  node: LayoutNode,
  nodes: PositionedNode[],
  connections: NodeConnection[],
  config: { nodeWidth: number; nodeHeight: number }
): void {
  // Add this node
  nodes.push({
    id: node.id,
    label: node.label,
    x: node.x,
    y: node.y,
    width: config.nodeWidth,
    height: config.nodeHeight,
    parentId: node.parentId,
  });

  // Add connections and recurse
  for (const child of node.children) {
    connections.push({
      fromId: node.id,
      toId: child.id,
    });
    collectResults(child, nodes, connections, config);
  }
}

/**
 * Utility: Convert flat branches array to tree structure
 *
 * This helper converts the MCP tool input format (centralTopic + branches)
 * to the TreeNode format expected by layoutTree.
 *
 * @example
 * const tree = buildTreeFromBranches("Main Topic", [
 *   { label: "Branch 1", children: ["Leaf A", "Leaf B"] },
 *   { label: "Branch 2" }
 * ]);
 */
export function buildTreeFromBranches(
  centralTopic: string,
  branches: Array<{ label: string; children?: string[] }>
): TreeNode {
  let idCounter = 0;

  const root: TreeNode = {
    id: `node-${idCounter++}`,
    label: centralTopic,
    children: branches.map((branch) => ({
      id: `node-${idCounter++}`,
      label: branch.label,
      children: (branch.children || []).map((childLabel) => ({
        id: `node-${idCounter++}`,
        label: childLabel,
      })),
    })),
  };

  return root;
}
