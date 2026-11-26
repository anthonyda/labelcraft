import { FRAME_IDS } from './frames'
import {
  DOC_VERSION,
  OBJECT_TYPES,
  type LabelDoc,
  type ObjectType,
} from './types'

export const toJson = (doc: LabelDoc): string => JSON.stringify(doc, null, 2)

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)

const isFrame = (v: unknown): boolean => {
  const f = v as Record<string, unknown> | null
  return (
    typeof f === 'object' &&
    f !== null &&
    (FRAME_IDS as readonly string[]).includes(f.design as string) &&
    isFiniteNumber(f.thicknessMm) &&
    isFiniteNumber(f.insetMm)
  )
}

/**
 * Check that parsed data is a label document. Used for imported files and
 * for data read back from browser storage. Throws a user-readable Error.
 */
export const parseDoc = (data: unknown): LabelDoc => {
  if (typeof data !== 'object' || data === null) {
    throw new Error('The file is not a labelcraft label.')
  }
  const d = data as { version?: unknown; label?: unknown; objects?: unknown }
  if (d.version !== DOC_VERSION) {
    throw new Error(
      `Unsupported label file version ${String(d.version)} (expected ${DOC_VERSION}).`,
    )
  }
  const label = d.label as Record<string, unknown> | null
  if (
    typeof label !== 'object' ||
    label === null ||
    !isFiniteNumber(label.widthMm) ||
    !isFiniteNumber(label.heightMm) ||
    !isFiniteNumber(label.dpi) ||
    (label.size !== undefined && typeof label.size !== 'string') ||
    (label.turned !== undefined && typeof label.turned !== 'boolean') ||
    (label.frame !== undefined && !isFrame(label.frame)) ||
    !Array.isArray(d.objects)
  ) {
    throw new Error('The file is not a labelcraft label.')
  }
  for (const o of d.objects as { type?: unknown }[]) {
    if (!OBJECT_TYPES.includes(o?.type as ObjectType)) {
      throw new Error(
        `The file has an unknown object type "${String(o?.type)}".`,
      )
    }
  }
  return data as LabelDoc
}

/** Parse a label file (R10.AC3). Throws an Error with a user-readable message. */
export const fromJson = (json: string): LabelDoc => {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('The file is not valid JSON.')
  }
  return parseDoc(data)
}
