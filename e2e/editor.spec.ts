import { expect, test, type Page } from '@playwright/test'
import {
  clickAt,
  connectEmulator,
  openPanel,
  screen,
  status,
  isPhone,
} from './helpers.ts'

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

const click = clickAt

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
  await openPanel(page, 'Edit')
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

// R4.AC1, AC8: real-size zoom from 10% to 2000%, typed values, Fit.
test('zoom is real size, with steps, typed values and Fit', async ({
  page,
}) => {
  const canvas = page.getByTestId('editor-canvas')
  const scale = async () => Number(await canvas.getAttribute('data-scale'))
  const level = page.getByLabel('Zoom level')
  await openPanel(page, 'Edit')

  // Starts at Fit, which shows its own percentage.
  const fitText = await level.inputValue()
  expect(fitText).toMatch(/^\d+%$/)
  const fit = await scale()

  // 100% = real size: the 30 mm label is 113 CSS px wide.
  await level.fill('100')
  await level.press('Enter')
  await expect(level).toHaveValue('100%')
  expect(Math.round(240 * (await scale()))).toBe(113)

  await level.fill('250%')
  await level.press('Enter')
  await expect(level).toHaveValue('250%')
  expect(await scale()).toBeCloseTo((2.5 * 96) / 203, 5)

  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(level).toHaveValue('300%')

  const out = page.getByRole('button', { name: 'Zoom out' })
  while (await out.isEnabled()) await out.click()
  await expect(level).toHaveValue('10%')

  await page.getByRole('button', { name: 'Fit' }).click()
  await expect(level).toHaveValue(fitText)
  expect(await scale()).toBeCloseTo(fit, 5)
})

// R4.AC8: Ctrl + mouse wheel zooms smoothly.
test('ctrl + wheel zooms', async ({ page }) => {
  test.skip(isPhone(page), 'mouse wheel')
  const canvas = page.getByTestId('editor-canvas')
  const before = Number(await canvas.getAttribute('data-scale'))
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, -200)
  await page.keyboard.up('Control')
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-scale')))
    .toBeGreaterThan(before * 1.2)
  await expect(page.getByLabel('Zoom level')).not.toHaveValue(/^\D/)
})

// C7: the edited label is what gets printed.
test('prints the edited label', async ({ page }) => {
  await click(page, TEXT)
  await page.keyboard.press('Delete')
  await connectEmulator(page)
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
