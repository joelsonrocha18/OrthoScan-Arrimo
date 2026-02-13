import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const certPath = path.join(__dirname, 'certs', 'orthoscan.local.pem')
const keyPath = path.join(__dirname, 'certs', 'orthoscan.local-key.pem')
const forceHttps = process.env.VITE_FORCE_HTTPS === '1'
const httpsConfig =
  forceHttps && fs.existsSync(certPath) && fs.existsSync(keyPath)
    ? {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      }
    : undefined

export default defineConfig({
  plugins: [react()],
  base: process.env.ELECTRON_BUILD ? './' : '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: httpsConfig,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/helpers/setup.ts'],
    include: ['src/tests/**/*.test.ts', 'src/tests/**/*.test.tsx'],
    css: true,
  },
})
