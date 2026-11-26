// Renders the PNG app icons (R30.AC1–AC2) into public/icons/.
// Run: node scripts/app-icons.mjs
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const logo = (size) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#2a0d00" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v9l-5 5H4z M20 14c-3 0-5 2-5 5 M8 9h8 M8 12h5"/><path d="M15 19c0-2.5 2-5 5-5z" fill="#2a0d00" fill-opacity="0.25" stroke="none"/></svg>`

// [file, size, corner radius (share of size), logo size (share of size)]
const ICONS = [
  ['icon-192.png', 192, 0.21, 0.75],
  ['icon-512.png', 512, 0.21, 0.75],
  // Maskable: full bleed, logo inside the 80 % safe circle.
  ['icon-maskable-512.png', 512, 0, 0.56],
  // iOS rounds the corners itself.
  ['apple-touch-icon.png', 180, 0, 0.7],
]

mkdirSync('public/icons', { recursive: true })
const browser = await chromium.launch()
for (const [file, size, radius, share] of ICONS) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
  })
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">
<div style="width:${size}px;height:${size}px;border-radius:${radius * size}px;background:#ff7a45;display:grid;place-items:center">${logo(Math.round(size * share))}</div>
</body></html>`)
  await page.screenshot({ path: `public/icons/${file}`, omitBackground: true })
  await page.close()
}
await browser.close()
console.log('public/icons written')
