import { expect } from 'vitest';

/**
 * Assert that output contains a pattern
 */
export function assertContains(
  output: string[],
  pattern: RegExp | string,
  message?: string
): void {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  const found = output.some((line) => regex.test(line));

  if (!found) {
    throw new Error(
      message ||
        `Expected output to contain ${pattern}. Got:\n${output.join('\n')}`
    );
  }
}

/**
 * Assert ANSI escape code is present (for styling verification)
 */
export function assertAnsiCode(
  output: string[],
  code: string,
  message?: string
): void {
  const ansiPattern = new RegExp(`\\x1b\\[${code}m`);
  const found = output.some((line) => ansiPattern.test(line));

  if (!found) {
    throw new Error(
      message || `Expected ANSI code ${code} in output. Got:\n${output.join('\n')}`
    );
  }
}

/**
 * Assert exit code matches expected
 */
export function assertExitCode(
  actual: number | null,
  expected: number,
  message?: string
): void {
  expect(actual).toBe(expected);
}

/**
 * Assert output does NOT contain a pattern
 */
export function assertNotContains(
  output: string[],
  pattern: RegExp | string,
  message?: string
): void {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  const found = output.some((line) => regex.test(line));

  if (found) {
    throw new Error(
      message ||
        `Expected output NOT to contain ${pattern}. Got:\n${output.join('\n')}`
    );
  }
}

/**
 * Assert output lines appear in order
 */
export function assertOrder(
  output: string[],
  patterns: Array<RegExp | string>,
  message?: string
): void {
  let lastIndex = -1;

  for (const pattern of patterns) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const index = output.findIndex((line, i) => i > lastIndex && regex.test(line));

    if (index === -1) {
      throw new Error(
        message ||
          `Pattern ${pattern} not found after index ${lastIndex}. Output:\n${output.join(
            '\n'
          )}`
      );
    }

    lastIndex = index;
  }
}
