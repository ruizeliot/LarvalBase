import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { CanvasState } from "../index.js";
import { readNotesFile, writeNotesFile } from "../persistence/files.js";
import { markAiWrite } from "../session/edits.js";

export function registerNotesTools(): Tool[] {
  return [
    {
      name: "append_notes",
      description: "Append content to a section in the brainstorm notes. Creates section if it doesn't exist. Updates file and broadcasts to viewer.",
      inputSchema: {
        type: "object" as const,
        properties: {
          section: {
            type: "string",
            description: "Section name (e.g., 'Core Concept', 'Features', 'Integrations')",
          },
          content: {
            type: "string",
            description: "Markdown content to append under the section",
          },
          file: {
            type: "string",
            description: "Optional file path relative to project (default: docs/brainstorm-notes.md)",
          },
        },
        required: ["section", "content"],
      },
    },
    {
      name: "update_section",
      description: "Replace entire section content in brainstorm notes",
      inputSchema: {
        type: "object" as const,
        properties: {
          section: {
            type: "string",
            description: "Section name to update",
          },
          content: {
            type: "string",
            description: "New content for the section (replaces existing)",
          },
          file: {
            type: "string",
            description: "Optional file path relative to project",
          },
        },
        required: ["section", "content"],
      },
    },
    {
      name: "get_notes",
      description: "Get current brainstorm notes content",
      inputSchema: {
        type: "object" as const,
        properties: {
          section: {
            type: "string",
            description: "Optional: specific section to retrieve. If omitted, returns all sections.",
          },
          file: {
            type: "string",
            description: "Optional file path relative to project",
          },
        },
        required: [],
      },
    },
  ];
}

export async function handleNotesTool(
  name: string,
  args: Record<string, unknown>,
  state: CanvasState,
  broadcast: (message: object) => void
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  const file = (args.file as string) || "docs/brainstorm-notes.md";
  const filePath = `${state.projectDir}/${file}`;

  try {
    switch (name) {
      case "append_notes": {
        const section = args.section as string;
        const content = args.content as string;

        // Read current file
        let fileContent = await readNotesFile(filePath);

        // Find section or create it
        const sectionHeader = `## ${section}`;
        const sectionIndex = fileContent.indexOf(sectionHeader);

        if (sectionIndex === -1) {
          // Create new section at end
          fileContent = fileContent.trimEnd() + `\n\n${sectionHeader}\n${content}\n`;
        } else {
          // Find next section to know where to insert
          const afterHeader = sectionIndex + sectionHeader.length;
          const nextSectionMatch = fileContent.slice(afterHeader).match(/\n## /);
          const insertPoint = nextSectionMatch
            ? afterHeader + nextSectionMatch.index!
            : fileContent.length;

          // Insert content before next section
          const beforeInsert = fileContent.slice(0, insertPoint).trimEnd();
          const afterInsert = fileContent.slice(insertPoint);
          fileContent = beforeInsert + "\n" + content + "\n" + afterInsert;
        }

        // Write file
        await writeNotesFile(filePath, fileContent);

        // Mark as AI write so file watcher ignores this change
        markAiWrite();

        // Update state
        const existingContent = state.notes.get(section) || "";
        state.notes.set(section, existingContent + "\n" + content);

        // Broadcast to viewers
        broadcast({
          type: "notes_update",
          section,
          content: state.notes.get(section),
          action: "append",
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Appended to section "${section}" in ${file}`,
            },
          ],
        };
      }

      case "update_section": {
        const section = args.section as string;
        const content = args.content as string;

        // Read current file
        let fileContent = await readNotesFile(filePath);

        // Find section
        const sectionHeader = `## ${section}`;
        const sectionIndex = fileContent.indexOf(sectionHeader);

        if (sectionIndex === -1) {
          // Create new section
          fileContent = fileContent.trimEnd() + `\n\n${sectionHeader}\n${content}\n`;
        } else {
          // Find section bounds
          const afterHeader = sectionIndex + sectionHeader.length;
          const nextSectionMatch = fileContent.slice(afterHeader).match(/\n## /);
          const sectionEnd = nextSectionMatch
            ? afterHeader + nextSectionMatch.index!
            : fileContent.length;

          // Replace section content
          fileContent =
            fileContent.slice(0, sectionIndex) +
            `${sectionHeader}\n${content}\n` +
            fileContent.slice(sectionEnd);
        }

        // Write file
        await writeNotesFile(filePath, fileContent);

        // Mark as AI write so file watcher ignores this change
        markAiWrite();

        // Update state
        state.notes.set(section, content);

        // Broadcast
        broadcast({
          type: "notes_update",
          section,
          content,
          action: "replace",
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Updated section "${section}" in ${file}`,
            },
          ],
        };
      }

      case "get_notes": {
        const section = args.section as string | undefined;

        // Read file
        const fileContent = await readNotesFile(filePath);

        if (section) {
          // Return specific section
          const sectionHeader = `## ${section}`;
          const sectionIndex = fileContent.indexOf(sectionHeader);

          if (sectionIndex === -1) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Section "${section}" not found`,
                },
              ],
            };
          }

          const afterHeader = sectionIndex + sectionHeader.length;
          const nextSectionMatch = fileContent.slice(afterHeader).match(/\n## /);
          const sectionEnd = nextSectionMatch
            ? afterHeader + nextSectionMatch.index!
            : fileContent.length;

          const sectionContent = fileContent.slice(afterHeader, sectionEnd).trim();

          return {
            content: [
              {
                type: "text" as const,
                text: sectionContent,
              },
            ],
          };
        }

        // Return all content
        return {
          content: [
            {
              type: "text" as const,
              text: fileContent,
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text" as const, text: `Unknown notes tool: ${name}` }],
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
