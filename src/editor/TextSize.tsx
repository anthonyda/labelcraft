/** Text size, Fit to box and letter width (spec R5.AC5–AC7). */
import { useId, useState } from 'react'
import type { TextObject } from '../model/types'
import { mmToPx } from '../model/units'
import {
  FIT_MAX_PT,
  FIT_MIN_PT,
  stretchOf,
  textFontPt,
} from '../render/textFit'
import { useEditorState } from './useEditor'

const SLIDER_MIN = 4
const SLIDER_MAX = 96

export function TextSize({
  o,
  onChange,
}: {
  o: TextObject
  onChange: (patch: Partial<TextObject>, mergeKey?: string) => void
}) {
  const dpi = useEditorState().history.present.label.dpi
  const id = useId()
  const [draft, setDraft] = useState<string>()
  const auto = !!o.autoSize
  const used = textFontPt(
    o,
    Math.max(1, Math.round(mmToPx(o.width, dpi))),
    Math.max(1, Math.round(mmToPx(o.height, dpi))),
    dpi,
  )
  const shown = auto ? String(used) : (draft ?? String(o.fontSize))
  return (
    <div className="field text-size-field">
      <label htmlFor={`${id}-n`}>
        Size <span className="unit">(pt)</span>
      </label>
      <div className="text-size-row">
        <input
          type="range"
          aria-label="Size slider"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={0.5}
          value={Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, used))}
          disabled={auto}
          // Dragging is one undo step (R5.AC5).
          onChange={(e) =>
            onChange({ fontSize: Number(e.target.value) }, 'fontSize')
          }
        />
        <input
          id={`${id}-n`}
          type="number"
          inputMode="decimal"
          min={FIT_MIN_PT}
          max={FIT_MAX_PT}
          step={0.5}
          value={shown}
          disabled={auto}
          onFocus={() => setDraft(String(o.fontSize))}
          onBlur={() => setDraft(undefined)}
          onChange={(e) => {
            setDraft(e.target.value)
            const v = e.target.valueAsNumber
            if (Number.isNaN(v) || v < FIT_MIN_PT || v > FIT_MAX_PT) return
            onChange({ fontSize: v }, 'fontSize')
          }}
        />
      </div>
      <label className="field check fit-box">
        <input
          type="checkbox"
          checked={auto}
          onChange={(e) =>
            onChange(
              e.target.checked
                ? { autoSize: true }
                : // Turning it off keeps the size used (R5.AC6).
                  { autoSize: false, fontSize: used },
            )
          }
        />
        Fit to box
      </label>
    </div>
  )
}

/** R5.AC7: letter width, 50–200 %. */
export function LetterWidth({
  o,
  onChange,
}: {
  o: TextObject
  onChange: (patch: Partial<TextObject>, mergeKey?: string) => void
}) {
  const id = useId()
  const [draft, setDraft] = useState<string>()
  const pct = Math.round(stretchOf(o) * 100)
  const set = (v: number) =>
    onChange({ stretch: v === 100 ? undefined : v / 100 }, 'stretch')
  return (
    <div className="field text-size-field">
      <label htmlFor={`${id}-n`}>
        Letter width <span className="unit">(%)</span>
      </label>
      <div className="text-size-row">
        <input
          type="range"
          aria-label="Letter width slider"
          min={50}
          max={200}
          step={5}
          value={pct}
          onChange={(e) => set(Number(e.target.value))}
        />
        <input
          id={`${id}-n`}
          type="number"
          inputMode="numeric"
          min={50}
          max={200}
          step={5}
          value={draft ?? String(pct)}
          onFocus={() => setDraft(String(pct))}
          onBlur={() => setDraft(undefined)}
          onChange={(e) => {
            setDraft(e.target.value)
            const v = e.target.valueAsNumber
            if (Number.isNaN(v) || v < 50 || v > 200) return
            set(v)
          }}
        />
      </div>
    </div>
  )
}
