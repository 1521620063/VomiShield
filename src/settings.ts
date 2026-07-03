import type { CSSProperties } from 'react'
import { DEFAULT_LANGUAGE, type Language } from './i18n'

export type AnchorStyle =
  | 'crosshair'
  | 'ring'
  | 'fullGuide'
  | 'horizontal'
  | 'vertical'
  | 'cornerBrackets'
  | 'boxCircle'
  | 'edgeBars'
  | 'tBars'
  | 'dotMatrix'

export type AnchorPart = 'main' | 'center' | 'outer' | 'guide' | 'edge'

export type AnchorPartSettings = {
  opacity: number
  size: number
  thickness: number
  color: string
  glow: number
}

export type AnchorStyleSettings = {
  backdrop: number
  activePart: AnchorPart
  parts: Partial<Record<AnchorPart, AnchorPartSettings>>
}

export type AnchorPartConfig = {
  labelKey: string
  defaults: AnchorPartSettings
  size: {
    min: number
    max: number
    step: number
  }
}

export type AnchorStyleConfig = {
  defaultBackdrop: number
  defaultPart: AnchorPart
  parts: Partial<Record<AnchorPart, AnchorPartConfig>>
}

export const DEFAULT_SHORTCUT = 'Ctrl+Alt+V'

const DEFAULT_PART_VISUALS = {
  opacity: 0.72,
  thickness: 2,
  color: '#6ff0c2',
  glow: 0.42,
}

const DEFAULT_BACKDROP = 0
const DEFAULT_SIZE_CONFIG = { min: 32, max: 320, step: 2 }

function partConfig(
  part: AnchorPart,
  overrides: Partial<AnchorPartSettings> = {},
  size = DEFAULT_SIZE_CONFIG,
): AnchorPartConfig {
  return {
    labelKey: `settings.parts.${part}`,
    defaults: {
      ...DEFAULT_PART_VISUALS,
      size: 120,
      ...overrides,
    },
    size,
  }
}

export const ANCHOR_STYLE_CONFIGS: Record<AnchorStyle, AnchorStyleConfig> = {
  crosshair: {
    defaultBackdrop: DEFAULT_BACKDROP,
    defaultPart: 'main',
    parts: {
      main: partConfig('main', { size: 120 }),
    },
  },
  ring: {
    defaultBackdrop: DEFAULT_BACKDROP,
    defaultPart: 'main',
    parts: {
      main: partConfig('main', { size: 104 }, { min: 40, max: 280, step: 2 }),
    },
  },
  fullGuide: {
    defaultBackdrop: DEFAULT_BACKDROP,
    defaultPart: 'guide',
    parts: {
      guide: partConfig(
        'guide',
        { opacity: 0.5, size: 160 },
        { min: 80, max: 640, step: 8 },
      ),
      center: partConfig(
        'center',
        { size: 72 },
        { min: 32, max: 220, step: 2 },
      ),
    },
  },
  horizontal: {
    defaultBackdrop: DEFAULT_BACKDROP,
    defaultPart: 'main',
    parts: {
      main: partConfig(
        'main',
        { opacity: 0.62, size: 160 },
        { min: 80, max: 640, step: 8 },
      ),
    },
  },
  vertical: {
    defaultBackdrop: DEFAULT_BACKDROP,
    defaultPart: 'main',
    parts: {
      main: partConfig(
        'main',
        { opacity: 0.62, size: 160 },
        { min: 80, max: 640, step: 8 },
      ),
    },
  },
  cornerBrackets: {
    defaultBackdrop: DEFAULT_BACKDROP,
    defaultPart: 'main',
    parts: {
      main: partConfig('main', { size: 136 }, { min: 48, max: 360, step: 4 }),
    },
  },
  boxCircle: {
    defaultBackdrop: DEFAULT_BACKDROP,
    defaultPart: 'center',
    parts: {
      center: partConfig(
        'center',
        { size: 96 },
        { min: 40, max: 260, step: 2 },
      ),
      outer: partConfig(
        'outer',
        { size: 148 },
        { min: 48, max: 360, step: 4 },
      ),
    },
  },
  edgeBars: {
    defaultBackdrop: DEFAULT_BACKDROP,
    defaultPart: 'center',
    parts: {
      center: partConfig(
        'center',
        { size: 88 },
        { min: 40, max: 260, step: 2 },
      ),
      outer: partConfig(
        'outer',
        { size: 180 },
        { min: 64, max: 420, step: 4 },
      ),
    },
  },
  tBars: {
    defaultBackdrop: DEFAULT_BACKDROP,
    defaultPart: 'center',
    parts: {
      center: partConfig(
        'center',
        { size: 84 },
        { min: 40, max: 260, step: 2 },
      ),
      outer: partConfig(
        'outer',
        { size: 132 },
        { min: 48, max: 360, step: 4 },
      ),
    },
  },
  dotMatrix: {
    defaultBackdrop: DEFAULT_BACKDROP,
    defaultPart: 'center',
    parts: {
      center: partConfig(
        'center',
        { size: 88 },
        { min: 40, max: 260, step: 2 },
      ),
      outer: partConfig(
        'outer',
        { size: 148 },
        { min: 48, max: 360, step: 4 },
      ),
    },
  },
}

