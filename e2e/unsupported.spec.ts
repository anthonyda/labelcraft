import { expect, test } from '@playwright/test'
import { openPanel, status } from './helpers.ts'

/*
 * R1, C4 / T7.3: a browser without Web Bluetooth and Web Serial (Firefox,
 * Safari), simulated in Chromium by hiding both APIs.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    for (const api of ['bluetooth', 'serial']) {
      Object.defineProperty(Navigator.prototype, api, {
        get: () => undefined,
        configurable: true,
      })
    }
  })
  await page.goto('./')
  await expect(status(page)).toContainText('2 objects')
})

test('says so on load; the editor works; printing needs a printer', async ({
  page,
}) => {
  const notice = page.getByTestId('browser-notice')
  await expect(notice).toContainText("This browser can't print")

  // The editor works.
  await openPanel(page, 'Add')
  await page
    .getByRole('group', { name: 'Add' })
    .getByRole('button', { name: 'Text', exact: true })
    .click()
  await expect(status(page)).toContainText('3 objects')

  // Only the emulator can connect; real transports aren't offered.
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: /^Printer:/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Printer' })
  await expect(dialog).toContainText("can't reach real printers")
  await expect(dialog.getByLabel('Bluetooth')).toHaveCount(0)
  await expect(dialog.getByLabel(/USB cable/)).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Done' }).click()

  // Print is disabled without a printer.
  await page.getByRole('button', { name: 'Print…' }).click()
  const print = page.getByRole('dialog', { name: 'Print' })
  await expect(
    print.getByRole('button', { name: 'Connect a printer first' }),
  ).toBeDisabled()
  await print.getByRole('button', { name: 'Close' }).click()

  // Dismissed for the session.
  await notice.getByRole('button', { name: 'Dismiss' }).click()
  await expect(notice).toBeHidden()
  await page.reload()
  await expect(status(page)).toContainText('objects')
  await expect(page.getByTestId('browser-notice')).toHaveCount(0)
})

test('no notice in a browser that can print', async ({ browser }) => {
  const page = await browser.newPage()
  await page.goto('http://localhost:4173/')
  await expect(page.getByTestId('editor-status')).toContainText('2 objects')
  // Chromium has Web Bluetooth or Web Serial.
  await expect(page.getByTestId('browser-notice')).toHaveCount(0)
  await page.close()
})
