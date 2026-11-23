/** File export helpers (T5.3, R10.AC3–AC4) and thumbnails (T5.2). */
import type { LabelDoc } from '../model/types'
import { renderLabel } from '../render/renderLabel'

/** Safe file name from a label name. */
export const fileBaseName = (name: string | undefined): string =>
  (name ?? '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'label'

/** Ask the browser to download a blob. */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** The exact 1-bit print bitmap as PNG (R10.AC4). */
export const labelPng = async (doc: LabelDoc): Promise<Blob> => {
  const { canvas } = await renderLabel(doc)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('PNG export failed'))),
      'image/png',
    ),
  )
}

/** Small preview for the saved labels list. */
export const labelThumbnail = async (
  doc: LabelDoc,
  maxSize = 160,
): Promise<string> => {
  const { canvas } = await renderLabel(doc)
  const k = Math.min(1, maxSize / Math.max(canvas.width, canvas.height))
  const thumb = document.createElement('canvas')
  thumb.width = Math.max(1, Math.round(canvas.width * k))
  thumb.height = Math.max(1, Math.round(canvas.height * k))
  const ctx = thumb.getContext('2d')!
  ctx.drawImage(canvas, 0, 0, thumb.width, thumb.height)
  return thumb.toDataURL('image/png')
}
