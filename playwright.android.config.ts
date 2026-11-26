// E2E on a real Android phone (Chrome over adb). Never prints: the tests
// that press Print are left out, and e2e-android/test.ts blocks the button.
// Setup: a Chromium browser open on the phone (Edge, Chrome...), then
//   adb reverse tcp:4173 tcp:4173
//   adb forward tcp:9223 localabstract:chrome_devtools_remote[_<pid>]
//   npm run test:e2e:android
// Known phone-only failures (the test driver, not the app): typing opens
// the on-screen keyboard, which can cover the bottom tabs; file downloads
// aren't captured; where the browser offers installing, Install app opens
// its prompt instead of the help dialog.
import { defineConfig } from '@playwright/test'

const PRINTING_TESTS = [
  'prints the edited label',
  'objects outside the label are outlined and warned about',
  'portrait turns the label and its design; prints matching the preview',
  'pick a frame; it shows in the preview and prints',
  'frame categories; a decorative frame prints',
  'prints to the emulated D110_M and shows matching output',
  'pick a roll colour; the label shows it, printing does not',
]

export default defineConfig({
  testDir: 'e2e',
  tsconfig: './e2e-android/tsconfig.json',
  // Titles have no regex characters.
  grepInvert: new RegExp(PRINTING_TESTS.join('|')),
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  outputDir: 'test-results/android',
  projects: [{ name: 'android' }],
  webServer: {
    // adb reverse reaches 127.0.0.1, so listen there (not only on ::1).
    command:
      'npm run build && npm run preview -- --port 4173 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
})
