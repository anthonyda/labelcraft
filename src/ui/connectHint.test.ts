import { describe, expect, it } from 'vitest'
import { BLUETOOTH_LINK_HINT, connectHint } from './connectHint'

// R2.AC6
describe('connect hint', () => {
  const timeout =
    'Unable to perform initial negotiate: Error: Timeout waiting response (waited for c2)'

  it('asks to switch the printer on when it does not answer', () => {
    expect(connectHint(timeout, 'serial')).toBe(
      'Make sure the printer is switched on and the USB cable is plugged in, then press Connect again.',
    )
    expect(connectHint(timeout, 'bluetooth')).toBe(
      'Make sure the printer is switched on and close to this device, then press Connect again.',
    )
  })

  it('says nothing for a cancelled picker', () => {
    expect(
      connectHint('User cancelled the requestDevice() chooser.', 'bluetooth'),
    ).toBeUndefined()
  })

  // R2.AC8
  it('explains Bluetooth link failures', () => {
    expect(
      connectHint('Connection Error: Connection attempt failed.', 'bluetooth'),
    ).toBe(BLUETOOTH_LINK_HINT)
    expect(
      connectHint('NetworkError: GATT Server is disconnected.', 'bluetooth'),
    ).toBe(BLUETOOTH_LINK_HINT)
    expect(
      connectHint('Connection Error: Connection attempt failed.', 'serial'),
    ).toBeUndefined()
  })
})
