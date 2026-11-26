import { expect, test } from '@playwright/test'

/* SEO and sharing (R27). */

test('title, description, canonical and sharing tags', async ({ page }) => {
  await page.goto('./')
  await expect(page).toHaveTitle(/labelcraft — free label designer for NIIMBOT/)
  const meta = (sel: string) => page.locator(sel).getAttribute('content')
  expect(await meta('meta[name="description"]')).toMatch(/print them/)
  expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(
    'https://anthonyda.github.io/labelcraft/',
  )
  expect(await meta('meta[property="og:image"]')).toBe(
    'https://anthonyda.github.io/labelcraft/og-image.png',
  )
  expect(await meta('meta[name="twitter:card"]')).toBe('summary_large_image')
  // R27.AC6: never presented as NIIMBOT's own.
  expect(await meta('meta[property="og:title"]')).toContain('for NIIMBOT')
})

test('structured data is valid JSON-LD', async ({ page }) => {
  await page.goto('./')
  const json = await page
    .locator('script[type="application/ld+json"]')
    .textContent()
  const data = JSON.parse(json!)
  expect(data['@type']).toBe('WebApplication')
  expect(data.offers.price).toBe('0')
})

test('text for crawlers, robots.txt, sitemap and share image', async ({
  request,
}) => {
  const html = await (await request.get('./')).text()
  expect(html).toContain('A free label designer that runs in your browser')
  const robots = await (await request.get('./robots.txt')).text()
  expect(robots).toContain(
    'Sitemap: https://anthonyda.github.io/labelcraft/sitemap.xml',
  )
  const sitemap = await (await request.get('./sitemap.xml')).text()
  expect(sitemap).toContain(
    '<loc>https://anthonyda.github.io/labelcraft/</loc>',
  )
  const image = await request.get('./og-image.png')
  expect(image.headers()['content-type']).toContain('image/png')
})