type LegacyVisualSettings = {
  opacity: number
  size: number
  thickness: number
  color: string
  glow: number
  backdrop: number
}

export type OverlaySettings = {
  enabled: boolean
  style: AnchorStyle
  styleSettings: Record<AnchorStyle, AnchorStyleSettings>
  offsetY: number
  language: Language
  shortcut: string
}

export type OverlaySettingsInput = Partial<OverlaySettings> &
  Partial<LegacyVisualSettings>

type OverlaySettingsPatch = Partial<OverlaySettings> &
  Partial<LegacyVisualSettings>

function defaultStyleSettings(): Record<AnchorStyle, AnchorStyleSettings> {
  return Object.fromEntries(
    Object.entries(ANCHOR_STYLE_CONFIGS).map(([style, config]) => [
      style,
      {
        backdrop: config.defaultBackdrop,
        activePart: config.defaultPart,
        parts: Object.fromEntries(
          Object.entries(config.parts).map(([part, partConfig]) => [
            part,
            { ...partConfig.defaults },
          ]),
        ),
      },
    ]),
  ) as Record<AnchorStyle, AnchorStyleSettings>
}

export const DEFAULT_SETTINGS: OverlaySettings = {
  enabled: true,
  style: 'crosshair',
  styleSettings: defaultStyleSettings(),
  offsetY: 0,
  language: DEFAULT_LANGUAGE,
  shortcut: DEFAULT_SHORTCUT,
}

export function normalizeOverlaySettings(
  input: OverlaySettingsInput,
): OverlaySettings {
  const style = isAnchorStyle(input.style) ? input.style : DEFAULT_SETTINGS.style
  const styleSettings = defaultStyleSettings()

  for (const styleName of Object.keys(ANCHOR_STYLE_CONFIGS) as AnchorStyle[]) {
    const config = ANCHOR_STYLE_CONFIGS[styleName]
    const incoming = input.styleSettings?.[styleName]

    styleSettings[styleName] = {
      backdrop: incoming?.backdrop ?? config.defaultBackdrop,
      activePart: isAnchorPartForConfig(incoming?.activePart, config)
        ? incoming.activePart
        : config.defaultPart,
      parts: Object.fromEntries(
        Object.entries(config.parts).map(([part, partConfig]) => [
          part,
          {
            ...partConfig.defaults,
            ...incoming?.parts?.[part as AnchorPart],
          },
        ]),
      ),
    }
  }

  const legacyPartPatch = legacyPartSettings(input)
  const legacyBackdrop = input.backdrop
  if (legacyPartPatch || legacyBackdrop !== undefined) {
    const currentStyle = styleSettings[style]

    if (legacyBackdrop !== undefined) {
      currentStyle.backdrop = legacyBackdrop
    }

    if (legacyPartPatch) {
      for (const part of Object.keys(currentStyle.parts) as AnchorPart[]) {
        currentStyle.parts[part] = {
          ...currentStyle.parts[part],
          ...legacyPartPatch,
        } as AnchorPartSettings
      }
    }
  }

  return {
    enabled: input.enabled ?? DEFAULT_SETTINGS.enabled,
    style,
    styleSettings,
    offsetY: input.offsetY ?? DEFAULT_SETTINGS.offsetY,
    language: input.language ?? DEFAULT_SETTINGS.language,
    shortcut: input.shortcut ?? DEFAULT_SETTINGS.shortcut,
  }
}

