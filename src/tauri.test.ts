import { invoke } from '@tauri-apps/api/core'
import { emit, listen } from '@tauri-apps/api/event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from './settings'
import { onSettingsPreview, previewSettings, updateSettings } from './tauri'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('@tauri-apps/api/event', () => ({
  emit: vi.fn(),
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

  it('broadcasts preview settings without invoking a backend save command', async () => {
    vi.mocked(emit).mockResolvedValue(undefined)
    setTauriRuntime(true)

    await previewSettings(DEFAULT_SETTINGS)

    expect(emit).toHaveBeenCalledWith('settings-preview', DEFAULT_SETTINGS)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('listens for preview settings events', async () => {
    const handler = vi.fn()
    const unlisten = vi.fn()
    vi.mocked(listen).mockImplementation(async (_event, callback) => {
      callback({ payload: DEFAULT_SETTINGS } as never)
      return unlisten
    })
    setTauriRuntime(true)

    const cleanup = await onSettingsPreview(handler)

    expect(listen).toHaveBeenCalledWith('settings-preview', expect.any(Function))
    expect(handler).toHaveBeenCalledWith(DEFAULT_SETTINGS)
    cleanup()
    expect(unlisten).toHaveBeenCalledOnce()
  })
})
