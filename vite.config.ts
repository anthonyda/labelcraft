/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vite'

// Relative base so the site works from the GitHub Pages sub-path (spec C6).
export default defineConfig({
  base: './',
  plugins: [react()],
  // Pre-bundle so browser tests don't trigger a mid-run reload.
  optimizeDeps: {
    include: [
      '@mmote/niimbluelib',
      'konva',
      'jsbarcode',
      'qrcode-generator',
      '@zxing/library',
    ],
  },
  test: {
    projects: [
      {
        // Pure logic (model, units, history): runs in Node.
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.browser.test.ts'],
        },
      },
      {
        // Rendering: runs in real Chromium so canvas output matches the app (C7).
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
