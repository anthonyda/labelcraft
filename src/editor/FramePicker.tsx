/** Frame picker in label setup (T6e.2, R23.AC1–AC2). */
import type { FrameDesign } from '../model/types'
import { FRAME_DESIGNS, frameFor } from '../render/frame'
import { NumberField } from './fields'
import { useEditorState, useEditorStore } from './useEditor'

/** Small previews of each design on a 24 × 24 grid. */
const PREVIEWS: Record<FrameDesign, string> = {
  none: 'M5 6h14v12H5z',
  line: 'M3 5h18v14H3z',
  thick: 'M3 5h18v14H3z',
  double: 'M2 4h20v16H2z M5 7h14v10H5z',
  rounded:
    'M7 5h10a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4z',
  dashed: 'M3 5h4 M10 5h4 M17 5h4 M3 19h4 M10 19h4 M17 19h4 M3 9v6 M21 9v6',
  dotted:
    'M3 5h.01 M7 5h.01 M11 5h.01 M15 5h.01 M19 5h.01 M3 19h.01 M7 19h.01 M11 19h.01 M15 19h.01 M19 19h.01 M3 12h.01 M21 12h.01',
  corners: 'M3 9V5h4 M17 5h4v4 M21 15v4h-4 M7 19H3v-4',
  ticket:
    'M6 5h12a3 3 0 0 0 3 3v8a3 3 0 0 0-3 3H6a3 3 0 0 0-3-3V8a3 3 0 0 0 3-3z',
}

export function FramePicker() {
  const store = useEditorStore()
  const label = useEditorState().history.present.label
  const frame = label.frame ?? frameFor('none')
  return (
    <div className="field frame-field">
      <span className="field-label" id="frame-label">
        Frame
      </span>
      <div className="frame-designs" role="group" aria-labelledby="frame-label">
        {FRAME_DESIGNS.map(({ design, name }) => (
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
            <svg
              className="icon frame-preview"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={design === 'thick' ? 3.5 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={design === 'none' ? '2 3' : undefined}
              opacity={design === 'none' ? 0.5 : undefined}
              aria-hidden="true"
              focusable="false"
            >
              <path d={PREVIEWS[design]} />
            </svg>
            {name}
          </button>
        ))}
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
