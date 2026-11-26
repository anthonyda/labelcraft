/**
 * Printer service (T2.2, T2.3): wraps a niimbluelib client with a small state
 * machine and the print flow required by R11.AC4. UI code subscribes to state
 * changes and never talks to the library directly.
 */
import {
  ImageEncoder,
  LabelType,
  PacketGenerator,
  PageColorType,
  Utils,
  findPrintTask,
  getPrinterMetaByModel,
  instantiateClient,
  type CombinedRfidInfo,
  type HeartbeatData,
  type NiimbotAbstractClient,
  type PrintProgressEvent,
  type PrintPacketProgressEvent,
  type PrintTaskName,
  type PrinterModel,
  type PrinterModelMeta,
} from '@mmote/niimbluelib'
import { localSettings, type SettingStore } from '../storage/settings'
import type { Transport } from './capabilities'
import { EmulatedD110MClient, type EmulatorOptions } from './emulator'

export type PrinterStatus =
  'disconnected' | 'connecting' | 'connected' | 'printing'

export type PrintProgress = { phase: 'send' | 'print'; percent: number }

/** What the printer reported about the loaded roll (R18). */
export type LoadedRoll = {
  /** Roll width × label length in mm, when the printer reports them. */
  size?: { widthMm: number; lengthMm: number }
  labelType?: LabelType
  /** From the roll's RFID tag, when present. */
  labelsLeft?: number
  /** Where the size came from (R18.AC10). */
  sizeSource?: 'printer' | 'remembered'
  /** The roll's RFID tag, when read (R18.AC9). */
  tag?: { barCode: string; serial: string; total: number; used: number }
}

/** R18.AC9: the printer's raw answer to the paper-info command. */
export type PaperInfoAnswer = { hex: string; length: number } | 'no answer'

/** R18.AC8: lid and tag state from the heartbeat, when reported. */
export type RollSensor = {
  lidOpen?: boolean
  /** False when the printer says it couldn't read the roll's tag. */
  tagRead?: boolean
}

/** R18.AC8: the heartbeat fields that explain a missing roll. */
export const rollSensorFrom = (data: HeartbeatData): RollSensor => ({
  lidOpen: data.lidClosed === undefined ? undefined : !data.lidClosed,
  tagRead: data.paperRfidSuccess,
})

const sameSensor = (a?: RollSensor, b?: RollSensor) =>
  a?.lidOpen === b?.lidOpen && a?.tagRead === b?.tagRead

