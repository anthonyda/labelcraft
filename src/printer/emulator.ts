/**
 * Emulated NIIMBOT D110_M (T2.0, spec R16).
 *
 * A niimbluelib client that, instead of talking to hardware, answers the
 * library's packets the way a D110_M does. It goes through the library's real
 * protocol code (packet encoding, parsing, print tasks), so the app's connect
 * and print flows are exercised end to end. Image rows it receives are
 * reassembled into pages so the app can show what would have been printed.
 *
 * Handshake answers are based on the D110_M (firmware 4.23) exchange recorded
 * in niimbluelib's test dumps (MIT licence); the serial number is made up.
 */
import {
  ConnectEvent,
  ConnectResult,
  DisconnectEvent,
  NiimbotAbstractClient,
  NiimbotPacket,
  PacketParser,
  RequestCommandId as TX,
  ResponseCommandId as RX,
  Utils,
  type ConnectionInfo,
  type NiimbotClientType,
  type PrintDirection,
} from '@mmote/niimbluelib'

export const EMULATOR_DEVICE_NAME = 'Emulated D110_M'

/** One page as received by the printer, in printer orientation. */
export type ReceivedPage = {
  /** Number of image rows (paper feed direction). */
  rows: number
  /** Pixels per row (printhead direction). */
  cols: number
  copies: number
  /** rows × cols, 1 = black. */
  pixels: Uint8Array
}

export type EmulatorOptions = {
  /** Simulated time to print one copy, in ms. */
  pageMs?: number
  /** Answer with a printer error at this step (for testing error handling). */
  failAt?: 'printStart' | 'pageEnd' | 'status'
  /** Printer error code to report with `failAt` (default 1 = cover open). */
  errorCode?: number
  /** Report the lid as open in heartbeats. */
  lidOpen?: boolean
}

const hex = (s: string) => Utils.hexToBuf(s)

/** Answers that do not depend on state, keyed by request command (+ first data byte). */
const STATIC_ANSWERS: Record<string, [RX, Uint8Array]> = {
  // Connect → ConnectedV3
  [`${TX.Connect}`]: [RX.In_Connect, Uint8Array.of(ConnectResult.ConnectedV3)],
  // Status data: firmware 3.01 → protocol v4, no colour
  [`${TX.PrinterStatusData}`]: [
    RX.In_PrinterStatusData,
    hex('3030232800c80000000a00030112ee00'),
  ],
  [`${TX.GetPrinterCapabilities}`]: [
    RX.In_GetPrinterCapabilities,
    hex(
      '010100020101030100040200c80501010602040007020501080205010904000000170a0200600b0206400c01010d01020e01010f0103100101110204011201001302000014010315010016010017010118050107000000190101',
    ),
  ],
  // PrinterInfo: model id 2320 (D110_M)
  [`${TX.PrinterInfo}:8`]: [RX.In_PrinterInfoPrinterCode, hex('0910')],
  // PrinterInfo: serial number "EMULATED01"
  [`${TX.PrinterInfo}:11`]: [
    RX.In_PrinterInfoSerialNumber,
    new TextEncoder().encode('EMULATED01'),
  ],
  // PrinterInfo: battery level 4 (of 4)
  [`${TX.PrinterInfo}:10`]: [RX.In_PrinterInfoChargeLevel, hex('04')],
  // PrinterInfo: auto shutdown time 3
  [`${TX.PrinterInfo}:7`]: [RX.In_PrinterInfoAutoShutDownTime, hex('03')],
  // PrinterInfo: area
  [`${TX.PrinterInfo}:15`]: [RX.In_PrinterInfoArea, hex('0001')],
  // Heartbeat (printer info): hw 4.01, fw 4.23, printhead 96 px, 203 dpi
  [`${TX.Heartbeat}:3`]: [RX.In_HeartbeatBasic, hex('04010417006002020100')],
  // No RFID tag on the label roll
  [`${TX.RfidInfo}`]: [RX.In_RfidInfo, hex('00')],
  // Print settings acknowledged
  [`${TX.SetLabelType}`]: [RX.In_SetLabelType, hex('01')],
  [`${TX.SetDensity}`]: [RX.In_SetDensity, hex('01')],
  [`${TX.SetPrintSpeed}`]: [RX.In_SetPrintSpeed, hex('01')],
  [`${TX.PrintQuantity}`]: [RX.In_PrintQuantity, hex('01')],
}

