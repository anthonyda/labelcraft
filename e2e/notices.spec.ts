import { expect, test, type Page } from '@playwright/test'
import { clickAt, openPanel, status } from './helpers.ts'

/* Notices and the outside banner (R8.AC5, R19.AC5). QR at dots (152, 8). */
const QR = { x: 192, y: 48 }

const props = (page: Page) =>
  page.getByRole('complementary', { name: 'Properties' })

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await expect(status(page)).toContainText('2 objects')
})

// R19.AC5
test('a banner stays while an element is outside the label', async ({
  page,
}) => {
  const banner = page.getByTestId('outside-banner')
  await expect(banner).toHaveCount(0)
  await clickAt(page, QR)
  await openPanel(page, 'Properties')
  await props(page).getByLabel('X (mm)').fill('25')
  await expect(banner).toContainText(
    'Attention: 1 element is outside the label',
  )
  // It stays: still there after other edits and a while later.
  await page.waitForTimeout(1500)
  await expect(banner).toBeVisible()
  // Select picks the elements that are outside.
  await banner.getByRole('button', { name: 'Select' }).click()
  await expect(status(page)).toContainText('1 selected · qr at 25.0')
  await openPanel(page, 'Properties')
  await props(page).getByLabel('X (mm)').fill('19')
  await expect(banner).toHaveCount(0)
})

// R8.AC5
test('says why a barcode grew back', async ({ page }) => {
  await openPanel(page, 'Add')
  await page.getByRole('button', { name: 'Barcode', exact: true }).click()
  await expect(status(page)).toContainText('barcode at')
  await openPanel(page, 'Properties')
  await props(page).getByLabel('Width (mm)').fill('5')
  await props(page).getByLabel('Width (mm)').blur()
  const notice = page.getByTestId('editor-notice')
  await expect(notice).toContainText('Barcode widened to 12.')
  await expect(notice).toContainText('at least one printer dot')
  await notice.getByRole('button', { name: 'Dismiss' }).click()
  await expect(notice).toHaveCount(0)
})
