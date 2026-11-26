import {
  ImageEncoder,
  LabelType,
  type NiimbotAbstractClient,
} from '@mmote/niimbluelib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { newDoc } from '../model/factory'
import { renderLabel } from '../render/renderLabel'
import { EmulatedD110MClient, type EmulatorOptions } from './emulator'
import { memorySettings, type SettingStore } from '../storage/settings'
import {
  PrintCancelledError,
  PrinterService,
  knownModel,
  type PrinterState,
} from './printerService'

let service: PrinterService | undefined

afterEach(async () => {
  await service?.disconnect()
  service = undefined
})

/** Service whose "bluetooth"/"serial"/"emulator" all create an emulator. */
const emulatedService = (
  options: EmulatorOptions = {},
  settings: SettingStore = memorySettings(),
) => {
  service = new PrinterService(
    () => new EmulatedD110MClient({ pageMs: 30, ...options }),
    settings,
  )
  const states: PrinterState[] = []
  service.subscribe((s) => states.push(s))
  return { service, states }
}

const label = async () =>
  (await renderLabel(newDoc({ widthMm: 30, heightMm: 12 }))).canvas

const job = { quantity: 1, density: 3, labelType: LabelType.WithGaps }

// T2.2 / R2
describe('printer service: connection', () => {
  it('goes disconnected → connecting → connected with model info', async () => {
    const { service, states } = emulatedService()
    await service.connect('emulator')
    // The last update adds the raw paper-info answer (R18.AC9).
    expect([...new Set(states.map((s) => s.status))]).toEqual([
      'connecting',
      'connected',
    ])
    expect(service.getState()).toMatchObject({
      status: 'connected',
      transport: 'emulator',
      deviceName: 'Emulated D110_M',
      printTask: 'D110M_V4',
    })
    expect(service.getState().model?.model).toBe('D110_M')
  })

  it('returns to disconnected with an error when connecting fails', async () => {
    service = new PrinterService(
      () =>
        ({
          on: () => undefined,
          connect: () => Promise.reject(new Error('User cancelled the picker')),
          disconnect: () => Promise.resolve(),
        }) as unknown as NiimbotAbstractClient,
      memorySettings(),
    )
    await service.connect('bluetooth')
    expect(service.getState()).toMatchObject({
      status: 'disconnected',
      error: 'User cancelled the picker',
    })
  })

  it('disconnects on request', async () => {
    const { service } = emulatedService()
    await service.connect('emulator')
    await service.disconnect()
    expect(service.getState().status).toBe('disconnected')
  })

  it('notices an unexpected disconnect', async () => {
    const { service } = emulatedService()
    await service.connect('emulator')
    await service.getClient()!.disconnect() // e.g. printer switched off
    expect(service.getState().status).toBe('disconnected')
  })
})

// T2.3 / R11
describe('printer service: print', () => {
  it('prints with send then print progress and returns to connected', async () => {
    const { service, states } = emulatedService()
    await service.connect('emulator')
    await service.print(await label(), { ...job, quantity: 2 })

    const phases = states.map((s) => s.progress?.phase).filter(Boolean)
    expect(phases).toContain('send')
    expect(phases.at(-1)).toBe('print')
    expect(states.findLast((s) => s.progress)?.progress?.percent).toBe(100)
    expect(service.getState()).toMatchObject({ status: 'connected' })
    expect(service.getState().progress).toBeUndefined()
    const client = service.getClient() as EmulatedD110MClient
    expect(client.receivedPages[0].copies).toBe(2)
  })

  it('refuses to print when not connected', async () => {
    const { service } = emulatedService()
    await expect(service.print(await label(), job)).rejects.toThrow(
      /not connected/,
    )
  })

  it('shows printer errors and returns to connected', async () => {
    const { service } = emulatedService({ failAt: 'pageEnd', errorCode: 1 })
    await service.connect('emulator')
    await expect(service.print(await label(), job)).rejects.toThrow(
      /CoverOpen|Print error 1/,
    )
    expect(service.getState().status).toBe('connected')
    expect(service.getState().error).toMatch(/CoverOpen|Print error 1/)
  })

  it('can cancel while printing', async () => {
    const { service } = emulatedService({ pageMs: 5_000 })
    await service.connect('emulator')
    const printing = service.print(await label(), job)
    await new Promise((r) => setTimeout(r, 300))
    service.cancelPrint()
    await expect(printing).rejects.toBeInstanceOf(PrintCancelledError)
    expect(service.getState().status).toBe('connected')
    expect(service.getState().error).toBeUndefined()
  })

  it('stops the heartbeat while printing and restarts it after', async () => {
    const { service } = emulatedService()
    await service.connect('emulator')
    const client = service.getClient()!
    const calls: string[] = []
    const stop = client.stopHeartbeat.bind(client)
    const start = client.startHeartbeat.bind(client)
    client.stopHeartbeat = () => (calls.push('stop'), stop())
    client.startHeartbeat = () => (calls.push('start'), start())
    await service.print(await label(), job)
    // (startHeartbeat itself calls stopHeartbeat to clear an old timer)
    expect(calls[0]).toBe('stop')
    expect(calls.indexOf('start')).toBeGreaterThan(0)
  })
})

