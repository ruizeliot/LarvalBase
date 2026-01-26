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
import {
  layoutFlow,
  FlowNode,
  FlowEdge,
  PositionedFlowNode,
  PositionedFlowEdge,
} from "../layouts/hierarchical.js";
import {
  layoutGrid,
  MatrixCell,
  PositionedMatrixElement,
  quadrantToRowCol,
} from "../layouts/grid.js";
import {
  layoutClusters,
  Cluster,
  PositionedClusterElement,
} from "../layouts/cluster.js";
import {
  createTextSkeleton,
} from "../elements/excalidraw.js";

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
    {
      name: "create_flow",
      description:
        "Create a flow diagram to visualize a process, journey, or decision tree. " +
        "Supports start/end nodes, process steps, and decision diamonds with Yes/No branches.",
      inputSchema: {
        type: "object" as const,
        properties: {
          title: {
            type: "string",
            description: "Optional title for the flow diagram",
          },
          nodes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "Unique node identifier",
                },
                label: {
                  type: "string",
                  description: "Node text",
                },
                type: {
                  type: "string",
                  enum: ["start", "end", "process", "decision"],
                  description: "Node type: start (begin), end (terminate), process (action), decision (branch)",
                },
              },
              required: ["id", "label", "type"],
            },
            description: "Flow diagram nodes",
          },
          edges: {
            type: "array",
            items: {
              type: "object",
              properties: {
                from: {
                  type: "string",
                  description: "Source node ID",
                },
                to: {
                  type: "string",
                  description: "Target node ID",
                },
                label: {
                  type: "string",
                  description: "Optional edge label (e.g., 'Yes', 'No' for decision branches)",
                },
              },
              required: ["from", "to"],
            },
            description: "Edges connecting nodes",
          },
          direction: {
            type: "string",
            enum: ["TB", "LR"],
            description: "Flow direction: TB (top-to-bottom) or LR (left-to-right). Default: TB",
          },
        },
        required: ["nodes", "edges"],
      },
    },
    {
      name: "create_matrix",
      description:
        "Create a 2x2 matrix for comparing options along two dimensions " +
        "(e.g., urgent/important, effort/impact). Items are placed in quadrants " +
        "based on their high/low values for each axis.",
      inputSchema: {
        type: "object" as const,
        properties: {
          title: {
            type: "string",
            description: "Optional title for the matrix",
          },
          xAxis: {
            type: "object",
            properties: {
              label: {
                type: "string",
                description: "X-axis label (e.g., 'Urgency')",
              },
              lowLabel: {
                type: "string",
                description: "Low end label (e.g., 'Low'). Default: 'Low'",
              },
              highLabel: {
                type: "string",
                description: "High end label (e.g., 'High'). Default: 'High'",
              },
            },
            required: ["label"],
          },
          yAxis: {
            type: "object",
            properties: {
              label: {
                type: "string",
                description: "Y-axis label (e.g., 'Importance')",
              },
              lowLabel: {
                type: "string",
                description: "Low end label. Default: 'Low'",
              },
              highLabel: {
                type: "string",
                description: "High end label. Default: 'High'",
              },
            },
            required: ["label"],
          },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                  description: "Item text/label",
                },
                quadrant: {
                  type: "string",
                  enum: ["high-high", "high-low", "low-high", "low-low"],
                  description:
                    "Which quadrant to place the item (format: yAxis-xAxis)",
                },
              },
              required: ["text", "quadrant"],
            },
            description: "Items to place in the matrix quadrants",
          },
        },
        required: ["xAxis", "yAxis"],
      },
    },
    {
      name: "create_affinity_diagram",
      description:
        "Create an affinity diagram to group related ideas into categories. " +
        "Each group is displayed as a labeled cluster containing its items.",
      inputSchema: {
        type: "object" as const,
        properties: {
          title: {
            type: "string",
            description: "Optional title for the diagram",
          },
          groups: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: {
                  type: "string",
                  description: "Group/category name",
                },
                items: {
                  type: "array",
                  items: { type: "string" },
                  description: "Items belonging to this group",
                },
              },
              required: ["label", "items"],
            },
            description: "Groups of related items",
          },
        },
        required: ["groups"],
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

      case "create_flow": {
        return handleCreateFlow(args, broadcast);
      }

      case "create_matrix": {
        return handleCreateMatrix(args, broadcast);
      }

      case "create_affinity_diagram": {
        return handleCreateAffinityDiagram(args, broadcast);
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

// =============================================================================
// Flow Diagram Handler
// =============================================================================

interface FlowArgs {
  title?: string;
  nodes: Array<{
    id: string;
    label: string;
    type: 'start' | 'end' | 'process' | 'decision';
  }>;
  edges: Array<{
    from: string;
    to: string;
    label?: string;
  }>;
  direction?: 'TB' | 'LR';
}

/**
 * Handle create_flow tool
 */
function handleCreateFlow(
  args: Record<string, unknown>,
  broadcast: (message: object) => void
): { content: Array<{ type: "text"; text: string }>; isError?: boolean } {
  const input = args as unknown as FlowArgs;

  // Validate required fields
  if (!input.nodes || !Array.isArray(input.nodes) || input.nodes.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Error: nodes array is required and must not be empty",
        },
      ],
      isError: true,
    };
  }

  if (!input.edges || !Array.isArray(input.edges)) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Error: edges array is required",
        },
      ],
      isError: true,
    };
  }

  // Convert to layout types
  const flowNodes: FlowNode[] = input.nodes.map(n => ({
    id: n.id,
    label: n.label,
    type: n.type,
  }));

  const flowEdges: FlowEdge[] = input.edges.map(e => ({
    from: e.from,
    to: e.to,
    label: e.label,
  }));

  // Calculate layout
  const layout = layoutFlow(flowNodes, flowEdges, {
    startX: 500,
    startY: 50,
    direction: input.direction || 'TB',
    levelGap: 100,
    nodeGap: 60,
    nodeWidth: 140,
    nodeHeight: 60,
  });

  // Generate element skeletons
  const elements = generateFlowElements(layout);

  // Broadcast to all connected clients
  broadcast({
    type: "diagram_elements",
    diagramType: "flow",
    elements,
    action: "replace",
  });

  // Build response message
  const title = input.title ? `"${input.title}"` : "flow diagram";
  const nodeCount = layout.nodes.length;
  const edgeCount = layout.edges.length;

  return {
    content: [
      {
        type: "text" as const,
        text: `Created ${title} with ${nodeCount} nodes and ${edgeCount} connections`,
      },
    ],
  };
}

