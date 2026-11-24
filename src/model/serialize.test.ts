import { describe, expect, it } from 'vitest'
import { createObject, newDoc } from './factory'
import { fromJson, toJson } from './serialize'
import { OBJECT_TYPES } from './types'

// T1.1 / R10.AC3: documents round-trip through JSON with a version check.
describe('serialize', () => {
  it('round-trips a document with every object type', () => {
    const doc = newDoc()
    for (const type of OBJECT_TYPES) {
      doc.objects.push(createObject(type, doc.label))
    }
    expect(fromJson(toJson(doc))).toEqual(doc)
  })

  // T6b.2 / R12.AC5: the chosen size entry is kept; older labels still load.
  it('keeps the label size entry, and loads labels saved without one', () => {
    const doc = newDoc()
    doc.label.size = 'D-12x40'
    expect(fromJson(toJson(doc)).label.size).toBe('D-12x40')
    const old = JSON.stringify({
      version: 1,
      label: { widthMm: 30, heightMm: 12, dpi: 203 },
      objects: [],
    })
    expect(fromJson(old).label.size).toBeUndefined()
    const bad = JSON.stringify({ ...doc, label: { ...doc.label, size: 3 } })
    expect(() => fromJson(bad)).toThrow(/not a labelcraft label/)
  })

  it('rejects invalid JSON', () => {
    expect(() => fromJson('not json')).toThrow(/not valid JSON/)
  })

  it('rejects an unsupported version', () => {
    const json = JSON.stringify({ ...newDoc(), version: 99 })
    expect(() => fromJson(json)).toThrow(/version 99/)
  })

  it('rejects a document without objects', () => {
    const json = JSON.stringify({ version: 1, label: newDoc().label })
    expect(() => fromJson(json)).toThrow(/not a labelcraft label/)
  })

  it('rejects unknown object types', () => {
    const json = JSON.stringify({
      ...newDoc(),
      objects: [{ id: 'a', type: 'star' }],
    })
    expect(() => fromJson(json)).toThrow(/unknown object type "star"/)
  })
})
