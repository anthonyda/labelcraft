import { expect, test, type Page } from '@playwright/test'
import { clickAt, connectEmulator, openPanel, status } from './helpers.ts'

/*
 * Printer model, official label sizes, loaded roll and objects outside the
 * label (M6b: T6b.0–T6b.5, R12, R17–R19). Start label: 30 × 12 mm with text
 * at dots (8, 12) 144 × 72 and a QR code at (152, 8) 80 × 80.
 */
const TEXT = { x: 80, y: 48 }
const QR = { x: 192, y: 48 }

const props = (page: Page) =>
  page.getByRole('complementary', { name: 'Properties' })

const labelGroup = async (page: Page) => {
  await openPanel(page, 'Properties')
  return props(page).getByRole('group', { name: 'Label' })
}
const title = (page: Page) => page.locator('#editor-title')
const sizeOptions = (page: Page) =>
  props(page)
    .getByLabel('Size')
    .locator('option')
    .evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value))

const printerDialog = async (page: Page) => {
  await page.getByRole('button', { name: /^Printer:/ }).click()
  return page.getByRole('dialog', { name: 'Printer' })
}

const editButton = async (page: Page, name: string) => {
  await openPanel(page, 'Edit')
  await page.getByRole('button', { name, exact: true }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await expect(status(page)).toContainText('2 objects')
})

// R3.AC1, R12.AC1–AC2, AC5–AC6
test('pick an official size, or Custom', async ({ page }) => {
  const label = await labelGroup(page)
  // The sample label is the 12 × 30 mm D roll.
  await expect(label.getByLabel('Size')).toHaveValue('D-12x30')
  await expect(label.getByLabel('Width (mm)')).toHaveCount(0)

  await label.getByLabel('Size').selectOption('D-12x22')
  await expect(title(page)).toContainText('22 × 12 mm')
  await expect(status(page)).toContainText('2 objects')

  await label.getByLabel('Size').selectOption('custom')
  await expect(label.getByLabel('Width (mm)')).toHaveValue('22')
  await label.getByLabel('Width (mm)').fill('33')
  await label.getByLabel('Height (mm)').fill('11')
  await expect(title(page)).toContainText('33 × 11 mm')
  await expect(label.getByLabel('Size')).toHaveValue('custom')

  // Each size change is one undo step.
  await editButton(page, 'Undo')
  await expect(title(page)).toContainText('33 × 12 mm')
  await editButton(page, 'Undo')
  await expect(title(page)).toContainText('22 × 12 mm')
  await editButton(page, 'Undo')
  await editButton(page, 'Undo')
  await expect(title(page)).toContainText('30 × 12 mm')
})

// R17.AC2, AC5–AC6, R12.AC3–AC4, AC8
test('choose a printer model while disconnected', async ({ page }) => {
  const dialog = await printerDialog(page)
  await dialog.getByLabel('Printer model').selectOption('B21')
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('button', { name: /^Printer:/ })).toHaveText(
    'Printer: B21chosen, not connected',
  )

  const label = await labelGroup(page)
  await expect(label.getByLabel('Resolution (from B21, chosen)')).toHaveValue(
    '203',
  )
  const values = await sizeOptions(page)
  expect(values).toContain('B-50x30')
  expect(values.every((v) => v.startsWith('B-') || v === 'custom')).toBe(true)

  // 50 mm rolls print 48 mm on the B21's 384-dot head.
  await label.getByLabel('Size').selectOption('B-50x30')
  await expect(title(page)).toContainText('48.05 × 30 mm')
  await expect(label.getByLabel('Size').locator('option:checked')).toHaveText(
    '50 × 30 mm, prints 48.0 mm',
  )

  // Remembered on the next visit.
  await page.reload()
  await expect(page.getByRole('button', { name: /^Printer:/ })).toHaveText(
    'Printer: B21chosen, not connected',
  )
})

// R17.AC1, AC3
test('the detected model replaces the chosen one', async ({ page }) => {
  const dialog = await printerDialog(page)
  await dialog.getByLabel('Printer model').selectOption('B21')
  await dialog.getByLabel(/Emulated D110_M/).check()
  await dialog.getByRole('button', { name: 'Connect' }).click()
  await expect(
    dialog.getByRole('status').filter({ hasText: 'Detected' }),
  ).toHaveText('Detected D110_M; it replaces the B21 you had chosen.')
  // R24.AC2: a detected model is shown as text.
  await expect(dialog.getByTestId('printer-model')).toHaveText(
    'Model: D110_M (detected)',
  )
  await expect(dialog.getByLabel('Printer model')).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Done' }).click()

  await labelGroup(page)
  const values = await sizeOptions(page)
  expect(values.every((v) => v.startsWith('D-') || v === 'custom')).toBe(true)
})

