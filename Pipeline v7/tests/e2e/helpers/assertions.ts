import { expect } from 'vitest';

/**
 * Custom assertions for TUI testing
 */

/**
 * Assert that output contains text
 */
export function expectOutput(output: string) {
  return {
    toContain(text: string) {
      expect(output).toContain(text);
    },

    toMatch(pattern: RegExp) {
      expect(output).toMatch(pattern);
    },

    toHaveProgressBar(percentage: number) {
      expect(output).toMatch(new RegExp(`${percentage}%`));
    },

    toHaveStatus(status: string) {
      const statusPatterns: Record<string, RegExp> = {
        running: /running|▶|⟳/i,
        idle: /idle|○/i,
        completed: /complete|✓|✔/i,
        error: /error|✗|✘/i,
        pending: /pending|○/i,
      };
      const pattern = statusPatterns[status.toLowerCase()];
      if (pattern) {
        expect(output).toMatch(pattern);
      } else {
        expect(output.toLowerCase()).toContain(status.toLowerCase());
      }
    },

    toHaveTodo(content: string, status?: 'pending' | 'in_progress' | 'completed') {
      expect(output).toContain(content);
      if (status) {
        const statusIcons: Record<string, string[]> = {
          pending: ['○', '[ ]'],
          in_progress: ['⟳', '[~]', '...'],
          completed: ['✓', '✔', '[x]', '[X]'],
        };
        const icons = statusIcons[status];
        const hasIcon = icons.some((icon) => output.includes(icon));
        expect(hasIcon, `Expected todo "${content}" to have ${status} status`).toBe(true);
      }
    },

    toHaveEpic(name: string, status?: 'pending' | 'in_progress' | 'complete') {
      expect(output).toContain(name);
      if (status) {
        // Check that status indicator appears near epic name
        const epicLine = output.split('\n').find((line) => line.includes(name));
        expect(epicLine, `Epic "${name}" not found in output`).toBeDefined();

        if (status === 'complete') {
          expect(epicLine).toMatch(/✓|✔|complete/i);
        } else if (status === 'in_progress') {
          expect(epicLine).toMatch(/⟳|running|in.progress/i);
        }
      }
    },

    toHavePhase(phase: number | string, name?: string) {
      expect(output).toMatch(new RegExp(`Phase\\s*${phase}`, 'i'));
      if (name) {
        expect(output).toContain(name);
      }
    },

    toHaveCost(amount?: number) {
      expect(output).toMatch(/\$[\d.]+/);
      if (amount !== undefined) {
        expect(output).toContain(`$${amount.toFixed(2)}`);
      }
    },

    toHaveDuration(format?: string) {
      // Duration format: MM:SS or HH:MM:SS
      expect(output).toMatch(/\d+:\d{2}(:\d{2})?/);
      if (format) {
        expect(output).toContain(format);
      }
    },

    toHaveHeader(projectName: string) {
      expect(output).toContain(projectName);
    },

    toHaveShortcuts() {
      // Should show at least some keyboard shortcuts
      expect(output).toMatch(/\[.\]/);
    },

    toHaveModal() {
      // Modal usually has borders and centered content (includes rounded corners ╭╮)
      expect(output).toMatch(/[┌╔╭].*[┐╗╮]/);
    },

    toBeEmpty() {
      expect(output.trim()).toBe('');
    },

    not: {
      toContain(text: string) {
        expect(output).not.toContain(text);
      },

      toMatch(pattern: RegExp) {
        expect(output).not.toMatch(pattern);
      },

      toHaveModal() {
        expect(output).not.toMatch(/[┌╔╭].*[┐╗╮]/);
      },
    },
  };
}

/**
 * Assert todo list structure
 */
export function expectTodoList(todos: Array<{ content: string; status: string }>) {
  return {
    toHaveLength(length: number) {
      expect(todos).toHaveLength(length);
    },

    toHaveCompleted(count: number) {
      const completed = todos.filter((t) => t.status === 'completed');
      expect(completed).toHaveLength(count);
    },

    toHaveInProgress(count: number) {
      const inProgress = todos.filter((t) => t.status === 'in_progress');
      expect(inProgress).toHaveLength(count);
    },

    toHavePending(count: number) {
      const pending = todos.filter((t) => t.status === 'pending');
      expect(pending).toHaveLength(count);
    },

    toBeAllCompleted() {
      const allCompleted = todos.every((t) => t.status === 'completed');
      expect(allCompleted).toBe(true);
    },
  };
}

/**
 * Assert manifest structure
 */
export function expectManifest(manifest: {
  currentPhase?: string;
  phases?: Record<string, { status: string }>;
  epics?: Array<{ status: string }>;
}) {
  return {
    toBeAtPhase(phase: number | string) {
      expect(manifest.currentPhase).toBe(String(phase));
    },

    toHavePhaseStatus(phase: number | string, status: string) {
      expect(manifest.phases?.[String(phase)]?.status).toBe(status);
    },

    toHaveCompletedPhases(count: number) {
      const completed = Object.values(manifest.phases || {}).filter(
        (p) => p.status === 'complete'
      );
      expect(completed).toHaveLength(count);
    },

    toHaveEpicsCompleted(count: number) {
      const completed = (manifest.epics || []).filter((e) => e.status === 'complete');
      expect(completed).toHaveLength(count);
    },
  };
}
