import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// In development, requests to /api are forwarded to the backend, so no CORS setup is needed.
export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { port: 5173, proxy: { '/api': { target: process.env.API_TARGET || 'http://localhost:5000', changeOrigin: true } } },
})
