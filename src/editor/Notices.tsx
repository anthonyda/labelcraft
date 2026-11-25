/**
 * Messages above the canvas: a notice when the editor changed something by
 * itself (R8.AC5), and a banner that stays while objects are outside the
 * label (R19.AC5).
 */
import { useEffect } from 'react'
import { Button, Icon } from '../ui/icons'
import { useEditorState, useEditorStore, useObjectsOutside } from './useEditor'

const NOTICE_MS = 8000

export function Notices() {
  const store = useEditorStore()
  const { history, notice } = useEditorState()
  const outside = useObjectsOutside(history.present)

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => store.dismissNotice(), NOTICE_MS)
    return () => clearTimeout(t)
  }, [notice, store])

  return (
    <div className="notices">
      {outside.length > 0 && (
        <div
          className="banner banner-warning"
          role="status"
          data-testid="outside-banner"
        >
          <Icon name="warning" />
          <span>
            <strong>Attention:</strong>{' '}
            {outside.length === 1
              ? '1 element is outside the label'
              : `${outside.length} elements are outside the label`}{' '}
            (red outline). The parts outside won't print.
          </span>
          <Button icon="select" onClick={() => store.select(outside)}>
            Select
          </Button>
        </div>
      )}
      {notice && (
        <div
          key={notice.id}
          className="banner banner-info"
          role="status"
          data-testid="editor-notice"
        >
          <Icon name="info" />
          <span>{notice.message}</span>
          <Button
            icon="close"
            aria-label="Dismiss"
            className="icon-only"
            onClick={() => store.dismissNotice()}
          />
        </div>
      )}
    </div>
  )
}
