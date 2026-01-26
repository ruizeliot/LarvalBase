/**
 * High-Level Visualization Tools
 *
 * MCP tools for generating complete diagram visualizations on the canvas.
 * These tools compose the low-level element builders and layout algorithms
 * to produce cohesive visual artifacts.
 *
 * Unlike the basic canvas tools (create_shape, etc.), these tools understand
 * diagram semantics and produce properly laid-out multi-element visualizations.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { CanvasState } from "../index.js";
import {
  createRectangleSkeleton,
  createEllipseSkeleton,
  createArrowSkeleton,
  ExcalidrawElementSkeleton,
} from "../elements/excalidraw.js";
import {
  layoutTree,
  buildTreeFromBranches,
  PositionedNode,
  NodeConnection,
} from "../layouts/tree.js";

// =============================================================================
// Tool Registration
// =============================================================================

/**
 * Register all visualization tools
 */
export function registerVisualizationTools(): Tool[] {
  return [
    {
      name: "create_mindmap",
      description:
        "Create a mind map visualization on the canvas with a central topic and branching ideas. " +
        "The mind map will be automatically laid out with the central topic in the middle and " +
        "branches radiating outward.",
      inputSchema: {
        type: "object" as const,
        properties: {
          centralTopic: {
            type: "string",
            description: "The central concept of the mind map",
          },
          branches: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: {
                  type: "string",
                  description: "Label for this branch",
                },
                children: {
                  type: "array",
                  items: { type: "string" },
                  description: "Sub-branches (leaf nodes)",
                },
              },
              required: ["label"],
            },
            description:
              "First-level branches with optional sub-branches (children)",
          },
          style: {
            type: "object",
            properties: {
              centerColor: {
                type: "string",
                description:
                  "Background color for central topic (e.g., '#d0bfff')",
              },
              branchColor: {
                type: "string",
                description:
                  "Background color for branch nodes (e.g., '#a5d8ff')",
              },
              leafColor: {
                type: "string",
                description:
                  "Background color for leaf nodes (e.g., '#b2f2bb')",
              },
            },
            description: "Optional color customization",
          },
        },
        required: ["centralTopic"],
      },
    },
  ];
}

// =============================================================================
// Tool Handler
// =============================================================================

/**
 * Handle visualization tool calls
 */
export async function handleVisualizationTool(
  name: string,
  args: Record<string, unknown>,
  _state: CanvasState,
  broadcast: (message: object) => void
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case "create_mindmap": {
        return handleCreateMindmap(args, broadcast);
      }

      default:
        return {
          content: [
            {
              type: "text" as const,
              text: `Unknown visualization tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// =============================================================================
// Mind Map Handler
// =============================================================================

interface MindmapArgs {
  centralTopic: string;
  branches?: Array<{
    label: string;
    children?: string[];
  }>;
  style?: {
    centerColor?: string;
    branchColor?: string;
    leafColor?: string;
  };
}

/**
 * Handle create_mindmap tool
 */
function handleCreateMindmap(
  args: Record<string, unknown>,
  broadcast: (message: object) => void
): { content: Array<{ type: "text"; text: string }>; isError?: boolean } {
  const input = args as unknown as MindmapArgs;

  // Validate required fields
  if (!input.centralTopic || typeof input.centralTopic !== "string") {
    return {
      content: [
        {
          type: "text" as const,
          text: "Error: centralTopic is required and must be a string",
        },
      ],
      isError: true,
    };
  }

  // Build tree structure
  const tree = buildTreeFromBranches(
    input.centralTopic,
    input.branches || []
  );

  // Calculate layout
  const layout = layoutTree(tree, {
    startX: 500,
    startY: 100,
    levelGap: 120,
    siblingGap: 40,
    nodeWidth: 160,
    nodeHeight: 60,
  });

  // Default colors
  const colors = {
    center: input.style?.centerColor || "#d0bfff", // Light purple
    branch: input.style?.branchColor || "#a5d8ff", // Light blue
    leaf: input.style?.leafColor || "#b2f2bb", // Light green
  };

  // Generate element skeletons
  const elements = generateMindmapElements(layout, colors);

  // Broadcast to all connected clients
  broadcast({
    type: "diagram_elements",
    diagramType: "mindmap",
    elements,
    action: "replace",
  });

  // Count nodes for response
  const nodeCount = layout.nodes.length;
  const connectionCount = layout.connections.length;

  return {
    content: [
      {
        type: "text" as const,
        text: `Created mind map "${input.centralTopic}" with ${nodeCount} nodes and ${connectionCount} connections`,
      },
    ],
  };
}

/**
 * Generate Excalidraw element skeletons from layout result
 */
function generateMindmapElements(
  layout: { nodes: PositionedNode[]; connections: NodeConnection[] },
  colors: { center: string; branch: string; leaf: string }
): ExcalidrawElementSkeleton[] {
  const elements: ExcalidrawElementSkeleton[] = [];

  // Find the root node (no parentId)
  const rootNode = layout.nodes.find((n) => !n.parentId);

  // Create node elements
  for (const node of layout.nodes) {
    const isRoot = !node.parentId;
    const isLeaf = !layout.connections.some((c) => c.fromId === node.id);

    // Determine color based on node type
    let backgroundColor: string;
    if (isRoot) {
      backgroundColor = colors.center;
    } else if (isLeaf) {
      backgroundColor = colors.leaf;
    } else {
      backgroundColor = colors.branch;
    }

    // Root node is an ellipse, others are rectangles
    if (isRoot) {
      elements.push(
        createEllipseSkeleton({
          id: node.id,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          label: node.label,
          backgroundColor,
          fillStyle: "solid",
        })
      );
    } else {
      elements.push(
        createRectangleSkeleton({
          id: node.id,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          label: node.label,
          backgroundColor,
          fillStyle: "solid",
          roundness: { type: 3 }, // Rounded corners
        })
      );
    }
  }

  // Create arrow elements for connections
  for (const conn of layout.connections) {
    const fromNode = layout.nodes.find((n) => n.id === conn.fromId);
    const toNode = layout.nodes.find((n) => n.id === conn.toId);

    if (!fromNode || !toNode) continue;

    // Calculate arrow start (bottom center of parent)
    const startX = fromNode.x + fromNode.width / 2;
    const startY = fromNode.y + fromNode.height;

    // Calculate arrow end (top center of child)
    const endX = toNode.x + toNode.width / 2;
    const endY = toNode.y;

    elements.push(
      createArrowSkeleton({
        id: `arrow-${conn.fromId}-${conn.toId}`,
        x: startX,
        y: startY,
        startX,
        startY,
        endX,
        endY,
        strokeColor: "#495057",
        strokeWidth: 2,
        startBinding: { elementId: conn.fromId },
        endBinding: { elementId: conn.toId },
      })
    );
  }

  return elements;
}
