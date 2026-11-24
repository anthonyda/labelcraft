/** R18.AC3: offer the loaded roll's size when it differs from the label's. */
import { usePrinter, useKnownModel } from '../printer/usePrinter'
import { labelForRoll, sameSize } from './labelSize'
import { useEditorState, useEditorStore } from './useEditor'

const mm = (n: number) => String(Math.round(n * 100) / 100)

export function RollOffer() {
  const store = useEditorStore()
  const label = useEditorState().history.present.label
  const printer = usePrinter()
  const model = useKnownModel()
  const size = printer.roll?.size
  if (!size || printer.status === 'disconnected') return null
  const target = labelForRoll(size, model)
  if (sameSize(target, label)) return null
  const name = `${mm(size.widthMm)} × ${mm(size.lengthMm)} mm`
  return (
    <div className="roll-offer">
      <p>The printer has {name} labels loaded.</p>
      <button type="button" onClick={() => store.setLabel(target)}>
        Use loaded roll ({name})
      </button>
    </div>
  )
}