/** Image row packets: no answer, like the real printer. */
const ROW_COMMANDS: number[] = [
  TX.PrintBitmapRow,
  TX.PrintBitmapRowIndexed,
  TX.PrintEmptyRow,
]

type Job = {
  totalPages: number
  /** Copies whose data has fully arrived and are waiting to print. */
  queued: number
  printed: number
  /** When the copy currently printing started (ms timestamp). */
  copyStartedAt: number
  current?: ReceivedPage
  pages: ReceivedPage[]
}

export class EmulatedD110MClient extends NiimbotAbstractClient {
  private connected = false
  private job?: Job
  private timer?: ReturnType<typeof setInterval>
  private readonly options: Required<Omit<EmulatorOptions, 'failAt'>> &
    Pick<EmulatorOptions, 'failAt'>

  constructor(options: EmulatorOptions = {}) {
    super()
    this.options = {
      pageMs: 800,
      errorCode: 1,
      lidOpen: false,
      ...options,
    }
    this.setPacketInterval(0)
  }

  /** Pages received in the last print job, in printer orientation. */
  get receivedPages(): ReceivedPage[] {
    return this.job?.pages ?? []
  }

  override async connect(): Promise<ConnectionInfo> {
    this.connected = true
    await this.negotiateAndGetPrinterInfo(() => (this.connected = false))
    const result: ConnectionInfo = {
      deviceName: EMULATOR_DEVICE_NAME,
      result: this.printerInfo.connectResult ?? ConnectResult.FirmwareErrors,
    }
    this.emit('connect', new ConnectEvent(result))
    return result
  }

  override async disconnect(): Promise<void> {
    this.stopHeartbeat()
    this.stopJobTimer()
    if (this.connected) {
      this.connected = false
      this.emit('disconnect', new DisconnectEvent())
    }
  }

  override isConnected(): boolean {
    return this.connected
  }

  override getType(): NiimbotClientType {
    return 'virtual'
  }

  override async sendRaw(data: Uint8Array, force?: boolean): Promise<void> {
    const send = async () => {
      if (!this.connected) throw new Error('Port is not readable/writable')
      await Utils.sleep(this.packetIntervalMs)
      // The connect packet is sent with a one-byte prefix; skip to the header.
      let start = 0
      while (
        start < data.length - 1 &&
        !(data[start] === 0x55 && data[start + 1] === 0x55)
      ) {
        start++
      }
      for (const packet of PacketParser.parsePacketBundle(data.slice(start))) {
        const answer = this.handle(packet)
        if (answer) {
          const bytes = answer.toBytes()
          setTimeout(() => this.processRawPacket(bytes), 1)
        }
      }
    }
    if (force) await send()
    else await this.mutex.runExclusive(send)
  }