// T6b.0 / R17
describe('printer service: model', () => {
  it('uses the chosen model while disconnected and remembers it', () => {
    const settings = memorySettings()
    const { service } = emulatedService({}, settings)
    expect(knownModel(service.getState())).toBeUndefined()
    service.setChosenModel('B21')
    expect(knownModel(service.getState())).toMatchObject({
      meta: { model: 'B21' },
      source: 'chosen',
    })
    // A new visit starts with the same choice.
    const again = new PrinterService(undefined, settings)
    expect(again.getState().chosen?.model).toBe('B21')
    service.setChosenModel(undefined)
    expect(settings.get('printerModel')).toBeUndefined()
  })

  it('the detected model replaces a different chosen one, with a notice', async () => {
    const settings = memorySettings()
    const { service } = emulatedService({}, settings)
    service.setChosenModel('B21')
    await service.connect('emulator')
    expect(knownModel(service.getState())).toMatchObject({
      meta: { model: 'D110_M' },
      source: 'detected',
    })
    expect(service.getState().modelNotice).toMatch(/Detected D110_M.*B21/)
    expect(settings.get('printerModel')).toBe('D110_M')
    await service.disconnect()
    expect(knownModel(service.getState())).toMatchObject({
      meta: { model: 'D110_M' },
      source: 'chosen',
    })
  })

  it('falls back to the chosen model when the printer is not recognised', async () => {
    const { service } = emulatedService({ modelId: 9999 })
    await service.connect('emulator')
    expect(service.getState().model).toBeUndefined()
    expect(service.getState().printTask).toBeUndefined()
    service.setChosenModel('D110_M')
    expect(knownModel(service.getState())?.source).toBe('chosen')
    expect(service.getState().printTask).toBe('D110M_V4')
    await service.print(await label(), job)
    expect(service.getState().status).toBe('connected')
  })
  // R17.AC4: a chosen "top" printer gets the bitmap in its direction.
  it("uses the chosen model's print direction", async () => {
    const { service } = emulatedService({ modelId: 9999 })
    await service.connect('emulator')
    service.setChosenModel('B21')
    const spy = vi.spyOn(ImageEncoder, 'encodeCanvas')
    // The emulator doesn't speak the B21 protocol; only the encoding matters.
    await service.print(await label(), job).catch(() => undefined)
    expect(spy.mock.calls[0]?.[2]).toBe('top')
    spy.mockRestore()
  })
})

