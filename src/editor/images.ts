/** Image input (T4.3, R6.AC1): files and clipboard → image objects. */
import { createObject } from '../model/factory'
import type { ImageObject, LabelSetup } from '../model/types'

export const IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'image/webp',
  'image/gif',
]

/** Accept attribute for file inputs. */
export const IMAGE_ACCEPT =
  'image/png,image/jpeg,image/svg+xml,image/webp,image/gif'

/** Largest share of the label a new image takes. */
const MAX_SHARE = 0.8

/** Size in mm that keeps the image's aspect ratio and fits the label. */
export const fitImageMm = (
  naturalWidth: number,
  naturalHeight: number,
  label: LabelSetup,
): { width: number; height: number } => {
  const maxW = label.widthMm * MAX_SHARE
  const maxH = label.heightMm * MAX_SHARE
  const ratio = naturalWidth / Math.max(1, naturalHeight)
  let width = maxW
  let height = width / ratio
  if (height > maxH) {
    height = maxH
    width = height * ratio
  }
  return { width, height }
}

export const isImageFile = (f: File): boolean => IMAGE_TYPES.includes(f.type)

const readDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

/** New image object for a file, centred on the label. Throws if unreadable. */
export const imageObjectFromFile = async (
  file: File,
  label: LabelSetup,
): Promise<ImageObject> => {
  if (!isImageFile(file)) {
    throw new Error(
      `${file.name || 'This file'} is not a PNG, JPEG or SVG image.`,
    )
  }
  const src = await readDataUrl(file)
  const img = new Image()
  img.src = src
  await img.decode()
  const { width, height } = fitImageMm(
    img.naturalWidth || 100,
    img.naturalHeight || 100,
    label,
  )
  return {
    ...(createObject('image', label) as ImageObject),
    src,
    width,
    height,
    x: (label.widthMm - width) / 2,
    y: (label.heightMm - height) / 2,
  }
}
