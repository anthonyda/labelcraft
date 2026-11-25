import { expect, test, type Page } from '@playwright/test'
import { clickAt, isPhone, openPanel, status } from './helpers.ts'

/*
 * Layers panel (M6d: T6d.2–T6d.3, R21). Start label: text "Hello from
 * labelcraft" at the back, QR code (front) at dots (152, 8) 80 × 80.
 */
const QR_NAME = 'https://anthonyda.github.io/labelcraft/'
const QR = { x: 192, y: 48 }

const list = (page: Page) => page.getByRole('listbox', { name: 'Layers' })
const row = (page: Page, name: string | RegExp) =>
  list(page).getByRole('option', { name })

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await expect(status(page)).toContainText('2 objects')
})

// R21.AC1–AC2
test('lists layers front-most first and selects from the list', async ({
  page,
}) => {
  test.skip(isPhone(page), 'desktop panel')
  await expect(
    page.getByRole('complementary', { name: 'Layers' }),
  ).toBeVisible()
  await expect(list(page).getByRole('option')).toHaveText([
    QR_NAME,
    'Hello from labelcraft',
  ])

  await row(page, 'Hello from labelcraft').click()
  await expect(status(page)).toContainText('1 selected · text at')
  await row(page, QR_NAME).click({ modifiers: ['Shift'] })
  await expect(status(page)).toContainText('2 selected')
  await expect(row(page, QR_NAME)).toHaveAttribute('aria-selected', 'true')
  await row(page, QR_NAME).click({ modifiers: ['ControlOrMeta'] })
  await expect(status(page)).toContainText('1 selected · text at')

  // Selecting on the canvas highlights the row.
  await clickAt(page, QR)
  await expect(row(page, QR_NAME)).toHaveAttribute('aria-selected', 'true')
  await expect(row(page, 'Hello from labelcraft')).toHaveAttribute(
    'aria-selected',
    'false',
  )
})

// R21.AC3, AC5
test('keyboard: arrows, Space, Shift, and editor shortcuts', async ({
  page,
}) => {
  test.skip(isPhone(page), 'desktop panel')
  await list(page).focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Space')
  await expect(status(page)).toContainText('1 selected · text at')
  // Arrows move in the list; they don't nudge the object.
  await expect(status(page)).toContainText('text at 1.0, 1.5 mm')
  await page.keyboard.press('Shift+ArrowUp')
  await expect(status(page)).toContainText('2 selected')

  await page.keyboard.press('Delete')
  await expect(status(page)).toContainText('0 objects')
  await expect(page.getByText('No objects yet.')).toBeVisible()
})

// R21.AC4
test('marks layers outside the label', async ({ page }) => {
  await openPanel(page, 'Layers')
  await expect(row(page, /outside the label/)).toHaveCount(0)
  await clickAt(page, QR)
  await openPanel(page, 'Properties')
  await page
    .getByRole('complementary', { name: 'Properties' })
    .getByLabel('X (mm)')
    .fill('25')
  await expect(status(page)).toContainText('1 outside the label')
  await openPanel(page, 'Layers')
  await expect(row(page, /labelcraft\/\s*, outside the label$/)).toBeVisible()
  await expect(row(page, /outside the label/)).toHaveCount(1)
})

// R21.AC7
test('desktop: no horizontal page scroll at 900 px', async ({ page }) => {
  test.skip(isPhone(page), 'desktop panel')
  await page.setViewportSize({ width: 900, height: 700 })
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
  const canvas = (await page.getByTestId('editor-canvas').boundingBox())!
  expect(canvas.width).toBeGreaterThan(300)
})

// R21.AC6
test('phone: tapping a layer selects it and closes the panel', async ({
  page,
}) => {
  test.skip(!isPhone(page), 'phone panel')
  await openPanel(page, 'Layers')
  const r = row(page, 'Hello from labelcraft')
  expect((await r.boundingBox())!.height).toBeGreaterThanOrEqual(43.5)
  await r.click()
  await expect(page.getByRole('dialog', { name: 'Layers' })).toBeHidden()
  await expect(status(page)).toContainText('1 selected · text at')
})
