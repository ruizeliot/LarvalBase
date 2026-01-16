import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Required for Excalidraw
    'process.env.IS_PREACT': JSON.stringify('false'),
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 3457, // Different from MCP server port (3456)
    proxy: {
      '/api': 'http://localhost:3456',
      '/ws': {
        target: 'ws://localhost:3456',
        ws: true,
      },
    },
  },
});
