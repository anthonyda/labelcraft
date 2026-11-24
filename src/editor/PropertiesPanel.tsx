/**
 * Properties panel (T4.4, R9) and label setup (T4.5, R3). Every change shows
 * on the canvas immediately; typing in one field is a single undo step.
 */
import { useId, useRef, useState } from 'react'
import type {
  BarcodeFormat,
  ImageMode,
  LabelObject,
  QrErrorCorrection,
  TextAlign,
} from '../model/types'
import {
  findSize,
  headFor,
  labelSizesFor,
  selectedSizeId,
  sizeName,
  sizeToLabel,
} from '../model/labelSizes'
import { labelSizePx } from '../model/units'
import { useKnownModel } from '../printer/usePrinter'
import {
  CheckField,
  FieldGroup,
  NumberField,
  SelectField,
  TextField,
} from './fields'
import { FONT_FAMILIES } from './fonts'
import { IMAGE_ACCEPT, imageObjectFromFile } from './images'
import { RollOffer } from './RollOffer'
import { useEditorState, useEditorStore } from './useEditor'

const TYPE_NAMES: Record<LabelObject['type'], string> = {
  text: 'Text',
  image: 'Image',
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  line: 'Line',
  qr: 'QR code',
  barcode: 'Barcode',
}

const mm = (n: number) => String(Math.round(n * 100) / 100)

/** R3.AC1, R12: official sizes grouped by family, then Custom. */
function SizeField() {
  const store = useEditorStore()
  const label = useEditorState().history.present.label
  const model = useKnownModel()
  const id = useId()
  const groups = labelSizesFor(model?.model)
  const value = selectedSizeId(label, groups, model)
  return (
    <div className="field">
      <label htmlFor={id}>Size</label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          const size = findSize(e.target.value)
          // R12.AC2: Custom starts from the current size.
          if (!size) return store.setLabel({ size: 'custom' })
          store.setLabel({
            ...sizeToLabel(size, headFor(size.family, model)),
            size: size.id,
          })
        }}
      >
        {groups.map((g) => (
          <optgroup key={g.family} label={g.label}>
            {g.sizes.map((s) => (
              <option key={s.id} value={s.id}>
                {sizeName(s, headFor(s.family, model))}
              </option>
            ))}
          </optgroup>
        ))}
        <option value="custom">Custom</option>
      </select>
    </div>
  )
}

function LabelSetupFields() {
  const store = useEditorStore()
  const doc = useEditorState().history.present
  const model = useKnownModel()
  const { width, height } = labelSizePx(doc.label)
  // R3.AC3: the printhead spans the label height for "left" printers.
  const across = model?.printDirection === 'left' ? height : width
  const overflow = model && across > model.printheadPixels
  const custom =
    selectedSizeId(doc.label, labelSizesFor(model?.model), model) === 'custom'

  return (
    <FieldGroup title="Label">
      <SizeField />
      {custom ? (
        <>
          <NumberField
            label="Width"
            unit="mm"
            value={doc.label.widthMm}
            min={1}
            max={500}
            onChange={(v) =>
              store.setLabel({ widthMm: v, size: 'custom' }, 'label:width')
            }
          />
          <NumberField
            label="Height"
            unit="mm"
            value={doc.label.heightMm}
            min={1}
            max={500}
            onChange={(v) =>
              store.setLabel({ heightMm: v, size: 'custom' }, 'label:height')
            }
          />
        </>
      ) : (
        <p className="status" data-testid="label-dimensions">
          {mm(doc.label.widthMm)} × {mm(doc.label.heightMm)} mm
        </p>
      )}
      <SelectField
        label={
          model
            ? `Resolution (from ${model.model}${model.source === 'chosen' ? ', chosen' : ''})`
            : 'Resolution'
        }
        value={doc.label.dpi}
        options={[
          [203, '203 dpi'],
          [300, '300 dpi'],
        ]}
        disabled={!!model}
        onChange={(v) => store.setLabel({ dpi: v })}
      />
      <RollOffer />
      {overflow && (
        <p className="warning" role="note">
          This label is {across} dots across, but the {model.model}'s print head
          is {model.printheadPixels} dots ({' '}
          {((model.printheadPixels / model.dpi) * 25.4).toFixed(1)} mm). The
          edge will be cut off.
        </p>
      )}
    </FieldGroup>
  )
}

