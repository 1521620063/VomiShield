import { invoke } from '@tauri-apps/api/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from './settings'
import { updateSettings } from './tauri'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}))

function setTauriRuntime(enabled: boolean) {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: enabled ? { __TAURI_INTERNALS__: {} } : {},
  })
}

describe('tauri api wrapper', () => {
  afterEach(() => {
    vi.resetAllMocks()
    setTauriRuntime(false)
  })

  it('does not hide update failures inside the Tauri runtime', async () => {
    const error = new Error('command failed')
    vi.mocked(invoke).mockRejectedValue(error)
    setTauriRuntime(true)

    await expect(updateSettings(DEFAULT_SETTINGS)).rejects.toThrow('command failed')
  })

  it('keeps the browser fallback for non-Tauri previews', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('invoke unavailable'))
    setTauriRuntime(false)

    await expect(updateSettings(DEFAULT_SETTINGS)).resolves.toEqual(DEFAULT_SETTINGS)
  })
})
