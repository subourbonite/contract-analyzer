import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { tmpdir } from 'os'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  // Use Windows temp directory to avoid OneDrive sync conflicts
  cacheDir: resolve(tmpdir(), 'vite-cache', 'contract-analyzer'),
})
