import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { CanvasState } from "../index.js";

export function registerDiagramTools(): Tool[] {
  return [
    {
      name: "render_mermaid",
      description: "Render a Mermaid diagram in the Live Canvas viewer. Supports flowcharts, sequence diagrams, class diagrams, etc.",
      inputSchema: {
        type: "object" as const,
        properties: {
          diagram: {
            type: "string",
            description: "Mermaid diagram code (e.g., 'flowchart TD\\n  A --> B')",
          },
          id: {
            type: "string",
            description: "Optional ID for updating existing diagram. New ID generated if omitted.",
          },
          title: {
            type: "string",
            description: "Optional title displayed above the diagram",
          },
          theme: {
            type: "string",
            enum: ["default", "dark", "forest", "neutral"],
            description: "Mermaid theme (default: 'default')",
          },
        },
        required: ["diagram"],
      },
    },
    {
      name: "render_ascii",
      description: "Display ASCII art/diagram in the Live Canvas viewer with monospace formatting",
      inputSchema: {
        type: "object" as const,
        properties: {
          content: {
            type: "string",
            description: "ASCII art content to display",
          },
          id: {
            type: "string",
            description: "Optional ID for updating existing ASCII block",
          },
          title: {
            type: "string",
            description: "Optional title displayed above the ASCII art",
          },
        },
        required: ["content"],
      },
    },
    {
      name: "render_plantuml",
      description: "Render a PlantUML diagram (requires PlantUML server integration)",
      inputSchema: {
        type: "object" as const,
        properties: {
          diagram: {
            type: "string",
            description: "PlantUML diagram code",
          },
          id: {
            type: "string",
            description: "Optional ID for updating existing diagram",
          },
          title: {
            type: "string",
            description: "Optional title displayed above the diagram",
          },
        },
        required: ["diagram"],
      },
    },
  ];
}

let diagramCounter = 0;

export async function handleDiagramTool(
  name: string,
  args: Record<string, unknown>,
  state: CanvasState,
  broadcast: (message: object) => void
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case "render_mermaid": {
        const diagram = args.diagram as string;
        const id = (args.id as string) || `mermaid-${++diagramCounter}`;
        const title = args.title as string | undefined;
        const theme = (args.theme as string) || "default";

        // Store diagram
        state.diagrams.set(id, { code: diagram, type: "mermaid" });

        // Broadcast to viewers
        broadcast({
          type: "diagram_update",
          id,
          diagramType: "mermaid",
          code: diagram,
          title,
          theme,
          action: state.diagrams.has(id) ? "update" : "create",
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Rendered Mermaid diagram "${id}" in Live Canvas`,
            },
          ],
        };
      }

      case "render_ascii": {
        const content = args.content as string;
        const id = (args.id as string) || `ascii-${++diagramCounter}`;
        const title = args.title as string | undefined;

        // Store as a diagram type
        state.diagrams.set(id, { code: content, type: "ascii" });

        // Broadcast
        broadcast({
          type: "diagram_update",
          id,
          diagramType: "ascii",
          code: content,
          title,
          action: state.diagrams.has(id) ? "update" : "create",
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Rendered ASCII diagram "${id}" in Live Canvas`,
            },
          ],
        };
      }

      case "render_plantuml": {
        const diagram = args.diagram as string;
        const id = (args.id as string) || `plantuml-${++diagramCounter}`;
        const title = args.title as string | undefined;

        // Store diagram
        state.diagrams.set(id, { code: diagram, type: "plantuml" });

        // Broadcast (viewer will need to handle PlantUML rendering)
        broadcast({
          type: "diagram_update",
          id,
          diagramType: "plantuml",
          code: diagram,
          title,
          action: state.diagrams.has(id) ? "update" : "create",
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Rendered PlantUML diagram "${id}" in Live Canvas (requires PlantUML server)`,
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text" as const, text: `Unknown diagram tool: ${name}` }],
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
