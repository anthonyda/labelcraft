/**
 * Printer service (T2.2, T2.3): wraps a niimbluelib client with a small state
 * machine and the print flow required by R11.AC4. UI code subscribes to state
 * changes and never talks to the library directly.
 */
import {
  ImageEncoder,
  LabelType,
  PageColorType,
  instantiateClient,
  type NiimbotAbstractClient,
  type PrintProgressEvent,
  type PrintPacketProgressEvent,
  type PrintTaskName,
  type PrinterModelMeta,
} from '@mmote/niimbluelib'
import type { Transport } from './capabilities'
import { EmulatedD110MClient, type EmulatorOptions } from './emulator'

export type PrinterStatus =
  'disconnected' | 'connecting' | 'connected' | 'printing'

export type PrintProgress = { phase: 'send' | 'print'; percent: number }

export type PrinterState = {
  status: PrinterStatus
  transport?: Transport
  deviceName?: string
  /** Detected model, or undefined when unknown (R2.AC2). */
  model?: PrinterModelMeta
  /** Print task detected for the model, if any (R11.AC3). */
  printTask?: PrintTaskName
  progress?: PrintProgress
  /** Last connect or print error, shown to the user. */
  error?: string
}

export type PrintJobOptions = {
  quantity: number
  density: number
  labelType: LabelType
  /** Required when the print task could not be detected. */
  printTask?: PrintTaskName
}

export class PrintCancelledError extends Error {
  constructor() {
    super('Print cancelled.')
  }
}

export type ClientFactory = (
  transport: Transport,
  emulatorOptions?: EmulatorOptions,
) => NiimbotAbstractClient

export const defaultClientFactory: ClientFactory = (
  transport,
  emulatorOptions,
) =>
  transport === 'emulator'
    ? new EmulatedD110MClient(emulatorOptions)
    : instantiateClient(transport)

type Listener = (state: PrinterState) => void

const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : String(e)

export class PrinterService {
  private state: PrinterState = { status: 'disconnected' }
  private listeners = new Set<Listener>()
  private client?: NiimbotAbstractClient
  private cancelRequested?: () => void

  private readonly createClient: ClientFactory

  constructor(createClient: ClientFactory = defaultClientFactory) {
    this.createClient = createClient
  }

  getState = (): PrinterState => this.state

  /** Subscribe to state changes; returns an unsubscribe function. */
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** The underlying client (e.g. to read emulator output). */
  getClient(): NiimbotAbstractClient | undefined {
    return this.client
  }

  private set(patch: Partial<PrinterState>, replace = false) {
    this.state = replace ? (patch as PrinterState) : { ...this.state, ...patch }
    this.listeners.forEach((l) => l(this.state))
  }

  /** R2.AC1–AC3: opens the browser device picker for real transports. */
  async connect(
    transport: Transport,
    emulatorOptions?: EmulatorOptions,
  ): Promise<void> {
    if (this.state.status !== 'disconnected') await this.disconnect()
    this.set({ status: 'connecting', transport }, true)

    const client = this.createClient(transport, emulatorOptions)
    this.client = client
    // R2.AC4: unexpected disconnects update the state.
    client.on('disconnect', () => {
      if (this.client !== client) return
      this.cancelRequested?.()
      this.client = undefined
      this.set(
        { status: 'disconnected', transport: this.state.transport },
        true,
      )
    })

    try {
      const info = await client.connect()
      this.set({
        status: 'connected',
        deviceName: info.deviceName ?? 'Unknown printer',
        model: client.getModelMetadata(),
        printTask: client.getPrintTaskType(),
      })
    } catch (e) {
      this.client = undefined
      await client.disconnect().catch(() => undefined)
      this.set(
        { status: 'disconnected', transport, error: errorMessage(e) },
        true,
      )
    }
  }

  /** R2.AC4 */
  async disconnect(): Promise<void> {
    const client = this.client
    this.client = undefined
    this.cancelRequested?.()
    await client?.disconnect().catch(() => undefined)
    this.set({ status: 'disconnected', transport: this.state.transport }, true)
  }

  /**
   * R11.AC6. During the data-sending phase, cancellation takes effect as soon
   * as the page data has been sent (the library sends a page atomically).
   */
  cancelPrint(): void {
    this.cancelRequested?.()
  }

  /**
   * R11.AC4–AC6: print a 1-bit canvas. Always ends the print job on the
   * printer and restarts the heartbeat, also on error or cancel.
   */
  async print(canvas: HTMLCanvasElement, opts: PrintJobOptions): Promise<void> {
    const client = this.client
    if (!client || this.state.status !== 'connected') {
      throw new Error('Printer is not connected.')
    }
    const taskName = this.state.printTask ?? opts.printTask
    if (!taskName) throw new Error('Choose a print task for this printer.')
    const printDirection = this.state.model?.printDirection ?? 'left'

    let cancelled = false
    const cancelPromise = new Promise<never>((_, reject) => {
      this.cancelRequested = () => {
        cancelled = true
        reject(new PrintCancelledError())
      }
    })
    cancelPromise.catch(() => undefined)

    const onPacket = (e: PrintPacketProgressEvent) =>
      this.set({ progress: { phase: 'send', percent: e.progress } })
    const onPrint = (e: PrintProgressEvent) => {
      const done = e.page >= e.pagesTotal
      const percent = done
        ? 100
        : Math.floor(
            ((e.page + e.pagePrintProgress / 100) / e.pagesTotal) * 100,
          )
      this.set({
        progress: { phase: 'print', percent: Math.min(100, percent) },
      })
    }

    this.set({
      status: 'printing',
      error: undefined,
      progress: { phase: 'send', percent: 0 },
    })
    client.stopHeartbeat()
    client.on('printpacketprogress', onPacket)
    client.on('printprogress', onPrint)

    const task = client.protocol.newPrintTask(taskName, {
      totalPages: opts.quantity,
      density: opts.density,
      labelType: opts.labelType,
      pageColor: PageColorType.SingleColor,
      statusPollIntervalMs: 100,
      statusTimeoutMs: 8_000,
    })

    let failure: unknown
    try {
      const encoded = ImageEncoder.encodeCanvas(
        canvas,
        PageColorType.SingleColor,
        printDirection,
      )
      await task.printInit()
      await task.printPage(encoded, opts.quantity)
      if (cancelled) throw new PrintCancelledError()
      await Promise.race([task.waitForPageFinished(), cancelPromise])
      await Promise.race([task.waitForFinished(), cancelPromise])
    } catch (e) {
      failure = e
    }

    // Always end the job on the printer (R11.AC4), unless the link is gone.
    if (client.isConnected()) {
      try {
        await task.printEnd()
      } catch (e) {
        failure ??= e
      }
    }

    client.off('printpacketprogress', onPacket)
    client.off('printprogress', onPrint)
    this.cancelRequested = undefined

    if (this.client === client && client.isConnected()) {
      client.startHeartbeat()
      this.set({
        status: 'connected',
        progress: undefined,
        error:
          failure && !(failure instanceof PrintCancelledError)
            ? errorMessage(failure)
            : undefined,
      })
    }

    if (failure) throw failure
  }
}

export { LabelType }
