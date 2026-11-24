/** App settings kept between visits (not part of labels). */

export type SettingStore = {
  get(key: string): string | undefined
  set(key: string, value: string | undefined): void
}

const PREFIX = 'labelcraft.'

/** localStorage, ignoring failures (private mode, blocked storage). */
export const localSettings: SettingStore = {
  get(key) {
    try {
      return localStorage.getItem(PREFIX + key) ?? undefined
    } catch {
      return undefined
    }
  },
  set(key, value) {
    try {
      if (value === undefined) localStorage.removeItem(PREFIX + key)
      else localStorage.setItem(PREFIX + key, value)
    } catch {
      // Not remembered; the app still works.
    }
  },
}

/** In-memory store for tests and environments without localStorage. */
export const memorySettings = (): SettingStore => {
  const values = new Map<string, string>()
  return {
    get: (key) => values.get(key),
    set: (key, value) => {
      if (value === undefined) values.delete(key)
      else values.set(key, value)
    },
  }
}
