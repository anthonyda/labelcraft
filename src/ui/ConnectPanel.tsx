/** Connect / disconnect (T2.4, R1, R2, R16), printer model (R17), roll (R18). */
import { modelsLibrary } from '@mmote/niimbluelib'
import { useMemo, useState } from 'react'
import { RollOffer } from '../editor/RollOffer'
import {
  FAMILIES,
  FAMILY_ORDER,
  LABEL_SIZES,
  familyOfModel,
} from '../model/labelSizes'
import { useEditorState } from '../editor/useEditor'
import { Button } from './icons'
import {
  availableTransports,
  canPrintToHardware,
  detectCapabilities,
  type Transport,
} from '../printer/capabilities'
import { printerService, usePrinter } from '../printer/usePrinter'
import { connectHint } from './connectHint'
import { rollMessage } from './rollMessage'

/** Library models grouped by size family (R17.AC2). */
const MODEL_GROUPS: [string, string[]][] = (() => {
  const names = modelsLibrary
    .map((m) => m.model as string)
    .filter((m) => m !== 'UNKNOWN')
    .sort()
  const groups: [string, string[]][] = FAMILY_ORDER.map((f) => [
    FAMILIES[f].name,
    names.filter((m) => familyOfModel(m) === f),
  ])
  groups.push(['Other models', names.filter((m) => !familyOfModel(m))])
  return groups
})()

