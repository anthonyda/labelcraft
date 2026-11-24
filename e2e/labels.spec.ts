import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

/* Save / load (M5: T5.1–T5.3, R10). Start label: 30 × 12 mm, 2 objects. */

const status = (page: Page) => page.getByTestId('editor-status')
const labelName = (page: Page) => page.getByTestId('label-name')
const labels = (page: Page) => page.getByRole('group', { name: 'Labels' })
const addRect = (page: Page) =>
  page
    .getByRole('group', { name: 'Add' })
    .getByRole('button', { name: '+ Rectangle' })
    .click()

/** Wait until the latest change has been auto-saved. */
const waitSaved = async (page: Page) => {
  await expect(page.getByTestId('autosave')).toHaveText('Kept in this browser')
}

const download = async (page: Page, button: string) => {
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    labels(page).getByRole('button', { name: button, exact: true }).click(),
  ])
  return {
    name: file.suggestedFilename(),
    data: await readFile((await file.path())!),
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await expect(status(page)).toContainText('2 objects')
  await waitSaved(page)
})

// T5.1 / R10.AC1
test('auto-saves and restores the label after a reload', async ({ page }) => {
  await addRect(page)
  await expect(page.getByTestId('autosave')).toHaveText('Saving…')
  await waitSaved(page)
  await page.reload()
  await expect(status(page)).toContainText('3 objects')
})

// T5.2 / R10.AC2
test('saves, reopens and deletes named labels', async ({ page }) => {
  // Save as a new named label
  await labels(page).getByRole('button', { name: 'Save', exact: true }).click()
  const saveDialog = page.getByRole('dialog', { name: 'Save label as' })
  await saveDialog.getByLabel('Name').fill('Shelf A')
  await saveDialog.getByRole('button', { name: 'Save' }).click()
  await expect(saveDialog).toBeHidden()
  await expect(labelName(page)).toHaveText('Shelf A')

  // Change it, then Save overwrites without asking for a name
  await addRect(page)
  await expect(page.getByText('unsaved changes')).toBeVisible()
  await labels(page).getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('unsaved changes')).toBeHidden()

  // New label, then edit it so it has unsaved changes
  await labels(page).getByRole('button', { name: 'New' }).click()
  await expect(labelName(page)).toHaveText('Untitled')
  await expect(status(page)).toContainText('0 objects')
  await addRect(page)

  // Open the saved label: asks before discarding the unsaved one
  await labels(page).getByRole('button', { name: 'Open…' }).click()
  const openDialog = page.getByRole('dialog', { name: 'Open label' })
  const item = openDialog.getByRole('listitem').filter({ hasText: 'Shelf A' })
  await expect(item.locator('img')).toBeVisible() // thumbnail
  await item.getByRole('button', { name: 'Open' }).click()
  const confirm = page.getByRole('dialog', { name: 'Discard changes?' })
  await confirm.getByRole('button', { name: 'Discard' }).click()
  await expect(labelName(page)).toHaveText('Shelf A')
  await expect(status(page)).toContainText('3 objects')

  // Delete it (two steps)
  await labels(page).getByRole('button', { name: 'Open…' }).click()
  await item.getByRole('button', { name: 'Delete', exact: true }).click()
  await item.getByRole('button', { name: 'Delete "Shelf A"' }).click()
  await expect(openDialog.getByText('No saved labels yet')).toBeVisible()
})

// T5.2: "Keep editing" leaves the current label alone.
test('keeps the current label when discarding is declined', async ({
  page,
}) => {
  await addRect(page)
  await labels(page).getByRole('button', { name: 'New' }).click()
  const confirm = page.getByRole('dialog', { name: 'Discard changes?' })
  await confirm.getByRole('button', { name: 'Keep editing' }).click()
  await expect(confirm).toBeHidden()
  await expect(status(page)).toContainText('3 objects')
})

// T5.3 / R10.AC3: JSON round trip and invalid files.
test('exports and imports a label file', async ({ page }) => {
  const { name, data } = await download(page, 'Export file')
  expect(name).toBe('label.labelcraft.json')
  const doc = JSON.parse(data.toString('utf8'))
  expect(doc.version).toBe(1)
  expect(doc.objects).toHaveLength(2)

  doc.label.widthMm = 40
  doc.objects.pop()
  await page.getByTestId('import-file').setInputFiles({
    name: 'Bin 7.labelcraft.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(doc)),
  })
  await expect(labelName(page)).toHaveText('Bin 7')
  await expect(page.locator('#editor-title')).toContainText('40 × 12 mm')
  await expect(status(page)).toContainText('1 objects')

  await page.getByTestId('import-file').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{ not json'),
  })
  await expect(page.getByRole('alert')).toContainText('not valid JSON')

  await page.getByTestId('import-file').setInputFiles({
    name: 'future.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ ...doc, version: 9 })),
  })
  await expect(page.getByRole('alert')).toContainText('version 9')
  await expect(labelName(page)).toHaveText('Bin 7') // unchanged
})

// T5.3 / R10.AC4: PNG of the print bitmap.
test('exports the label as a PNG at printer resolution', async ({ page }) => {
  const { name, data } = await download(page, 'Export PNG')
  expect(name).toBe('label.png')
  expect(data.subarray(1, 4).toString('ascii')).toBe('PNG')
  // IHDR: width and height (big-endian) at bytes 16–23
  expect(data.readUInt32BE(16)).toBe(240)
  expect(data.readUInt32BE(20)).toBe(96)
})
