import { expect, test } from '@playwright/test'

// T2.4 / R2, R11, R16: connect to the emulated D110_M and print the sample label.
test('prints to the emulated D110_M and shows matching output', async ({
  page,
}) => {
  await page.goto('./')

  await page.getByRole('button', { name: /^Printer:/ }).click()
  const printer = page.getByRole('dialog', { name: 'Printer' })
  await printer.getByLabel(/Emulated D110_M/).check()
  await printer.getByRole('button', { name: 'Connect' }).click()
  await expect(printer.getByText('Connected to')).toContainText(
    'Emulated D110_M',
  )
  // R16.AC4: clearly labelled as emulated, in the dialog and the header
  await expect(printer.locator('.badge')).toHaveText('Emulated')
  await printer.getByRole('button', { name: 'Done' }).click()
  await expect(
    page.getByRole('button', { name: /^Printer: D110_M/ }),
  ).toContainText('Emulated')

  await page.getByRole('button', { name: 'Print…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Print' })
  await expect(dialog.getByRole('img', { name: 'Print preview' })).toBeVisible()

  await dialog.getByLabel('Copies').fill('2')
  await dialog.getByRole('button', { name: 'Print', exact: true }).click()

  await expect(dialog.getByRole('status').first()).toHaveText('Printed.', {
    timeout: 15_000,
  })
  // R16.AC3: received bitmap equals the preview
  await expect(
    dialog.getByRole('img', {
      name: 'Bitmap received by the emulated printer',
    }),
  ).toBeVisible()
  await expect(
    dialog.getByText('Matches the preview pixel for pixel.'),
  ).toBeVisible()

  const same = await page.evaluate(() => {
    const read = (id: string) => {
      const c = document.querySelector<HTMLCanvasElement>(
        `canvas[data-testid="${id}"]`,
      )!
      return Array.from(
        c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data,
      )
    }
    const a = read('print-preview')
    const b = read('emulator-output')
    return (
      a.length > 0 && a.length === b.length && a.every((v, i) => v === b[i])
    )
  })
  expect(same).toBe(true)

  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toBeHidden()
  await page.getByRole('button', { name: /^Printer:/ }).click()
  await printer.getByRole('button', { name: 'Disconnect' }).click()
  await expect(printer.getByText('Not connected.')).toBeVisible()
  await printer.getByRole('button', { name: 'Done' }).click()
  await expect(
    page.getByRole('button', { name: 'Printer: Not connected' }),
  ).toBeVisible()
})

// R11.AC1: print stays disabled while disconnected.
test('print is disabled until a printer is connected', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Print…' }).click()
  await expect(
    page.getByRole('button', { name: 'Connect a printer first' }),
  ).toBeDisabled()
})
