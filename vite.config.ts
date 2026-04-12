/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/socket.io': {
        target: 'http://127.0.0.1:3000',
        ws: true
      },
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./unit-test/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/frontend-tests/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}']
    }
  }
})
