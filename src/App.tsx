import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  DEFAULT_SETTINGS,
  overlayRenderAttributes,
  overlayCssVars,
  type AnchorStyle,
  type OverlaySettings,
} from './settings'
import {
  getSettings,
  onSettingsChanged,
  onSettingsPreview,
  previewSettings,
  toggleOverlay,
  updateSettings,
} from './tauri'
import { startSettingsSync } from './settingsSync'
import { applyDocumentViewMode } from './viewMode'
import { createSettingsCommitter } from './settingsCommit'

const STYLE_LABELS: Array<{ value: AnchorStyle; label: string }> = [
  { value: 'crosshair', label: 'Crosshair' },
  { value: 'ring', label: 'Center ring' },
  { value: 'fullGuide', label: 'Full guide' },
  { value: 'horizontal', label: 'Horizontal line' },
  { value: 'vertical', label: 'Vertical line' },
  { value: 'cornerBrackets', label: 'Corner brackets' },
]

function App() {
  const isOverlay = window.location.hash === '#/overlay'
  const [settings, setSettings] = useState<OverlaySettings>(DEFAULT_SETTINGS)
  const [status, setStatus] = useState('Ready')
  const settingsCommitter = useMemo(
    () =>
      createSettingsCommitter({
        initialSettings: DEFAULT_SETTINGS,
        applySettings: setSettings,
        previewSettings,
        saveSettings: updateSettings,
        onStatus: setStatus,
        onError: (error) => {
          setStatus(`Save failed: ${formatError(error)}`)
        },
      }),
    [],
  )

  useEffect(() => {
    applyDocumentViewMode(document, isOverlay)

    return startSettingsSync({
      isOverlay,
      getSettings,
      onSettingsChanged,
      onSettingsPreview,
      applySettings: settingsCommitter.receiveExternal,
      onError: (error) => {
        if (!isOverlay) {
          setStatus(`Sync failed: ${formatError(error)}`)
        }
      },
    })
  }, [isOverlay, settingsCommitter])

  useEffect(() => () => settingsCommitter.dispose(), [settingsCommitter])

  const commitPatch = (patch: Partial<OverlaySettings>) => {
    settingsCommitter.commitPatch(patch)
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
              settingsCommitter.replaceSettings(next)
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
                commitPatch({ style: event.target.value as AnchorStyle })
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
            onChange={(opacity) => commitPatch({ opacity })}
          />

          <label className="field color-field">
            <span>Color</span>
            <input
              type="color"
              value={settings.color}
              onChange={(event) => commitPatch({ color: event.target.value })}
            />
          </label>

          <RangeField
            label="Size"
            min={32}
            max={360}
            step={1}
            value={settings.size}
            suffix="px"
            onChange={(size) => commitPatch({ size })}
          />

          <RangeField
            label="Thickness"
            min={1}
            max={8}
            step={1}
            value={settings.thickness}
            suffix="px"
            onChange={(thickness) => commitPatch({ thickness })}
          />

          <RangeField
            label="Glow"
            min={0}
            max={1}
            step={0.01}
            value={settings.glow}
            suffix=""
            onChange={(glow) => commitPatch({ glow })}
          />

          <RangeField
            label="Background dim"
            min={0}
            max={0.45}
            step={0.01}
            value={settings.backdrop}
            suffix=""
            onChange={(backdrop) => commitPatch({ backdrop })}
          />

          <RangeField
            label="Vertical offset"
            min={-240}
            max={240}
            step={1}
            value={settings.offsetY}
            suffix="px"
            onChange={(offsetY) => commitPatch({ offsetY })}
          />
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
      <div className="overlay-backdrop" />
      <div className="anchor anchor-horizontal" />
      <div className="anchor anchor-vertical" />
      <div className="anchor anchor-ring" />
      <div className="anchor-corner anchor-corner-top-left" />
      <div className="anchor-corner anchor-corner-top-right" />
      <div className="anchor-corner anchor-corner-bottom-left" />
      <div className="anchor-corner anchor-corner-bottom-right" />
    </div>
  )
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export default App
