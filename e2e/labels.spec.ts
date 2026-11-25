import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { openPanel } from './helpers.ts'

/* Save / load (M5: T5.1–T5.3, R10). Start label: 30 × 12 mm, 2 objects. */

const status = (page: Page) => page.getByTestId('editor-status')
const labelName = (page: Page) => page.getByTestId('label-name')
const labels = (page: Page) => page.getByRole('group', { name: 'Labels' })
const addRect = async (page: Page) => {
  await openPanel(page, 'Add')
  await page
    .getByRole('group', { name: 'Add' })
    .getByRole('button', { name: 'Rectangle', exact: true })
    .click()
}

/** Wait until the latest change has been auto-saved. */
const waitSaved = async (page: Page) => {
  await expect(page.getByTestId('autosave')).toHaveText('Kept in this browser')
}

const download = async (page: Page, button: string) => {
  await openPanel(page, 'Labels')
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
  await openPanel(page, 'Labels')
  await labels(page).getByRole('button', { name: 'Save', exact: true }).click()
  const saveDialog = page.getByRole('dialog', { name: 'Save label as' })
  await saveDialog.getByLabel('Name').fill('Shelf A')
  await saveDialog.getByRole('button', { name: 'Save' }).click()
  await expect(saveDialog).toBeHidden()
  await expect(labelName(page)).toHaveText('Shelf A')

  // Change it, then Save overwrites without asking for a name
  await addRect(page)
  await expect(page.getByText('unsaved changes')).toBeVisible()
  await openPanel(page, 'Labels')
  await labels(page).getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('unsaved changes')).toBeHidden()

  // New label, then edit it so it has unsaved changes
  await openPanel(page, 'Labels')
  await labels(page).getByRole('button', { name: 'New' }).click()
  await expect(labelName(page)).toHaveText('Untitled')
  await expect(status(page)).toContainText('0 objects')
  await addRect(page)

  // Open the saved label: asks before discarding the unsaved one
  await openPanel(page, 'Labels')
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
  await openPanel(page, 'Labels')
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
  await openPanel(page, 'Labels')
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
  await openPanel(page, 'Labels') // import errors show in the Labels panel
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

// R10.AC5: rename the current label from the header.
test('renames the label from the header', async ({ page }) => {
  const renameTo = async (name: string) => {
    await page
      .getByRole('button', { name: /Rename label|Untitled|Shelf/ })
      .first()
      .click()
    const input = page.getByLabel('Label name')
    await input.fill(name)
    await input.press('Enter')
  }

  // Unsaved label: the name is kept for Save and auto-save.
  await renameTo('Shelf B')
  await expect(labelName(page)).toHaveText('Shelf B')
  await waitSaved(page)
  await page.reload()
  await expect(labelName(page)).toHaveText('Shelf B')
  await openPanel(page, 'Labels')
  await labels(page).getByRole('button', { name: 'Save', exact: true }).click()
  const saveDialog = page.getByRole('dialog', { name: 'Save label as' })
  await expect(saveDialog.getByLabel('Name')).toHaveValue('Shelf B')
  await saveDialog.getByRole('button', { name: 'Save' }).click()
  await expect(saveDialog).toBeHidden()

  // Saved label with unsaved changes: renamed in storage, changes stay unsaved.
  await addRect(page)
  await expect(page.getByText('unsaved changes')).toBeVisible()
  await renameTo('Shelf C')
  await expect(labelName(page)).toHaveText('Shelf C')
  await expect(page.getByText('unsaved changes')).toBeVisible()
  await openPanel(page, 'Labels')
  await labels(page).getByRole('button', { name: 'Open…' }).click()
  const open = page.getByRole('dialog', { name: 'Open label' })
  await expect(open.getByText('Shelf C')).toBeVisible()
  await expect(open.getByText('Shelf B')).toHaveCount(0)

  // Escape cancels.
  await open.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('button', { name: /Shelf C/ }).click()
  await page.getByLabel('Label name').fill('Nope')
  await page.getByLabel('Label name').press('Escape')
  await expect(labelName(page)).toHaveText('Shelf C')
})
