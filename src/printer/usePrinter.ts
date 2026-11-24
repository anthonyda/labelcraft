import { useMemo, useSyncExternalStore } from 'react'
import type { ModelInfo } from '../model/labelSizes'
import {
  PrinterService,
  knownModel,
  type ModelSource,
  type PrinterState,
} from './printerService'

/** One printer connection for the whole app. */
export const printerService = new PrinterService()

export const usePrinter = (
  service: PrinterService = printerService,
): PrinterState => useSyncExternalStore(service.subscribe, service.getState)

/** R17: the detected or chosen model, as label sizes need it. */
export const useKnownModel = ():
  (ModelInfo & { source: ModelSource }) | undefined => {
  const state = usePrinter()
  const known = knownModel(state)
  const meta = known?.meta
  const source = known?.source
  return useMemo(
    () =>
      meta && source
        ? {
            model: meta.model,
            printDirection: meta.printDirection,
            printheadPixels: meta.printheadPixels,
            dpi: meta.dpi,
            source,
          }
        : undefined,
    [meta, source],
  )
}
