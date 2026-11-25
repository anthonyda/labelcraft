import { expect, type Page } from '@playwright/test'

/** True for the phone layout (bottom bar + sheets). */
export const isPhone = (page: Page): boolean =>
  (page.viewportSize()?.width ?? 1280) < 900

export type PanelName = 'Labels' | 'Add' | 'Layers' | 'Edit' | 'Properties'

/** Make a tool panel reachable: on phones open its bottom sheet. */
export const openPanel = async (page: Page, name: PanelName) => {
  if (!isPhone(page)) return
  const button = page
    .getByRole('navigation', { name: 'Editor panels' })
    .getByRole('button', { name, exact: true })
  if ((await button.getAttribute('aria-expanded')) !== 'true') {
    await button.click()
  }
  await expect(page.getByRole('dialog', { name })).toBeVisible()
}

export const status = (page: Page) => page.getByTestId('editor-status')

/** Screen position of a point given in label printer dots. */
export const screen = async (page: Page, p: { x: number; y: number }) => {
  const canvas = page.getByTestId('editor-canvas')
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  const scale = Number(await canvas.getAttribute('data-scale'))
  const ox = Number(await canvas.getAttribute('data-origin-x'))
  const oy = Number(await canvas.getAttribute('data-origin-y'))
  const scrollLeft = await canvas.evaluate((el) => el.scrollLeft)
  const scrollTop = await canvas.evaluate((el) => el.scrollTop)
  return {
    x: box.x + ox + p.x * scale - scrollLeft,
    y: box.y + oy + p.y * scale - scrollTop,
    scale,
  }
}

export const clickAt = async (
  page: Page,
  p: { x: number; y: number },
  shift = false,
) => {
  const s = await screen(page, p)
  if (shift) await page.keyboard.down('Shift')
  await page.mouse.click(s.x, s.y)
  if (shift) await page.keyboard.up('Shift')
}

/** Connect to the emulated printer through the Printer dialog. */
export const connectEmulator = async (page: Page) => {
  await page.getByRole('button', { name: /^Printer:/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Printer' })
  await dialog.getByLabel(/Emulated D110_M/).check()
  await dialog.getByRole('button', { name: 'Connect' }).click()
  await expect(dialog.getByText('Connected to')).toBeVisible()
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(dialog).toBeHidden()
}

/** Share of dark pixels shown in a region of the editor canvas (label dots). */
export const inkIn = (
  page: Page,
  r: { x: number; y: number; width: number; height: number },
) =>
  page.evaluate((r) => {
    const wrap = document.querySelector<HTMLElement>(
      '[data-testid="editor-canvas"]',
    )!
    const scale = Number(wrap.dataset.scale)
    const ox = Number(wrap.dataset.originX)
    const oy = Number(wrap.dataset.originY)
    const c = wrap.querySelector('canvas')!
    const dpr = c.width / c.clientWidth
    const x0 = Math.round((ox + r.x * scale) * dpr)
    const y0 = Math.round((oy + r.y * scale) * dpr)
    const w = Math.round(r.width * scale * dpr)
    const h = Math.round(r.height * scale * dpr)
    const d = c.getContext('2d')!.getImageData(x0, y0, w, h).data
    let dark = 0
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && d[i] < 128) dark++
    return dark / (w * h)
  }, r)