export type PrinterState = {
  status: PrinterStatus
  transport?: Transport
  deviceName?: string
  /** Detected model, or undefined when unknown (R2.AC2). */
  model?: PrinterModelMeta
  /** Model chosen by the user, remembered between visits (R17.AC2, AC5). */
  chosen?: PrinterModelMeta
  /** Set when a detected model replaced a different chosen one (R17.AC3). */
  modelNotice?: string
  /** Loaded roll, read on connect, on request and on change (R18.AC1). */
  roll?: LoadedRoll
  /** What the printer's heartbeat says about the roll (R18.AC8). */
  rollSensor?: RollSensor
  /** Raw paper-info answer, for diagnosis (R18.AC9). */
  paperInfoAnswer?: PaperInfoAnswer
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

export type ModelSource = 'detected' | 'chosen'

/**
 * R17: the model the app lays labels out for: the detected one while
 * connected, else the chosen one.
 */
export const knownModel = (
  state: PrinterState,
): { meta: PrinterModelMeta; source: ModelSource } | undefined => {
  if (state.model) return { meta: state.model, source: 'detected' }
  if (state.chosen) return { meta: state.chosen, source: 'chosen' }
  return undefined
}

const LABEL_TYPES = new Set<number>(
  Object.values(LabelType).filter((v): v is number => typeof v === 'number'),
)

/** R18.AC2, AC5, AC6: read what the printer said about its roll. */
export const rollFromRfid = (info: CombinedRfidInfo): LoadedRoll => {
  const roll: LoadedRoll = {}
  const paper = info.paperInfo
  if (paper?.valid && paper.paperWidth && paper.paperHeight) {
    roll.size = { widthMm: paper.paperWidth, lengthMm: paper.paperHeight }
    roll.sizeSource = 'printer'
  }
  const tag = info.labelRfidInfo
  const type =
    paper?.valid && paper.paperType ? paper.paperType : tag?.consumablesType
  // 0 (Invalid) means unknown.
  if (type && LABEL_TYPES.has(type)) {
    roll.labelType = type
  }
  if (tag?.tagPresent && tag.allPaper >= 0 && tag.usedPaper >= 0) {
    roll.labelsLeft = Math.max(0, tag.allPaper - tag.usedPaper)
  }
  if (tag?.tagPresent) {
    roll.tag = {
      barCode: tag.barCode,
      serial: tag.serialNumber,
      total: tag.allPaper,
      used: tag.usedPaper,
    }
  }
  return roll
}

const ROLL_SIZES_SETTING = 'rollSizes'

type RollSize = NonNullable<LoadedRoll['size']>

/** R18.AC10: remembered sizes, by tag barcode. */
const readRollSizes = (settings: SettingStore): Record<string, RollSize> => {
  try {
    const v: unknown = JSON.parse(settings.get(ROLL_SIZES_SETTING) ?? '{}')
    if (!v || typeof v !== 'object') return {}
    const out: Record<string, RollSize> = {}
    for (const [k, s] of Object.entries(v as Record<string, unknown>)) {
      const r = s as Partial<RollSize> | null
      if (
        typeof r?.widthMm === 'number' &&
        typeof r.lengthMm === 'number' &&
        r.widthMm > 0 &&
        r.lengthMm > 0
      ) {
        out[k] = { widthMm: r.widthMm, lengthMm: r.lengthMm }
      }
    }
    return out
  } catch {
    return {}
  }
}

const MODEL_SETTING = 'printerModel'

export class PrinterService {
  private state: PrinterState = { status: 'disconnected' }
  private listeners = new Set<Listener>()
  private client?: NiimbotAbstractClient
  private cancelRequested?: () => void

  private readonly createClient: ClientFactory
  private readonly settings: SettingStore

  constructor(
    createClient: ClientFactory = defaultClientFactory,
    settings: SettingStore = localSettings,
  ) {
    this.createClient = createClient
    this.settings = settings
    const saved = settings.get(MODEL_SETTING)
    const chosen = saved
      ? getPrinterMetaByModel(saved as PrinterModel)
      : undefined
    this.state = { status: 'disconnected', chosen }
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

  /** `replace` resets the connection state but keeps the chosen model. */
  private set(patch: Partial<PrinterState>, replace = false) {
    this.state = replace
      ? ({ chosen: this.state.chosen, ...patch } as PrinterState)
      : { ...this.state, ...patch }
    this.listeners.forEach((l) => l(this.state))
  }

  /** The print task for a model, if the library knows one. */
  private taskFor(meta?: PrinterModelMeta): PrintTaskName | undefined {
    if (!meta) return undefined
    return findPrintTask(
      meta.model,
      this.client?.getPrinterInfo().protocolVersion,
    )
  }

  /**
   * R17.AC2, AC4, AC5: choose the model (undefined = any printer). While a
   * printer is connected with an undetected model, it also sets the print task.
   */
  setChosenModel(model: string | undefined): void {
    const chosen = model
      ? getPrinterMetaByModel(model as PrinterModel)
      : undefined
    this.settings.set(MODEL_SETTING, chosen?.model)
    const patch: Partial<PrinterState> = { chosen, modelNotice: undefined }
    if (this.state.status !== 'disconnected' && !this.state.model) {
      patch.printTask = this.client?.getPrintTaskType() ?? this.taskFor(chosen)
    }
    this.set(patch)
  }

  /** R18.AC1: ask the printer about the loaded roll again. */
  async readRoll(): Promise<void> {
    const client = this.client
    if (!client || this.state.status !== 'connected') return
    const info = await client.fetchRfidInfo()
    if (this.client === client) this.set({ roll: this.withMemory(info) })
    await this.readPaperInfoAnswer(client)
  }

  /** R18.AC10: a reported size wins; else the size remembered for the tag. */
  private withMemory(info: CombinedRfidInfo): LoadedRoll {
    const roll = rollFromRfid(info)
    if (roll.size || !roll.tag?.barCode) return roll
    const size = readRollSizes(this.settings)[roll.tag.barCode]
    return size ? { ...roll, size, sizeSource: 'remembered' } : roll
  }

  /** R18.AC9: ask for the paper info again and keep the raw bytes. */
  private async readPaperInfoAnswer(client: NiimbotAbstractClient) {
    let answer: PaperInfoAnswer
    try {
      const packet = await client.sendPacketWaitResponse(
        PacketGenerator.getPaperInfo(),
      )
      answer = {
        hex: Utils.bufToHex(packet.data, ' '),
        length: packet.dataLength,
      }
    } catch {
      answer = 'no answer'
    }
    if (this.client === client) this.set({ paperInfoAnswer: answer })
  }

  /** R18.AC10: remember the loaded roll's size for its tag barcode. */
  rememberRollSize(size: RollSize): void {
    const roll = this.state.roll
    const code = roll?.tag?.barCode
    if (!roll || !code || roll.sizeSource === 'printer') return
    const sizes = { ...readRollSizes(this.settings), [code]: size }
    this.settings.set(ROLL_SIZES_SETTING, JSON.stringify(sizes))
    this.set({ roll: { ...roll, size, sizeSource: 'remembered' } })
  }

  /** R18.AC10: forget the remembered size of the loaded roll. */
  forgetRollSize(): void {
    const roll = this.state.roll
    const code = roll?.tag?.barCode
    if (!roll || !code || roll.sizeSource !== 'remembered') return
    const sizes = readRollSizes(this.settings)
    delete sizes[code]
    this.settings.set(
      ROLL_SIZES_SETTING,
      Object.keys(sizes).length ? JSON.stringify(sizes) : undefined,
    )
    const rest = { ...roll }
    delete rest.size
    delete rest.sizeSource
    this.set({ roll: rest })
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
    // R18.AC1: the library reads the roll again when the lid or roll changes.
    client.on('rfidinfofetched', (e) => {
      if (this.client === client && this.state.status !== 'connecting') {
        this.set({ roll: this.withMemory(e.info) })
        void this.readPaperInfoAnswer(client)
      }
    })
    // R18.AC8: lid and tag state, to explain a missing roll.
    client.on('heartbeat', (e) => {
      if (this.client !== client) return
      const sensor = rollSensorFrom(e.data)
      if (!sameSensor(sensor, this.state.rollSensor)) {
        this.set({ rollSensor: sensor })
      }
    })

    try {
      const info = await client.connect()
      // R2.AC7: cancelled (or replaced) while connecting: drop this one.
      if (this.client !== client) {
        await client.disconnect().catch(() => undefined)
        return
      }
      const detected = client.getModelMetadata()
      const chosen = this.state.chosen
      const patch: Partial<PrinterState> = {
        status: 'connected',
        deviceName: info.deviceName ?? 'Unknown printer',
        model: detected,
        printTask: client.getPrintTaskType() ?? this.taskFor(chosen),
        // The library reads the roll while connecting (fetchRfidInfo).
        roll: this.withMemory(client.getRfidInfo()),
      }
      // R17.AC3: the detected model replaces the chosen one.
      if (detected) {
        if (chosen && chosen.model !== detected.model) {
          patch.modelNotice = `Detected ${detected.model}; it replaces the ${chosen.model} you had chosen.`
        }
        patch.chosen = detected
        this.settings.set(MODEL_SETTING, detected.model)
      }
      this.set(patch)
      await this.readPaperInfoAnswer(client)
    } catch (e) {
      await client.disconnect().catch(() => undefined)
      // R2.AC7: a cancelled connection reports nothing.
      if (this.client !== client) return
      this.client = undefined
      this.set(
        { status: 'disconnected', transport, error: errorMessage(e) },
        true,
      )
    }
  }

  /** R2.AC7: give up a connection that hangs (e.g. Bluetooth pairing). */
  async cancelConnect(): Promise<void> {
    if (this.state.status === 'connecting') await this.disconnect()
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
