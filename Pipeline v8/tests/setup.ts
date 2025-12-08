/**
 * Global Test Setup
 * Pipeline v8
 *
 * Shared setup for all test layers (unit, integration, E2E)
 */
import { beforeEach, afterEach, vi } from 'vitest';

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Global error handler to prevent unhandled rejections from failing silently
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  throw reason;
});