// T6b.4 / R18
describe('printer service: loaded roll', () => {
  it('reads the roll on connect', async () => {
    const { service } = emulatedService()
    await service.connect('emulator')
    expect(service.getState().roll).toEqual({
      size: { widthMm: 12, lengthMm: 40 },
      sizeSource: 'printer',
      labelType: LabelType.WithGaps,
      labelsLeft: 145,
      tag: {
        barCode: '6972842743589',
        serial: 'EMULATEDROLL',
        total: 155,
        used: 10,
      },
    })
    expect(service.getState().paperInfoAnswer).toMatchObject({ length: 18 })
  })

  it('reports nothing when the printer does not know its roll', async () => {
    const { service } = emulatedService({ roll: null })
    await service.connect('emulator')
    expect(service.getState().roll).toEqual({})
    await service.readRoll()
    expect(service.getState().roll).toEqual({})
  })

  it('reads the roll again on request', async () => {
    const { service } = emulatedService({
      roll: {
        widthMm: 50,
        lengthMm: 30,
        gapMm: 3,
        labelType: LabelType.Transparent,
        total: 230,
        used: 0,
      },
    })
    await service.connect('emulator')
    await service.readRoll()
    expect(service.getState().roll).toMatchObject({
      size: { widthMm: 50, lengthMm: 30 },
      labelType: LabelType.Transparent,
      labelsLeft: 230,
    })
  })
  // R18.AC1: the library re-reads the roll when its heartbeat sees a change.
  it('follows a roll change the printer notices by itself', async () => {
    const { service } = emulatedService({ roll: null })
    await service.connect('emulator')
    expect(service.getState().roll).toEqual({})
    const client = service.getClient() as EmulatedD110MClient
    client.stopHeartbeat()
    await client.fetchHeartbeatData()
    client.setRoll({
      widthMm: 12,
      lengthMm: 40,
      gapMm: 2,
      labelType: LabelType.WithGaps,
      total: 155,
      used: 0,
    })
    await client.fetchHeartbeatData() // tag now read: the library refetches
    await expect
      .poll(() => service.getState().roll)
      .toMatchObject({
        size: { widthMm: 12, lengthMm: 40 },
        labelType: LabelType.WithGaps,
        labelsLeft: 155,
      })
  })

  // R18.AC9, AC10: a D110_M reads the tag but not the size.
  it('remembers a roll size by tag barcode', async () => {
    const settings = memorySettings()
    const { service } = emulatedService({ shortPaperInfo: true }, settings)
    await service.connect('emulator')
    expect(service.getState().roll?.size).toBeUndefined()
    expect(service.getState().roll?.labelsLeft).toBe(145)
    expect(service.getState().paperInfoAnswer).toEqual({
      hex: '00 00 00 00',
      length: 4,
    })
    service.rememberRollSize({ widthMm: 12, lengthMm: 40 })
    expect(service.getState().roll).toMatchObject({
      size: { widthMm: 12, lengthMm: 40 },
      sizeSource: 'remembered',
    })
    expect(JSON.parse(settings.get('rollSizes')!)).toEqual({
      '6972842743589': { widthMm: 12, lengthMm: 40 },
    })

    // A new connection uses the remembered size.
    await service.disconnect()
    await service.connect('emulator')
    expect(service.getState().roll).toMatchObject({
      size: { widthMm: 12, lengthMm: 40 },
      sizeSource: 'remembered',
    })

    service.forgetRollSize()
    expect(service.getState().roll?.size).toBeUndefined()
    expect(settings.get('rollSizes')).toBeUndefined()
  })

  it('prefers the size the printer reports', async () => {
    const settings = memorySettings()
    settings.set(
      'rollSizes',
      JSON.stringify({ '6972842743589': { widthMm: 15, lengthMm: 50 } }),
    )
    const { service } = emulatedService({}, settings)
    await service.connect('emulator')
    expect(service.getState().roll).toMatchObject({
      size: { widthMm: 12, lengthMm: 40 },
      sizeSource: 'printer',
    })
  })

  // R18.AC8
  it('keeps the lid and tag state from the heartbeat', async () => {
    const { service } = emulatedService({ roll: null })
    await service.connect('emulator')
    const client = service.getClient() as EmulatedD110MClient
    client.stopHeartbeat()
    await client.fetchHeartbeatData()
    expect(service.getState().rollSensor).toEqual({
      lidOpen: false,
      tagRead: false,
    })
    client.setLidOpen(true)
    await client.fetchHeartbeatData()
    expect(service.getState().rollSensor).toEqual({
      lidOpen: true,
      tagRead: false,
    })
  })
})

// R2.AC7: a connection that hangs (Bluetooth pairing) can be cancelled.
describe('printer service: cancel connecting', () => {
  it('returns to disconnected and ignores a late answer', async () => {
    let finish: () => void = () => undefined
    let closed = false
    class Hanging extends EmulatedD110MClient {
      override async connect() {
        await new Promise<void>((r) => (finish = r))
        return super.connect()
      }
      override async disconnect() {
        closed = true
        return super.disconnect()
      }
    }
    service = new PrinterService(() => new Hanging({}), memorySettings())
    const connecting = service.connect('bluetooth')
    expect(service.getState().status).toBe('connecting')
    await service.cancelConnect()
    expect(service.getState().status).toBe('disconnected')
    expect(service.getState().error).toBeUndefined()
    finish()
    await connecting
    expect(service.getState().status).toBe('disconnected')
    expect(closed).toBe(true)
  })
})
