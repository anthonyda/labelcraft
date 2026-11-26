/** Hints after a failed connection (R2.AC6, AC8). */
import type { Transport } from '../printer/capabilities'

const NO_ANSWER = /timeout|timed out|negotiate/i
/** Bluetooth link failures (Chrome: "Connection attempt failed", GATT). */
const LINK_FAILED = /connection attempt failed|gatt|networkerror/i

export const BLUETOOTH_LINK_HINT =
  "If the printer is paired in your phone's or computer's Bluetooth settings, unpair (forget) it, turn Bluetooth off and on, and close other apps connected to the printer (it takes one connection at a time). Then press Connect and pick it from the browser's list."

export const connectHint = (
  error: string,
  transport: Transport | undefined,
): string | undefined => {
  // R2.AC8
  if (transport === 'bluetooth' && LINK_FAILED.test(error)) {
    return BLUETOOTH_LINK_HINT
  }
  // R2.AC6
  if (!NO_ANSWER.test(error)) return undefined
  const extra =
    transport === 'serial'
      ? ' and the USB cable is plugged in'
      : transport === 'bluetooth'
        ? ' and close to this device'
        : ''
  return `Make sure the printer is switched on${extra}, then press Connect again.`
}
