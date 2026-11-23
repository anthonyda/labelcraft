import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from '@zxing/library'
import { describe, expect, it } from 'vitest'
import { createObject, newDoc } from '../model/factory'
import type { LabelDoc, LabelObject, ObjectType } from '../model/types'
import { blackRatio, isMonochrome, type Pixels } from './bitmap'
import { renderLabel } from './renderLabel'

const pixels = (canvas: HTMLCanvasElement): Pixels =>
  canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)

const isBlack = (px: Pixels, x: number, y: number) =>
  px.data[(y * px.width + x) * 4] === 0

/** Document with one object of `type`, overridden by `props`. */
const docWith = (
  type: ObjectType,
  props: Partial<LabelObject>,
  label: Partial<LabelDoc['label']> = {},
): LabelDoc => {
  const doc = newDoc({ widthMm: 50, heightMm: 30, dpi: 203, ...label })
  doc.objects.push({
    ...createObject(type, doc.label),
    rotation: 0,
    ...props,
  } as LabelObject)
  return doc
}

const render = async (doc: LabelDoc) => {
  const { canvas, warnings } = await renderLabel(doc)
  return { px: pixels(canvas), canvas, warnings }
}

/** Decode a QR code or barcode from the rendered label (R8.AC3). */
const decode = (px: Pixels, format: BarcodeFormat): string => {
  const lum = new Uint8ClampedArray(px.width * px.height)
  for (let p = 0; p < lum.length; p++) lum[p] = px.data[p * 4]
  const reader = new MultiFormatReader()
  reader.setHints(
    new Map<DecodeHintType, unknown>([
      [DecodeHintType.POSSIBLE_FORMATS, [format]],
      [DecodeHintType.TRY_HARDER, true],
    ]),
  )
  const bitmap = new BinaryBitmap(
    new HybridBinarizer(new RGBLuminanceSource(lum, px.width, px.height)),
  )
  return reader.decode(bitmap).getText()
}

/** Data URL of a horizontal black → white gradient image. */
const gradientImage = (width = 100, height = 20): string => {
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, width, 0)
  g.addColorStop(0, '#000')
  g.addColorStop(1, '#fff')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, width, height)
  return c.toDataURL('image/png')
}

// T1.5 / R3.AC2
describe('label size', () => {
  it('is 400 × 240 px for 50 × 30 mm at 203 dpi', async () => {
    const { canvas } = await renderLabel(newDoc({ widthMm: 50, heightMm: 30 }))
    expect([canvas.width, canvas.height]).toEqual([400, 240])
  })

  it('is 591 × 354 px for 50 × 30 mm at 300 dpi', async () => {
    const { canvas } = await renderLabel(
      newDoc({ widthMm: 50, heightMm: 30, dpi: 300 }),
    )
    expect([canvas.width, canvas.height]).toEqual([591, 354])
  })

  it('renders an empty label all white', async () => {
    const { px } = await render(newDoc())
    expect(blackRatio(px)).toBe(0)
  })
})

// T1.6 / C7
describe('1-bit output', () => {
  it('contains only black and white pixels with every object type', async () => {
    const doc = newDoc({ widthMm: 50, heightMm: 30 })
    for (const type of [
      'text',
      'rect',
      'ellipse',
      'line',
      'qr',
      'barcode',
    ] as const) {
      doc.objects.push({ ...createObject(type, doc.label), rotation: 17 })
    }
    doc.objects.push({
      ...createObject('image', doc.label),
      src: gradientImage(),
      rotation: 17,
    } as LabelObject)
    const { px } = await render(doc)
    expect(isMonochrome(px)).toBe(true)
    expect(blackRatio(px)).toBeGreaterThan(0)
  })
})

