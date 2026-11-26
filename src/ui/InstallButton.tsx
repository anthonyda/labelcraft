/** Install app button and help dialog (spec R30.AC4). */
import { useState } from 'react'
import { Button } from './icons'
import { isIos, promptInstall, useInstall } from './install'
import { Modal } from './Modal'

export function InstallButton() {
  const { standalone } = useInstall()
  const [help, setHelp] = useState(false)
  if (standalone) return null
  const ios = isIos()
  return (
    <>
      <Button
        icon="install"
        title="Install labelcraft as an app"
        onClick={async () => {
          if (!(await promptInstall())) setHelp(true)
        }}
        aria-label="Install app"
      >
        <span className="install-text">Install app</span>
      </Button>
      <Modal
        open={help}
        title="Install labelcraft"
        onClose={() => setHelp(false)}
      >
        {ios ? (
          <>
            <ol className="install-steps">
              <li>
                Tap <strong>Share</strong> (the square with an arrow) in Safari.
              </li>
              <li>
                Choose <strong>Add to Home Screen</strong>, then{' '}
                <strong>Add</strong>.
              </li>
            </ol>
            <p className="field-hint">
              iPhone and iPad browsers can't connect to label printers, so the
              app designs labels there; print from a computer or an Android
              phone.
            </p>
          </>
        ) : (
          <ol className="install-steps">
            <li>
              Open the browser menu (<strong>⋮</strong> or <strong>…</strong>).
            </li>
            <li>
              Choose <strong>Install labelcraft</strong>,{' '}
              <strong>Install app</strong> or{' '}
              <strong>Add to Home screen</strong>.
            </li>
          </ol>
        )}
        <div className="actions">
          <Button icon="check" onClick={() => setHelp(false)}>
            Done
          </Button>
        </div>
      </Modal>
    </>
  )
}
