/** Keyboard shortcuts (T3.3, R4.AC2–AC3, AC6). Pure mapping, tested alone. */

export type Command =
  | { type: 'nudge'; dx: number; dy: number }
  | {
      type:
        | 'delete'
        | 'duplicate'
        | 'copy'
        | 'paste'
        | 'undo'
        | 'redo'
        | 'selectAll'
        | 'deselect'
    }

export type KeyInput = {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
}

/** Arrow step in printer pixels; Shift = 10. */
export const NUDGE_PX = 1
export const NUDGE_PX_LARGE = 10

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

export const commandForKey = (e: KeyInput): Command | undefined => {
  const mod = e.ctrlKey || e.metaKey
  if (e.altKey) return undefined

  if (e.key in ARROWS && !mod) {
    const step = e.shiftKey ? NUDGE_PX_LARGE : NUDGE_PX
    const [x, y] = ARROWS[e.key]
    return { type: 'nudge', dx: x * step, dy: y * step }
  }
  if (!mod) {
    if (e.key === 'Delete' || e.key === 'Backspace') return { type: 'delete' }
    if (e.key === 'Escape') return { type: 'deselect' }
    return undefined
  }
  switch (e.key.toLowerCase()) {
    case 'z':
      return { type: e.shiftKey ? 'redo' : 'undo' }
    case 'y':
      return { type: 'redo' }
    case 'c':
      return { type: 'copy' }
    case 'v':
      return { type: 'paste' }
    case 'd':
      return { type: 'duplicate' }
    case 'a':
      return { type: 'selectAll' }
  }
  return undefined
}

/** Shortcuts must not steal keys from text fields. */
export const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  )
}
