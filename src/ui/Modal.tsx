/** Native modal dialog wrapper: opened with showModal(), closed by the browser on Esc. */
import { useEffect, useId, useRef, type ReactNode } from 'react'

export function Modal({
  open,
  title,
  onClose,
  children,
  className = '',
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-labelledby={titleId}
      onClose={onClose}
    >
      <h1 id={titleId}>{title}</h1>
      {open && children}
    </dialog>
  )
}
