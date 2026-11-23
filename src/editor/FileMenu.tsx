/**
 * Labels menu (T5.2, T5.3): new, open, save, save as, import/export JSON,
 * export PNG. Replacing a label with unsaved changes asks first.
 */
import { useRef, useState } from 'react'
import { newDoc } from '../model/factory'
import { fromJson, toJson } from '../model/serialize'
import type { LabelDoc } from '../model/types'
import {
  deleteLabel,
  getLabel,
  listLabels,
  saveLabel,
  type SavedLabelMeta,
} from '../storage/db'
import {
  downloadBlob,
  fileBaseName,
  labelPng,
  labelThumbnail,
} from '../storage/files'
import type { AutosaveStatus } from '../storage/useAutosave'
import { Modal } from '../ui/Modal'
import { useEditorState, useEditorStore } from './useEditor'

type Pending =
  | { kind: 'saveAs' }
  | { kind: 'open'; labels: SavedLabelMeta[] }
  | { kind: 'confirm'; message: string; then: () => void }

const AUTOSAVE_TEXT: Record<AutosaveStatus, string> = {
  loading: 'Loading…',
  saving: 'Saving…',
  saved: 'Kept in this browser',
  error: "Couldn't save in this browser",
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function FileMenu({ autosave }: { autosave: AutosaveStatus }) {
  const store = useEditorStore()
  const { file } = useEditorState()
  const [pending, setPending] = useState<Pending>()
  const [error, setError] = useState<string>()
  const [name, setName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string>()
  const importRef = useRef<HTMLInputElement>(null)
  const dirty = store.isDirty

  const close = () => {
    setPending(undefined)
    setConfirmDelete(undefined)
  }

  /** Run `action` now, or after confirming if there are unsaved changes. */
  const guard = (action: () => void) => {
    if (!store.isDirty) return action()
    setPending({
      kind: 'confirm',
      message: `"${file.name ?? 'Untitled'}" has changes that aren't saved. Discard them?`,
      then: action,
    })
  }

  const run = async (fn: () => Promise<void>) => {
    setError(undefined)
    try {
      await fn()
    } catch (e) {
      setError(errorText(e))
    }
  }

  const saveAs = (labelName: string, id?: string) =>
    run(async () => {
      const doc = store.doc
      const labelId = await saveLabel({
        id,
        name: labelName,
        doc,
        thumbnail: await labelThumbnail(doc),
      })
      store.markSaved(labelId, labelName)
    })

  const onSave = () => {
    if (file.labelId && file.name) void saveAs(file.name, file.labelId)
    else {
      setName(file.name ?? '')
      setPending({ kind: 'saveAs' })
    }
  }

  const onOpen = () =>
    run(async () => setPending({ kind: 'open', labels: await listLabels() }))

  const openLabel = (id: string) =>
    run(async () => {
      const label = await getLabel(id)
      if (!label) throw new Error('That label no longer exists.')
      store.load(label.doc, { labelId: label.id, name: label.name })
      close()
    })

  const onDelete = (id: string) =>
    run(async () => {
      await deleteLabel(id)
      store.forgetLabel(id)
      setConfirmDelete(undefined)
      setPending({ kind: 'open', labels: await listLabels() })
    })

  const onImport = async (f: File | undefined) => {
    if (!f) return
    await run(async () => {
      const doc: LabelDoc = fromJson(await f.text())
      const baseName = f.name.replace(/(\.labelcraft)?\.json$/i, '')
      guard(() => store.load(doc, { name: baseName }, true))
    })
  }

  const exportJson = () =>
    downloadBlob(
      new Blob([toJson(store.doc)], { type: 'application/json' }),
      `${fileBaseName(file.name)}.labelcraft.json`,
    )

  const exportPng = () =>
    run(async () =>
      downloadBlob(await labelPng(store.doc), `${fileBaseName(file.name)}.png`),
    )

  return (
    <div className="file-menu">
      <p className="file-name">
        <strong data-testid="label-name">{file.name ?? 'Untitled'}</strong>
        {dirty && file.labelId && <span> · unsaved changes</span>}
        <span className="autosave" role="status" data-testid="autosave">
          {AUTOSAVE_TEXT[autosave]}
        </span>
      </p>
      <div className="group" role="group" aria-label="Labels">
        <button
          type="button"
          onClick={() =>
            guard(() => store.load(newDoc({ ...store.doc.label })))
          }
        >
          New
        </button>
        <button type="button" onClick={onOpen}>
          Open…
        </button>
        <button type="button" onClick={onSave}>
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            setName(file.name ?? '')
            setPending({ kind: 'saveAs' })
          }}
        >
          Save as…
        </button>
        <button type="button" onClick={() => importRef.current?.click()}>
          Import…
        </button>
        <button type="button" onClick={exportJson}>
          Export file
        </button>
        <button type="button" onClick={exportPng}>
          Export PNG
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".json,application/json"
          hidden
          aria-label="Label file to import"
          data-testid="import-file"
          onChange={(e) => {
            void onImport(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <Modal
        open={pending?.kind === 'saveAs'}
        title="Save label as"
        onClose={close}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const n = name.trim()
            if (!n) return
            void saveAs(n).then(close)
          }}
        >
          <div className="field">
            <label htmlFor="save-name">Name</label>
            <input
              id="save-name"
              value={name}
              autoFocus
              required
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="actions">
            <button type="button" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Save
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={pending?.kind === 'open'}
        title="Open label"
        onClose={close}
        className="open-dialog"
      >
        {pending?.kind === 'open' && pending.labels.length === 0 && (
          <p>No saved labels yet. Use Save to keep one here.</p>
        )}
        {pending?.kind === 'open' && pending.labels.length > 0 && (
          <ul className="saved-labels">
            {pending.labels.map((l) => (
              <li key={l.id}>
                {l.thumbnail && <img src={l.thumbnail} alt="" />}
                <span className="saved-name">
                  <strong>{l.name}</strong>
                  <small>{new Date(l.updatedAt).toLocaleString()}</small>
                </span>
                {confirmDelete === l.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(undefined)}
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => void onDelete(l.id)}
                    >
                      Delete "{l.name}"
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(l.id)}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="primary"
                      onClick={() => guard(() => void openLabel(l.id))}
                    >
                      Open
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="actions">
          <button type="button" onClick={close}>
            Close
          </button>
        </div>
      </Modal>

      <Modal
        open={pending?.kind === 'confirm'}
        title="Discard changes?"
        onClose={close}
      >
        {pending?.kind === 'confirm' && (
          <>
            <p>{pending.message}</p>
            <div className="actions">
              <button
                type="button"
                className="danger"
                onClick={() => {
                  const then = pending.then
                  close()
                  then()
                }}
              >
                Discard
              </button>
              <button
                type="button"
                className="primary"
                autoFocus
                onClick={close}
              >
                Keep editing
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
