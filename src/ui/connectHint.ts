/** R2.AC6: a hint when the printer doesn't answer while connecting. */
import type { Transport } from '../printer/capabilities'

const NO_ANSWER = /timeout|timed out|negotiate/i

export const connectHint = (
  error: string,
  transport: Transport | undefined,
): string | undefined => {
  if (!NO_ANSWER.test(error)) return undefined
  const extra =
    transport === 'serial'
      ? ' and the USB cable is plugged in'
      : transport === 'bluetooth'
        ? ' and close to this device'
        : ''
  return `Make sure the printer is switched on${extra}, then press Connect again.`
}