function isAnchorStyle(style: unknown): style is AnchorStyle {
  return (
    typeof style === 'string' && Object.hasOwn(ANCHOR_STYLE_CONFIGS, style)
  )
}

function isAnchorPartForConfig(
  part: unknown,
  config: AnchorStyleConfig,
): part is AnchorPart {
  return typeof part === 'string' && Object.hasOwn(config.parts, part)
}

export function patchSettings(
  current: OverlaySettings,
  patch: OverlaySettingsPatch,
): OverlaySettings {
  return normalizeOverlaySettings({
    ...current,
    ...patch,
  })
}

export function activeAnchorStyleSettings(
  settings: OverlaySettingsInput,
): AnchorStyleSettings {
  const normalized = normalizeOverlaySettings(settings)

  return normalized.styleSettings[normalized.style]
}

export function activeAnchorPart(settings: OverlaySettingsInput): AnchorPart {
  return activeAnchorStyleSettings(settings).activePart
}

export function activeAnchorPartSettings(
  settings: OverlaySettingsInput,
): AnchorPartSettings {
  const styleSettings = activeAnchorStyleSettings(settings)

  return styleSettings.parts[styleSettings.activePart] as AnchorPartSettings
}

export function activePartConfig(
  settings: OverlaySettingsInput,
): AnchorPartConfig {
  const normalized = normalizeOverlaySettings(settings)
  const styleConfig = ANCHOR_STYLE_CONFIGS[normalized.style]
  const part = normalized.styleSettings[normalized.style].activePart

  return styleConfig.parts[part] as AnchorPartConfig
}

export function patchActiveStyleSettings(
  settings: OverlaySettings,
  patch: Partial<Pick<AnchorStyleSettings, 'backdrop' | 'activePart'>>,
): OverlaySettings {
  const normalized = normalizeOverlaySettings(settings)
  const styleSettings = normalized.styleSettings[normalized.style]

  return normalizeOverlaySettings({
    ...normalized,
    styleSettings: {
      ...normalized.styleSettings,
      [normalized.style]: {
        ...styleSettings,
        ...patch,
      },
    },
  })
}

export function patchActivePartSettings(
  settings: OverlaySettings,
  patch: Partial<AnchorPartSettings>,
): OverlaySettings {
  const normalized = normalizeOverlaySettings(settings)
  const styleSettings = normalized.styleSettings[normalized.style]
  const part = styleSettings.activePart

  return normalizeOverlaySettings({
    ...normalized,
    styleSettings: {
      ...normalized.styleSettings,
      [normalized.style]: {
        ...styleSettings,
        parts: {
          ...styleSettings.parts,
          [part]: {
            ...styleSettings.parts[part],
            ...patch,
          },
        },
      },
    },
  })
}

export function overlayCssVars(
  settings: OverlaySettingsInput,
): CSSProperties & Record<string, string> {
  const normalized = normalizeOverlaySettings(settings)
  const styleSettings = activeAnchorStyleSettings(normalized)
  const partSettings = activeAnchorPartSettings(normalized)
  const vars: CSSProperties & Record<string, string> = {
    '--overlay-opacity': String(partSettings.opacity),
    '--anchor-size': `${partSettings.size}px`,
    '--anchor-thickness': `${partSettings.thickness}px`,
    '--anchor-color': partSettings.color,
    '--anchor-glow': String(partSettings.glow),
    '--backdrop-opacity': String(styleSettings.backdrop),
    '--anchor-offset-y': `${normalized.offsetY}px`,
  }

  for (const [part, settings] of Object.entries(styleSettings.parts)) {
    if (!settings) {
      continue
    }

    vars[`--anchor-${part}-opacity`] = String(settings.opacity)
    vars[`--anchor-${part}-size`] = `${settings.size}px`
    vars[`--anchor-${part}-thickness`] = `${settings.thickness}px`
    vars[`--anchor-${part}-color`] = settings.color
    vars[`--anchor-${part}-glow`] = String(settings.glow)
  }

  return vars
}

