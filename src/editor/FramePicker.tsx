/** Frame picker in label setup (spec R23.AC1–AC2). */
import { useId, useState } from 'react'
import {
  FRAME_CATEGORIES,
  FRAMES,
  frameFor,
  frameInfo,
  type FrameCategory,
} from '../model/frames'
import type { FrameDesign } from '../model/types'
import { renderFrame } from '../render/frame'
import { NumberField } from './fields'
import { useEditorState, useEditorStore } from './useEditor'

/** A 24 × 12 mm sample label drawn by the real renderer (R23.AC1). */
const previews = new Map<FrameDesign, string>()
const previewUrl = (design: FrameDesign): string => {
  let url = previews.get(design)
  if (url === undefined) {
    const canvas = renderFrame({
      widthMm: 24,
      heightMm: 12,
      dpi: 203,
      frame: frameFor(design),
    })
    url = canvas ? canvas.toDataURL('image/png') : ''
    previews.set(design, url)
  }
  return url
}

/** The preview as an icon in the text colour (the bitmap is the mask). */
function FramePreview({ design }: { design: FrameDesign }) {
  const id = useId()
  const url = previewUrl(design)
  return (
    <svg
      className="icon frame-preview"
      viewBox="0 0 192 96"
      aria-hidden="true"
      focusable="false"
    >
      {url ? (
        <>
          <mask id={id} style={{ maskType: 'alpha' }}>
            <image href={url} width="192" height="96" />
          </mask>
          <rect
            width="192"
            height="96"
            fill="currentColor"
            mask={`url(#${id})`}
          />
        </>
      ) : (
        <rect
          x="16"
          y="12"
          width="160"
          height="72"
          rx="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeDasharray="10 10"
          opacity="0.5"
        />
      )}
    </svg>
  )
}

export function FramePicker() {
  const store = useEditorStore()
  const label = useEditorState().history.present.label
  const frame = label.frame ?? frameFor('none')
  const [category, setCategory] = useState<FrameCategory>(
    () => frameInfo(frame.design).category,
  )
  return (
    <div className="field frame-field">
      <span className="field-label" id="frame-label">
        Frame
      </span>
      <div
        className="frame-categories"
        role="group"
        aria-label="Frame categories"
      >
        {FRAME_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className="chip"
            aria-pressed={category === c.id}
            onClick={() => setCategory(c.id)}
          >
            <svg
              className="icon chip-dot"
              viewBox="0 0 8 8"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="4" cy="4" r="3" fill="currentColor" />
            </svg>
            {c.name}
          </button>
        ))}
      </div>
      <div className="frame-designs" role="group" aria-labelledby="frame-label">
        {FRAMES.filter((f) => f.category === category).map(
          ({ design, name }) => (
            <button
              key={design}
              type="button"
              aria-pressed={frame.design === design}
              className={frame.design === design ? 'active' : undefined}
              onClick={() =>
                store.setLabel({
                  frame: design === 'none' ? undefined : frameFor(design),
                })
              }
            >
              <FramePreview design={design} />
              {name}
            </button>
          ),
        )}
      </div>
      {frame.design !== 'none' && (
        <div className="field-row">
          <NumberField
            label="Thickness"
            unit="mm"
            value={frame.thicknessMm}
            min={0.2}
            max={2}
            onChange={(v) =>
              store.setLabel(
                { frame: { ...frame, thicknessMm: v } },
                'frame:thickness',
              )
            }
          />
          <NumberField
            label="Inset"
            unit="mm"
            value={frame.insetMm}
            min={0}
            max={3}
            onChange={(v) =>
              store.setLabel({ frame: { ...frame, insetMm: v } }, 'frame:inset')
            }
          />
        </div>
      )}
    </div>
  )
}
