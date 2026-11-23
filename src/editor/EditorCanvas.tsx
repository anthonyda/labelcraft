/**
 * Editor canvas (T3.1, T3.2): the label at a zoomable scale with free
 * placement. Objects are shown as their own print bitmaps, so the screen
 * matches the print (C7). Coordinates inside the stage are printer pixels.
 */
import type Konva from 'konva'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Image, Layer, Rect, Stage, Transformer } from 'react-konva'
import { boundingBox } from '../model/ops'
import type { LabelObject, TextObject } from '../model/types'
import { labelSizePx, mmToPx, ptToPx, pxToMm } from '../model/units'
import { objectPixelBox } from '../render/renderObject'
import type { ObjectPatch } from './store'
import { useEditorState, useEditorStore, useObjectBitmap } from './useEditor'

/** Screen px around the label. */
export const CANVAS_PADDING = 16
/** Largest canvas height as a share of the viewport, at zoom 1. */
const MAX_HEIGHT_VH = 0.55

type Band = { x1: number; y1: number; x2: number; y2: number }

function ObjectNode({
  o,
  dpi,
  hidden,
  onPointerDown,
  onDragEnd,
  onTransformEnd,
  onEdit,
}: {
  o: LabelObject
  dpi: number
  hidden: boolean
  onPointerDown: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void
  onDragEnd: () => void
  onTransformEnd: () => void
  onEdit: () => void
}) {
  const bitmap = useObjectBitmap(o, dpi)
  const box = objectPixelBox(o, dpi)
  return (
    <Image
      id={o.id}
      name="object"
      image={bitmap?.canvas}
      x={box.x + box.width / 2}
      y={box.y + box.height / 2}
      width={box.width}
      height={box.height}
      offsetX={box.width / 2}
      offsetY={box.height / 2}
      rotation={o.rotation}
      opacity={hidden ? 0 : 1}
      draggable
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
      onDblClick={onEdit}
      onDblTap={onEdit}
    />
  )
}

/**
 * In-place text editing (T4.2, R5.AC1): a native text field over the text
 * object, so the device keyboard works normally. Enter or leaving the field
 * saves, Shift+Enter adds a line, Esc cancels.
 */
function TextEditor({
  o,
  dpi,
  scale,
  onDone,
}: {
  o: TextObject
  dpi: number
  scale: number
  onDone: (text?: string) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const done = useRef(false)
  const box = objectPixelBox(o, dpi)
  const finish = (text?: string) => {
    if (done.current) return
    done.current = true
    onDone(text)
  }
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])
  return (
    <textarea
      ref={ref}
      className="text-editor"
      aria-label="Edit text"
      defaultValue={o.text}
      spellCheck={false}
      style={{
        left: CANVAS_PADDING + box.x * scale,
        top: CANVAS_PADDING + box.y * scale,
        width: box.width * scale,
        height: box.height * scale,
        transform: o.rotation ? `rotate(${o.rotation}deg)` : undefined,
        fontFamily: o.fontFamily,
        fontSize: ptToPx(o.fontSize, dpi) * scale,
        fontWeight: o.bold ? 'bold' : 'normal',
        fontStyle: o.italic ? 'italic' : 'normal',
        textDecoration: o.underline ? 'underline' : 'none',
        textAlign: o.align,
        lineHeight: o.lineHeight,
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          finish()
        } else if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          finish(e.currentTarget.value)
        }
      }}
      onBlur={(e) => finish(e.currentTarget.value)}
    />
  )
}

