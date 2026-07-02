import type { OverlaySettings } from './settings'

const OVERLAY_REFRESH_INTERVAL_MS = 500

type TimerId = ReturnType<typeof globalThis.setInterval>

type SettingsSyncOptions = {
  isOverlay: boolean
  getSettings: () => Promise<OverlaySettings>
  onSettingsChanged: (
    handler: (settings: OverlaySettings) => void,
  ) => Promise<() => void>
  applySettings: (settings: OverlaySettings) => void
  onError?: (error: unknown) => void
  setIntervalFn?: typeof globalThis.setInterval
  clearIntervalFn?: typeof globalThis.clearInterval
}

export function startSettingsSync({
  isOverlay,
  getSettings,
  onSettingsChanged,
  applySettings,
  onError = () => {},
  setIntervalFn = globalThis.setInterval.bind(globalThis),
  clearIntervalFn = globalThis.clearInterval.bind(globalThis),
}: SettingsSyncOptions) {
  let disposed = false
  let unlisten: (() => void) | undefined
  let intervalId: TimerId | undefined

  const refreshSettings = () => {
    void getSettings()
      .then((settings) => {
        if (!disposed) {
          applySettings(settings)
        }
      })
      .catch((error) => {
        if (!disposed) {
          onError(error)
        }
      })
  }

  refreshSettings()

  void onSettingsChanged((settings) => {
    if (!disposed) {
      applySettings(settings)
    }
  })
    .then((cleanup) => {
      if (disposed) {
        cleanup()
      } else {
        unlisten = cleanup
      }
    })
    .catch((error) => {
      if (!disposed) {
        onError(error)
      }
    })

  if (isOverlay) {
    intervalId = setIntervalFn(refreshSettings, OVERLAY_REFRESH_INTERVAL_MS)
  }

  return () => {
    disposed = true
    unlisten?.()

    if (intervalId !== undefined) {
      clearIntervalFn(intervalId)
    }
  }
}
