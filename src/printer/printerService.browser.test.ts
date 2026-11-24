import { LabelType, type NiimbotAbstractClient } from '@mmote/niimbluelib'
import { afterEach, describe, expect, it } from 'vitest'
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
    expect(states.map((s) => s.status)).toEqual(['connecting', 'connected'])
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
})

// T6b.4 / R18
describe('printer service: loaded roll', () => {
  it('reads the roll on connect', async () => {
    const { service } = emulatedService()
    await service.connect('emulator')
    expect(service.getState().roll).toEqual({
      size: { widthMm: 12, lengthMm: 40 },
      labelType: LabelType.WithGaps,
      labelsLeft: 145,
    })
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
    expect(service.getState().roll).toEqual({
      size: { widthMm: 50, lengthMm: 30 },
      labelType: LabelType.Transparent,
      labelsLeft: 230,
    })
  })
})
