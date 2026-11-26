import { expect, test, type Page } from '@playwright/test'
import { connectEmulator, openPanel, status } from './helpers.ts'

/* Roll colour (R28). */

const labelGroup = async (page: Page) => {
  await openPanel(page, 'Properties')
  return page
    .getByRole('complementary', { name: 'Properties' })
    .getByRole('group', { name: 'Label' })
}
const canvas = (page: Page) => page.getByTestId('editor-canvas')

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await expect(status(page)).toContainText('2 objects')
})

test('pick a roll colour; the label shows it, printing does not', async ({
  page,
}) => {
  const label = await labelGroup(page)
  const swatches = label.getByRole('group', { name: 'Roll colour' })
  await expect(swatches.getByRole('button', { name: 'White' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await swatches.getByRole('button', { name: 'Yellow' }).click()
  await expect(
    swatches.getByRole('button', { name: 'Yellow' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(label.getByTestId('roll-color-name')).toHaveText('Yellow')
  await expect(canvas(page)).toHaveAttribute('data-roll-color', '#ffe04a')

  // Custom colour from the system picker.
  await swatches.getByLabel('Custom colour').fill('#123456')
  await expect(label.getByTestId('roll-color-name')).toHaveText(
    'Custom #123456',
  )
  await expect(canvas(page)).toHaveAttribute('data-roll-color', '#123456')

  // AC3: one undo step each.
  await openPanel(page, 'Edit')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(canvas(page)).toHaveAttribute('data-roll-color', '#ffe04a')

  // AC4: the print preview stays black on white.
  await connectEmulator(page)
  await page.getByRole('button', { name: 'Print…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Print' })
  const corner = await dialog
    .getByTestId('print-preview')
    .evaluate((c: HTMLCanvasElement) => [
      ...c.getContext('2d')!.getImageData(1, 1, 1, 1).data,
    ])
  expect(corner).toEqual([255, 255, 255, 255])
  await dialog.getByRole('button', { name: 'Print', exact: true }).click()
  await expect(dialog.getByRole('status').first()).toHaveText('Printed.', {
    timeout: 15_000,
  })
  await expect(
    dialog.getByText('Matches the preview pixel for pixel.'),
  ).toBeVisible()
})

test('clear rolls show a checkerboard', async ({ page }) => {
  const label = await labelGroup(page)
  await label
    .getByRole('group', { name: 'Roll colour' })
    .getByRole('button', { name: 'Clear' })
    .click()
  await expect(canvas(page)).toHaveAttribute('data-roll-color', 'clear')
  await expect(page.getByTestId('autosave')).toHaveText('Saving…')
  await expect(page.getByTestId('autosave')).toHaveText('Kept in this browser')
  await page.reload()
  // Saved with the label (auto-save).
  await expect(canvas(page)).toHaveAttribute('data-roll-color', 'clear')
})
