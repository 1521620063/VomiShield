import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  formatKeyboardShortcut,
  overlayRenderAttributes,
  overlayCssVars,
  patchSettings,
  shortcutFromKeyboardEvent,
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
      shortcut: 'Ctrl+Alt+V',
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
      'boxCircle',
      'edgeBars',
      'tBars',
      'dotMatrix',
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

  it('formats stored shortcuts for display', () => {
    expect(formatKeyboardShortcut('Ctrl+Alt+V')).toBe('Ctrl + Alt + V')
    expect(formatKeyboardShortcut('Meta+Shift+Digit1')).toBe('Meta + Shift + 1')
  })

  it('records keyboard events as normalized shortcuts', () => {
    const event = {
      ctrlKey: true,
      altKey: true,
      shiftKey: false,
      metaKey: false,
      code: 'KeyB',
      preventDefault() {},
      stopPropagation() {},
    } as unknown as React.KeyboardEvent

    expect(shortcutFromKeyboardEvent(event)).toEqual({
      shortcut: 'Ctrl+Alt+B',
    })
  })

  it('rejects shortcut recordings without a modifier and primary key', () => {
    const withoutModifier = {
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      code: 'KeyB',
      preventDefault() {},
      stopPropagation() {},
    } as unknown as React.KeyboardEvent

    const onlyModifier = {
      ctrlKey: true,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      code: 'ControlLeft',
      preventDefault() {},
      stopPropagation() {},
    } as unknown as React.KeyboardEvent

    expect(shortcutFromKeyboardEvent(withoutModifier)).toEqual({
      error: 'missingModifier',
    })
    expect(shortcutFromKeyboardEvent(onlyModifier)).toEqual({
      error: 'missingKey',
    })
  })
})
