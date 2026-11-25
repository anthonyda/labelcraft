import { expect, test } from '@playwright/test'
import { openPanel } from './helpers.ts'

// T0.4 smoke test: the built app loads and renders.
test('app loads', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'labelcraft' })).toBeVisible()
  // On phones the notice is in the Labels panel's About section (R24.AC4).
  await openPanel(page, 'Labels')
  await expect(
    page.getByText('not affiliated with or endorsed by NIIMBOT'),
  ).toBeVisible()
})
