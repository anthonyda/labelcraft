import { expect, test } from '@playwright/test'
import { openPanel, status } from './helpers.ts'

/* Install as an app (R30). */

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await expect(status(page)).toContainText('2 objects')
})

// R30.AC1–AC2
test('manifest, icons and iPhone tags', async ({ page, request }) => {
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  const manifestUrl = new URL(href!, page.url()).href
  const manifest = await (await request.get(manifestUrl)).json()
  expect(manifest).toMatchObject({
    short_name: 'labelcraft',
    display: 'standalone',
    start_url: './',
    scope: './',
  })
  const sizes = manifest.icons.map(
    (i: { sizes: string; purpose: string }) => `${i.sizes} ${i.purpose}`,
  )
  expect(sizes).toEqual(
    expect.arrayContaining(['192x192 any', '512x512 any', '512x512 maskable']),
  )
  for (const icon of manifest.icons) {
    const res = await request.get(new URL(icon.src, manifestUrl).href)
    expect(res.status(), icon.src).toBe(200)
  }
  const apple = await page
    .locator('link[rel="apple-touch-icon"]')
    .getAttribute('href')
  expect((await request.get(new URL(apple!, page.url()).href)).status()).toBe(
    200,
  )
  await expect(
    page.locator('meta[name="apple-mobile-web-app-capable"]'),
  ).toHaveAttribute('content', 'yes')
})

// R30.AC3
test('service worker is registered', async ({ page }) => {
  await expect
    .poll(() =>
      page.evaluate(
        async () => !!(await navigator.serviceWorker.getRegistration()),
      ),
    )
    .toBe(true)
})

// R30.AC4: without a browser offer, the button explains how to install.
test('Install app opens the help dialog', async ({ page }) => {
  await openPanel(page, 'Labels')
  await page
    .getByRole('button', { name: 'Install', exact: true })
    .filter({ visible: true })
    .first()
    .click()
  const dialog = page.getByRole('dialog', { name: 'Install labelcraft' })
  await expect(dialog).toContainText('browser menu')
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(dialog).toBeHidden()
})