// T1.7 / R7
describe('shapes', () => {
  // 5 mm = 39.96 → 40 px; 10 mm = 79.9 → 80 px at 203 dpi.
  it('fills a rectangle on exact pixels', async () => {
    const { px } = await render(
      docWith('rect', { x: 5, y: 5, width: 10, height: 10, filled: true }),
    )
    expect(isBlack(px, 40, 40)).toBe(true)
    expect(isBlack(px, 119, 119)).toBe(true)
    expect(isBlack(px, 39, 40)).toBe(false)
    expect(isBlack(px, 120, 119)).toBe(false)
    expect(isBlack(px, 40, 39)).toBe(false)
    expect(isBlack(px, 40, 120)).toBe(false)
  })

  it('draws a rectangle outline inside its box', async () => {
    // 0.5 mm stroke = 4 px
    const { px } = await render(
      docWith('rect', {
        x: 5,
        y: 5,
        width: 10,
        height: 10,
        filled: false,
        strokeWidth: 0.5,
      }),
    )
    expect(isBlack(px, 40, 80)).toBe(true)
    expect(isBlack(px, 43, 80)).toBe(true)
    expect(isBlack(px, 44, 80)).toBe(false)
    expect(isBlack(px, 39, 80)).toBe(false)
    expect(isBlack(px, 80, 80)).toBe(false)
  })

  it('draws an ellipse', async () => {
    const { px } = await render(
      docWith('ellipse', { x: 5, y: 5, width: 20, height: 10, filled: true }),
    )
    // centre filled, box corner empty
    expect(isBlack(px, 120, 80)).toBe(true)
    expect(isBlack(px, 41, 41)).toBe(false)
  })

  it('draws a line across the middle of its box', async () => {
    const { px } = await render(
      docWith('line', { x: 5, y: 5, width: 20, height: 2, strokeWidth: 0.5 }),
    )
    // box y 40..56 px, line 4 px thick centred: rows 46..49
    expect(isBlack(px, 60, 46)).toBe(true)
    expect(isBlack(px, 60, 49)).toBe(true)
    expect(isBlack(px, 60, 45)).toBe(false)
    expect(isBlack(px, 60, 50)).toBe(false)
  })

  it('rotates around the box centre', async () => {
    // 20 × 4 mm bar centred at (25, 15) mm, rotated 90° → vertical bar.
    const { px } = await render(
      docWith('rect', {
        x: 15,
        y: 13,
        width: 20,
        height: 4,
        filled: true,
        rotation: 90,
      }),
    )
    const cx = 200
    const cy = 120
    expect(isBlack(px, cx, cy)).toBe(true)
    expect(isBlack(px, cx, cy - 70)).toBe(true) // ±8.75 mm along the bar
    expect(isBlack(px, cx, cy + 70)).toBe(true)
    expect(isBlack(px, cx - 70, cy)).toBe(false) // old bar ends now empty
    expect(isBlack(px, cx + 70, cy)).toBe(false)
  })
})

// T1.7 / R5
describe('text', () => {
  const textDoc = (props: Partial<LabelObject>) =>
    docWith('text', {
      x: 2,
      y: 2,
      width: 46,
      height: 10,
      text: 'Hello label 123',
      ...props,
    } as Partial<LabelObject>)

  it('puts ink inside its box and nowhere else', async () => {
    const { px } = await render(
      textDoc({ fontSize: 14 } as Partial<LabelObject>),
    )
    // box 16..384 × 16..96 px; 14 pt ≈ 39 px tall
    expect(
      blackRatio(px, { x: 16, y: 16, width: 368, height: 60 }),
    ).toBeGreaterThan(0.02)
    expect(blackRatio(px, { x: 0, y: 120, width: 400, height: 120 })).toBe(0)
  })

  // R5.AC3: small text keeps visible strokes after thresholding.
  it('keeps small text (6 pt) visible', async () => {
    const { px } = await render(
      textDoc({ fontSize: 6 } as Partial<LabelObject>),
    )
    expect(
      blackRatio(px, { x: 16, y: 16, width: 368, height: 30 }),
    ).toBeGreaterThan(0.01)
  })

  it('draws bold text heavier than regular', async () => {
    const regular = await render(
      textDoc({ fontSize: 14 } as Partial<LabelObject>),
    )
    const bold = await render(
      textDoc({ fontSize: 14, bold: true } as Partial<LabelObject>),
    )
    expect(blackRatio(bold.px)).toBeGreaterThan(blackRatio(regular.px) * 1.2)
  })

  it('underlines text', async () => {
    const plain = await render(
      textDoc({ fontSize: 14 } as Partial<LabelObject>),
    )
    const under = await render(
      textDoc({ fontSize: 14, underline: true } as Partial<LabelObject>),
    )
    expect(blackRatio(under.px)).toBeGreaterThan(blackRatio(plain.px))
  })

  it('aligns right', async () => {
    const { px } = await render(
      textDoc({
        fontSize: 14,
        text: 'Hi',
        align: 'right',
      } as Partial<LabelObject>),
    )
    expect(blackRatio(px, { x: 16, y: 16, width: 184, height: 60 })).toBe(0)
    expect(
      blackRatio(px, { x: 300, y: 16, width: 84, height: 60 }),
    ).toBeGreaterThan(0)
  })
})