function legacyPartSettings(
  input: Partial<LegacyVisualSettings>,
): Partial<AnchorPartSettings> | undefined {
  const patch: Partial<AnchorPartSettings> = {}

  if (input.opacity !== undefined) {
    patch.opacity = input.opacity
  }
  if (input.size !== undefined) {
    patch.size = input.size
  }
  if (input.thickness !== undefined) {
    patch.thickness = input.thickness
  }
  if (input.color !== undefined) {
    patch.color = input.color
  }
  if (input.glow !== undefined) {
    patch.glow = input.glow
  }

  return Object.keys(patch).length > 0 ? patch : undefined
}

export function overlayRenderAttributes(
  settings: OverlaySettingsInput,
): { 'data-anchor-style': AnchorStyle } {
  const normalized = normalizeOverlaySettings(settings)

  return {
    'data-anchor-style': normalized.style,
  }
}

export type ShortcutRecordingResult =
  | { shortcut: string }
  | { error: 'missingModifier' | 'missingKey' | 'unsupportedKey' }

export type KeyboardShortcutEvent = Pick<
  globalThis.KeyboardEvent,
  'altKey' | 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey'
>

const MODIFIER_CODES = new Set([
  'AltLeft',
  'AltRight',
  'ControlLeft',
  'ControlRight',
  'MetaLeft',
  'MetaRight',
  'ShiftLeft',
  'ShiftRight',
])

const KEY_LABELS: Record<string, string> = {
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  ArrowUp: 'Up',
  Backspace: 'Backspace',
  Delete: 'Delete',
  End: 'End',
  Enter: 'Enter',
  Escape: 'Esc',
  Home: 'Home',
  Insert: 'Insert',
  Minus: '-',
  Equal: '=',
  PageDown: 'Page Down',
  PageUp: 'Page Up',
  Period: '.',
  Semicolon: ';',
  Slash: '/',
  Space: 'Space',
  Tab: 'Tab',
}

const STORAGE_KEYS = new Set([
  'Backspace',
  'Delete',
  'End',
  'Enter',
  'Escape',
  'Home',
  'Insert',
  'Minus',
  'Equal',
  'PageDown',
  'PageUp',
  'Period',
  'Semicolon',
  'Slash',
  'Space',
  'Tab',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
])

export function shortcutFromKeyboardEvent(
  event: KeyboardShortcutEvent,
): ShortcutRecordingResult {
  const modifiers = [
    event.ctrlKey ? 'Ctrl' : '',
    event.altKey ? 'Alt' : '',
    event.shiftKey ? 'Shift' : '',
    event.metaKey ? 'Cmd' : '',
  ].filter(Boolean)

  if (modifiers.length === 0) {
    return { error: 'missingModifier' }
  }

  if (MODIFIER_CODES.has(event.code)) {
    return { error: 'missingKey' }
  }

  const key = keyCodeToShortcutPart(event.code)

  if (key === undefined) {
    return { error: 'unsupportedKey' }
  }

  return {
    shortcut: [...modifiers, key].join('+'),
  }
}

export function formatKeyboardShortcut(shortcut: string) {
  return shortcut
    .split('+')
    .map((part) => formatShortcutPart(part.trim()))
    .join(' + ')
}

function keyCodeToShortcutPart(code: string) {
  const letterMatch = /^Key([A-Z])$/.exec(code)
  if (letterMatch) {
    return letterMatch[1]
  }

  const digitMatch = /^Digit([0-9])$/.exec(code)
  if (digitMatch) {
    return digitMatch[1]
  }

  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) {
    return code
  }

  if (STORAGE_KEYS.has(code)) {
    return code
  }

  return undefined
}

function formatShortcutPart(part: string) {
  if (/^Key[A-Z]$/.test(part)) {
    return part.slice(3)
  }

  if (/^Digit[0-9]$/.test(part)) {
    return part.slice(5)
  }

  return KEY_LABELS[part] ?? part
}
