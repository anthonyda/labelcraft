/** Font field with groups and previews (spec R31.AC3). */
import { useId } from 'react'
import { FONT_FAMILIES, FONT_GROUPS } from './fonts'

export function FontField({
  value,
  onChange,
}: {
  value: string
  onChange: (font: string) => void
}) {
  const id = useId()
  const known = FONT_FAMILIES.includes(value)
  return (
    <div className="field font-field">
      <label htmlFor={id}>Font</label>
      <select
        id={id}
        value={value}
        style={{ fontFamily: `"${value}"` }}
        onChange={(e) => onChange(e.target.value)}
      >
        {!known && <option value={value}>{value}</option>}
        {FONT_GROUPS.map((g) => (
          <optgroup key={g.name} label={g.name}>
            {g.fonts.map((f) => (
              // Shown in its own typeface where the browser allows.
              <option key={f} value={f} style={{ fontFamily: `"${f}"` }}>
                {f}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <p
        className="font-sample"
        style={{ fontFamily: `"${value}"` }}
        data-testid="font-sample"
        aria-hidden="true"
      >
        Labels 0123 €
      </p>
    </div>
  )
}
