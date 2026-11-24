/** Connect / disconnect (T2.4, R1, R2, R16), printer model (R17), roll (R18). */
import { LabelType, modelsLibrary } from '@mmote/niimbluelib'
import { useMemo, useState } from 'react'
import { RollOffer } from '../editor/RollOffer'
import { FAMILIES, FAMILY_ORDER, familyOfModel } from '../model/labelSizes'
import {
  availableTransports,
  canPrintToHardware,
  detectCapabilities,
  type Transport,
} from '../printer/capabilities'
import { printerService, usePrinter } from '../printer/usePrinter'

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

const LABEL_TYPE_NAMES: Partial<Record<LabelType, string>> = {
  [LabelType.WithGaps]: 'labels with gaps',
  [LabelType.Black]: 'black mark',
  [LabelType.Continuous]: 'continuous',
  [LabelType.Transparent]: 'transparent labels',
}

function ModelPicker() {
  const state = usePrinter()
  const detected = state.model
  const id = 'printer-model'
  return (
    <div className="field">
      <label htmlFor={id}>Printer model</label>
      <select
        id={id}
        value={detected?.model ?? state.chosen?.model ?? ''}
        disabled={!!detected || state.status === 'printing'}
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
                {detected?.model === m ? ' (detected)' : ''}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}

function RollInfo() {
  const state = usePrinter()
  const roll = state.roll
  if (state.status !== 'connected' && state.status !== 'printing') return null
  const type = roll?.labelType && LABEL_TYPE_NAMES[roll.labelType]
  return (
    <div className="roll-info">
      {roll?.size ? (
        <p className="status" data-testid="loaded-roll">
          Loaded roll: {roll.size.widthMm} × {roll.size.lengthMm} mm
          {type && `, ${type}`}
          {roll.labelsLeft !== undefined && ` · ${roll.labelsLeft} labels left`}
        </p>
      ) : (
        <p className="status" data-testid="loaded-roll">
          This printer didn't report the loaded roll.
        </p>
      )}
      <button
        type="button"
        onClick={() => printerService.readRoll()}
        disabled={state.status !== 'connected'}
      >
        Read roll
      </button>
      <RollOffer />
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
            Connected to <strong>{state.deviceName}</strong>
            {state.transport === 'emulator' && (
              <span className="badge">Emulated</span>
            )}
            {' · '}
            {state.model
              ? state.model.model
              : state.chosen
                ? `model not recognised, using ${state.chosen.model}`
                : 'unknown model'}
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

      {connected ? (
        <button
          type="button"
          onClick={() => printerService.disconnect()}
          disabled={state.status === 'printing'}
        >
          Disconnect
        </button>
      ) : (
        <button
          type="button"
          className="primary"
          onClick={() => printerService.connect(transport)}
          disabled={busy}
        >
          Connect
        </button>
      )}
    </div>
  )
}
