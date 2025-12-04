import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/pipeline-gui-test/',
  server: {
    host: '127.0.0.1',
    port: 5125,
    allowedHosts: ['ingevision.cloud'],
  },
})
