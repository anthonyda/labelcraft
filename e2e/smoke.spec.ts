import { expect, test } from '@playwright/test'

// T0.4 smoke test: the built app loads and renders.
test('app loads', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'labelcraft' })).toBeVisible()
  await expect(
    page.getByText('not affiliated with or endorsed by NIIMBOT'),
  ).toBeVisible()
})
