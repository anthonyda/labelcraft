/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'

/** Commit the site is built from, shown in the footer (CI: GITHUB_SHA). */
const commit = (() => {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA
  try {
    return execSync('git rev-parse HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
})()

// Relative base so the site works from the GitHub Pages sub-path (spec C6).
export default defineConfig({
  base: './',
  plugins: [react()],
  define: { __BUILD_COMMIT__: JSON.stringify(commit) },
  // R31.AC2: font files stay separate so they load only when a label uses
  // them (small ones would otherwise be inlined into the CSS).
  build: {
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
  },
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
          include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
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
