/**
 * Unit Test Setup
 * Pipeline v8
 *
 * Setup for unit tests - pure functions, no I/O
 */
import { beforeEach, afterEach, vi } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
