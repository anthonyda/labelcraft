import { expect, test, type Page } from '@playwright/test'
import {
  clickAt,
  connectEmulator,
  inkIn,
  openPanel,
  screen,
  status,
} from './helpers.ts'

/*
 * Objects and properties (M4: T4.1–T4.5). Start label: 30 × 12 mm at 203 dpi
 * (240 × 96 dots) with text at dots (8, 12) 144 × 72 and a QR code at
 * (152, 8) 80 × 80.
 */
const TEXT = { x: 80, y: 48 }
const QR = { x: 192, y: 48 }

const props = (page: Page) =>
  page.getByRole('complementary', { name: 'Properties' })

/** A small PNG (dark left half, light right half). */
const pngBuffer = async (page: Page) => {
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 60
    c.height = 30
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, 60, 30)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, 30, 30)
    return c.toDataURL('image/png')
  })
  return Buffer.from(dataUrl.split(',')[1], 'base64')
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await expect(status(page)).toContainText('2 objects · 0 selected')
})

// T4.1
test('adds every object type from the Add menu', async ({ page }) => {
  const types = [
    ['Text', 'text'],
    ['Rectangle', 'rect'],
    ['Ellipse', 'ellipse'],
    ['Line', 'line'],
    ['QR code', 'qr'],
    ['Barcode', 'barcode'],
  ]
  let count = 2
  for (const [name, type] of types) {
    await openPanel(page, 'Add')
    await page
      .getByRole('group', { name: 'Add' })
      .getByRole('button', { name: `+ ${name}` })
      .click()
    count++
    await expect(status(page)).toContainText(
      `${count} objects · 1 selected · ${type} at`,
    )
  }
})

// T4.2 / R5.AC1: double-click (or double-tap) to edit in place.
test('edits text in place: Enter saves, Esc cancels, Shift+Enter adds a line', async ({
  page,
}, testInfo) => {
  const openEditor = async () => {
    const s = await screen(page, TEXT)
    if (testInfo.project.name === 'phone') {
      await page.touchscreen.tap(s.x, s.y)
      await page.touchscreen.tap(s.x, s.y)
    } else {
      await page.mouse.dblclick(s.x, s.y)
    }
    const editor = page.getByRole('textbox', { name: 'Edit text' })
    await expect(editor).toBeFocused()
    return editor
  }
  await openPanel(page, 'Properties')
  const textField = props(page).getByLabel('Text', { exact: true })

  let editor = await openEditor()
  await editor.fill('Shipping')
  await editor.press('Enter')
  await expect(editor).toBeHidden()
  await expect(textField).toHaveValue('Shipping')

  editor = await openEditor()
  await editor.fill('zzz')
  await editor.press('Escape')
  await expect(textField).toHaveValue('Shipping')

  editor = await openEditor()
  await editor.fill('A')
  await editor.press('Shift+Enter')
  await editor.pressSequentially('B')
  await editor.press('Enter')
  await expect(textField).toHaveValue('A\nB')

  // One edit = one undo step
  await openPanel(page, 'Edit')
  await page.getByRole('button', { name: 'Undo' }).click()
  await openPanel(page, 'Properties')
  await expect(textField).toHaveValue('Shipping')
})

// T4.4 / R9: properties update the canvas immediately; typing is one undo step.
test('properties panel edits position and content', async ({ page }) => {
  await clickAt(page, TEXT)
  await page.keyboard.press('Delete')
  await clickAt(page, QR)
  await expect(status(page)).toContainText('qr at 19.0, 1.0 mm')

  await openPanel(page, 'Properties')
  const x = props(page).getByLabel('X (mm)')
  await x.fill('')
  await x.pressSequentially('1.5')
  await expect(status(page)).toContainText('qr at 1.5, 1.0 mm')
  // Canvas updated: QR ink now on the left, none where it was.
  await expect
    .poll(() => inkIn(page, { x: 16, y: 12, width: 72, height: 72 }))
    .toBeGreaterThan(0.2)
  expect(await inkIn(page, { x: 160, y: 12, width: 72, height: 72 })).toBe(0)

  await openPanel(page, 'Edit')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(status(page)).toContainText('qr at 19.0, 1.0 mm')

  await openPanel(page, 'Properties')
  await props(page).getByLabel('Rotation (°)').fill('90')
  await expect(status(page)).toContainText('90°')

  await props(page).getByLabel('Content').fill('Changed')
  await expect(props(page).getByLabel('Content')).toHaveValue('Changed')
})

// T4.3 / R6.AC1: file picker, clipboard paste, bad file.
test('adds images from a file and from the clipboard', async ({ page }) => {
  const png = await pngBuffer(page)
  await page
    .getByTestId('image-file')
    .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png })
  await expect(status(page)).toContainText('3 objects · 1 selected · image at')
  // 2:1 image fits 80% of 30 mm width → 24 × 12? limited by 80% of 12 mm height
  await expect(status(page)).toContainText('19.2 × 9.6 mm')

  await openPanel(page, 'Properties')
  await props(page).getByLabel('Black and white').selectOption('threshold')
  await expect(props(page).getByLabel('Threshold')).toHaveValue('128')

  await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))
    const dt = new DataTransfer()
    dt.items.add(new File([bytes], 'pasted.png', { type: 'image/png' }))
    window.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }),
    )
  }, png.toString('base64'))
  await expect(status(page)).toContainText('4 objects · 1 selected · image at')

  await openPanel(page, 'Add')
  await page.getByTestId('image-file').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hello'),
  })
  await expect(page.getByRole('alert')).toContainText('not a PNG, JPEG or SVG')
})

// T4.5 / R3: label size, dpi from the printer, print-head warning.
test('label setup with printer dpi and print-head warning', async ({
  page,
}) => {
  await openPanel(page, 'Properties')
  const label = props(page).getByRole('group', { name: 'Label' })
  await label.getByLabel('Width (mm)').fill('40')
  await expect(page.locator('#editor-title')).toContainText('40 × 12 mm')
  await expect(label.getByLabel('Resolution')).toBeEnabled()
  await expect(label.getByRole('note')).toHaveCount(0)

  await connectEmulator(page)
  await expect(label.getByLabel('Resolution (from D110_M)')).toBeDisabled()
  await expect(label.getByLabel('Resolution (from D110_M)')).toHaveValue('203')

  // 12 mm = 96 dots fits the 96-dot head; 20 mm does not.
  await label.getByLabel('Height (mm)').fill('20')
  await expect(label.getByRole('note')).toContainText('print head is 96 dots')
})
