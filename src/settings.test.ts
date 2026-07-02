import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  overlayCssVars,
  patchSettings,
  type OverlaySettings,
} from './settings'

describe('settings helpers', () => {
  it('keeps the frontend defaults aligned with the Rust defaults', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      enabled: true,
      style: 'crosshair',
      opacity: 0.72,
      size: 120,
      thickness: 2,
      color: '#6ff0c2',
    })
  })

  it('merges partial setting updates without dropping existing values', () => {
    const current: OverlaySettings = {
      ...DEFAULT_SETTINGS,
      enabled: false,
      color: '#ffcc66',
    }

    expect(patchSettings(current, { opacity: 0.35 })).toEqual({
      ...current,
      opacity: 0.35,
    })
  })

  it('creates stable CSS variables for the overlay renderer', () => {
    expect(
      overlayCssVars({
        ...DEFAULT_SETTINGS,
        opacity: 0.5,
        size: 160,
        thickness: 4,
        color: '#ffffff',
      }),
    ).toEqual({
      '--overlay-opacity': '0.5',
      '--anchor-size': '160px',
      '--anchor-thickness': '4px',
      '--anchor-color': '#ffffff',
    })
  })
})
