import { expect, test, type Page } from '@playwright/test'
import { connectEmulator, openPanel, status } from './helpers.ts'

/* Orientation and frames (M6e: T6e.1–T6e.2, R22, R23). Start: 30 × 12 mm. */

const labelGroup = async (page: Page) => {
  await openPanel(page, 'Properties')
  return page
    .getByRole('complementary', { name: 'Properties' })
    .getByRole('group', { name: 'Label' })
}
const title = (page: Page) => page.locator('#editor-title')
const undo = async (page: Page) => {
  await openPanel(page, 'Edit')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
}

const printToEmulator = async (page: Page) => {
  await connectEmulator(page)
  await page.getByRole('button', { name: 'Print…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Print' })
  await dialog.getByRole('button', { name: 'Print', exact: true }).click()
  await expect(dialog.getByRole('status').first()).toHaveText('Printed.', {
    timeout: 15_000,
  })
  return dialog
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await expect(status(page)).toContainText('2 objects')
})

// R22
test('portrait turns the label and its design; prints matching the preview', async ({
  page,
}) => {
  const label = await labelGroup(page)
  await expect(label.getByLabel('Orientation')).toHaveValue('landscape')
  await label.getByLabel('Orientation').selectOption('portrait')
  await expect(title(page)).toContainText('12 × 30 mm')
  await expect(label.getByLabel('Size')).toHaveValue('D-12x30')
  await expect(status(page)).not.toContainText('outside the label')

  const canvas = page.getByTestId('editor-canvas')
  const box = (await canvas.boundingBox())!
  expect(box.height).toBeGreaterThan(0)

  const dialog = await printToEmulator(page)
  await expect(
    dialog.getByText('Matches the preview pixel for pixel.'),
  ).toBeVisible()
  const preview = await dialog
    .getByTestId('print-preview')
    .evaluate((c: HTMLCanvasElement) => [c.width, c.height])
  expect(preview[1]).toBeGreaterThan(preview[0]) // portrait preview
  await dialog.getByRole('button', { name: 'Close' }).click()

  await undo(page)
  await expect(title(page)).toContainText('30 × 12 mm')
})

// R23
test('pick a frame; it shows in the preview and prints', async ({ page }) => {
  const label = await labelGroup(page)
  const frames = label.getByRole('group', { name: 'Frame', exact: true })
  await expect(frames.getByRole('button', { name: 'None' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await frames.getByRole('button', { name: 'Double line' }).click()
  await expect(
    frames.getByRole('button', { name: 'Double line' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(label.getByLabel('Thickness (mm)')).toHaveValue('0.3')
  await label.getByLabel('Inset (mm)').fill('1')

  const dialog = await printToEmulator(page)
  // Ink near the left edge of the preview: the frame at inset 1 mm (8 dots).
  const edgeInk = await dialog
    .getByTestId('print-preview')
    .evaluate((c: HTMLCanvasElement) => {
      const d = c.getContext('2d')!.getImageData(8, 48, 1, 1).data
      return d[0]
    })
  expect(edgeInk).toBe(0)
  await expect(
    dialog.getByText('Matches the preview pixel for pixel.'),
  ).toBeVisible()
})

// R23.AC1: categories; a decorative frame prints matching the preview.
test('frame categories; a decorative frame prints', async ({ page }) => {
  const label = await labelGroup(page)
  const chips = label.getByRole('group', { name: 'Frame categories' })
  const frames = label.getByRole('group', { name: 'Frame', exact: true })
  await expect(chips.getByRole('button')).toHaveText([
    'Basic',
    'Lines',
    'Corners',
    'Shapes',
    'Decorative',
    'Fancy',
  ])
  await expect(chips.getByRole('button', { name: 'Basic' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await chips.getByRole('button', { name: 'Decorative' }).click()
  await expect(frames.getByRole('button')).toHaveText([
    'Wavy',
    'Zigzag',
    'Scalloped',
    'Stamp',
    'Beads',
    'Diamonds',
    'Stars',
    'Hearts',
    'Crosses',
    'Checker',
    'Sawtooth',
  ])
  await frames.getByRole('button', { name: 'Stamp' }).click()
  await expect(frames.getByRole('button', { name: 'Stamp' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  const dialog = await printToEmulator(page)
  await expect(
    dialog.getByText('Matches the preview pixel for pixel.'),
  ).toBeVisible()
})
