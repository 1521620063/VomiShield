import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  overlayRenderAttributes,
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
      glow: 0.42,
      backdrop: 0,
      offsetY: 0,
      language: 'zh',
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
        glow: 0.8,
        backdrop: 0.18,
        offsetY: -24,
      }),
    ).toEqual({
      '--overlay-opacity': '0.5',
      '--anchor-size': '160px',
      '--anchor-thickness': '4px',
      '--anchor-color': '#ffffff',
      '--anchor-glow': '0.8',
      '--backdrop-opacity': '0.18',
      '--anchor-offset-y': '-24px',
    })
  })

  it('exposes anchor style as a stable data attribute for CSS selectors', () => {
    expect(
      overlayRenderAttributes({
        ...DEFAULT_SETTINGS,
        style: 'fullGuide',
      }),
    ).toEqual({
      'data-anchor-style': 'fullGuide',
    })
  })

  it('accepts the expanded anchor styles for rendering', () => {
    const styles = [
      'crosshair',
      'ring',
      'fullGuide',
      'horizontal',
      'vertical',
      'cornerBrackets',
    ] as const

    expect(
      styles.map((style) =>
        overlayRenderAttributes({
          ...DEFAULT_SETTINGS,
          style,
        }),
      ),
    ).toEqual(styles.map((style) => ({ 'data-anchor-style': style })))
  })
})
