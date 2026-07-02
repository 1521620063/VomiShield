import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type OverlaySettings } from './settings'
import { startSettingsSync } from './settingsSync'

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('startSettingsSync', () => {
  it('refreshes settings immediately and on settings-changed events', async () => {
    const eventSettings: OverlaySettings = {
      ...DEFAULT_SETTINGS,
      style: 'ring',
    }
    const applySettings = vi.fn()
    const unlisten = vi.fn()

    const stop = startSettingsSync({
      isOverlay: false,
      getSettings: vi.fn().mockResolvedValue(DEFAULT_SETTINGS),
      onSettingsChanged: vi.fn(async (handler) => {
        handler(eventSettings)
        return unlisten
      }),
      applySettings,
    })

    await flushPromises()
    stop()

    expect(applySettings).toHaveBeenCalledWith(DEFAULT_SETTINGS)
    expect(applySettings).toHaveBeenCalledWith(eventSettings)
    expect(unlisten).toHaveBeenCalledOnce()
  })

  it('polls backend settings for the overlay window as a missed-event fallback', async () => {
    let intervalCallback: (() => void) | undefined
    const getSettings = vi.fn().mockResolvedValue(DEFAULT_SETTINGS)

    const stop = startSettingsSync({
      isOverlay: true,
      getSettings,
      onSettingsChanged: vi.fn(async () => vi.fn()),
      applySettings: vi.fn(),
      setIntervalFn: (callback, delay) => {
        intervalCallback = typeof callback === 'function' ? () => callback() : undefined
        expect(delay).toBe(500)
        return 7
      },
      clearIntervalFn: vi.fn(),
    })

    intervalCallback?.()
    await flushPromises()
    stop()

    expect(getSettings).toHaveBeenCalledTimes(2)
  })
})
