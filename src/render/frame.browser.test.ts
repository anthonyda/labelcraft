import { describe, expect, it } from 'vitest'
import { newDoc } from '../model/factory'
import type { FrameDesign, LabelSetup } from '../model/types'
import { FRAME_DESIGNS, frameFor, renderFrame } from './frame'
import { renderLabel } from './renderLabel'

const label = (frame?: LabelSetup['frame']): LabelSetup => ({
  ...newDoc({ widthMm: 40, heightMm: 12 }).label,
  frame,
})

const inkBox = (c: HTMLCanvasElement, band: number) => {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
  let n = 0
  let inner = 0
  // Inner area: further than `band` dots from every edge.
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] === 0) continue
      n++
      const edge = Math.min(x, y, c.width - 1 - x, c.height - 1 - y)
      if (edge > band) inner++
    }
  }
  return { n, inner }
}

// T6e.2 / R23
describe('label frames', () => {
  it('draws nothing for none or no frame', () => {
    expect(renderFrame(label())).toBeUndefined()
    expect(renderFrame(label(frameFor('none')))).toBeUndefined()
  })

  it.each(
    FRAME_DESIGNS.filter((d) => d.design !== 'none').map((d) => d.design),
  )('%s draws ink only near the edge, in whole dots', (design) => {
    const frame = {
      ...frameFor(design as FrameDesign),
      thicknessMm: 0.3,
      insetMm: 0.5,
    }
    const c = renderFrame(label(frame))!
    expect(c.width).toBe(320)
    expect(c.height).toBe(96)
    // Inset 4 dots + up to 3 lines of 2 dots; ticket notches reach 2 mm (16 dots) in.
    const { n, inner } = inkBox(
      c,
      design === 'ticket' ? 4 + 16 + 3 : 4 + 3 * 3 + 2,
    )
    expect(n).toBeGreaterThan(50)
    expect(inner).toBe(0)
    // Opaque black or fully transparent only.
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
    for (let i = 3; i < d.length; i += 4) expect([0, 255]).toContain(d[i])
  })

  it('keeps the inset clear and draws at least one dot', () => {
    const c = renderFrame(
      label({ design: 'line', thicknessMm: 0.01, insetMm: 0.5 }),
    )!
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
    const ink = (x: number, y: number) => d[(y * c.width + x) * 4 + 3] > 0
    expect(ink(0, 48)).toBe(false) // inset (4 dots) is empty
    expect(ink(4, 48)).toBe(true) // one-dot line
    expect(ink(5, 48)).toBe(false)
  })

  it('is printed on top of objects', async () => {
    const doc = newDoc({ widthMm: 40, heightMm: 12 })
    doc.label.frame = frameFor('thick')
    const { canvas } = await renderLabel(doc)
    const d = canvas.getContext('2d')!.getImageData(10, 48, 1, 1).data
    expect(d[0]).toBe(0) // thick line at x = 4..11
  })
})
