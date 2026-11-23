/** Small form controls for the properties panel. */
import { useId, useState, type ReactNode } from 'react'

const round = (n: number, digits: number) => {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

/**
 * Number input that lets the user type freely (e.g. "1." or "") and reports
 * valid numbers immediately (R9.AC2).
 */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  digits = 2,
  unit,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  digits?: number
  unit?: string
}) {
  const id = useId()
  const [draft, setDraft] = useState<string>()
  const shown = draft ?? String(round(value, digits))
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {unit && <span className="unit"> ({unit})</span>}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={shown}
        min={min}
        max={max}
        step={step}
        onFocus={() => setDraft(String(round(value, digits)))}
        onBlur={() => setDraft(undefined)}
        onChange={(e) => {
          setDraft(e.target.value)
          const v = e.target.valueAsNumber
          if (Number.isNaN(v)) return
          if (min !== undefined && v < min) return
          if (max !== undefined && v > max) return
          onChange(v)
        }}
      />
    </div>
  )
}

export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: T
  options: readonly (readonly [T, string])[]
  onChange: (v: T) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={String(value)}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value
          const match = options.find(([v]) => String(v) === raw)
          if (match) onChange(match[0])
        }}
      >
        {options.map(([v, name]) => (
          <option key={String(v)} value={String(v)}>
            {name}
          </option>
        ))}
      </select>
    </div>
  )
}

export function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="field check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}

export function TextField({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
}) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

export function FieldGroup({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <fieldset className="field-group">
      <legend>{title}</legend>
      {children}
    </fieldset>
  )
}
