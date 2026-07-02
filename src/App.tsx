import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  DEFAULT_SETTINGS,
  overlayRenderAttributes,
  overlayCssVars,
  patchSettings,
  type AnchorStyle,
  type OverlaySettings,
} from './settings'
import {
  getSettings,
  onSettingsChanged,
  toggleOverlay,
  updateSettings,
} from './tauri'
import { startSettingsSync } from './settingsSync'
import { applyDocumentViewMode } from './viewMode'

const STYLE_LABELS: Array<{ value: AnchorStyle; label: string }> = [
  { value: 'crosshair', label: 'Crosshair' },
  { value: 'ring', label: 'Center ring' },
  { value: 'fullGuide', label: 'Full guide' },
]

function App() {
  const isOverlay = window.location.hash === '#/overlay'
  const [settings, setSettings] = useState<OverlaySettings>(DEFAULT_SETTINGS)
  const [status, setStatus] = useState('Ready')

  useEffect(() => {
    applyDocumentViewMode(document, isOverlay)

    return startSettingsSync({
      isOverlay,
      getSettings,
      onSettingsChanged,
      applySettings: setSettings,
      onError: (error) => {
        if (!isOverlay) {
          setStatus(`Sync failed: ${formatError(error)}`)
        }
      },
    })
  }, [isOverlay])

  const commitPatch = async (patch: Partial<OverlaySettings>) => {
    const previous = settings
    const next = patchSettings(settings, patch)
    setSettings(next)
    setStatus('Saving...')

    try {
      const saved = await updateSettings(next)
      setSettings(saved)
      setStatus('Saved')
    } catch (error) {
      setSettings(previous)
      setStatus(`Save failed: ${formatError(error)}`)
    }
  }

  const overlayVars = useMemo(() => overlayCssVars(settings), [settings])

  if (isOverlay) {
    return <OverlaySurface settings={settings} style={overlayVars} />
  }

  return (
    <main className="shell">
      <section className="panel control-panel">
        <div className="title-row">
          <div>
            <h1>VomiShield</h1>
            <p>Stable visual anchors for windowed and borderless 3D games.</p>
          </div>
          <button
            type="button"
            className={settings.enabled ? 'power is-on' : 'power'}
            onClick={async () => {
              const next = await toggleOverlay()
              setSettings(next)
              setStatus(next.enabled ? 'Overlay enabled' : 'Overlay disabled')
            }}
          >
            {settings.enabled ? 'On' : 'Off'}
          </button>
        </div>

        <div className="preview-frame">
          <OverlaySurface settings={settings} style={overlayVars} preview />
        </div>

        <div className="controls">
          <label className="field">
            <span>Anchor style</span>
            <select
              value={settings.style}
              onChange={(event) =>
                void commitPatch({ style: event.target.value as AnchorStyle })
              }
            >
              {STYLE_LABELS.map((style) => (
                <option key={style.value} value={style.value}>
                  {style.label}
                </option>
              ))}
            </select>
          </label>

          <RangeField
            label="Opacity"
            min={0.05}
            max={1}
            step={0.01}
            value={settings.opacity}
            suffix=""
            onChange={(opacity) => void commitPatch({ opacity })}
          />

          <RangeField
            label="Size"
            min={32}
            max={360}
            step={1}
            value={settings.size}
            suffix="px"
            onChange={(size) => void commitPatch({ size })}
          />

          <RangeField
            label="Thickness"
            min={1}
            max={8}
            step={1}
            value={settings.thickness}
            suffix="px"
            onChange={(thickness) => void commitPatch({ thickness })}
          />

          <label className="field color-field">
            <span>Color</span>
            <input
              type="color"
              value={settings.color}
              onChange={(event) => void commitPatch({ color: event.target.value })}
            />
          </label>
        </div>

        <footer className="footer-row">
          <span>{status}</span>
          <span>Shortcut: Ctrl + Alt + V</span>
        </footer>
      </section>
    </main>
  )
}

type RangeFieldProps = {
  label: string
  min: number
  max: number
  step: number
  value: number
  suffix: string
  onChange: (value: number) => void
}

function RangeField({
  label,
  min,
  max,
  step,
  value,
  suffix,
  onChange,
}: RangeFieldProps) {
  return (
    <label className="field range-field">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>
        {value}
        {suffix}
      </output>
    </label>
  )
}

type OverlaySurfaceProps = {
  settings: OverlaySettings
  style: React.CSSProperties
  preview?: boolean
}

function OverlaySurface({ settings, style, preview = false }: OverlaySurfaceProps) {
  const className = [
    'overlay-surface',
    preview ? 'is-preview' : '',
    settings.enabled ? 'is-enabled' : 'is-disabled',
  ]
    .filter(Boolean)
    .join(' ')
  const renderAttributes = overlayRenderAttributes(settings)

  return (
    <div
      className={className}
      style={style}
      aria-hidden={!preview}
      {...renderAttributes}
    >
      <div className="anchor anchor-horizontal" />
      <div className="anchor anchor-vertical" />
      <div className="anchor anchor-ring" />
    </div>
  )
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export default App