  private handle(packet: NiimbotPacket): NiimbotPacket | undefined {
    const cmd = packet.command as TX
    const d = packet.data
    const reply = (id: RX, data: Uint8Array | number[]) =>
      new NiimbotPacket(id, data)
    const fail = () => reply(RX.In_PrintError, [this.options.errorCode])

    if (ROW_COMMANDS.includes(cmd)) {
      this.receiveRow(cmd, d)
      return undefined
    }

    switch (cmd) {
      case TX.Heartbeat:
        if (d[0] === 4 || d[0] === 1) {
          // Advanced2: battery, temperature, lid (0 = closed), paper (0 = in)
          return reply(RX.In_HeartbeatAdvanced2, [
            0x0f,
            0xd1,
            0x04,
            0x4d,
            this.options.lidOpen ? 1 : 0,
            0,
            0,
            0,
            0,
            0,
            0,
          ])
        }
        break
      case TX.SoundSettings:
        return reply(RX.In_SoundSettings, d)
      case TX.PrintStart: {
        if (this.options.failAt === 'printStart') return fail()
        this.stopJobTimer()
        this.job = {
          totalPages: d.length >= 2 ? Utils.bytesToU16(d.slice(0, 2)) : 1,
          queued: 0,
          printed: 0,
          copyStartedAt: 0,
          pages: [],
        }
        return reply(RX.In_PrintStart, [1])
      }
      case TX.SetPageSize: {
        const rows = Utils.bytesToU16(d.slice(0, 2))
        const cols = d.length >= 4 ? Utils.bytesToU16(d.slice(2, 4)) : 0
        const copies = d.length >= 6 ? Utils.bytesToU16(d.slice(4, 6)) : 1
        if (this.job) {
          this.job.current = {
            rows,
            cols,
            copies,
            pixels: new Uint8Array(rows * cols),
          }
        }
        return reply(RX.In_SetPageSize, [1])
      }
      case TX.PageEnd: {
        if (this.options.failAt === 'pageEnd') return fail()
        const job = this.job
        if (job?.current) {
          job.pages.push(job.current)
          if (job.queued === job.printed) job.copyStartedAt = Date.now()
          job.queued += job.current.copies
          job.current = undefined
          this.startJobTimer()
        }
        return reply(RX.In_PageEnd, [1])
      }
      case TX.PrintStatus: {
        if (this.options.failAt === 'status') return fail()
        const job = this.job
        const printed = job?.printed ?? 0
        let progress = 0
        if (job && job.queued > job.printed) {
          progress = Math.min(
            99,
            Math.floor(
              ((Date.now() - job.copyStartedAt) / this.options.pageMs) * 100,
            ),
          )
        }
        return reply(RX.In_PrintStatus, [
          ...Utils.u16ToBytes(printed),
          progress,
          progress,
        ])
      }
      case TX.PrintEnd:
        this.stopJobTimer()
        return reply(RX.In_PrintEnd, [1])
      case TX.CancelPrint:
        this.stopJobTimer()
        return reply(RX.In_CancelPrint, [1])
    }

    const key = STATIC_ANSWERS[`${cmd}:${d[0]}`] ?? STATIC_ANSWERS[`${cmd}`]
    if (key) return reply(key[0], key[1])
    return reply(RX.In_NotSupported, [1])
  }

  private receiveRow(cmd: TX, d: Uint8Array) {
    const page = this.job?.current
    if (!page) return
    const pos = Utils.bytesToU16(d.slice(0, 2))
    if (cmd === TX.PrintEmptyRow) return // rows start white
    // [pos u16][3 pixel-count bytes][repeats][payload]
    const repeats = d[5]
    const payload = d.slice(6)
    const row = new Uint8Array(page.cols)
    if (cmd === TX.PrintBitmapRow) {
      for (let x = 0; x < page.cols; x++) {
        if (payload[x >> 3] & (0x80 >> (x & 7))) row[x] = 1
      }
    } else {
      // Indexed: list of u16 black pixel positions
      for (let i = 0; i + 1 < payload.length; i += 2) {
        const x = Utils.bytesToU16(payload.slice(i, i + 2))
        if (x < page.cols) row[x] = 1
      }
    }
    for (let r = pos; r < Math.min(page.rows, pos + repeats); r++) {
      page.pixels.set(row, r * page.cols)
    }
  }

  private startJobTimer() {
    if (this.timer) return
    this.timer = setInterval(() => {
      const job = this.job
      if (!job || job.printed >= job.queued) return
      if (Date.now() - job.copyStartedAt >= this.options.pageMs) {
        job.printed++
        job.copyStartedAt = Date.now()
      }
    }, 10)
  }

  private stopJobTimer() {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
  }
}

/**
 * Received page as a canvas in label orientation (undoes the rotation that
 * niimbluelib's ImageEncoder applies for the model's print direction).
 */
export const receivedPageToCanvas = (
  page: ReceivedPage,
  printDirection: PrintDirection,
): HTMLCanvasElement => {
  const left = printDirection === 'left'
  const canvas = document.createElement('canvas')
  canvas.width = left ? page.rows : page.cols
  canvas.height = left ? page.cols : page.rows
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(canvas.width, canvas.height)
  for (let r = 0; r < page.rows; r++) {
    for (let c = 0; c < page.cols; c++) {
      // "left" = image was rotated 90° clockwise: label (x, y) → row x, col H-1-y
      const x = left ? r : c
      const y = left ? canvas.height - 1 - c : r
      const v = page.pixels[r * page.cols + c] ? 0 : 255
      img.data.set([v, v, v, 255], (y * canvas.width + x) * 4)
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}
