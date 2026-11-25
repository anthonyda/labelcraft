/**
 * Editor canvas (T3.1, T3.2): the label at a zoomable scale with free
 * placement. Objects are shown as their own print bitmaps, so the screen
 * matches the print (C7). Coordinates inside the stage are printer pixels.
 */
import type Konva from 'konva'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Image, Layer, Rect, Stage, Transformer } from 'react-konva'
import { boundingBox } from '../model/ops'
import type { LabelObject, TextObject } from '../model/types'
import { labelSizePx, mmToPx, ptToPx, pxToMm } from '../model/units'
import { renderFrame } from '../render/frame'
import { inkOutsideBox } from '../render/inkBounds'
import { objectPixelBox } from '../render/renderObject'
import { useScreenScale } from '../ui/calibration'
import { COARSE_POINTER_QUERY, useMediaQuery } from '../ui/useMediaQuery'
import type { ObjectPatch } from './store'
import {
  useEditorState,
  useEditorStore,
  useObjectBitmap,
  useObjectsOutside,
} from './useEditor'
import { clampZoom, scaleToZoom, zoomToScale, type Zoom } from './zoom'

/** Minimum screen px around the label. */
export const CANVAS_PADDING = 16

/** Outline of objects that go past the label edge (R19.AC1). */
const OUTSIDE_COLOR = '#dc2626'

type Band = { x1: number; y1: number; x2: number; y2: number }

