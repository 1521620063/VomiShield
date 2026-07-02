import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from './settings'
import { createSettingsCommitter } from './settingsCommit'

function flushPromises() {
  return Promise.resolve()
}

describe('createSettingsCommitter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('previews every change immediately but only saves the latest value after the debounce', async () => {
    const applySettings = vi.fn()
    const previewSettings = vi.fn()
    const saveSettings = vi.fn(async (settings) => settings)

    const committer = createSettingsCommitter({
      initialSettings: DEFAULT_SETTINGS,
      applySettings,
      previewSettings,
      saveSettings,
      onStatus: vi.fn(),
      onError: vi.fn(),
      debounceMs: 120,
    })

    committer.commitPatch({ opacity: 0.5 })
    committer.commitPatch({ opacity: 0.6 })

    expect(applySettings).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      opacity: 0.6,
    })
    expect(previewSettings).toHaveBeenCalledTimes(2)
    expect(saveSettings).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(119)
    expect(saveSettings).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()

    expect(saveSettings).toHaveBeenCalledOnce()
    expect(saveSettings).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      opacity: 0.6,
    })
  })

  it('ignores stale save responses after a newer local edit', async () => {
    const applySettings = vi.fn()
    const firstSave = Promise.resolve({
      ...DEFAULT_SETTINGS,
      opacity: 0.5,
    })
    const saveSettings = vi
      .fn()
      .mockReturnValueOnce(firstSave)
      .mockResolvedValueOnce({
        ...DEFAULT_SETTINGS,
        opacity: 0.7,
      })

    const committer = createSettingsCommitter({
      initialSettings: DEFAULT_SETTINGS,
      applySettings,
      previewSettings: vi.fn(),
      saveSettings,
      onStatus: vi.fn(),
      onError: vi.fn(),
      debounceMs: 120,
    })

    committer.commitPatch({ opacity: 0.5 })
    await vi.advanceTimersByTimeAsync(120)
    committer.commitPatch({ opacity: 0.7 })
    await firstSave
    await flushPromises()

    expect(applySettings).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      opacity: 0.7,
    })

    await vi.advanceTimersByTimeAsync(120)
    await flushPromises()

    expect(applySettings).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      opacity: 0.7,
    })
    expect(saveSettings).toHaveBeenCalledTimes(2)
  })

  it('keeps local edits from being overwritten by older external sync events', () => {
    const applySettings = vi.fn()
    const committer = createSettingsCommitter({
      initialSettings: DEFAULT_SETTINGS,
      applySettings,
      previewSettings: vi.fn(),
      saveSettings: vi.fn(async (settings) => settings),
      onStatus: vi.fn(),
      onError: vi.fn(),
      debounceMs: 120,
    })

    committer.commitPatch({ size: 180 })
    committer.receiveExternal({
      ...DEFAULT_SETTINGS,
      size: 80,
    })

    expect(applySettings).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      size: 180,
    })
  })

  it('can force replace settings after commands that already persisted state', () => {
    const applySettings = vi.fn()
    const committer = createSettingsCommitter({
      initialSettings: DEFAULT_SETTINGS,
      applySettings,
      previewSettings: vi.fn(),
      saveSettings: vi.fn(async (settings) => settings),
      onStatus: vi.fn(),
      onError: vi.fn(),
      debounceMs: 120,
    })

    committer.replaceSettings({
      ...DEFAULT_SETTINGS,
      enabled: false,
    })
    committer.commitPatch({ opacity: 0.4 })

    expect(applySettings).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      enabled: false,
      opacity: 0.4,
    })
  })
})
