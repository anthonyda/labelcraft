/**
 * QR code and barcode rendering (T1.7, R8). Codes are drawn module by module
 * at whole-pixel sizes so edges stay sharp and scannable (R8.AC3).
 */
import JsBarcode from 'jsbarcode'
import qrcode from 'qrcode-generator'
import type { BarcodeFormat, QrErrorCorrection } from '../model/types'

/** Dark/light module grid of a QR code. Content is encoded as UTF-8 bytes. */
export const qrModules = (
  content: string,
  errorCorrection: QrErrorCorrection,
): boolean[][] => {
  const qr = qrcode(0, errorCorrection)
  // qrcode-generator takes one byte per char code; pass UTF-8 bytes that way.
  const bytes = new TextEncoder().encode(content)
  qr.addData(String.fromCharCode(...bytes), 'Byte')
  qr.make()
  const n = qr.getModuleCount()
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => qr.isDark(r, c)),
  )
}

export type BarcodeEncoding =
  { valid: true; bits: string; text: string } | { valid: false }

/** Bar pattern ('1' = bar, '0' = space) and human-readable text. */
export const barcodeEncoding = (
  content: string,
  format: BarcodeFormat,
): BarcodeEncoding => {
  const target: { encodings?: { data: string; text?: string }[] } = {}
  let valid = true
  try {
    JsBarcode(target, content, {
      format,
      valid: (v) => {
        valid = v
      },
    })
  } catch {
    return { valid: false }
  }
  if (!valid || !target.encodings?.length) return { valid: false }
  return {
    valid: true,
    bits: target.encodings.map((e) => e.data).join(''),
    text: target.encodings.map((e) => e.text ?? '').join(''),
  }
}

export type CodeResult = { canvas: HTMLCanvasElement; warning?: string }

const blankCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, width)
  canvas.height = Math.max(1, height)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000'
  return { canvas, ctx }
}

/** QR code centred in a width × height px box, whole-pixel modules. */
export const drawQr = (
  content: string,
  errorCorrection: QrErrorCorrection,
  width: number,
  height: number,
): CodeResult => {
  const { canvas, ctx } = blankCanvas(width, height)
  if (!content) return { canvas, warning: 'QR code has no content.' }
  let modules: boolean[][]
  try {
    modules = qrModules(content, errorCorrection)
  } catch {
    return { canvas, warning: 'QR code content is too long.' }
  }
  const n = modules.length
  const size = Math.floor(Math.min(width, height) / n)
  if (size < 1) {
    return { canvas, warning: 'QR code is too small to print; make it bigger.' }
  }
  const ox = Math.floor((width - n * size) / 2)
  const oy = Math.floor((height - n * size) / 2)
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (modules[r][c]) ctx.fillRect(ox + c * size, oy + r * size, size, size)
    }
  }
  const warning =
    size < 2 ? 'QR code modules are 1 px; it may not scan well.' : undefined
  return { canvas, warning }
}

/** Barcode centred in a width × height px box, whole-pixel bar widths. */
/** Smallest readable digits, in printer dots. */
const MIN_TEXT_PX = 7

export const drawBarcode = (
  content: string,
  format: BarcodeFormat,
  showText: boolean,
  width: number,
  height: number,
  fontPx: number,
): CodeResult => {
  const { canvas, ctx } = blankCanvas(width, height)
  const enc = barcodeEncoding(content, format)
  if (!enc.valid) {
    return { canvas, warning: `"${content}" is not a valid ${format} barcode.` }
  }
  const moduleW = Math.floor(width / enc.bits.length)
  if (moduleW < 1) {
    return { canvas, warning: 'Barcode is too narrow to print; make it wider.' }
  }
  const barsW = enc.bits.length * moduleW
  // The digits must fit under the bars: shrink the font to the bars' width
  // and to at most 40% of the height (a fixed size cut digits off).
  let textPx = 0
  let warning: string | undefined
  if (showText) {
    ctx.font = `${fontPx}px monospace`
    const measured = ctx.measureText(enc.text).width
    textPx = Math.min(
      fontPx,
      Math.floor((fontPx * barsW) / Math.max(1, measured)),
      Math.floor((height * 0.4) / 1.2),
    )
    if (textPx < MIN_TEXT_PX) {
      textPx = 0
      warning =
        "Barcode text doesn't fit; make the barcode wider or turn off Show text."
    }
  }
  const textH = textPx ? Math.ceil(textPx * 1.2) : 0
  const barsH = height - textH
  if (barsH < 1) {
    return { canvas, warning: 'Barcode is too short to print; make it taller.' }
  }
  const ox = Math.floor((width - barsW) / 2)
  for (let i = 0; i < enc.bits.length; i++) {
    if (enc.bits[i] === '1') ctx.fillRect(ox + i * moduleW, 0, moduleW, barsH)
  }
  if (textPx) {
    ctx.font = `${textPx}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(enc.text, width / 2, barsH + Math.floor(textPx * 0.1))
  }
  return { canvas, warning }
}
