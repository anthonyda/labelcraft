import { describe, expect, it } from 'vitest'
import { createObject, newDoc } from './factory'
import { baseLayerName, layerNames } from './layerNames'
import type { LabelObject, ObjectType } from './types'

const obj = (type: ObjectType, props: Partial<LabelObject> = {}) =>
  ({ ...createObject(type, newDoc().label), ...props }) as LabelObject

// T6d.1 / R21.AC1
describe('layer names', () => {
  it('uses the first non-empty line of a text', () => {
    expect(baseLayerName(obj('text', { text: '\n  Hello \nworld' }))).toBe(
      'Hello',
    )
    expect(baseLayerName(obj('text', { text: '  \n ' }))).toBe('Text')
  })

  it('clips long names', () => {
    const name = baseLayerName(obj('text', { text: 'x'.repeat(60) }))
    expect(name).toHaveLength(40)
    expect(name.endsWith('…')).toBe(true)
  })

  it('uses the content of codes, else the type', () => {
    expect(baseLayerName(obj('qr', { content: 'https://a.b' }))).toBe(
      'https://a.b',
    )
    expect(baseLayerName(obj('barcode', { content: '' }))).toBe('Barcode')
    expect(baseLayerName(obj('rect'))).toBe('Rectangle')
    expect(baseLayerName(obj('ellipse'))).toBe('Ellipse')
    expect(baseLayerName(obj('line'))).toBe('Line')
  })

  it('numbers repeated names in drawing order', () => {
    const doc = newDoc()
    doc.objects.push(
      obj('rect', { id: 'a' }),
      obj('text', { id: 'b', text: 'Hi' }),
      obj('rect', { id: 'c' }),
    )
    expect(Object.fromEntries(layerNames(doc))).toEqual({
      a: 'Rectangle 1',
      b: 'Hi',
      c: 'Rectangle 2',
    })
  })

  // R21.AC10
  it('uses names given by the user, as they are', () => {
    const doc = newDoc()
    doc.objects.push(
      obj('rect', { id: 'a', name: '  Border ' }),
      obj('rect', { id: 'b' }),
      obj('rect', { id: 'c' }),
      obj('text', { id: 'd', text: 'Hi', name: '' }),
    )
    expect(Object.fromEntries(layerNames(doc))).toEqual({
      a: 'Border',
      b: 'Rectangle 1',
      c: 'Rectangle 2',
      d: 'Hi',
    })
  })
})
