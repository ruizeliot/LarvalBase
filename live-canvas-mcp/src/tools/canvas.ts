import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { CanvasState, Shape } from "../index.js";

export function registerCanvasTools(): Tool[] {
  return [
    {
      name: "create_shape",
      description: "Create a shape on the Live Canvas for visual brainstorming",
      inputSchema: {
        type: "object" as const,
        properties: {
          type: {
            type: "string",
            enum: ["rectangle", "ellipse", "text", "arrow", "line"],
            description: "Shape type",
          },
          x: {
            type: "number",
            description: "X position on canvas",
          },
          y: {
            type: "number",
            description: "Y position on canvas",
          },
          width: {
            type: "number",
            description: "Width (for rectangle/ellipse)",
          },
          height: {
            type: "number",
            description: "Height (for rectangle/ellipse)",
          },
          text: {
            type: "string",
            description: "Text content (for text shapes or labels)",
          },
          style: {
            type: "object",
            properties: {
              fill: { type: "string", description: "Fill color (e.g., '#3b82f6')" },
              stroke: { type: "string", description: "Stroke color" },
              strokeWidth: { type: "number", description: "Stroke width in pixels" },
            },
            description: "Visual styling options",
          },
        },
        required: ["type", "x", "y"],
      },
    },
    {
      name: "update_shape",
      description: "Update an existing shape's properties",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: {
            type: "string",
            description: "ID of shape to update",
          },
          x: { type: "number", description: "New X position" },
          y: { type: "number", description: "New Y position" },
          width: { type: "number", description: "New width" },
          height: { type: "number", description: "New height" },
          text: { type: "string", description: "New text content" },
          style: {
            type: "object",
            properties: {
              fill: { type: "string" },
              stroke: { type: "string" },
              strokeWidth: { type: "number" },
            },
          },
        },
        required: ["id"],
      },
    },
    {
      name: "delete_shape",
      description: "Delete a shape from the canvas",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: {
            type: "string",
            description: "ID of shape to delete",
          },
        },
        required: ["id"],
      },
    },
    {
      name: "connect_shapes",
      description: "Draw a connection (arrow/line) between two shapes",
      inputSchema: {
        type: "object" as const,
        properties: {
          fromId: {
            type: "string",
            description: "ID of source shape",
          },
          toId: {
            type: "string",
            description: "ID of target shape",
          },
          type: {
            type: "string",
            enum: ["arrow", "line"],
            description: "Connection type (default: arrow)",
          },
          label: {
            type: "string",
            description: "Optional label for the connection",
          },
          style: {
            type: "object",
            properties: {
              stroke: { type: "string" },
              strokeWidth: { type: "number" },
            },
          },
        },
        required: ["fromId", "toId"],
      },
    },
    {
      name: "clear_canvas",
      description: "Clear all shapes from the canvas",
      inputSchema: {
        type: "object" as const,
        properties: {
          confirm: {
            type: "boolean",
            description: "Must be true to confirm clearing",
          },
        },
        required: ["confirm"],
      },
    },
  ];
}

let shapeCounter = 0;

export async function handleCanvasTool(
  name: string,
  args: Record<string, unknown>,
  state: CanvasState,
  broadcast: (message: object) => void
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case "create_shape": {
        const id = `shape-${++shapeCounter}`;
        const shape: Shape = {
          id,
          type: args.type as Shape["type"],
          x: args.x as number,
          y: args.y as number,
          width: args.width as number | undefined,
          height: args.height as number | undefined,
          text: args.text as string | undefined,
          style: args.style as Shape["style"],
        };

        // Store shape
        state.shapes.set(id, shape);

        // Broadcast
        broadcast({
          type: "canvas_update",
          action: "create",
          shape,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Created ${shape.type} shape "${id}" at (${shape.x}, ${shape.y})`,
            },
          ],
        };
      }

      case "update_shape": {
        const id = args.id as string;
        const existing = state.shapes.get(id);

        if (!existing) {
          return {
            content: [{ type: "text" as const, text: `Shape "${id}" not found` }],
            isError: true,
          };
        }

        // Update properties
        const updated: Shape = {
          ...existing,
          x: (args.x as number) ?? existing.x,
          y: (args.y as number) ?? existing.y,
          width: (args.width as number) ?? existing.width,
          height: (args.height as number) ?? existing.height,
          text: (args.text as string) ?? existing.text,
          style: args.style ? { ...existing.style, ...(args.style as object) } : existing.style,
        };

        state.shapes.set(id, updated);

        // Broadcast
        broadcast({
          type: "canvas_update",
          action: "update",
          shape: updated,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Updated shape "${id}"`,
            },
          ],
        };
      }

      case "delete_shape": {
        const id = args.id as string;

        if (!state.shapes.has(id)) {
          return {
            content: [{ type: "text" as const, text: `Shape "${id}" not found` }],
            isError: true,
          };
        }

        state.shapes.delete(id);

        // Broadcast
        broadcast({
          type: "canvas_update",
          action: "delete",
          shapeId: id,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Deleted shape "${id}"`,
            },
          ],
        };
      }

      case "connect_shapes": {
        const fromId = args.fromId as string;
        const toId = args.toId as string;
        const connType = (args.type as "arrow" | "line") || "arrow";
        const label = args.label as string | undefined;

        // Verify shapes exist
        const fromShape = state.shapes.get(fromId);
        const toShape = state.shapes.get(toId);

        if (!fromShape || !toShape) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Cannot connect: ${!fromShape ? `"${fromId}"` : ""} ${!toShape ? `"${toId}"` : ""} not found`,
              },
            ],
            isError: true,
          };
        }

        // Create connection shape
        const connId = `conn-${++shapeCounter}`;
        const connection: Shape = {
          id: connId,
          type: connType,
          x: fromShape.x + (fromShape.width || 100) / 2,
          y: fromShape.y + (fromShape.height || 50) / 2,
          fromId,
          toId,
          text: label,
          style: args.style as Shape["style"],
        };

        state.shapes.set(connId, connection);

        // Broadcast
        broadcast({
          type: "canvas_update",
          action: "connect",
          connection: {
            id: connId,
            fromId,
            toId,
            type: connType,
            label,
            style: connection.style,
          },
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Created ${connType} connection "${connId}" from "${fromId}" to "${toId}"`,
            },
          ],
        };
      }

      case "clear_canvas": {
        const confirm = args.confirm as boolean;

        if (!confirm) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Must set confirm: true to clear canvas",
              },
            ],
            isError: true,
          };
        }

        const count = state.shapes.size;
        state.shapes.clear();

        // Broadcast
        broadcast({
          type: "canvas_update",
          action: "clear",
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Cleared ${count} shapes from canvas`,
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text" as const, text: `Unknown canvas tool: ${name}` }],
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
