import {
  DOC_VERSION,
  OBJECT_TYPES,
  type LabelDoc,
  type ObjectType,
} from './types'

export const toJson = (doc: LabelDoc): string => JSON.stringify(doc, null, 2)

/** Parse a label file (R10.AC3). Throws an Error with a user-readable message. */
export const fromJson = (json: string): LabelDoc => {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('The file is not valid JSON.')
  }
  if (typeof data !== 'object' || data === null) {
    throw new Error('The file is not a labelcraft label.')
  }
  const d = data as { version?: unknown; label?: unknown; objects?: unknown }
  if (d.version !== DOC_VERSION) {
    throw new Error(
      `Unsupported label file version ${String(d.version)} (expected ${DOC_VERSION}).`,
    )
  }
  if (
    typeof d.label !== 'object' ||
    d.label === null ||
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
