import { expect, test, type Page } from '@playwright/test'

/*
 * Editor core (M3: T3.1–T3.4, R4). The start label is 30 × 12 mm at 203 dpi
 * (240 × 96 printer px) with:
 *   text  at px (8, 12)  size 144 × 72
 *   QR    at px (152, 8) size 80 × 80
 */
const TEXT = { x: 80, y: 48 }
const QR = { x: 192, y: 48 }
// Below the objects, away from the selection handles
const EMPTY_ON_LABEL = { x: 40, y: 94 }

/** Screen position of a point given in label printer pixels. */
const screen = async (page: Page, p: { x: number; y: number }) => {
  const canvas = page.getByTestId('editor-canvas')
  const box = (await canvas.boundingBox())!
  const scale = Number(await canvas.getAttribute('data-scale'))
  const origin = Number(await canvas.getAttribute('data-origin'))
  return {
    x: box.x + origin + p.x * scale,
    y: box.y + origin + p.y * scale,
    scale,
  }
}

const click = async (
  page: Page,
  p: { x: number; y: number },
  shift = false,
) => {
  const s = await screen(page, p)
  if (shift) await page.keyboard.down('Shift')
  await page.mouse.click(s.x, s.y)
  if (shift) await page.keyboard.up('Shift')
}

const drag = async (
  page: Page,
  from: { x: number; y: number },
  by: { x: number; y: number },
) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + by.x / 2, from.y + by.y / 2, { steps: 5 })
  await page.mouse.move(from.x + by.x, from.y + by.y, { steps: 5 })
  await page.mouse.up()
}

const status = (page: Page) => page.getByTestId('editor-status')

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await expect(status(page)).toContainText('2 objects · 0 selected')
})

// R4.AC2: click, shift-click, click empty
test('selects with click and shift-click, clears on empty click', async ({
  page,
}) => {
  await click(page, TEXT)
  await expect(status(page)).toContainText(
    '1 selected · text at 1.0, 1.5 mm · 18.0 × 9.0 mm · 0°',
  )
  await click(page, QR, true)
  await expect(status(page)).toContainText('2 selected')
  await click(page, EMPTY_ON_LABEL)
  await expect(status(page)).toContainText('0 selected')
})

// R4.AC2: drag box
test('selects with a drag box', async ({ page }) => {
  const start = await screen(page, { x: -3, y: -3 }) // in the padding
  const end = await screen(page, { x: 200, y: 60 })
  await drag(page, start, { x: end.x - start.x, y: end.y - start.y })
  await expect(status(page)).toContainText('2 selected')
})

// R4.AC2: move by dragging
test('moves an object by dragging', async ({ page }) => {
  const s = await screen(page, QR)
  await drag(page, s, { x: -8 * s.scale, y: 0 }) // 8 printer px left
  await expect(status(page)).toContainText('qr at 18.0, 1.0 mm')
})

// R4.AC2: resize with a handle
test('resizes with the bottom-right handle', async ({ page }) => {
  await click(page, QR)
  const corner = await screen(page, { x: 232, y: 88 })
  await drag(page, corner, { x: -16 * corner.scale, y: -16 * corner.scale })
  // within a printer dot of 8 mm (screen-to-dot rounding)
  await expect(status(page)).toContainText(/ 8\.[01] × 8\.[01] mm/)
})

// R4.AC2 arrows, R4.AC3 delete/duplicate/copy/paste, R4.AC6 undo/redo
test('keyboard: nudge, delete, undo/redo, duplicate, copy/paste', async ({
  page,
}) => {
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control'
  await click(page, TEXT)
  await page.keyboard.press('Shift+ArrowRight') // 10 px = 1.25 mm
  await page.keyboard.press('ArrowDown') // 1 px
  await expect(status(page)).toContainText('text at 2.3, 1.6 mm')

  await page.keyboard.press('Delete')
  await expect(status(page)).toContainText('1 objects · 0 selected')
  await page.keyboard.press(`${mod}+z`)
  await expect(status(page)).toContainText('2 objects')
  await page.keyboard.press(`${mod}+y`)
  await expect(status(page)).toContainText('1 objects')
  await page.keyboard.press(`${mod}+z`)

  await click(page, QR)
  await page.keyboard.press(`${mod}+d`)
  await expect(status(page)).toContainText(
    '3 objects · 1 selected · qr at 21.0',
  )
  await page.keyboard.press(`${mod}+c`)
  await page.keyboard.press(`${mod}+v`)
  await expect(status(page)).toContainText(
    '4 objects · 1 selected · qr at 23.0',
  )
  await page.keyboard.press('Escape')
  await expect(status(page)).toContainText('0 selected')
})

// T3.4 / R4.AC3–AC5: toolbar
test('toolbar: align, duplicate, delete, disabled without selection', async ({
  page,
}) => {
  const tools = page.getByRole('toolbar', { name: 'Editor tools' })
  await expect(tools.getByRole('button', { name: 'Delete' })).toBeDisabled()

  await click(page, TEXT)
  await tools.getByRole('button', { name: 'Align right' }).click()
  await expect(status(page)).toContainText('text at 12.0, 1.5 mm')
  await tools.getByRole('button', { name: 'Align bottom' }).click()
  await expect(status(page)).toContainText('text at 12.0, 3.0 mm')
  await tools.getByRole('button', { name: 'Duplicate' }).click()
  await expect(status(page)).toContainText('3 objects')
  await tools.getByRole('button', { name: 'Delete' }).click()
  await expect(status(page)).toContainText('2 objects')
  await tools.getByRole('button', { name: 'Undo' }).click()
  await expect(status(page)).toContainText('3 objects')
})

// R4.AC1: zoom
test('zooms in, out and back to fit', async ({ page }) => {
  const canvas = page.getByTestId('editor-canvas')
  const fit = Number(await canvas.getAttribute('data-scale'))
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(page.getByLabel('Zoom level')).toHaveText('150%')
  expect(Number(await canvas.getAttribute('data-scale'))).toBeCloseTo(fit * 1.5)
  await page.getByRole('button', { name: 'Zoom out' }).click()
  await page.getByRole('button', { name: 'Zoom out' }).click()
  await expect(page.getByLabel('Zoom level')).toHaveText('75%')
  await page.getByRole('button', { name: 'Fit' }).click()
  await expect(page.getByLabel('Zoom level')).toHaveText('100%')
})

// C7: the edited label is what gets printed.
test('prints the edited label', async ({ page }) => {
  await click(page, TEXT)
  await page.keyboard.press('Delete')
  await page.getByLabel(/Emulated D110_M/).check()
  await page.getByRole('button', { name: 'Connect' }).click()
  await expect(page.getByText('Connected to')).toBeVisible()
  await page.getByRole('button', { name: 'Print…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Print' })
  await dialog.getByRole('button', { name: 'Print', exact: true }).click()
  await expect(
    dialog.getByText('Matches the preview pixel for pixel.'),
  ).toBeVisible({
    timeout: 15_000,
  })
  // Text deleted: left part of the printed label is blank.
  const leftInk = await page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>(
      'canvas[data-testid="emulator-output"]',
    )!
    const d = c.getContext('2d')!.getImageData(0, 0, 140, c.height).data
    let ink = 0
    for (let i = 0; i < d.length; i += 4) if (d[i] === 0) ink++
    return ink
  })
  expect(leftInk).toBe(0)
})
