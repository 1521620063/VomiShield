import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { DEFAULT_SETTINGS, type OverlaySettings } from './settings'

export async function getSettings(): Promise<OverlaySettings> {
  try {
    return await invoke<OverlaySettings>('get_settings')
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function updateSettings(
  settings: OverlaySettings,
): Promise<OverlaySettings> {
  try {
    return await invoke<OverlaySettings>('update_settings', { settings })
  } catch {
    return settings
  }
}

export async function toggleOverlay(): Promise<OverlaySettings> {
  try {
    return await invoke<OverlaySettings>('toggle_overlay')
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function onSettingsChanged(
  handler: (settings: OverlaySettings) => void,
): Promise<() => void> {
  try {
    return await listen<OverlaySettings>('settings-changed', (event) => {
      handler(event.payload)
    })
  } catch {
    return () => {}
  }
}

