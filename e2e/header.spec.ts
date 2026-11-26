import { expect, test } from '@playwright/test'
import { connectEmulator, openPanel, isPhone, status } from './helpers.ts'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await expect(status(page)).toContainText('2 objects')
})

// R24.AC7
test('credits niimbluelib', async ({ page }) => {
  if (isPhone(page)) await openPanel(page, 'Labels')
  const link = page.getByTestId('lib-credit').filter({ visible: true }).first()
  await expect(link).toHaveText('niimbluelib')
  await expect(link).toHaveAttribute(
    'href',
    'https://github.com/MultiMote/niimbluelib',
  )
})

// R24.AC8
test('printer button: red when not connected, plain for the emulator', async ({
  page,
}) => {
  const button = page.getByRole('button', { name: /^Printer:/ })
  await expect(button).toHaveClass(/is-disconnected/)
  await expect(button).toHaveCSS('background-color', 'rgb(185, 28, 28)')
  await connectEmulator(page)
  await expect(button).not.toHaveClass(/is-disconnected|is-connected/)
})