function ObjectFields({ o }: { o: LabelObject }) {
  const store = useEditorStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string>()
  const set = (patch: Partial<LabelObject>, field?: string) =>
    store.updateObject(o.id, patch, field && `${o.id}:${field}`)

  return (
    <>
      <FieldGroup title={TYPE_NAMES[o.type]}>
        {o.type === 'text' && (
          <>
            <TextField
              label="Text"
              multiline
              value={o.text}
              onChange={(text) => set({ text }, 'text')}
            />
            <SelectField
              label="Font"
              value={o.fontFamily}
              options={FONT_FAMILIES.map((f) => [f, f] as const)}
              onChange={(fontFamily) => set({ fontFamily })}
            />
            <NumberField
              label="Size"
              unit="pt"
              value={o.fontSize}
              min={1}
              max={200}
              step={1}
              onChange={(fontSize) => set({ fontSize }, 'fontSize')}
            />
            <div className="field-row">
              <CheckField
                label="Bold"
                checked={o.bold}
                onChange={(bold) => set({ bold })}
              />
              <CheckField
                label="Italic"
                checked={o.italic}
                onChange={(italic) => set({ italic })}
              />
              <CheckField
                label="Underline"
                checked={o.underline}
                onChange={(underline) => set({ underline })}
              />
            </div>
            <SelectField<TextAlign>
              label="Alignment"
              value={o.align}
              options={[
                ['left', 'Left'],
                ['center', 'Centre'],
                ['right', 'Right'],
              ]}
              onChange={(align) => set({ align })}
            />
            <NumberField
              label="Line height"
              value={o.lineHeight}
              min={0.5}
              max={3}
              step={0.1}
              onChange={(lineHeight) => set({ lineHeight }, 'lineHeight')}
            />
          </>
        )}

        {o.type === 'image' && (
          <>
            <button type="button" onClick={() => fileRef.current?.click()}>
              Replace image…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={IMAGE_ACCEPT}
              hidden
              aria-label="Replacement image file"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                try {
                  const img = await imageObjectFromFile(file, store.doc.label)
                  set({ src: img.src })
                  setError(undefined)
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err))
                }
              }}
            />
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <SelectField<ImageMode>
              label="Black and white"
              value={o.mode}
              options={[
                ['dither', 'Dithering (photos)'],
                ['threshold', 'Threshold (logos, drawings)'],
              ]}
              onChange={(mode) => set({ mode })}
            />
            {o.mode === 'threshold' && (
              <NumberField
                label="Threshold"
                value={o.threshold}
                min={1}
                max={255}
                step={1}
                digits={0}
                onChange={(threshold) => set({ threshold }, 'threshold')}
              />
            )}
          </>
        )}

        {(o.type === 'rect' || o.type === 'ellipse') && (
          <>
            <CheckField
              label="Filled"
              checked={o.filled}
              onChange={(filled) => set({ filled })}
            />
            {!o.filled && (
              <NumberField
                label="Outline"
                unit="mm"
                value={o.strokeWidth}
                min={0.1}
                max={20}
                onChange={(strokeWidth) => set({ strokeWidth }, 'strokeWidth')}
              />
            )}
          </>
        )}

        {o.type === 'line' && (
          <NumberField
            label="Thickness"
            unit="mm"
            value={o.strokeWidth}
            min={0.1}
            max={20}
            onChange={(strokeWidth) => set({ strokeWidth }, 'strokeWidth')}
          />
        )}

        {o.type === 'qr' && (
          <>
            <TextField
              label="Content"
              multiline
              value={o.content}
              onChange={(content) => set({ content }, 'content')}
            />
            <SelectField<QrErrorCorrection>
              label="Error correction"
              value={o.errorCorrection}
              options={[
                ['L', 'Low (7%)'],
                ['M', 'Medium (15%)'],
                ['Q', 'Quartile (25%)'],
                ['H', 'High (30%)'],
              ]}
              onChange={(errorCorrection) => set({ errorCorrection })}
            />
          </>
        )}

        {o.type === 'barcode' && (
          <>
            <TextField
              label="Content"
              value={o.content}
              onChange={(content) => set({ content }, 'content')}
            />
            <SelectField<BarcodeFormat>
              label="Format"
              value={o.format}
              options={[
                ['CODE128', 'Code 128'],
                ['EAN13', 'EAN-13'],
              ]}
              onChange={(format) => set({ format })}
            />
            <CheckField
              label="Show text"
              checked={o.showText}
              onChange={(showText) => set({ showText })}
            />
          </>
        )}
      </FieldGroup>

      <FieldGroup title="Position and size">
        <div className="field-row">
          <NumberField
            label="X"
            unit="mm"
            value={o.x}
            onChange={(x) => set({ x }, 'x')}
          />
          <NumberField
            label="Y"
            unit="mm"
            value={o.y}
            onChange={(y) => set({ y }, 'y')}
          />
        </div>
        <div className="field-row">
          <NumberField
            label="Width"
            unit="mm"
            value={o.width}
            min={0.1}
            onChange={(width) => set({ width }, 'width')}
          />
          <NumberField
            label="Height"
            unit="mm"
            value={o.height}
            min={0.1}
            onChange={(height) => set({ height }, 'height')}
          />
        </div>
        <NumberField
          label="Rotation"
          unit="°"
          value={o.rotation}
          min={-360}
          max={360}
          step={1}
          onChange={(rotation) => set({ rotation }, 'rotation')}
        />
      </FieldGroup>
    </>
  )
}

export function PropertiesPanel() {
  const { history, selection } = useEditorState()
  const selected = history.present.objects.filter((o) =>
    selection.includes(o.id),
  )
  return (
    <aside className="properties" aria-label="Properties">
      {selected.length === 1 ? (
        <ObjectFields key={selected[0].id} o={selected[0]} />
      ) : selected.length > 1 ? (
        <p className="status">{selected.length} objects selected.</p>
      ) : (
        <LabelSetupFields />
      )}
    </aside>
  )
}
