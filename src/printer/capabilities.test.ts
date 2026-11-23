import { describe, expect, it } from 'vitest'
import {
  availableTransports,
  canPrintToHardware,
  detectCapabilities,
} from './capabilities'

const nav = (props: object) => props as Partial<Navigator>

// T2.1 / R1, R16.AC1
describe('capabilities', () => {
  it('detects Web Bluetooth and Web Serial', () => {
    expect(detectCapabilities(nav({ bluetooth: {}, serial: {} }))).toEqual({
      bluetooth: true,
      serial: true,
    })
  })

  it('detects neither (e.g. Firefox, Safari)', () => {
    const caps = detectCapabilities(nav({}))
    expect(caps).toEqual({ bluetooth: false, serial: false })
    expect(canPrintToHardware(caps)).toBe(false)
  })

  it('offers only the available transports, emulator always last', () => {
    expect(availableTransports({ bluetooth: true, serial: true })).toEqual([
      'bluetooth',
      'serial',
      'emulator',
    ])
    expect(availableTransports({ bluetooth: true, serial: false })).toEqual([
      'bluetooth',
      'emulator',
    ])
    expect(availableTransports({ bluetooth: false, serial: false })).toEqual([
      'emulator',
    ])
  })
})
