import { describe, expect, it } from 'vitest'
import { commandForKey, type KeyInput } from './shortcuts'

const key = (k: string, mods: Partial<KeyInput> = {}): KeyInput => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
})

// T3.3: R4.AC2 (arrows), R4.AC3 (Del, copy/paste, duplicate), R4.AC6 (undo/redo)
describe('keyboard shortcuts', () => {
  it('nudges 1 px with arrows and 10 px with Shift', () => {
    expect(commandForKey(key('ArrowLeft'))).toEqual({
      type: 'nudge',
      dx: -1,
      dy: 0,
    })
    expect(commandForKey(key('ArrowDown', { shiftKey: true }))).toEqual({
      type: 'nudge',
      dx: 0,
      dy: 10,
    })
  })

  it.each([
    [key('Delete'), 'delete'],
    [key('Backspace'), 'delete'],
    [key('Escape'), 'deselect'],
    [key('z', { ctrlKey: true }), 'undo'],
    [key('z', { metaKey: true }), 'undo'],
    [key('Z', { ctrlKey: true, shiftKey: true }), 'redo'],
    [key('y', { ctrlKey: true }), 'redo'],
    [key('c', { ctrlKey: true }), 'copy'],
    [key('v', { ctrlKey: true }), 'paste'],
    [key('d', { ctrlKey: true }), 'duplicate'],
    [key('a', { metaKey: true }), 'selectAll'],
  ])('maps %o to %s', (input, type) => {
    expect(commandForKey(input)?.type).toBe(type)
  })

  it('ignores other keys', () => {
    expect(commandForKey(key('x'))).toBeUndefined()
    expect(commandForKey(key('ArrowLeft', { altKey: true }))).toBeUndefined()
    expect(commandForKey(key('q', { ctrlKey: true }))).toBeUndefined()
  })
})
