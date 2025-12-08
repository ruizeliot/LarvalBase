import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Global setup
    setupFiles: ['./tests/setup.ts'],

    // Test organization
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/e2e/**/*.test.ts'
    ],

    // Environment
    environment: 'node',

    // Timeouts by layer
    testTimeout: 30000,

    // Coverage
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/types/**']
    },

    // Globals
    globals: true
  }
});
