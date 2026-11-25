import { expect, test, type CDPSession, type Page } from '@playwright/test'
import {
  isPhone,
  openPanel,
  screen,
  status,
  type PanelName,
} from './helpers.ts'

/* Phone and desktop layout (M6: T6.1–T6.3, R15). */

const bottomBar = (page: Page) =>
  page.getByRole('navigation', { name: 'Editor panels' })

/** What each phone panel must make reachable (R15.AC3). */
const PANEL_CONTENT: Record<PanelName, string[]> = {
  Labels: [
    'New',
    'Open…',
    'Save',
    'Save as…',
    'Import…',
    'Export file',
    'Export PNG',
  ],
  Add: ['Text', 'Rectangle', 'Ellipse', 'Line', 'QR code', 'Barcode', 'Image'],
  Layers: [],
  Edit: [
    'Undo',
    'Redo',
    'Duplicate',
    'Delete',
    'To front',
    'To back',
    'Align left',
    'Align bottom',
    'Zoom in',
    'Fit',
  ],
  Properties: [],
}

type Pt = { x: number; y: number }

const touch = (
  client: CDPSession,
  type: 'touchStart' | 'touchMove' | 'touchEnd',
  points: Pt[],
) =>
  client.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map((p, i) => ({ x: p.x, y: p.y, id: i + 1 })),
  })

/** Move fingers from `from` to `to` in steps. */
const gesture = async (page: Page, from: Pt[], to: Pt[], steps = 8) => {
  const client = await page.context().newCDPSession(page)
  await touch(client, 'touchStart', from)
  for (let i = 1; i <= steps; i++) {
    await touch(
      client,
      'touchMove',
      from.map((f, k) => ({
        x: f.x + ((to[k].x - f.x) * i) / steps,
        y: f.y + ((to[k].y - f.y) * i) / steps,
      })),
    )
  }
  await touch(client, 'touchEnd', [])
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await expect(status(page)).toContainText('2 objects')
})

// R15.AC1
test('desktop: toolbar on top, properties beside the canvas', async ({
  page,
}) => {
  test.skip(isPhone(page), 'desktop layout')
  const toolbar = page.getByRole('toolbar', { name: 'Editor tools' })
  const canvas = page.getByTestId('editor-canvas')
  const props = page.getByRole('complementary', { name: 'Properties' })
  await expect(toolbar).toBeVisible()
  await expect(props).toBeVisible()
  await expect(bottomBar(page)).toHaveCount(0)
  const t = (await toolbar.boundingBox())!
  const c = (await canvas.boundingBox())!
  const p = (await props.boundingBox())!
  expect(t.y + t.height).toBeLessThanOrEqual(c.y + 1)
  expect(p.x).toBeGreaterThanOrEqual(c.x + c.width - 1)
})

// R15.AC2–AC3
test('phone: canvas fills the screen, every tool is in the bottom bar', async ({
  page,
}) => {
  test.skip(!isPhone(page), 'phone layout')
  await expect(bottomBar(page)).toBeVisible()
  await expect(page.getByRole('toolbar', { name: 'Editor tools' })).toBeHidden()
  await expect(
    page.getByRole('complementary', { name: 'Properties' }),
  ).toBeHidden()

  // The canvas takes most of the screen height.
  const vh = page.viewportSize()!.height
  const c = (await page.getByTestId('editor-canvas').boundingBox())!
  expect(c.height).toBeGreaterThan(vh * 0.5)

  for (const [panel, buttons] of Object.entries(PANEL_CONTENT)) {
    await openPanel(page, panel as PanelName)
    const sheet = page.getByRole('dialog', { name: panel })
    for (const name of buttons) {
      await expect(
        sheet.getByRole('button', { name, exact: true }),
      ).toBeVisible()
    }
    // The label stays in view above the open panel.
    const s = (await sheet.boundingBox())!
    const label = await screen(page, { x: 120, y: 48 })
    expect(label.y).toBeLessThan(s.y)
  }
  await expect(
    page.getByRole('complementary', { name: 'Properties' }).getByRole('group', {
      name: 'Label',
    }),
  ).toBeVisible()
})

// R15.AC3: touch targets of at least 44 px.
test('phone: touch targets are at least 44 px', async ({ page }) => {
  test.skip(!isPhone(page), 'phone layout')
  const tooSmall: string[] = []
  const check = async (scope: ReturnType<Page['locator']>) => {
    for (const b of await scope.getByRole('button').all()) {
      if (!(await b.isVisible())) continue
      const box = (await b.boundingBox())!
      if (box.width < 43.5 || box.height < 43.5) {
        tooSmall.push(`${await b.textContent()} ${box.width}×${box.height}`)
      }
    }
  }
  await check(page.locator('header'))
  await check(page.locator('nav'))
  for (const panel of Object.keys(PANEL_CONTENT) as PanelName[]) {
    await openPanel(page, panel)
    await check(page.locator('dialog[open]'))
  }
  expect(tooSmall).toEqual([])
})

