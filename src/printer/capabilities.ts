/** Browser capability detection (T2.1, R1). */

export type Transport = 'bluetooth' | 'serial' | 'emulator'

export type Capabilities = {
  bluetooth: boolean
  serial: boolean
}

export const detectCapabilities = (
  nav: Partial<Navigator> = typeof navigator === 'undefined' ? {} : navigator,
): Capabilities => ({
  bluetooth: 'bluetooth' in nav && nav.bluetooth !== undefined,
  serial: 'serial' in nav && (nav as { serial?: unknown }).serial !== undefined,
})

/** True when a real printer can be reached (R1.AC1). */
export const canPrintToHardware = (c: Capabilities): boolean =>
  c.bluetooth || c.serial

/**
 * Connection options to offer, in display order (R1.AC2, R16.AC1).
 * The emulator is always available.
 */
export const availableTransports = (c: Capabilities): Transport[] => [
  ...(c.bluetooth ? (['bluetooth'] as const) : []),
  ...(c.serial ? (['serial'] as const) : []),
  'emulator',
]
