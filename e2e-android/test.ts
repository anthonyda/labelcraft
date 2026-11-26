/**
 * Runs the E2E suite in a Chromium browser on a real Android phone, over its
 * DevTools socket forwarded by adb (ANDROID_CDP_URL), without
 * changing the tests: `@playwright/test` is mapped to this file by
 * e2e-android/tsconfig.json. Each test gets a fresh page with cleared
 * site storage. A guard blocks the print dialog's Print button: these runs
 * must never start a print.
 */
import {
  chromium,
  expect,
  test as base,
  type Browser,
  type BrowserContext,
} from 'playwright/test'

export * from 'playwright/test'
export { expect }

const BASE = process.env.ANDROID_BASE_URL ?? 'http://localhost:4173/'
const CDP = process.env.ANDROID_CDP_URL ?? 'http://localhost:9223'

/** Blocks the print dialog's Print button (no print, ever). */
const NO_PRINT = () => {
  document.addEventListener(
    'click',
    (e) => {
      const b = (e.target as Element | null)?.closest?.('button')
      if (
        b &&
        b.closest('dialog.print-dialog') &&
        b.textContent?.trim() === 'Print'
      ) {
        e.stopImmediatePropagation()
        e.preventDefault()
        ;(window as unknown as { __printBlocked: boolean }).__printBlocked =
          true
      }
    },
    true,
  )
}

/**
 * Keeps the on-screen keyboard closed: it pans the visible area, and
 * Playwright's synthetic taps then miss (a real tap works; checked by hand).
 */
const NO_KEYBOARD = () => {
  document.addEventListener(
    'focusin',
    (e) => {
      const t = e.target as HTMLElement | null
      if (t?.matches?.('input, textarea')) t.setAttribute('inputmode', 'none')
    },
    true,
  )
}

export const test = base.extend<
  object,
  { phone: Browser; androidContext: BrowserContext }
>({
  phone: [
    async ({}, use) => {
      const browser = await chromium.connectOverCDP(CDP)
      await use(browser)
      // Leaves the phone's browser running; only our tabs are closed.
    },
    { scope: 'worker' },
  ],
  androidContext: [
    async ({ phone }, use) => {
      const context = phone.contexts()[0]
      await context.addInitScript(NO_PRINT)
      await context.addInitScript(NO_KEYBOARD)
      await use(context)
    },
    { scope: 'worker' },
  ],
  context: async ({ androidContext }, use) => use(androidContext),
  page: async ({ androidContext }, use) => {
    // Close tabs left by an earlier test so nothing holds the database open.
    for (const p of androidContext.pages()) {
      if (p.url().startsWith(BASE)) await p.close()
    }
    const page = await androidContext.newPage()
    // Fresh site state for each test (only the test server's origin).
    await page.goto(BASE)
    await page.evaluate(async () => {
      localStorage.clear()
      sessionStorage.clear()
      for (const r of await navigator.serviceWorker.getRegistrations()) {
        await r.unregister()
      }
      for (const k of await caches.keys()) await caches.delete(k)
      for (const db of await indexedDB.databases()) {
        if (!db.name) continue
        await new Promise((done) => {
          const req = indexedDB.deleteDatabase(db.name!)
          req.onsuccess = req.onerror = req.onblocked = () => done(undefined)
        })
      }
    })
    // Its viewport isn't set by Playwright: report the real one (helpers
    // pick the phone layout from it).
    const size = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }))
    page.viewportSize = () => size
    // The phone's own context has no baseURL: resolve relative URLs here.
    const goto = page.goto.bind(page)
    page.goto = (url, options) => goto(new URL(url, BASE).href, options)
    await use(page)
    await page.close()
  },
  baseURL: BASE,
})
