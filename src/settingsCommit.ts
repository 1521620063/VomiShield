import { patchSettings, type OverlaySettings } from './settings'

export const SETTINGS_SAVE_DEBOUNCE_MS = 120

type TimerId = ReturnType<typeof globalThis.setTimeout>
export type SettingsCommitStatus = 'editing' | 'saving' | 'saved'

type SettingsCommitterOptions = {
  initialSettings: OverlaySettings
  applySettings: (settings: OverlaySettings) => void
  previewSettings: (settings: OverlaySettings) => Promise<void> | void
  saveSettings: (settings: OverlaySettings) => Promise<OverlaySettings>
  onStatus: (status: SettingsCommitStatus) => void
  onError: (error: unknown) => void
  debounceMs?: number
  setTimeoutFn?: typeof globalThis.setTimeout
  clearTimeoutFn?: typeof globalThis.clearTimeout
}

export function createSettingsCommitter({
  initialSettings,
  applySettings,
  previewSettings,
  saveSettings,
  onStatus,
  onError,
  debounceMs = SETTINGS_SAVE_DEBOUNCE_MS,
  setTimeoutFn = globalThis.setTimeout.bind(globalThis),
  clearTimeoutFn = globalThis.clearTimeout.bind(globalThis),
}: SettingsCommitterOptions) {
  let currentSettings = initialSettings
  let saveTimer: TimerId | undefined
  let revision = 0
  let hasLocalEdit = false

  const applyCurrentSettings = (settings: OverlaySettings) => {
    currentSettings = settings
    applySettings(settings)
  }

  const scheduleSave = (settings: OverlaySettings) => {
    revision += 1
    const saveRevision = revision

    if (saveTimer !== undefined) {
      clearTimeoutFn(saveTimer)
    }

    saveTimer = setTimeoutFn(() => {
      saveTimer = undefined
      onStatus('saving')

      void saveSettings(settings)
        .then((savedSettings) => {
          if (saveRevision === revision) {
            hasLocalEdit = false
            applyCurrentSettings(savedSettings)
            onStatus('saved')
          }
        })
        .catch((error) => {
          if (saveRevision === revision) {
            hasLocalEdit = false
            onError(error)
          }
        })
    }, debounceMs)
  }

  return {
    commitPatch(patch: Partial<OverlaySettings>) {
      const nextSettings = patchSettings(currentSettings, patch)
      hasLocalEdit = true
      applyCurrentSettings(nextSettings)
      onStatus('editing')
      void Promise.resolve(previewSettings(nextSettings)).catch(onError)
      scheduleSave(nextSettings)
    },

    receiveExternal(settings: OverlaySettings) {
      if (!hasLocalEdit) {
        applyCurrentSettings(settings)
      }
    },

    replaceSettings(settings: OverlaySettings) {
      hasLocalEdit = false
      applyCurrentSettings(settings)
    },

    dispose() {
      if (saveTimer !== undefined) {
        clearTimeoutFn(saveTimer)
      }
    },
  }
}
