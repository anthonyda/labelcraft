/**
 * 1-bit conversion (T1.6). Works on any RGBA pixel buffer so it can be unit
 * tested without a browser. Transparent pixels count as white (label paper).
 */

export type Pixels = {
  data: Uint8ClampedArray
  width: number
  height: number
}

export const DEFAULT_THRESHOLD = 128

/** Luminance 0 (black) – 255 (white) of an RGBA pixel composited on white. */
export const luminance = (
  r: number,
  g: number,
  b: number,
  a: number,
): number => {
  const l = 0.299 * r + 0.587 * g + 0.114 * b
  const alpha = a / 255
  // Round so pure greys map to their own value (128 stays 128, not 127.99…).
  return Math.round(l * alpha + 255 * (1 - alpha))
}

const setBW = (data: Uint8ClampedArray, i: number, black: boolean) => {
  const v = black ? 0 : 255
  data[i] = v
  data[i + 1] = v
  data[i + 2] = v
  data[i + 3] = 255
}

/** In place: luminance below `threshold` becomes black, the rest white. */
export const thresholdPixels = (
  px: Pixels,
  threshold = DEFAULT_THRESHOLD,
): void => {
  const { data } = px
  for (let i = 0; i < data.length; i += 4) {
    setBW(
      data,
      i,
      luminance(data[i], data[i + 1], data[i + 2], data[i + 3]) < threshold,
    )
  }
}

/** In place: Floyd–Steinberg dithering to black and white (R6.AC2). */
export const ditherPixels = (px: Pixels): void => {
  const { data, width, height } = px
  const lum = new Float32Array(width * height)
  for (let p = 0; p < lum.length; p++) {
    const i = p * 4
    lum[p] = luminance(data[i], data[i + 1], data[i + 2], data[i + 3])
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x
      const old = lum[p]
      const black = old < 128
      const err = old - (black ? 0 : 255)
      if (x + 1 < width) lum[p + 1] += (err * 7) / 16
      if (y + 1 < height) {
        if (x > 0) lum[p + width - 1] += (err * 3) / 16
        lum[p + width] += (err * 5) / 16
        if (x + 1 < width) lum[p + width + 1] += err / 16
      }
      setBW(data, p * 4, black)
    }
  }
}

/** True when every pixel is opaque pure black or pure white. */
export const isMonochrome = (px: Pixels): boolean => {
  const { data } = px
  for (let i = 0; i < data.length; i += 4) {
    const v = data[i]
    if (
      (v !== 0 && v !== 255) ||
      data[i + 1] !== v ||
      data[i + 2] !== v ||
      data[i + 3] !== 255
    ) {
      return false
    }
  }
  return true
}

/** Fraction of black pixels, optionally inside a rectangle. */
export const blackRatio = (
  px: Pixels,
  rect = { x: 0, y: 0, width: px.width, height: px.height },
): number => {
  let black = 0
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      if (px.data[(y * px.width + x) * 4] === 0) black++
    }
  }
  return black / (rect.width * rect.height)
}
