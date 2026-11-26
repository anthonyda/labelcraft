// Renders public/og-image.png (1200 × 630), the link preview image (R27.AC2).
// Run: node scripts/og-image.mjs
import { chromium } from '@playwright/test'

const html = `<!doctype html><html><head><style>
body{margin:0;width:1200px;height:630px;font-family:Inter,Segoe UI,system-ui,sans-serif;
background:#0057ff;color:#fff;display:flex;flex-direction:column;justify-content:flex-start;padding:96px 80px 0;box-sizing:border-box;position:relative;overflow:hidden}
.brand{display:flex;align-items:center;gap:22px;font-size:64px;font-weight:700;letter-spacing:-1px}
.tile{width:92px;height:92px;border-radius:20px;background:#ff7a45;display:grid;place-items:center}
h2{font-size:40px;font-weight:500;margin:34px 0 0;color:#e6efff;max-width:600px;line-height:1.25}
.label{width:470px;height:188px;background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,40,.35);
color:#000;display:flex;align-items:center;gap:34px;padding:0 36px;box-sizing:border-box;position:absolute;right:70px;bottom:80px;transform:rotate(-4deg)}
.label b{font:700 46px Arial,sans-serif;line-height:1.05}
.label small{display:block;font:20px Arial,sans-serif;margin-top:8px}
.qr{width:126px;height:126px;flex:none}
</style></head><body>
<div class="brand"><div class="tile"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#2a0d00" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v9l-5 5H4z M20 14c-3 0-5 2-5 5 M8 9h8 M8 12h5"/><path d="M15 19c0-2.5 2-5 5-5z" fill="#2a0d00" fill-opacity="0.25" stroke="none"/></svg></div>labelcraft</div>
<h2>Design labels in your browser and print them to NIIMBOT printers. Free, no install.</h2>
<div class="label"><div><b>Organic apples</b><small>€2.49 / kg · Spain</small></div><svg class="qr" viewBox="0 0 21 21" shape-rendering="crispEdges"><path fill="#000" d="M0 0h7v7H0z M14 0h7v7h-7z M0 14h7v7H0z"/><path fill="#fff" d="M1 1h5v5H1z M15 1h5v5h-5z M1 15h5v5H1z"/><path fill="#000" d="M2 2h3v3H2z M16 2h3v3h-3z M2 16h3v3H2z M8 0h1v2H8z M10 1h2v1h-2z M9 3h3v1H9z M8 5h1v3H8z M11 6h2v2h-2z M0 8h2v1H0z M3 9h3v1H3z M7 9h2v2H7z M10 9h1v3h-1z M13 8h3v1h-3z M17 9h4v1h-4z M14 11h2v2h-2z M18 12h2v1h-2z M8 13h2v2H8z M11 14h3v1h-3z M15 15h2v1h-2z M19 15h2v2h-2z M9 17h1v3H9z M12 17h2v2h-2z M15 18h3v1h-3z M11 20h2v1h-2z M17 20h4v1h-4z M1 11h2v1H1z M5 12h1v2H5z"/></svg></div>
</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.setContent(html)
await page.screenshot({ path: 'public/og-image.png' })
await browser.close()
console.log('public/og-image.png written')
