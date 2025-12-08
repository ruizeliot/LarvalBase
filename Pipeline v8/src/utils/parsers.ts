/**
 * Parsers
 * Pipeline v8
 *
 * Pure parsing functions (no I/O)
 */
import type { TodoItem, Manifest, EpicInfo } from '../types/index.js';

/**
 * US-012: Parse manifest JSON
 * SKELETON: Returns undefined - not implemented
 */
export function parseManifestJson(json: string): Manifest | undefined {
  // SKELETON: Not implemented
  throw new Error('Not implemented');
}

/**
 * US-050: Parse todo JSONL format
 * SKELETON: Returns empty array - not implemented
 */
export function parseTodoJsonl(content: string): TodoItem[] {
  // SKELETON: Not implemented
  throw new Error('Not implemented');
}

/**
 * US-051: Extract todo statuses from todo array
 * SKELETON: Returns empty object - not implemented
 */
export function extractTodoStatuses(
  todos: TodoItem[]
): { pending: number; in_progress: number; completed: number } {
  // SKELETON: Not implemented
  throw new Error('Not implemented');
}

/**
 * US-049: Match session ID pattern in filename
 * SKELETON: Returns false - not implemented
 */
export function matchSessionIdPattern(
  filename: string,
  sessionId: string
): boolean {
  // SKELETON: Not implemented
  throw new Error('Not implemented');
}

/**
 * US-062: Parse epic statuses from manifest phases
 * SKELETON: Returns empty array - not implemented
 */
export function parseEpicStatuses(phases: Record<string, unknown>): EpicInfo[] {
  // SKELETON: Not implemented
  throw new Error('Not implemented');
}

/**
 * US-069: Parse ccusage output
 * SKELETON: Returns 0 - not implemented
 */
export function parseCcusageOutput(output: string): number {
  // SKELETON: Not implemented
  throw new Error('Not implemented');
}

/**
 * US-039: Parse exit code meaning
 * SKELETON: Returns 'unknown' - not implemented
 */
export function parseExitCode(code: number): 'success' | 'error' | 'unknown' {
  // SKELETON: Not implemented
  throw new Error('Not implemented');
}

/**
 * US-076-080: Get command for phase and mode
 * SKELETON: Returns empty string - not implemented
 */
export function getPhaseCommand(
  phase: number,
  mode: 'new' | 'feature' | 'fix'
): string {
  // SKELETON: Not implemented
  throw new Error('Not implemented');
}
