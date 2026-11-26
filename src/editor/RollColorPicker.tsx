/** Roll colour picker in label setup (spec R28.AC1). */
import {
  CLEAR,
  ROLL_COLORS,
  WHITE,
  rollColorOf,
  rollColorSwatch,
} from '../model/rollColors'
import { useEditorState, useEditorStore } from './useEditor'

const Check = () => (
  <svg className="swatch-check" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)

export function RollColorPicker() {
  const store = useEditorStore()
  const label = useEditorState().history.present.label
  const color = rollColorOf(label)
  const listed = rollColorSwatch(color)
  const custom = !listed

  const set = (value: string, mergeKey?: string) => {
    if (value === rollColorOf(label)) return
    store.setLabel({ color: value === WHITE ? undefined : value }, mergeKey)
  }

  return (
    <div className="field roll-color-field">
      <span className="field-label">
        Roll colour
        <span className="roll-color-name" data-testid="roll-color-name">
          {listed ? listed.name : `Custom ${color}`}
        </span>
      </span>
      <div className="swatches" role="group" aria-label="Roll colour">
        {ROLL_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={'swatch' + (c.value === CLEAR ? ' swatch-clear' : '')}
            style={c.value === CLEAR ? undefined : { background: c.value }}
            aria-pressed={listed?.id === c.id}
            aria-label={c.name}
            title={c.name}
            onClick={() => set(c.value)}
          >
            {listed?.id === c.id && <Check />}
          </button>
        ))}
        <label
          className="swatch swatch-custom"
          title="Custom colour"
          style={custom ? { background: color } : undefined}
          data-active={custom || undefined}
        >
          <input
            type="color"
            aria-label="Custom colour"
            value={color === CLEAR ? WHITE : color}
            // Dragging in the system picker is one undo step (R28.AC3).
            onChange={(e) => set(e.target.value.toLowerCase(), 'label:color')}
          />
          {custom && <Check />}
        </label>
      </div>
    </div>
  )
}