/**
 * Generate Excalidraw element skeletons from flow layout result
 */
function generateFlowElements(
  layout: { nodes: PositionedFlowNode[]; edges: PositionedFlowEdge[] }
): ExcalidrawElementSkeleton[] {
  const elements: ExcalidrawElementSkeleton[] = [];

  // Node colors by type
  const nodeColors: Record<FlowNode['type'], string> = {
    start: '#b2f2bb',    // Light green
    end: '#ffc9c9',      // Light red
    process: '#a5d8ff',  // Light blue
    decision: '#ffec99', // Light yellow
  };

  // Create node elements
  for (const node of layout.nodes) {
    const backgroundColor = nodeColors[node.type];

    if (node.type === 'start' || node.type === 'end') {
      // Start/end nodes are ellipses (stadium shape)
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
    } else if (node.type === 'decision') {
      // Decision nodes are diamonds - use a rectangle with rotation
      // Note: We'll use a rectangle with a diamond-like aspect for now
      // A proper diamond would require a custom polygon or rotation
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
          // Diamond effect via smaller roundness
          roundness: { type: 2, value: 8 },
        })
      );
    } else {
      // Process nodes are rectangles
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

  // Create arrow elements for edges
  for (const edge of layout.edges) {
    elements.push(
      createArrowSkeleton({
        id: edge.id,
        x: edge.startX,
        y: edge.startY,
        startX: edge.startX,
        startY: edge.startY,
        endX: edge.endX,
        endY: edge.endY,
        strokeColor: "#495057",
        strokeWidth: 2,
        startBinding: { elementId: edge.fromId },
        endBinding: { elementId: edge.toId },
      })
    );

    // Add edge label as text element if present
    if (edge.label) {
      const midX = (edge.startX + edge.endX) / 2;
      const midY = (edge.startY + edge.endY) / 2;

      elements.push({
        type: "text",
        id: `${edge.id}-label`,
        x: midX - 15,
        y: midY - 10,
        text: edge.label,
        fontSize: 14,
        fontFamily: 1,
        textAlign: "center",
        strokeColor: "#495057",
      });
    }
  }

  return elements;
}
