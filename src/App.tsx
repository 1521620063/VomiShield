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
  LANGUAGE_OPTIONS,
  getUiText,
  type Language,
} from './i18n'
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
import {
  createSettingsCommitter,
  type SettingsCommitStatus,
} from './settingsCommit'

const ANCHOR_STYLE_VALUES: AnchorStyle[] = [
  'crosshair',
  'ring',
  'fullGuide',
  'horizontal',
  'vertical',
  'cornerBrackets',
]

type SimpleStatusKind =
  | 'ready'
  | 'overlayEnabled'
  | 'overlayDisabled'
  | SettingsCommitStatus

type UiStatus =
  | { kind: SimpleStatusKind }
  | { kind: 'saveFailed' | 'syncFailed'; detail: string }

function App() {
  const isOverlay = window.location.hash === '#/overlay'
  const [settings, setSettings] = useState<OverlaySettings>(DEFAULT_SETTINGS)
  const [status, setStatus] = useState<UiStatus>({ kind: 'ready' })
  const settingsCommitter = useMemo(
    () =>
      createSettingsCommitter({
        initialSettings: DEFAULT_SETTINGS,
        applySettings: setSettings,
        previewSettings,
        saveSettings: updateSettings,
        onStatus: (status) => setStatus({ kind: status }),
        onError: (error) => {
          setStatus({ kind: 'saveFailed', detail: formatError(error) })
        },
      }),
    [],
  )
  const text = getUiText(settings.language)

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
          setStatus({ kind: 'syncFailed', detail: formatError(error) })
        }
      },
    })
  }, [isOverlay, settingsCommitter])

  useEffect(() => () => settingsCommitter.dispose(), [settingsCommitter])

  useEffect(() => {
    document.documentElement.lang = settings.language === 'zh' ? 'zh-CN' : 'en'
  }, [settings.language])

  const commitPatch = (patch: Partial<OverlaySettings>) => {
    settingsCommitter.commitPatch(patch)
  }

  const setLanguage = (language: Language) => {
    commitPatch({ language })
  }

  const overlayVars = useMemo(() => overlayCssVars(settings), [settings])

  if (isOverlay) {
    return <OverlaySurface settings={settings} style={overlayVars} />
  }

  return (
    <main className="shell">
      <section className="panel control-panel">
        <div className="title-row">
          <div className="brand-lockup">
            <img className="brand-mark" src="/logo.svg" alt="" />
            <div>
              <h1>VomiShield</h1>
              <p>{text.tagline}</p>
            </div>
          </div>
          <div className="header-actions">
            <div
              className="language-switch"
              role="group"
              aria-label={text.languageSwitchLabel}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={settings.language === option.value ? 'is-active' : ''}
                  aria-pressed={settings.language === option.value}
                  onClick={() => setLanguage(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={settings.enabled ? 'power is-on' : 'power'}
              onClick={async () => {
                const next = await toggleOverlay()
                settingsCommitter.replaceSettings(next)
                setStatus({
                  kind: next.enabled ? 'overlayEnabled' : 'overlayDisabled',
                })
              }}
            >
              {settings.enabled ? text.powerOn : text.powerOff}
            </button>
          </div>
        </div>

        <div className="preview-frame">
          <OverlaySurface settings={settings} style={overlayVars} preview />
        </div>

        <div className="controls">
          <label className="field">
            <span>{text.fields.anchorStyle}</span>
            <select
              value={settings.style}
              onChange={(event) =>
                commitPatch({ style: event.target.value as AnchorStyle })
              }
            >
              {ANCHOR_STYLE_VALUES.map((style) => (
                <option key={style} value={style}>
                  {text.anchorStyles[style]}
                </option>
              ))}
            </select>
          </label>

          <RangeField
            label={text.fields.opacity}
            min={0.05}
            max={1}
            step={0.01}
            value={settings.opacity}
            suffix=""
            onChange={(opacity) => commitPatch({ opacity })}
          />

          <label className="field color-field">
            <span>{text.fields.color}</span>
            <input
              type="color"
              value={settings.color}
              onChange={(event) => commitPatch({ color: event.target.value })}
            />
          </label>

          <RangeField
            label={text.fields.size}
            min={32}
            max={360}
            step={1}
            value={settings.size}
            suffix="px"
            onChange={(size) => commitPatch({ size })}
          />

          <RangeField
            label={text.fields.thickness}
            min={1}
            max={8}
            step={1}
            value={settings.thickness}
            suffix="px"
            onChange={(thickness) => commitPatch({ thickness })}
          />

          <RangeField
            label={text.fields.glow}
            min={0}
            max={1}
            step={0.01}
            value={settings.glow}
            suffix=""
            onChange={(glow) => commitPatch({ glow })}
          />

          <RangeField
            label={text.fields.backdrop}
            min={0}
            max={0.45}
            step={0.01}
            value={settings.backdrop}
            suffix=""
            onChange={(backdrop) => commitPatch({ backdrop })}
          />

          <RangeField
            label={text.fields.offsetY}
            min={-240}
            max={240}
            step={1}
            value={settings.offsetY}
            suffix="px"
            onChange={(offsetY) => commitPatch({ offsetY })}
          />
        </div>

        <footer className="footer-row">
          <span>{formatStatus(status, text)}</span>
          <span>{text.shortcut}</span>
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

function formatStatus(status: UiStatus, text: ReturnType<typeof getUiText>) {
  const label = text.statuses[status.kind]

  if ('detail' in status) {
    return `${label}${text.statusDetailSeparator}${status.detail}`
  }

  return label
}

export default App
