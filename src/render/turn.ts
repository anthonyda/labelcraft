/** Turn a canvas by a quarter turn, pixel for pixel (R22.AC4). */
export const turnCanvas = (
  source: HTMLCanvasElement,
  direction: 'clockwise' | 'counterclockwise',
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = source.height
  canvas.height = source.width
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  if (direction === 'clockwise') {
    ctx.translate(canvas.width, 0)
    ctx.rotate(Math.PI / 2)
  } else {
    ctx.translate(0, canvas.height)
    ctx.rotate(-Math.PI / 2)
  }
  ctx.drawImage(source, 0, 0)
  return canvas
}

/**
 * The bitmap to send to the printer: a turned design (portrait on a landscape
 * roll, or the reverse) is turned back to the printer's layout.
 */
export const printLayout = (
  canvas: HTMLCanvasElement,
  turned: boolean | undefined,
): HTMLCanvasElement =>
  turned ? turnCanvas(canvas, 'counterclockwise') : canvas