// R15.AC5 / T6.3: no sideways page scrolling down to 360 px.
test('no horizontal page scroll at 360 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  const overflow = () =>
    page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )
  expect(await overflow()).toBeLessThanOrEqual(0)
  for (const panel of Object.keys(PANEL_CONTENT) as PanelName[]) {
    await openPanel(page, panel)
    expect(await overflow(), panel).toBeLessThanOrEqual(0)
  }
})

// R15.AC4 / T6.2: pinch to zoom, two-finger pan.
test('phone: pinch zooms and two fingers pan', async ({ page }) => {
  test.skip(!isPhone(page), 'touch gestures')
  const canvas = page.getByTestId('editor-canvas')
  const fit = Number(await canvas.getAttribute('data-scale'))
  const c = (await canvas.boundingBox())!
  const mid = { x: c.x + c.width / 2, y: c.y + c.height / 2 }

  await gesture(
    page,
    [
      { x: mid.x - 30, y: mid.y },
      { x: mid.x + 30, y: mid.y },
    ],
    [
      { x: mid.x - 90, y: mid.y },
      { x: mid.x + 90, y: mid.y },
    ],
  )
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-scale')))
    .toBeGreaterThan(fit * 2)
  await expect(status(page)).toContainText('0 selected') // no selection box left behind

  const before = await canvas.evaluate((el) => el.scrollLeft)
  await gesture(
    page,
    [
      { x: mid.x - 20, y: mid.y },
      { x: mid.x + 20, y: mid.y },
    ],
    [
      { x: mid.x - 120, y: mid.y },
      { x: mid.x - 80, y: mid.y },
    ],
  )
  await expect
    .poll(() => canvas.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(before + 50)
})

// R15.AC4: one finger drags the selected object.
test('phone: one finger drags an object', async ({ page }) => {
  test.skip(!isPhone(page), 'touch gestures')
  const qr = await screen(page, { x: 192, y: 48 })
  await gesture(page, [qr], [{ x: qr.x - 16 * qr.scale, y: qr.y }])
  await expect(status(page)).toContainText('qr at 17.0, 1.0 mm')
})

/** Visible buttons whose first child is not an icon (R20.AC1). */
const buttonsWithoutIcon = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .filter((b) => b.offsetParent !== null)
      .filter((b) => {
        const first = b.firstElementChild
        return !(
          first?.matches('svg.icon') &&
          first.getAttribute('aria-hidden') === 'true'
        )
      })
      .map((b) => b.textContent?.trim() || b.getAttribute('aria-label')),
  )

// R20.AC1, AC3–AC4 / T6c.2–T6c.3
test('every button has an icon before its text; logo in the header', async ({
  page,
}) => {
  await expect(page.locator('h1.brand svg.logo')).toBeVisible()
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    'href',
    './favicon.svg',
  )
  expect(await buttonsWithoutIcon(page)).toEqual([])
  for (const panel of Object.keys(PANEL_CONTENT) as PanelName[]) {
    await openPanel(page, panel)
    expect(await buttonsWithoutIcon(page), panel).toEqual([])
  }
  // Dialogs: Printer (with the emulator connected) and Print.
  await page.getByRole('button', { name: /^Printer:/ }).click()
  const printer = page.getByRole('dialog', { name: 'Printer' })
  await printer.getByLabel(/Emulated D110_M/).check()
  await printer.getByRole('button', { name: 'Connect' }).click()
  await expect(printer.getByText('Connected to')).toBeVisible()
  expect(await buttonsWithoutIcon(page)).toEqual([])
  await printer.getByRole('button', { name: 'Done' }).click()
  await page.getByRole('button', { name: 'Print…' }).click()
  await expect(page.getByRole('dialog', { name: 'Print' })).toBeVisible()
  expect(await buttonsWithoutIcon(page)).toEqual([])
})

// R20.AC6: every enabled button reacts to the mouse.
test('desktop: buttons change on hover', async ({ page }) => {
  test.skip(isPhone(page), 'hover needs a mouse')
  const bg = (name: string | RegExp) =>
    page
      .getByRole('button', { name })
      .evaluate((b) => getComputedStyle(b).backgroundColor)
  for (const name of ['New', 'Text', 'Fit', /^Printer:/, 'Print…']) {
    const before = await bg(name)
    await page.getByRole('button', { name }).hover()
    await expect.poll(() => bg(name), String(name)).not.toBe(before)
    await page.mouse.move(0, 0)
  }
})
