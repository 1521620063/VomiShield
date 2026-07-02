import type { CSSProperties } from 'react'

export type AnchorStyle = 'crosshair' | 'ring' | 'fullGuide'

export type OverlaySettings = {
  enabled: boolean
  style: AnchorStyle
  opacity: number
  size: number
  thickness: number
  color: string
}

export const DEFAULT_SETTINGS: OverlaySettings = {
  enabled: true,
  style: 'crosshair',
  opacity: 0.72,
  size: 120,
  thickness: 2,
  color: '#6ff0c2',
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
  }
}

export function overlayRenderAttributes(
  settings: OverlaySettings,
): { 'data-anchor-style': AnchorStyle } {
  return {
    'data-anchor-style': settings.style,
  }
}
