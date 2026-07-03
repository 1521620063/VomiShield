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

export type OverlaySettings = {
  enabled: boolean
  style: AnchorStyle
  opacity: number
  size: number
  thickness: number
  color: string
  glow: number
  backdrop: number
  offsetY: number
  language: Language
  shortcut: string
}

export const DEFAULT_SHORTCUT = 'Ctrl+Alt+V'

export const DEFAULT_SETTINGS: OverlaySettings = {
  enabled: true,
  style: 'crosshair',
  opacity: 0.72,
  size: 120,
  thickness: 2,
  color: '#6ff0c2',
  glow: 0.42,
  backdrop: 0,
  offsetY: 0,
  language: DEFAULT_LANGUAGE,
  shortcut: DEFAULT_SHORTCUT,
}

export function patchSettings(
  current: OverlaySettings,
  patch: Partial<OverlaySettings>,
): OverlaySettings {
  return {
    ...current,
    ...patch,
  }
}

export function overlayCssVars(
  settings: OverlaySettings,
): CSSProperties & Record<string, string> {
  return {
    '--overlay-opacity': String(settings.opacity),
    '--anchor-size': `${settings.size}px`,
    '--anchor-thickness': `${settings.thickness}px`,
    '--anchor-color': settings.color,
    '--anchor-glow': String(settings.glow),
    '--backdrop-opacity': String(settings.backdrop),
    '--anchor-offset-y': `${settings.offsetY}px`,
  }
}

export function overlayRenderAttributes(
  settings: OverlaySettings,
): { 'data-anchor-style': AnchorStyle } {
  return {
    'data-anchor-style': settings.style,
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
