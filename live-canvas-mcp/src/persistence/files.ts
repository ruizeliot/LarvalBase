import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

/**
 * Read a notes file, creating it with template if it doesn't exist
 */
export async function readNotesFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // File doesn't exist, create with template
      const template = createNotesTemplate();
      await ensureDir(dirname(filePath));
      await writeFile(filePath, template, "utf-8");
      return template;
    }
    throw error;
  }
}

/**
 * Write content to a notes file
 */
export async function writeNotesFile(filePath: string, content: string): Promise<void> {
  await ensureDir(dirname(filePath));
  await writeFile(filePath, content, "utf-8");
}

/**
 * Ensure directory exists
 */
async function ensureDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
}

/**
 * Create initial brainstorm notes template
 */
function createNotesTemplate(): string {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().split(" ")[0].slice(0, 5);

  return `# Brainstorm Notes

**Session Started:** ${dateStr} ${timeStr}
**Last Updated:** ${dateStr} ${timeStr}

---

## Core Concept

*Describe the main idea here...*

## Features

*List features as they are discussed...*

## UI Ideas

*Visual and interaction concepts...*

## Technical Notes

*Implementation considerations...*

---

*This document is updated live during brainstorming.*
`;
}
