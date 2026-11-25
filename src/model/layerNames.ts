/** Names for the layers panel (T6d.1, R21.AC1). */
import type { LabelDoc, LabelObject } from './types'

const TYPE_NAMES: Record<LabelObject['type'], string> = {
  text: 'Text',
  image: 'Image',
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  line: 'Line',
  qr: 'QR code',
  barcode: 'Barcode',
}

const MAX = 40

const clip = (s: string) => (s.length > MAX ? `${s.slice(0, MAX - 1)}…` : s)

/** Name before numbering: text's first line, a code's content, else the type. */
export const baseLayerName = (o: LabelObject): string => {
  let name = ''
  if (o.type === 'text') {
    name =
      o.text
        .split('\n')
        .find((l) => l.trim())
        ?.trim() ?? ''
  } else if (o.type === 'qr' || o.type === 'barcode') {
    name = o.content.trim().split('\n')[0]
  }
  return name ? clip(name) : TYPE_NAMES[o.type]
}

/** Names by object id; names used more than once get 1, 2, … in drawing order. */
export const layerNames = (doc: LabelDoc): Map<string, string> => {
  const bases = doc.objects.map(baseLayerName)
  const total = new Map<string, number>()
  bases.forEach((b) => total.set(b, (total.get(b) ?? 0) + 1))
  const seen = new Map<string, number>()
  const names = new Map<string, string>()
  doc.objects.forEach((o, i) => {
    const b = bases[i]
    if (total.get(b)! > 1) {
      const n = (seen.get(b) ?? 0) + 1
      seen.set(b, n)
      names.set(o.id, `${b} ${n}`)
    } else {
      names.set(o.id, b)
    }
  })
  return names
}
