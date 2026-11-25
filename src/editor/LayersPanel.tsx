/**
 * Layers panel (T6d.2, T6d.3, spec R21): every object, front-most first, as a
 * multi-select list box. Selection is shared with the canvas.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { layerNames } from '../model/layerNames'
import type { LabelObject } from '../model/types'
import { Icon, type IconName } from '../ui/icons'
import { useEditorState, useEditorStore, useObjectsOutside } from './useEditor'

const TYPE_ICONS: Record<LabelObject['type'], IconName> = {
  text: 'text',
  image: 'image',
  rect: 'rect',
  ellipse: 'ellipse',
  line: 'line',
  qr: 'qr',
  barcode: 'barcode',
}

export function LayersPanel({
  onPicked,
}: {
  /** Called after a row is picked with a click or tap (phone: close the panel). */
  onPicked?: () => void
}) {
  const store = useEditorStore()
  const { history, selection } = useEditorState()
  const doc = history.present
  const names = layerNames(doc)
  const outside = useObjectsOutside(doc)
  // R21.AC1: front-most (drawn last) first.
  const rows = [...doc.objects].reverse()
  const listId = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<string>()
  const active = rows.find((o) => o.id === activeId)?.id ?? selection[0]

  // R21.AC2: the selected row scrolls into view.
  useEffect(() => {
    const first = selection[0]
    if (!first) return
    listRef.current
      ?.querySelector(`[data-layer="${CSS.escape(first)}"]`)
      ?.scrollIntoView?.({ block: 'nearest' })
  }, [selection])

  if (rows.length === 0) {
    return (
      <p className="layers-empty">
        No objects yet. Use Add to place text, shapes, codes or images.
      </p>
    )
  }

  const pick = (id: string, extend: boolean) => {
    if (extend) store.toggleSelected(id)
    else store.select([id])
    setActiveId(id)
  }

  // R21.AC3: arrows move, Space/Enter select, Shift extends.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = Math.max(
      0,
      rows.findIndex((o) => o.id === active),
    )
    const move = (to: number) => {
      const next = rows[Math.min(rows.length - 1, Math.max(0, to))]
      setActiveId(next.id)
      if (e.shiftKey) {
        if (!store.selection.includes(next.id)) {
          store.select([...store.selection, next.id])
        }
      }
    }
    switch (e.key) {
      case 'ArrowDown':
        move(i + 1)
        break
      case 'ArrowUp':
        move(i - 1)
        break
      case 'Home':
        move(0)
        break
      case 'End':
        move(rows.length - 1)
        break
      case ' ':
      case 'Enter':
        if (active) pick(active, e.ctrlKey || e.metaKey)
        break
      default:
        return // Delete, Ctrl+D, … reach the editor shortcuts.
    }
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div
      ref={listRef}
      className="layers-list"
      role="listbox"
      aria-label="Layers"
      aria-multiselectable="true"
      tabIndex={0}
      aria-activedescendant={active ? `${listId}-${active}` : undefined}
      onKeyDown={onKeyDown}
    >
      {rows.map((o) => {
        const selected = selection.includes(o.id)
        const out = outside.includes(o.id)
        return (
          <div
            key={o.id}
            id={`${listId}-${o.id}`}
            data-layer={o.id}
            role="option"
            aria-selected={selected}
            className={[
              'layer',
              selected && 'selected',
              o.id === active && 'active',
              out && 'outside',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={(e) => {
              pick(o.id, e.shiftKey || e.ctrlKey || e.metaKey)
              if (!(e.shiftKey || e.ctrlKey || e.metaKey)) onPicked?.()
            }}
          >
            <Icon name={TYPE_ICONS[o.type]} />
            <span className="layer-name">{names.get(o.id)}</span>
            {out && (
              <span className="layer-outside" title="Outside the label">
                <span className="sr-only">, outside the label</span>
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