// R18.AC1–AC4
test('offer the loaded roll when the label has objects', async ({ page }) => {
  const dialog = await printerDialog(page)
  await dialog.getByLabel(/Emulated D110_M/).check()
  await dialog.getByRole('button', { name: 'Connect' }).click()
  await expect(dialog.getByTestId('loaded-roll')).toHaveText(
    'Loaded roll: 12 × 40 mm, labels with gaps · 145 labels left',
  )
  // Not applied by itself: the label has objects.
  await expect(title(page)).toContainText('30 × 12 mm')
  await dialog
    .getByRole('button', { name: 'Use loaded roll (12 × 40 mm)' })
    .click()
  await expect(title(page)).toContainText('40 × 12 mm')
  await expect(
    dialog.getByRole('button', { name: /Use loaded roll/ }),
  ).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Read roll' }).click()
  await expect(dialog.getByTestId('loaded-roll')).toContainText('12 × 40 mm')
  await dialog.getByRole('button', { name: 'Done' }).click()

  const label = await labelGroup(page)
  await expect(label.getByLabel('Size')).toHaveValue('D-12x40')
  await editButton(page, 'Undo')
  await expect(title(page)).toContainText('30 × 12 mm')
})

// R18.AC3
test('an empty label takes the loaded roll automatically', async ({ page }) => {
  for (const at of [TEXT, QR]) {
    await clickAt(page, at)
    await expect(status(page)).toContainText('1 selected')
    await editButton(page, 'Delete')
  }
  await expect(status(page)).toContainText('0 objects')
  await connectEmulator(page)
  await expect(title(page)).toContainText('40 × 12 mm')
})

/** Red outline pixels (R19.AC1) on the editor canvas. */
const redPixels = (page: Page) =>
  page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>(
      '[data-testid="editor-canvas"] canvas',
    )!
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
    let n = 0
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 180 && d[i + 1] < 90 && d[i + 2] < 90) n++
    }
    return n
  })

// R19
test('objects outside the label are outlined and warned about', async ({
  page,
}) => {
  expect(await redPixels(page)).toBe(0)

  // R19.AC4: a text box far past the edge, with its text inside, is fine.
  await clickAt(page, TEXT)
  await expect(status(page)).toContainText('text at')
  await openPanel(page, 'Properties')
  await props(page).getByLabel('Height (mm)').fill('30')
  await expect(status(page)).toContainText('× 30.0 mm')
  await page.waitForTimeout(300)
  await expect(status(page)).not.toContainText('outside the label')
  await expect(page.getByTestId('editor-canvas')).toHaveAttribute(
    'data-outside',
    '',
  )

  await clickAt(page, QR)
  await expect(status(page)).toContainText('1 selected')
  await openPanel(page, 'Properties')
  await props(page).getByLabel('X (mm)').fill('25')
  await expect(status(page)).toContainText('1 outside the label')
  await expect(page.getByTestId('editor-canvas')).toHaveAttribute(
    'data-outside',
    /\S/,
  )
  // Deselect (click beside the label, below the banner), so the selection
  // frame doesn't cover the outline.
  const box = (await page.getByTestId('editor-canvas').boundingBox())!
  await page.mouse.click(box.x + 4, box.y + box.height - 4)
  await expect(status(page)).toContainText('0 selected')
  await expect.poll(() => redPixels(page)).toBeGreaterThan(20)

  // R19.AC3: warned before printing, but not blocked.
  await connectEmulator(page)
  await page.getByRole('button', { name: 'Print…' }).click()
  const print = page.getByRole('dialog', { name: 'Print' })
  await expect(print.getByTestId('outside-warning')).toHaveText(
    "1 object goes past the label edge; the parts outside won't print.",
  )
  await print.getByRole('button', { name: 'Print', exact: true }).click()
  await expect(print.getByRole('status').first()).toHaveText('Printed.', {
    timeout: 15_000,
  })
})
