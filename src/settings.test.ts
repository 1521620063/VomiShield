import { describe, expect, it } from 'vitest'
import {
  ANCHOR_STYLE_CONFIGS,
  DEFAULT_SETTINGS,
  activePartConfig,
  formatKeyboardShortcut,
  normalizeOverlaySettings,
  overlayRenderAttributes,
  overlayCssVars,
  patchActivePartSettings,
  patchActiveStyleSettings,
  previewOverlayCssVars,
  patchSettings,
  shortcutFromKeyboardEvent,
  type AnchorPart,
  type AnchorStyle,
  type OverlaySettings,
} from './settings'

type LegacyVisualKeys =
  | 'opacity'
  | 'size'
  | 'thickness'
  | 'color'
  | 'glow'
  | 'backdrop'
type AssertNever<T extends never> = T
type OverlaySettingsLegacyKeys = Extract<keyof OverlaySettings, LegacyVisualKeys>
type _OverlaySettingsHasNoLegacyKeys = AssertNever<OverlaySettingsLegacyKeys>
const overlaySettingsHasNoLegacyKeys: _OverlaySettingsHasNoLegacyKeys =
  undefined as never
void overlaySettingsHasNoLegacyKeys

describe('settings helpers', () => {
  it('creates nested defaults aligned with anchor style configs', () => {
    const styles = Object.keys(ANCHOR_STYLE_CONFIGS) as AnchorStyle[]

    expect(DEFAULT_SETTINGS).toMatchObject({
      enabled: true,
      style: 'crosshair',
      offsetY: 0,
      language: 'zh',
      shortcut: 'Ctrl+Alt+V',
    })
    expect(DEFAULT_SETTINGS).not.toHaveProperty('opacity')
    expect(DEFAULT_SETTINGS).not.toHaveProperty('size')
    expect(DEFAULT_SETTINGS).not.toHaveProperty('thickness')
    expect(DEFAULT_SETTINGS).not.toHaveProperty('color')
    expect(DEFAULT_SETTINGS).not.toHaveProperty('glow')
    expect(DEFAULT_SETTINGS).not.toHaveProperty('backdrop')

    expect(Object.keys(DEFAULT_SETTINGS.styleSettings).sort()).toEqual(
      styles.sort(),
    )

    for (const style of styles) {
      const config = ANCHOR_STYLE_CONFIGS[style]
      const styleSettings = DEFAULT_SETTINGS.styleSettings[style]

      expect(styleSettings.backdrop).toBe(config.defaultBackdrop)
      expect(styleSettings.activePart).toBe(config.defaultPart)
      expect(Object.keys(styleSettings.parts).sort()).toEqual(
        Object.keys(config.parts).sort(),
      )

      for (const part of Object.keys(config.parts) as Array<
        keyof typeof config.parts
      >) {
        const partConfig = config.parts[part]

        expect(partConfig).toBeDefined()
        expect(styleSettings.parts[part]).toEqual(partConfig!.defaults)
      }
    }
  })

  it('merges partial setting updates and normalizes the result', () => {
    const current: OverlaySettings = {
      ...DEFAULT_SETTINGS,
      enabled: false,
    }

    expect(patchSettings(current, { style: 'boxCircle' })).toMatchObject({
      ...current,
      style: 'boxCircle',
      styleSettings: expect.any(Object),
    })
  })

  it('patchActivePartSettings updates only the active part', () => {
    const current = normalizeOverlaySettings({
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

    const next = patchActivePartSettings(current, {
      opacity: 0.33,
      color: '#ffffff',
    })

    expect(next.styleSettings.boxCircle.parts.outer).toMatchObject({
      ...current.styleSettings.boxCircle.parts.outer,
      opacity: 0.33,
      color: '#ffffff',
    })
    expect(next.styleSettings.boxCircle.parts.center).toEqual(
      current.styleSettings.boxCircle.parts.center,
    )
  })

  it('patchActiveStyleSettings updates backdrop without changing part visuals', () => {
    const current = normalizeOverlaySettings({
      ...DEFAULT_SETTINGS,
      style: 'boxCircle',
    })

    const next = patchActiveStyleSettings(current, { backdrop: 0.24 })

    expect(next.styleSettings.boxCircle.backdrop).toBe(0.24)
    expect(next.styleSettings.boxCircle.parts).toEqual(
      current.styleSettings.boxCircle.parts,
    )
  })

  it('creates active alias CSS variables and center/outer part variables', () => {
    expect(
      overlayCssVars({
        ...DEFAULT_SETTINGS,
        style: 'boxCircle',
        styleSettings: {
          ...DEFAULT_SETTINGS.styleSettings,
          boxCircle: {
            backdrop: 0.18,
            activePart: 'outer',
            parts: {
              center: {
                opacity: 0.4,
                size: 96,
                thickness: 3,
                color: '#00ff00',
                glow: 0.2,
                inset: 28,
              },
              outer: {
                opacity: 0.5,
                size: 160,
                thickness: 4,
                color: '#ffffff',
                glow: 0.8,
                inset: 36,
              },
            },
          },
        },
        offsetY: -24,
      }),
    ).toMatchObject({
      '--overlay-opacity': '0.5',
      '--anchor-size': '160px',
      '--anchor-thickness': '4px',
      '--anchor-color': '#ffffff',
      '--anchor-glow': '0.8',
      '--backdrop-opacity': '0.18',
      '--anchor-offset-y': '-24px',
      '--anchor-center-opacity': '0.4',
      '--anchor-center-size': '96px',
      '--anchor-center-thickness': '3px',
      '--anchor-center-color': '#00ff00',
      '--anchor-center-glow': '0.2',
      '--anchor-outer-opacity': '0.5',
      '--anchor-outer-size': '160px',
      '--anchor-outer-thickness': '4px',
      '--anchor-outer-color': '#ffffff',
      '--anchor-outer-glow': '0.8',
    })
  })

  it('normalizes legacy top-level visual settings into every part of the current style', () => {
    const settings = normalizeOverlaySettings({
      ...DEFAULT_SETTINGS,
      style: 'boxCircle',
      opacity: 0.31,
      size: 144,
      thickness: 5,
      color: '#ffcc66',
      glow: 0.75,
      backdrop: 0.22,
    })

    expect(settings.styleSettings.boxCircle.backdrop).toBe(0.22)
    expect(settings.styleSettings.boxCircle.parts.center).toEqual({
      opacity: 0.31,
      size: 144,
      thickness: 5,
      color: '#ffcc66',
      glow: 0.75,
      inset: 28,
    })
    expect(settings.styleSettings.boxCircle.parts.outer).toEqual({
      opacity: 0.31,
      size: 144,
      thickness: 5,
      color: '#ffcc66',
      glow: 0.75,
      inset: 28,
    })
    expect(settings.styleSettings.crosshair.parts.main).toEqual(
      DEFAULT_SETTINGS.styleSettings.crosshair.parts.main,
    )
  })

  it.each(['unknownStyle', 'toString'] as const)(
    'falls back to the default style before migrating legacy visuals for %s',
    (style) => {
      const normalize = () =>
        normalizeOverlaySettings({
          ...DEFAULT_SETTINGS,
          style: style as unknown as AnchorStyle,
          opacity: 0.31,
          size: 144,
          thickness: 5,
          color: '#ffcc66',
          glow: 0.75,
          backdrop: 0.22,
        })

      expect(normalize).not.toThrow()

      const settings = normalize()

      expect(settings.style).toBe('crosshair')
      expect(settings.styleSettings.crosshair.backdrop).toBe(0.22)
      expect(settings.styleSettings.crosshair.parts.main).toEqual({
        opacity: 0.31,
        size: 144,
        thickness: 5,
        color: '#ffcc66',
        glow: 0.75,
        inset: 28,
      })
    },
  )

  it('falls back to the style default part for inherited active part keys', () => {
    const settings = normalizeOverlaySettings({
      ...DEFAULT_SETTINGS,
      style: 'boxCircle',
      styleSettings: {
        ...DEFAULT_SETTINGS.styleSettings,
        boxCircle: {
          ...DEFAULT_SETTINGS.styleSettings.boxCircle,
          activePart: 'toString' as unknown as AnchorPart,
        },
      },
    })

    expect(settings.styleSettings.boxCircle.activePart).toBe('center')
    expect(() => overlayCssVars(settings)).not.toThrow()
    expect(overlayCssVars(settings)).toMatchObject({
      '--anchor-size': '96px',
      '--overlay-opacity': '0.72',
    })
  })

  it('returns active part config metadata', () => {
    const settings = normalizeOverlaySettings({
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

    expect(activePartConfig(settings)).toMatchObject({
      labelKey: 'settings.parts.outer',
      size: { min: 48, max: 640, step: 4 },
    })
  })

  it('keeps corner bracket inset independent from size', () => {
    const settings = normalizeOverlaySettings({
      ...DEFAULT_SETTINGS,
      style: 'cornerBrackets',
      styleSettings: {
        ...DEFAULT_SETTINGS.styleSettings,
        cornerBrackets: {
          ...DEFAULT_SETTINGS.styleSettings.cornerBrackets,
          parts: {
            main: {
              opacity: 0.72,
              size: 240,
              thickness: 2,
              color: '#6ff0c2',
              glow: 0.42,
              inset: 36,
            },
          },
        },
      },
    })

    expect(activePartConfig(settings)).toMatchObject({
      supportsInset: true,
      size: { min: 48, max: 640, step: 4 },
      inset: { min: 0, max: 320, step: 2 },
    })
    expect(overlayCssVars(settings)).toMatchObject({
      '--anchor-size': '240px',
      '--anchor-inset': '36px',
      '--edge-anchor-inset': '36px',
    })
  })

  it('scales oversized anchors only for the settings preview', () => {
    const settings = normalizeOverlaySettings({
      ...DEFAULT_SETTINGS,
      style: 'cornerBrackets',
      styleSettings: {
        ...DEFAULT_SETTINGS.styleSettings,
        cornerBrackets: {
          ...DEFAULT_SETTINGS.styleSettings.cornerBrackets,
          parts: {
            main: {
              opacity: 0.72,
              size: 640,
              thickness: 2,
              color: '#6ff0c2',
              glow: 0.42,
              inset: 320,
            },
          },
        },
      },
    })

    expect(overlayCssVars(settings)).not.toHaveProperty('--preview-scale')
    expect(previewOverlayCssVars(settings)).toMatchObject({
      '--anchor-size': '640px',
      '--preview-scale': '0.5625',
    })
  })

  it.each([
    ['horizontal', 'main'],
    ['vertical', 'main'],
    ['fullGuide', 'guide'],
  ] as const)(
    'marks %s %s as not size editable',
    (style, activePart) => {
      const settings = normalizeOverlaySettings({
        ...DEFAULT_SETTINGS,
        style,
        styleSettings: {
          ...DEFAULT_SETTINGS.styleSettings,
          [style]: {
            ...DEFAULT_SETTINGS.styleSettings[style],
            activePart,
          },
        },
      })

      expect(activePartConfig(settings)).toMatchObject({
        supportsSize: false,
      })
    },
  )

  it('keeps the full guide center mark size editable', () => {
    const settings = normalizeOverlaySettings({
      ...DEFAULT_SETTINGS,
      style: 'fullGuide',
      styleSettings: {
        ...DEFAULT_SETTINGS.styleSettings,
        fullGuide: {
          ...DEFAULT_SETTINGS.styleSettings.fullGuide,
          activePart: 'center',
        },
      },
    })

    expect(activePartConfig(settings)).toMatchObject({
      supportsSize: true,
    })
  })

  it.each([
    ['boxCircle', 'outer'],
    ['edgeBars', 'outer'],
  ] as const)(
    'marks %s %s as not thickness editable',
    (style, activePart) => {
      const settings = normalizeOverlaySettings({
        ...DEFAULT_SETTINGS,
        style,
        styleSettings: {
          ...DEFAULT_SETTINGS.styleSettings,
          [style]: {
            ...DEFAULT_SETTINGS.styleSettings[style],
            activePart,
          },
        },
      })

      expect(activePartConfig(settings)).toMatchObject({
        supportsThickness: false,
      })
    },
  )

  it('keeps t bars outer thickness editable', () => {
    const settings = normalizeOverlaySettings({
      ...DEFAULT_SETTINGS,
      style: 'tBars',
      styleSettings: {
        ...DEFAULT_SETTINGS.styleSettings,
        tBars: {
          ...DEFAULT_SETTINGS.styleSettings.tBars,
          activePart: 'outer',
        },
      },
    })

    expect(activePartConfig(settings)).toMatchObject({
      supportsThickness: true,
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
