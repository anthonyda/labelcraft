import { useSyncExternalStore } from 'react'
import { PrinterService, type PrinterState } from './printerService'

/** One printer connection for the whole app. */
export const printerService = new PrinterService()

export const usePrinter = (
  service: PrinterService = printerService,
): PrinterState => useSyncExternalStore(service.subscribe, service.getState)
