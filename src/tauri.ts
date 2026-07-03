import { invoke } from '@tauri-apps/api/core'
import { emit, listen } from '@tauri-apps/api/event'
import { DEFAULT_SETTINGS, type OverlaySettings } from './settings'

declare global {
  interface Window {
    __TAURI__?: unknown
    __TAURI_INTERNALS__?: unknown
  }
}

export function isTauriRuntime() {
  return (
    typeof window !== 'undefined' &&
    (window.__TAURI_INTERNALS__ !== undefined || window.__TAURI__ !== undefined)
  )
}

function fallbackOrThrow<T>(fallback: T, error: unknown): T {
  if (isTauriRuntime()) {
    throw error
  }

  return fallback
}

export async function getSettings(): Promise<OverlaySettings> {
  try {
    return await invoke<OverlaySettings>('get_settings')
  } catch (error) {
    return fallbackOrThrow(DEFAULT_SETTINGS, error)
  }
}

export async function updateSettings(
  settings: OverlaySettings,
): Promise<OverlaySettings> {
  try {
    return await invoke<OverlaySettings>('update_settings', { settings })
  } catch (error) {
    return fallbackOrThrow(settings, error)
  }
}

export async function toggleOverlay(): Promise<OverlaySettings> {
  try {
    return await invoke<OverlaySettings>('toggle_overlay')
  } catch (error) {
    return fallbackOrThrow(DEFAULT_SETTINGS, error)
  }
}

export async function onSettingsChanged(
  handler: (settings: OverlaySettings) => void,
): Promise<() => void> {
  try {
    return await listen<OverlaySettings>('settings-changed', (event) => {
      handler(event.payload)
    })
  } catch (error) {
    return fallbackOrThrow(() => {}, error)
  }
}

export async function previewSettings(settings: OverlaySettings): Promise<void> {
  try {
    await emit('settings-preview', settings)
  } catch (error) {
    return fallbackOrThrow(undefined, error)
  }
}

export async function onSettingsPreview(
  handler: (settings: OverlaySettings) => void,
): Promise<() => void> {
  try {
    return await listen<OverlaySettings>('settings-preview', (event) => {
      handler(event.payload)
    })
  } catch (error) {
    return fallbackOrThrow(() => {}, error)
  }
}
