import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_SETTINGS,
  normalizeOverlaySettings,
  patchActivePartSettings,
  type OverlaySettings,
} from './settings'
import { createSettingsCommitter } from './settingsCommit'

function flushPromises() {
  return Promise.resolve()
}

function boxCircleWithOuterPart(): OverlaySettings {
  return normalizeOverlaySettings({
    ...DEFAULT_SETTINGS,
    style: 'boxCircle',
    styleSettings: {
      ...DEFAULT_SETTINGS.styleSettings,
      boxCircle: {
        ...DEFAULT_SETTINGS.styleSettings.boxCircle,
        activePart: 'outer',
      },
    },
  })
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

    const firstChange = patchActivePartSettings(DEFAULT_SETTINGS, { opacity: 0.5 })
    const latestChange = patchActivePartSettings(firstChange, { opacity: 0.6 })

    committer.commitPatch(firstChange)
    committer.commitPatch(latestChange)

    expect(applySettings).toHaveBeenLastCalledWith(latestChange)
    expect(previewSettings).toHaveBeenCalledTimes(2)
    expect(saveSettings).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(119)
    expect(saveSettings).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()

    expect(saveSettings).toHaveBeenCalledOnce()
    expect(saveSettings).toHaveBeenCalledWith(latestChange)
  })

  it('ignores stale save responses after a newer local edit', async () => {
    const applySettings = vi.fn()
    const firstChange = patchActivePartSettings(DEFAULT_SETTINGS, { opacity: 0.5 })
    const latestChange = patchActivePartSettings(firstChange, { opacity: 0.7 })
    const firstSave = Promise.resolve(firstChange)
    const saveSettings = vi
      .fn()
      .mockReturnValueOnce(firstSave)
      .mockResolvedValueOnce(latestChange)

    const committer = createSettingsCommitter({
      initialSettings: DEFAULT_SETTINGS,
      applySettings,
      previewSettings: vi.fn(),
      saveSettings,
      onStatus: vi.fn(),
      onError: vi.fn(),
      debounceMs: 120,
    })

    committer.commitPatch(firstChange)
    await vi.advanceTimersByTimeAsync(120)
    committer.commitPatch(latestChange)
    await firstSave
    await flushPromises()

    expect(applySettings).toHaveBeenLastCalledWith(latestChange)

    await vi.advanceTimersByTimeAsync(120)
    await flushPromises()

    expect(applySettings).toHaveBeenLastCalledWith(latestChange)
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

    const localChange = patchActivePartSettings(DEFAULT_SETTINGS, { size: 180 })
    const externalChange = patchActivePartSettings(DEFAULT_SETTINGS, { size: 80 })

    committer.commitPatch(localChange)
    committer.receiveExternal(externalChange)

    expect(applySettings).toHaveBeenLastCalledWith(localChange)
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
    const replacedSettings = normalizeOverlaySettings({
      ...DEFAULT_SETTINGS,
      enabled: false,
    })
    const changedSettings = patchActivePartSettings(replacedSettings, {
      opacity: 0.4,
    })

    committer.commitPatch(changedSettings)

    expect(applySettings).toHaveBeenLastCalledWith(changedSettings)
  })

  it('preserves inactive part visuals when committing a changed active part', () => {
    const applySettings = vi.fn()
    const initialSettings = boxCircleWithOuterPart()
    const changedSettings = patchActivePartSettings(initialSettings, {
      opacity: 0.4,
    })
    const committer = createSettingsCommitter({
      initialSettings,
      applySettings,
      previewSettings: vi.fn(),
      saveSettings: vi.fn(async (settings) => settings),
      onStatus: vi.fn(),
      onError: vi.fn(),
      debounceMs: 120,
    })

    committer.commitPatch(changedSettings)

    expect(applySettings).toHaveBeenLastCalledWith(changedSettings)
    expect(
      applySettings.mock.lastCall?.[0].styleSettings.boxCircle.parts.center,
    ).toEqual(initialSettings.styleSettings.boxCircle.parts.center)
  })
})