function ObjectNode({
  o,
  dpi,
  hidden,
  onPointerDown,
  onDragEnd,
  onTransformEnd,
  onEdit,
  outside,
  labelPx,
}: {
  o: LabelObject
  dpi: number
  hidden: boolean
  /** R19.AC1: the object goes past the label edge. */
  outside: boolean
  labelPx: { width: number; height: number }
  onPointerDown: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void
  onDragEnd: () => void
  onTransformEnd: () => void
  onEdit: () => void
}) {
  const bitmap = useObjectBitmap(o, dpi)
  const box = objectPixelBox(o, dpi)
  // R19.AC1: keep the red outline up to date while dragging or resizing.
  const liveCheck = (e: Konva.KonvaEventObject<Event>) => {
    const n = e.target as Konva.Image
    if (n.id() !== o.id || !bitmap) return
    const width = n.width() * Math.abs(n.scaleX())
    const height = n.height() * Math.abs(n.scaleY())
    const out = inkOutsideBox(
      bitmap.canvas,
      { x: n.x() - width / 2, y: n.y() - height / 2, width, height },
      n.rotation(),
      labelPx,
    )
    n.stroke(out ? OUTSIDE_COLOR : '')
    n.strokeEnabled(out)
  }
  return (
    <Image
      id={o.id}
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
      onDragMove={liveCheck}
      onTransform={liveCheck}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
      stroke={outside ? OUTSIDE_COLOR : ''}
      strokeEnabled={outside}
      strokeWidth={2}
      strokeScaleEnabled={false}
      name={outside ? 'object outside' : 'object'}
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
  origin,
  onDone,
}: {
  o: TextObject
  dpi: number
  scale: number
  origin: { x: number; y: number }
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
        left: origin.x + box.x * scale,
        top: origin.y + box.y * scale,
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

export function EditorCanvas({
  zoom: zoomSetting,
  setZoom,
  onFitZoom,
}: {
  /** Real-size factor (R4.AC1), or fit to the canvas. */
  zoom: Zoom
  setZoom: (z: Zoom) => void
  /** Reports the zoom that fits the label in the canvas. */
  onFitZoom: (z: number) => void
}) {
  const store = useEditorStore()
  const { history, selection } = useEditorState()
  const doc = history.present
  const dpi = doc.label.dpi
  const label = labelSizePx(doc.label)
  const outside = useObjectsOutside(doc)
  const frame = useMemo(() => renderFrame(doc.label), [doc.label])

  const wrapperRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const trRef = useRef<Konva.Transformer>(null)
  const [container, setContainer] = useState({ width: 600, height: 300 })
  const coarse = useMediaQuery(COARSE_POINTER_QUERY)
  const [band, setBand] = useState<Band>()
  const [editingId, setEditingId] = useState<string>()
  const editing = doc.objects.find(
    (o): o is TextObject => o.id === editingId && o.type === 'text',
  )

  useLayoutEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) =>
      setContainer({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Fit the label in the space available (R4.AC1, R15).
  const fit = Math.min(
    (container.width - 2 * CANVAS_PADDING) / label.width,
    (container.height - 2 * CANVAS_PADDING) / label.height,
  )
  const { pxPerMm } = useScreenScale()
  const fitZoom = clampZoom(scaleToZoom(fit, dpi, pxPerMm))
  useEffect(() => {
    if (Number.isFinite(fitZoom)) onFitZoom(fitZoom)
  }, [fitZoom, onFitZoom])
  // In Fit mode the scale comes straight from this render's container size,
  // so it never lags behind a resize.
  const zoom = zoomSetting === 'fit' ? fitZoom : zoomSetting
  const scale = zoomSetting === 'fit' ? fit : zoomToScale(zoom, dpi, pxPerMm)
  const stageW = Math.max(
    container.width,
    label.width * scale + 2 * CANVAS_PADDING,
  )
  const stageH = Math.max(
    container.height,
    label.height * scale + 2 * CANVAS_PADDING,
  )
  // Label centred in the stage (screen px).
  const origin = {
    x: Math.round((stageW - label.width * scale) / 2),
    y: Math.round((stageH - label.height * scale) / 2),
  }

  // Two-finger gestures (T6.2, R15.AC4): pinch to zoom, move to pan.
  const gesture = useRef<{
    dist: number
    mid: { x: number; y: number }
    zoom: number
  }>(undefined)
  /** When the last two-finger gesture ended (its taps are not double-taps). */
  const gestureEndedAt = useRef(0)
  const zoomRef = useRef(zoom)
  useLayoutEffect(() => {
    zoomRef.current = zoom
  }, [zoom])
  const pendingAnchor = useRef<{ x: number; y: number; ratio: number }>(
    undefined,
  )
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const points = (e: TouchEvent) => {
      const r = el.getBoundingClientRect()
      const [a, b] = [e.touches[0], e.touches[1]]
      return {
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        mid: {
          x: (a.clientX + b.clientX) / 2 - r.left,
          y: (a.clientY + b.clientY) / 2 - r.top,
        },
      }
    }
    // Selection before the first finger landed, to undo a tap that turns
    // out to be the start of a pinch.
    let firstTouch: { at: number; selection: string[] } | undefined
    const objectNodes = () => stageRef.current?.find('.object') ?? []
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        firstTouch = { at: Date.now(), selection: store.selection }
        return
      }
      if (e.touches.length !== 2) return
      // A second finger turns any drag or selection box into a gesture.
      objectNodes().forEach((n) => {
        if (n.isDragging()) n.stopDrag()
        n.draggable(false)
      })
      setBand(undefined)
      if (firstTouch && Date.now() - firstTouch.at < 500) {
        store.select(firstTouch.selection)
      }
      firstTouch = undefined
      gesture.current = { ...points(e), zoom: zoomRef.current }
    }
    const onMove = (e: TouchEvent) => {
      const g = gesture.current
      if (!g || e.touches.length !== 2) return
      e.preventDefault()
      const p = points(e)
      el.scrollLeft -= p.mid.x - g.mid.x
      el.scrollTop -= p.mid.y - g.mid.y
      const next = clampZoom((g.zoom * p.dist) / Math.max(1, g.dist))
      if (Math.abs(next - zoomRef.current) > 0.01) {
        pendingAnchor.current = {
          ...p.mid,
          ratio: next / zoomRef.current,
        }
        setZoom(next)
      }
      gesture.current = { ...g, mid: p.mid }
    }
    // After a gesture, swallow touch ends until every finger is up, so the
    // browser doesn't follow the pinch or pan with an emulated mouse click.
    let suppressClick = false
    const onEnd = (e: TouchEvent) => {
      if (gesture.current) suppressClick = true
      if (suppressClick && e.cancelable) e.preventDefault()
      if (e.touches.length === 0) suppressClick = false
      if (e.touches.length < 2 && gesture.current) {
        gesture.current = undefined
        gestureEndedAt.current = Date.now()
        objectNodes().forEach((n) => n.draggable(true))
      }
    }
    // R4.AC8: Ctrl (or Cmd) + mouse wheel zooms smoothly at the pointer.
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      const next = clampZoom(zoomRef.current * Math.exp(-e.deltaY * 0.0015))
      if (Math.abs(next - zoomRef.current) < 0.0001) return
      const r = el.getBoundingClientRect()
      pendingAnchor.current = {
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        ratio: next / zoomRef.current,
      }
      setZoom(next)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onStart, { capture: true })
    el.addEventListener('touchmove', onMove, { capture: true, passive: false })
    el.addEventListener('touchend', onEnd, { capture: true, passive: false })
    el.addEventListener('touchcancel', onEnd, { capture: true })
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onStart, { capture: true })
      el.removeEventListener('touchmove', onMove, { capture: true })
      el.removeEventListener('touchend', onEnd, { capture: true })
      el.removeEventListener('touchcancel', onEnd, { capture: true })
    }
  }, [setZoom, store])

  // Keep the pinch midpoint under the fingers after zooming.
  useLayoutEffect(() => {
    const a = pendingAnchor.current
    const el = wrapperRef.current
    if (!a || !el) return
    pendingAnchor.current = undefined
    el.scrollLeft = (el.scrollLeft + a.x) * a.ratio - a.x
    el.scrollTop = (el.scrollTop + a.y) * a.ratio - a.y
  }, [scale])

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
      // Fingers of a pinch don't select.
      if (gesture.current) return
      const shift = 'shiftKey' in e.evt && e.evt.shiftKey
      if (shift) store.toggleSelected(id)
      else if (!store.selection.includes(id)) store.select([id])
    }

  const pointer = () => {
    const p = stageRef.current?.getRelativePointerPosition()
    return p ? { x: p.x, y: p.y } : undefined
  }

  const onStageDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (gesture.current) return
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
    if (!band || gesture.current) return
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
      data-origin-x={origin.x}
      data-origin-y={origin.y}
      data-outside={outside.join(' ')}
    >
      <Stage
        ref={stageRef}
        width={stageW}
        height={stageH}
        x={origin.x}
        y={origin.y}
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
              outside={outside.includes(o.id)}
              labelPx={label}
              hidden={o.id === editingId}
              onPointerDown={onObjectDown(o.id)}
              onDragEnd={commitOnce}
              onTransformEnd={commitOnce}
              onEdit={() => {
                if (o.type !== 'text') return
                // Fingers of a pinch or pan are not a double-tap.
                if (
                  gesture.current ||
                  Date.now() - gestureEndedAt.current < 800
                ) {
                  return
                }
                store.select([o.id])
                setEditingId(o.id)
              }}
            />
          ))}
          {/* R23.AC3: the frame, as printed, on top of objects. */}
          {frame && (
            <Image
              name="label-frame"
              image={frame}
              width={label.width}
              height={label.height}
              listening={false}
            />
          )}
          {/* R19.AC1: the label edge stays visible over objects. */}
          <Rect
            name="label-edge"
            width={label.width}
            height={label.height}
            stroke="#94a3b8"
            strokeWidth={1}
            strokeScaleEnabled={false}
            fillEnabled={false}
            listening={false}
          />
          <Transformer
            ref={trRef}
            rotationSnaps={[0, 90, 180, 270]}
            rotationSnapTolerance={4}
            keepRatio={false}
            flipEnabled={false}
            ignoreStroke
            anchorSize={coarse ? 22 : 10}
            rotateAnchorOffset={coarse ? 36 : 30}
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
          origin={origin}
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
