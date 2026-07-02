import type { CSSProperties } from 'react'
import { DEFAULT_LANGUAGE, type Language } from './i18n'

export type AnchorStyle =
  | 'crosshair'
  | 'ring'
  | 'fullGuide'
  | 'horizontal'
  | 'vertical'
  | 'cornerBrackets'

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
}

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
