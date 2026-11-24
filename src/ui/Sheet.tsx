/**
 * Phone bottom sheet (R15.AC2): a non-modal dialog, so the label above stays
 * usable while it is open. Its content stays mounted when closed, so dialogs
 * started from it keep working.
 */
import { useEffect, useRef, type ReactNode } from 'react'

export function Sheet({
  id,
  title,
  open,
  onClose,
  children,
}: {
  id: string
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.show()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      id={id}
      className="sheet"
      aria-labelledby={`${id}-title`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="sheet-header">
        <h2 id={`${id}-title`}>{title}</h2>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      {children}
    </dialog>
  )
}
