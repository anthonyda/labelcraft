import { describe, expect, it } from 'vitest'
import { fileBaseName } from './files'

describe('fileBaseName', () => {
  it('makes a safe file name', () => {
    expect(fileBaseName('Shelf A / box 3')).toBe('Shelf-A-box-3')
    expect(fileBaseName('  spaced  out ')).toBe('spaced-out')
  })

  it('falls back to "label"', () => {
    expect(fileBaseName(undefined)).toBe('label')
    expect(fileBaseName('???')).toBe('label')
  })
})
