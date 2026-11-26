import { expect, test, type Page } from '@playwright/test'
import { connectEmulator, isPhone, openPanel, status } from './helpers.ts'

/* UI review fixes (R24). Start label: 30 × 12 mm, 2 objects. */

const props = (page: Page) =>
  page.getByRole('complementary', { name: 'Properties' })

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await expect(status(page)).toContainText('2 objects')
})

// R24.AC1
test('label size shown once; frames as a 3-column grid', async ({ page }) => {
  await openPanel(page, 'Properties')
  const label = props(page).getByRole('group', { name: 'Label' })
  await expect(label.getByTestId('label-dimensions')).toHaveText(
    'label 30 × 12 mm',
  )
  const tiles = label
    .getByRole('group', { name: 'Frame', exact: true })
    .getByRole('button')
  const ys = await tiles.evaluateAll((bs) =>
    bs.map((b) => Math.round(b.getBoundingClientRect().top)),
  )
  expect(ys[0]).toBe(ys[2]) // three per row
  expect(ys[3]).toBeGreaterThan(ys[0])
})

// R24.AC3
test('print dialog: copies stepper, darkness scale, size vs roll', async ({
  page,
}) => {
  await connectEmulator(page)
  await page.getByRole('button', { name: 'Print…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Print' })
  const copies = dialog.getByLabel('Copies', { exact: true })
  await expect(
    dialog.getByRole('button', { name: 'Fewer copies' }),
  ).toBeDisabled()
  await dialog.getByRole('button', { name: 'More copies' }).click()
  await dialog.getByRole('button', { name: 'More copies' }).click()
  await expect(copies).toHaveValue('3')
  await expect(dialog.getByText('Lighter')).toBeVisible()
  await expect(dialog.getByText('Darker')).toBeVisible()
  // 30 × 12 mm label on the emulator's 12 × 40 mm roll: a mismatch.
  await expect(dialog.getByTestId('print-size')).toHaveText(
    '30 × 12 mm label on a 12 × 40 mm roll',
  )
  await expect(dialog.getByTestId('roll-mismatch')).toBeVisible()
})

// R24.AC2
test('printer dialog: one status line; roll offer is the primary action', async ({
  page,
}) => {
  await page.getByRole('button', { name: /^Printer:/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Printer' })
  await dialog.getByLabel(/Emulated D110_M/).check()
  await dialog.getByRole('button', { name: 'Connect' }).click()
  await expect(
    dialog.getByRole('paragraph').filter({ hasText: 'Connected:' }),
  ).toContainText('Connected: D110_M')
  await expect(
    dialog.getByRole('button', { name: /Use loaded roll/ }),
  ).toHaveClass(/primary/)
})

// R24.AC4
test('phone: one-line header, About in Labels', async ({ page }) => {
  test.skip(!isPhone(page), 'phone')
  const header = (await page.locator('.app-header').boundingBox())!
  expect(header.height).toBeLessThan(64)
  await expect(page.getByRole('button', { name: /^Printer:/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Print…' })).toBeVisible()
  await openPanel(page, 'Labels')
  const about = page.getByRole('region', { name: 'About' })
  await expect(about).toContainText('not affiliated')
  await expect(about.getByTestId('build-commit')).toBeVisible()
})

// R24.AC5
test('layers: full name on hover; resizable panel', async ({ page }) => {
  test.skip(isPhone(page), 'desktop panel')
  const qr = page.getByRole('option', { name: /anthonyda/ })
  await expect(qr).toHaveAttribute(
    'title',
    'https://anthonyda.github.io/labelcraft/',
  )
  const aside = page.getByRole('complementary', { name: 'Layers' })
  const before = (await aside.boundingBox())!.width
  const handle = page.getByRole('separator', { name: 'Resize layers panel' })
  const h = (await handle.boundingBox())!
  await page.mouse.move(h.x + h.width / 2, h.y + 40)
  await page.mouse.down()
  await page.mouse.move(h.x + 80, h.y + 40, { steps: 5 })
  await page.mouse.up()
  await expect
    .poll(async () => (await aside.boundingBox())!.width)
    .toBeGreaterThan(before + 60)
  await page.reload()
  await expect
    .poll(async () => (await aside.boundingBox())!.width)
    .toBeGreaterThan(before + 60)
})
