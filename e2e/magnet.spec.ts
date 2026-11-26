import { expect, test, type Page } from '@playwright/test'
import { openPanel, screen, status } from './helpers.ts'

/*
 * Magnet (R26). The QR code sits at dots (152, 8), 80 × 80; the label is
 * 240 dots wide, so moving the QR 7 dots right leaves its right edge 1 dot
 * from the label's right edge: the magnet pulls it the last dot.
 */
const QR = { x: 192, y: 48 }

const dragQr = async (page: Page, dots: number, alt = false) => {
  const s = await screen(page, QR)
  await page.mouse.move(s.x, s.y)
  await page.mouse.down()
  if (alt) await page.keyboard.down('Alt')
  await page.mouse.move(s.x + (dots * s.scale) / 2, s.y, { steps: 4 })
  await page.mouse.move(s.x + dots * s.scale, s.y, { steps: 4 })
  await page.mouse.up()
  if (alt) await page.keyboard.up('Alt')
}

const magnet = (page: Page) =>
  page.getByRole('button', { name: 'Magnet', exact: true })

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await expect(status(page)).toContainText('2 objects')
})

// R26.AC1, AC3
test('snaps to the label edge; Alt or the switch moves freely', async ({
  page,
}) => {
  await openPanel(page, 'Edit')
  await expect(magnet(page)).toHaveAttribute('aria-pressed', 'true')

  await dragQr(page, 7)
  // Snapped: right edge on 240 → left at 160 dots = 20.0 mm.
  await expect(status(page)).toContainText('qr at 20.0, 1.0 mm')

  await openPanel(page, 'Edit')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(status(page)).toContainText('qr at 19.0, 1.0 mm')

  // Turned off: the same move stays 1 dot short of the edge.
  await openPanel(page, 'Edit')
  await magnet(page).click()
  await expect(magnet(page)).toHaveAttribute('aria-pressed', 'false')
  await dragQr(page, 7)
  await expect(status(page)).toContainText('qr at 19.9, 1.0 mm')

  // Remembered.
  await page.reload()
  await openPanel(page, 'Edit')
  await expect(magnet(page)).toHaveAttribute('aria-pressed', 'false')
})

test('Alt moves freely for one drag', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard')
  await dragQr(page, 7, true)
  await expect(status(page)).toContainText('qr at 19.9, 1.0 mm')
})

// R29: the grid is shown in the editor only.
test('grid on and off; remembered', async ({ page }) => {
  const canvas = page.getByTestId('editor-canvas')
  await expect(canvas).toHaveAttribute('data-grid', 'off')
  await openPanel(page, 'Edit')
  const grid = page.getByRole('button', { name: 'Grid', exact: true })
  await expect(grid).toHaveAttribute('aria-pressed', 'false')
  await grid.click()
  await expect(grid).toHaveAttribute('aria-pressed', 'true')
  await expect(canvas).toHaveAttribute('data-grid', 'on')
  await page.reload()
  await expect(canvas).toHaveAttribute('data-grid', 'on')
})