function ModelPicker() {
  const state = usePrinter()
  const detected = state.model
  const id = 'printer-model'
  // R24.AC2: a detected model is shown as text, not a disabled dropdown.
  if (detected) {
    return (
      <p className="status" data-testid="printer-model">
        Model: <strong>{detected.model}</strong> (detected)
      </p>
    )
  }
  return (
    <div className="field">
      <label htmlFor={id}>Printer model</label>
      <select
        id={id}
        value={state.chosen?.model ?? ''}
        disabled={state.status === 'printing'}
        onChange={(e) =>
          printerService.setChosenModel(e.target.value || undefined)
        }
      >
        <option value="">Any printer</option>
        {MODEL_GROUPS.map(([group, models]) => (
          <optgroup key={group} label={group}>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}

const mmText = (n: number) => String(Math.round(n * 100) / 100)

/** R18.AC10: remember or forget the loaded roll's size. */
function RollMemory() {
  const state = usePrinter()
  const label = useEditorState().history.present.label
  const roll = state.roll
  if (!roll?.tag?.barCode) return null
  if (roll.sizeSource === 'remembered') {
    return (
      <Button icon="close" onClick={() => printerService.forgetRollSize()}>
        Forget this roll's size
      </Button>
    )
  }
  if (roll.size) return null
  const listed = LABEL_SIZES.find((s) => s.id === label.size)
  if (!listed) {
    return (
      <p className="field-hint">
        Pick this roll's size in the label's Size list to remember it.
      </p>
    )
  }
  const size = { widthMm: listed.rollWidthMm, lengthMm: listed.lengthMm }
  return (
    <Button icon="roll" onClick={() => printerService.rememberRollSize(size)}>
      Remember: this roll is {mmText(size.widthMm)} × {mmText(size.lengthMm)} mm
    </Button>
  )
}

/** R18.AC9: raw facts about the roll, for diagnosis. */
function RollDetails() {
  const state = usePrinter()
  const tag = state.roll?.tag
  const answer = state.paperInfoAnswer
  return (
    <details className="roll-details" data-testid="roll-details">
      <summary>Roll details</summary>
      <dl>
        <dt>Tag barcode</dt>
        <dd>{tag?.barCode || 'none'}</dd>
        <dt>Tag serial</dt>
        <dd>{tag?.serial || 'none'}</dd>
        <dt>Labels used</dt>
        <dd>{tag ? `${tag.used} of ${tag.total}` : 'unknown'}</dd>
        <dt>Paper info answer</dt>
        <dd data-testid="paper-info-answer">
          {answer === undefined
            ? 'not asked yet'
            : answer === 'no answer'
              ? 'no answer'
              : `${answer.length} bytes: ${answer.hex}`}
        </dd>
      </dl>
    </details>
  )
}

function RollInfo() {
  const state = usePrinter()
  if (state.status !== 'connected' && state.status !== 'printing') return null
  const { text, hint } = rollMessage(state.roll, state.rollSensor)
  return (
    <div className="roll-info">
      <p className="status" data-testid="loaded-roll">
        {text}
      </p>
      {hint && (
        <p className="field-hint" data-testid="roll-hint">
          {hint}
        </p>
      )}
      <Button
        icon="refresh"
        onClick={() => printerService.readRoll()}
        disabled={state.status !== 'connected'}
      >
        Read roll
      </Button>
      <RollMemory />
      <RollOffer />
      <RollDetails />
    </div>
  )
}

const TRANSPORT_LABELS: Record<Transport, string> = {
  bluetooth: 'Bluetooth',
  serial: 'USB cable (serial)',
  emulator: 'Emulated D110_M (no printer needed)',
}

export function ConnectPanel() {
  const state = usePrinter()
  const caps = useMemo(() => detectCapabilities(), [])
  const transports = availableTransports(caps)
  const [transport, setTransport] = useState<Transport>(transports[0])

  const busy = state.status === 'connecting' || state.status === 'printing'
  const connected = state.status === 'connected' || state.status === 'printing'

  return (
    <div className="connect-panel">
      {!canPrintToHardware(caps) && (
        <p className="warning" role="note">
          This browser can't reach real printers. Use Chrome, Edge or Opera on a
          computer, or Chrome on Android. You can still try the emulated
          printer.
        </p>
      )}

      {!connected && (
        <fieldset disabled={busy}>
          <legend>Connect with</legend>
          {transports.map((t) => (
            <label key={t} className="choice">
              <input
                type="radio"
                name="transport"
                value={t}
                checked={transport === t}
                onChange={() => setTransport(t)}
              />
              {TRANSPORT_LABELS[t]}
            </label>
          ))}
        </fieldset>
      )}

      <p className="status" aria-live="polite">
        {state.status === 'disconnected' && 'Not connected.'}
        {state.status === 'connecting' && 'Connecting…'}
        {connected && (
          <>
            Connected:{' '}
            <strong data-testid="connected-printer">
              {state.model?.model ?? state.deviceName}
            </strong>
            {state.transport === 'emulator' && (
              <span className="badge">Emulated</span>
            )}
            {!state.model &&
              (state.chosen
                ? ` · model not recognised, using ${state.chosen.model}`
                : ' · model not recognised')}
          </>
        )}
      </p>

      {state.modelNotice && connected && (
        <p className="notice-model" role="status">
          {state.modelNotice}
        </p>
      )}

      <ModelPicker />
      <RollInfo />

      {state.status === 'disconnected' && state.error && (
        <p className="error" role="alert">
          Couldn't connect: {state.error}
        </p>
      )}
      {state.status === 'disconnected' &&
        state.error &&
        connectHint(state.error, state.transport) && (
          <p className="field-hint" data-testid="connect-hint">
            {connectHint(state.error, state.transport)}
          </p>
        )}

      {connected ? (
        <Button
          icon="unplug"
          onClick={() => printerService.disconnect()}
          disabled={state.status === 'printing'}
        >
          Disconnect
        </Button>
      ) : (
        <>
          {/* R2.AC7: a hanging connection can be given up. */}
          {state.status === 'connecting' && (
            <>
              <p className="field-hint" data-testid="connecting-hint">
                Pairing can take a few seconds. If nothing happens, press Cancel
                and try again.
              </p>
              <Button
                icon="close"
                onClick={() => printerService.cancelConnect()}
              >
                Cancel
              </Button>
            </>
          )}
          <Button
            icon="plug"
            className="primary"
            onClick={() => printerService.connect(transport)}
            disabled={busy}
          >
            Connect
          </Button>
        </>
      )}
    </div>
  )
}
