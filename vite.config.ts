import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
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
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      includeAssets: [
        'apple-touch-icon.png',
        'notification.mp3',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-512x512.png',
        'brand/orthoscan-mark-color.png',
      ],
      manifest: {
        id: '/',
        name: 'Arrimo OrthoScan',
        short_name: 'OrthoScan',
        description: 'Gestao clinica e laboratorial com ortodontia digital.',
        theme_color: '#01527d',
        background_color: '#082c3d',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'pt-BR',
        categories: ['medical', 'health', 'productivity', 'business'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Agendamentos',
            short_name: 'Agenda',
            description: 'Abrir dashboard de agendamentos.',
            url: '/dashboard/agendamentos',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,jpg,jpeg,webp,woff2,mp3}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
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