export function EditorCanvas({ zoom }: { zoom: number }) {
  const store = useEditorStore()
  const { history, selection } = useEditorState()
  const doc = history.present
  const dpi = doc.label.dpi
  const label = labelSizePx(doc.label)

  const wrapperRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const trRef = useRef<Konva.Transformer>(null)
  const [containerWidth, setContainerWidth] = useState(600)
  const [band, setBand] = useState<Band>()
  const [editingId, setEditingId] = useState<string>()
  const editing = doc.objects.find(
    (o): o is TextObject => o.id === editingId && o.type === 'text',
  )

  useLayoutEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) =>
      setContainerWidth(entry.contentRect.width),
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Fit the label in the available width and a share of the viewport height.
  const maxH = Math.max(160, window.innerHeight * MAX_HEIGHT_VH)
  const fit = Math.min(
    (containerWidth - 2 * CANVAS_PADDING) / label.width,
    (maxH - 2 * CANVAS_PADDING) / label.height,
  )
  const scale = Math.max(0.05, fit * zoom)
  const stageW = Math.max(
    containerWidth,
    label.width * scale + 2 * CANVAS_PADDING,
  )
  const stageH = label.height * scale + 2 * CANVAS_PADDING

  // Attach the transformer to the selected nodes.
  useEffect(() => {
    const tr = trRef.current
    const stage = stageRef.current
    if (!tr || !stage) return
    const nodes = selection
      .filter((id) => id !== editingId)
      .map((id) => stage.findOne(`#${CSS.escape(id)}`))
      .filter((n): n is Konva.Node => !!n)
    tr.nodes(nodes)
    tr.getLayer()?.batchDraw()
  }, [selection, doc, editingId])

  /** Write the current node geometry of the selection back to the model. */
  const commitSelection = () => {
    const stage = stageRef.current
    if (!stage) return
    const patches: ObjectPatch[] = []
    for (const id of store.selection) {
      const node = stage.findOne(`#${CSS.escape(id)}`)
      if (!node) continue
      // Snap to whole printer dots so the model matches what prints.
      const w = Math.max(1, Math.round(node.width() * node.scaleX()))
      const h = Math.max(1, Math.round(node.height() * node.scaleY()))
      node.scale({ x: 1, y: 1 })
      patches.push({
        id,
        patch: {
          x: pxToMm(Math.round(node.x() - w / 2), dpi),
          y: pxToMm(Math.round(node.y() - h / 2), dpi),
          width: pxToMm(w, dpi),
          height: pxToMm(h, dpi),
          rotation: Math.round(node.rotation() * 100) / 100,
        },
      })
    }
    store.updateObjects(patches)
  }

  // A drag/transform of several nodes fires one end event per node: commit once.
  const pending = useRef(false)
  const commitOnce = () => {
    if (pending.current) return
    pending.current = true
    queueMicrotask(() => {
      pending.current = false
      commitSelection()
    })
  }

  const onObjectDown =
    (id: string) => (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      e.cancelBubble = true
      const shift = 'shiftKey' in e.evt && e.evt.shiftKey
      if (shift) store.toggleSelected(id)
      else if (!store.selection.includes(id)) store.select([id])
    }

  const pointer = () => {
    const p = stageRef.current?.getRelativePointerPosition()
    return p ? { x: p.x, y: p.y } : undefined
  }

  const onStageDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (
      e.target.hasName('object') ||
      e.target.getParent()?.className === 'Transformer'
    ) {
      return
    }
    const p = pointer()
    if (p) setBand({ x1: p.x, y1: p.y, x2: p.x, y2: p.y })
  }

  const onStageMove = () => {
    if (!band) return
    const p = pointer()
    if (p) setBand({ ...band, x2: p.x, y2: p.y })
  }

  const onStageUp = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!band) return
    setBand(undefined)
    const shift = 'shiftKey' in e.evt && e.evt.shiftKey
    const left = Math.min(band.x1, band.x2)
    const right = Math.max(band.x1, band.x2)
    const top = Math.min(band.y1, band.y2)
    const bottom = Math.max(band.y1, band.y2)
    if (right - left < 2 && bottom - top < 2) {
      if (!shift) store.clearSelection()
      return
    }
    // Objects whose visible bounds intersect the band.
    const hit = doc.objects
      .filter((o) => {
        const b = boundingBox(o)
        return (
          mmToPx(b.right, dpi) >= left &&
          mmToPx(b.left, dpi) <= right &&
          mmToPx(b.bottom, dpi) >= top &&
          mmToPx(b.top, dpi) <= bottom
        )
      })
      .map((o) => o.id)
    store.select(shift ? [...new Set([...store.selection, ...hit])] : hit)
  }

  return (
    <div
      ref={wrapperRef}
      className="editor-canvas"
      data-testid="editor-canvas"
      data-scale={scale}
      data-origin={CANVAS_PADDING}
    >
      <Stage
        ref={stageRef}
        width={stageW}
        height={stageH}
        x={CANVAS_PADDING}
        y={CANVAS_PADDING}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={onStageDown}
        onTouchStart={onStageDown}
        onMouseMove={onStageMove}
        onTouchMove={onStageMove}
        onMouseUp={onStageUp}
        onTouchEnd={onStageUp}
      >
        <Layer imageSmoothingEnabled={false}>
          <Rect
            name="label"
            width={label.width}
            height={label.height}
            fill="#fff"
            shadowColor="#000"
            shadowOpacity={0.25}
            shadowBlur={8 / scale}
          />
          {doc.objects.map((o) => (
            <ObjectNode
              key={o.id}
              o={o}
              dpi={dpi}
              hidden={o.id === editingId}
              onPointerDown={onObjectDown(o.id)}
              onDragEnd={commitOnce}
              onTransformEnd={commitOnce}
              onEdit={() => {
                if (o.type !== 'text') return
                store.select([o.id])
                setEditingId(o.id)
              }}
            />
          ))}
          <Transformer
            ref={trRef}
            rotationSnaps={[0, 90, 180, 270]}
            rotationSnapTolerance={4}
            keepRatio={false}
            flipEnabled={false}
            ignoreStroke
            anchorSize={10}
            borderStroke="#2563eb"
            anchorStroke="#2563eb"
            boundBoxFunc={(oldBox, newBox) =>
              Math.abs(newBox.width) < 2 || Math.abs(newBox.height) < 2
                ? oldBox
                : newBox
            }
          />
          {band && (
            <Rect
              x={Math.min(band.x1, band.x2)}
              y={Math.min(band.y1, band.y2)}
              width={Math.abs(band.x2 - band.x1)}
              height={Math.abs(band.y2 - band.y1)}
              fill="rgba(37, 99, 235, 0.1)"
              stroke="#2563eb"
              strokeWidth={1 / scale}
              listening={false}
            />
          )}
        </Layer>
      </Stage>
      {editing && (
        <TextEditor
          key={editing.id}
          o={editing}
          dpi={dpi}
          scale={scale}
          onDone={(text) => {
            setEditingId(undefined)
            if (text !== undefined && text !== editing.text) {
              store.updateObject(editing.id, { text })
            }
          }}
        />
      )}
    </div>
  )
}
