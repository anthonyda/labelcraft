import { instantiateClient } from '@mmote/niimbluelib'
import { describe, expect, it } from 'vitest'

// T0.3 smoke test: the pinned printer library loads and its virtual client
// (used for printer tests without hardware) can be created.
describe('niimbluelib', () => {
  it('creates a virtual client', () => {
    const client = instantiateClient('virtual')
    expect(client.getType()).toBe('virtual')
  })
})