// T1.7 / R6.AC2
describe('images', () => {
  const imageDoc = (mode: 'threshold' | 'dither', threshold = 128) =>
    docWith('image', {
      x: 0,
      y: 0,
      width: 50,
      height: 30,
      src: gradientImage(),
      mode,
      threshold,
    } as Partial<LabelObject>)

  it('thresholds: dark half black, light half white', async () => {
    const { px } = await render(imageDoc('threshold'))
    expect(blackRatio(px, { x: 0, y: 0, width: 150, height: 240 })).toBe(1)
    expect(blackRatio(px, { x: 250, y: 0, width: 150, height: 240 })).toBe(0)
  })

  it('moves the split with the threshold', async () => {
    const low = await render(imageDoc('threshold', 64))
    const high = await render(imageDoc('threshold', 192))
    expect(blackRatio(high.px)).toBeGreaterThan(blackRatio(low.px) + 0.3)
  })

  it('dithers: mixed pattern in the middle tones', async () => {
    const { px } = await render(imageDoc('dither'))
    const middle = blackRatio(px, { x: 180, y: 0, width: 40, height: 240 })
    expect(middle).toBeGreaterThan(0.3)
    expect(middle).toBeLessThan(0.7)
  })

  it('warns when the image is missing', async () => {
    const { warnings } = await render(
      docWith('image', { src: '' } as Partial<LabelObject>),
    )
    expect(warnings[0].message).toMatch(/no picture/)
  })
})

// T1.7 / R8
describe('codes', () => {
  it('renders a QR code that scans back', async () => {
    const content = 'https://example.com/label?id=42'
    const { px, warnings } = await render(
      docWith('qr', {
        x: 15,
        y: 5,
        width: 20,
        height: 20,
        content,
      } as Partial<LabelObject>),
    )
    expect(warnings).toEqual([])
    expect(decode(px, BarcodeFormat.QR_CODE)).toBe(content)
  })

  it('renders a Code 128 barcode that scans back', async () => {
    const content = 'LBL-2026-0042'
    const { px, warnings } = await render(
      docWith('barcode', {
        x: 3,
        y: 5,
        width: 44,
        height: 15,
        content,
        format: 'CODE128',
      } as Partial<LabelObject>),
    )
    expect(warnings).toEqual([])
    expect(decode(px, BarcodeFormat.CODE_128)).toBe(content)
  })

  it('renders an EAN-13 barcode that scans back', async () => {
    const { px, warnings } = await render(
      docWith('barcode', {
        x: 3,
        y: 5,
        width: 44,
        height: 15,
        content: '400638133393',
        format: 'EAN13',
      } as Partial<LabelObject>),
    )
    expect(warnings).toEqual([])
    expect(decode(px, BarcodeFormat.EAN_13)).toBe('4006381333931')
  })

  it('shows human-readable text only when enabled', async () => {
    const props = {
      x: 3,
      y: 5,
      width: 44,
      height: 15,
      content: 'ABC',
      format: 'CODE128',
    }
    const withText = await render(
      docWith('barcode', { ...props, showText: true } as Partial<LabelObject>),
    )
    const without = await render(
      docWith('barcode', { ...props, showText: false } as Partial<LabelObject>),
    )
    // bottom band of the box (y 120..160 px)
    const band = { x: 24, y: 140, width: 352, height: 20 }
    expect(blackRatio(without.px, band)).toBeGreaterThan(0.2) // bars reach the bottom
    expect(blackRatio(withText.px, band)).toBeLessThan(
      blackRatio(without.px, band),
    )
  })

  it('warns about an invalid EAN-13', async () => {
    const { warnings } = await render(
      docWith('barcode', {
        content: '12AB',
        format: 'EAN13',
      } as Partial<LabelObject>),
    )
    expect(warnings[0].message).toMatch(/not a valid EAN13/)
  })

  it('warns when a QR code is too small', async () => {
    const { warnings } = await render(
      docWith('qr', {
        width: 1,
        height: 1,
        content: 'x'.repeat(200),
      } as Partial<LabelObject>),
    )
    expect(warnings[0].message).toMatch(/too small/)
  })
})
