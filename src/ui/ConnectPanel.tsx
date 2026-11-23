/** Connect / disconnect (T2.4, R1, R2, R16). */
import { useMemo, useState } from 'react'
import {
  availableTransports,
  canPrintToHardware,
  detectCapabilities,
  type Transport,
} from '../printer/capabilities'
import { printerService, usePrinter } from '../printer/usePrinter'

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
    <section className="panel" aria-labelledby="printer-title">
      <h2 id="printer-title">Printer</h2>

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
            {state.model ? state.model.model : 'unknown model'}
          </>
        )}
      </p>

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
    </section>
  )
}
