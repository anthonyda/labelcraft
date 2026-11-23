import {
  ImageEncoder,
  LabelType,
  PageColorType,
  PrintError,
  type PrintProgressEvent,
} from '@mmote/niimbluelib'
import { afterEach, describe, expect, it } from 'vitest'
import { createObject, newDoc } from '../model/factory'
import type { LabelDoc, LabelObject } from '../model/types'
import { renderLabel } from '../render/renderLabel'
import {
  EMULATOR_DEVICE_NAME,
  EmulatedD110MClient,
  receivedPageToCanvas,
  type EmulatorOptions,
} from './emulator'

let client: EmulatedD110MClient | undefined

afterEach(async () => {
  await client?.disconnect()
  client = undefined
})

const connect = async (options: EmulatorOptions = {}) => {
  client = new EmulatedD110MClient({ pageMs: 30, ...options })
  const info = await client.connect()
  return { client, info }
}

/** 30 × 12 mm label (fits the D110_M's 96 px printhead) with some content. */
const sampleLabel = (): LabelDoc => {
  const doc = newDoc({ widthMm: 30, heightMm: 12 })
  doc.objects.push(
    {
      ...createObject('text', doc.label),
      x: 1,
      y: 1,
      width: 20,
      text: 'Emu',
    } as LabelObject,
    {
      ...createObject('qr', doc.label),
      x: 19,
      y: 1,
      width: 10,
      height: 10,
    } as LabelObject,
    {
      ...createObject('rect', doc.label),
      x: 0,
      y: 0,
      width: 30,
      height: 12,
      filled: false,
      strokeWidth: 0.3,
    } as LabelObject,
  )
  return doc
}

const pixelsOf = (canvas: HTMLCanvasElement) =>
  Array.from(
    canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
      .data,
  )

/** Print a canvas with the library's own print task for the detected model. */
const printCanvas = async (
  c: EmulatedD110MClient,
  canvas: HTMLCanvasElement,
  quantity = 1,
) => {
  const meta = c.getModelMetadata()!
  const task = c.protocol.newPrintTask(c.getPrintTaskType()!, {
    totalPages: quantity,
    density: 3,
    labelType: LabelType.WithGaps,
    statusPollIntervalMs: 20,
    statusTimeoutMs: 2_000,
  })
  const encoded = ImageEncoder.encodeCanvas(
    canvas,
    PageColorType.SingleColor,
    meta.printDirection,
  )
  try {
    await task.printInit()
    await task.printPage(encoded, quantity)
    await task.waitForPageFinished()
    await task.waitForFinished()
  } finally {
    await task.printEnd()
  }
  return meta
}

// T2.0 / R16.AC2
describe('emulated D110_M: connect', () => {
  it('connects and is detected as a D110_M', async () => {
    const { client, info } = await connect()
    expect(info.deviceName).toBe(EMULATOR_DEVICE_NAME)
    expect(client.isConnected()).toBe(true)
    const meta = client.getModelMetadata()
    expect(meta?.model).toBe('D110_M')
    expect(meta?.printheadPixels).toBe(96)
    expect(client.getPrintTaskType()).toBe('D110M_V4')
    expect(client.getPrinterInfo().serial).toBe('EMULATED01')
  })

  it('answers heartbeats with lid state', async () => {
    const closed = await connect()
    expect((await closed.client.protocol.heartbeat()).lidClosed).toBe(true)
    await closed.client.disconnect()
    const open = await connect({ lidOpen: true })
    expect((await open.client.protocol.heartbeat()).lidClosed).toBe(false)
  })

  it('emits disconnect', async () => {
    const { client } = await connect()
    let disconnected = false
    client.on('disconnect', () => (disconnected = true))
    await client.disconnect()
    expect(disconnected).toBe(true)
    expect(client.isConnected()).toBe(false)
  })
})

// T2.0 / R16.AC2–AC3
describe('emulated D110_M: print', () => {
  it('receives exactly the rendered bitmap', async () => {
    const { client } = await connect()
    const { canvas } = await renderLabel(sampleLabel())
    const meta = await printCanvas(client, canvas)

    expect(client.receivedPages).toHaveLength(1)
    const page = client.receivedPages[0]
    expect(page.cols).toBeLessThanOrEqual(96)
    const received = receivedPageToCanvas(page, meta.printDirection)
    expect([received.width, received.height]).toEqual([
      canvas.width,
      canvas.height,
    ])
    expect(pixelsOf(received)).toEqual(pixelsOf(canvas))
  })

  it('reports progress up to all copies printed', async () => {
    const { client } = await connect()
    const { canvas } = await renderLabel(sampleLabel())
    const events: PrintProgressEvent[] = []
    client.on('printprogress', (e) => events.push(e))
    await printCanvas(client, canvas, 3)
    expect(events.at(-1)?.page).toBe(3)
    expect(client.receivedPages[0].copies).toBe(3)
  })

  it.each(['printStart', 'pageEnd', 'status'] as const)(
    'fails with a printer error at %s',
    async (failAt) => {
      const { client } = await connect({ failAt, errorCode: 2 })
      const { canvas } = await renderLabel(sampleLabel())
      const result = printCanvas(client, canvas)
      await expect(result).rejects.toBeInstanceOf(PrintError)
      await expect(result).rejects.toThrow(/LackPaper|Print error 2/)
    },
  )
})
