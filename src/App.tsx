import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import './App.css'
import {
  ANCHOR_STYLE_CONFIGS,
  DEFAULT_SETTINGS,
  activeAnchorPartSettings,
  activeAnchorStyleSettings,
  activePartConfig,
  formatKeyboardShortcut,
  normalizeOverlaySettings,
  overlayRenderAttributes,
  overlayCssVars,
  patchActivePartSettings,
  patchActiveStyleSettings,
  previewOverlayCssVars,
  shortcutFromKeyboardEvent,
  type AnchorPart,
  type AnchorStyle,
  type KeyboardShortcutEvent,
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
import {
  checkForAppUpdate,
  installUpdateAndRelaunch,
  type AvailableUpdateInfo,
  type PendingUpdate,
} from './autoUpdate'

const ANCHOR_STYLE_VALUES: AnchorStyle[] = [
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
]

type SimpleStatusKind =
  | 'ready'
  | 'overlayEnabled'
  | 'overlayDisabled'
  | SettingsCommitStatus

type UiStatus =
  | { kind: SimpleStatusKind }
  | { kind: 'saveFailed' | 'syncFailed'; detail: string }

type AutoUpdateStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'available'; update: AvailableUpdateInfo }
  | { kind: 'notAvailable' }
  | {
      kind: 'downloading'
      update: AvailableUpdateInfo
      downloadedBytes: number
      contentLength?: number
    }
  | { kind: 'installing'; update: AvailableUpdateInfo }
  | { kind: 'relaunching'; update: AvailableUpdateInfo }
  | { kind: 'failed'; detail: string }

function App() {
  const isOverlay = window.location.hash === '#/overlay'
  const [settings, setSettings] = useState<OverlaySettings>(DEFAULT_SETTINGS)
  const [status, setStatus] = useState<UiStatus>({ kind: 'ready' })
  const [autoUpdateStatus, setAutoUpdateStatus] = useState<AutoUpdateStatus>({
    kind: 'idle',
  })
  const [pendingUpdate, setPendingUpdate] = useState<PendingUpdate>()
  const autoUpdateBusyRef = useRef(false)
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false)
  const [shortcutError, setShortcutError] = useState<
    keyof ReturnType<typeof getUiText>['shortcutErrors'] | undefined
  >()
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
  const normalizedSettings = useMemo(
    () => normalizeOverlaySettings(settings),
    [settings],
  )
  const text = getUiText(normalizedSettings.language)
  const activeStyle = useMemo(
    () => activeAnchorStyleSettings(normalizedSettings),
    [normalizedSettings],
  )
  const activePart = useMemo(
    () => activeAnchorPartSettings(normalizedSettings),
    [normalizedSettings],
  )
  const selectedPartConfig = useMemo(
    () => activePartConfig(normalizedSettings),
    [normalizedSettings],
  )
  const currentStyleConfig = ANCHOR_STYLE_CONFIGS[normalizedSettings.style]
  const partOptions = Object.keys(currentStyleConfig.parts) as AnchorPart[]

  const checkForUpdates = useCallback(
    async (source: 'automatic' | 'manual' = 'manual') => {
      if (autoUpdateBusyRef.current) {
        return
      }

      autoUpdateBusyRef.current = true
      setPendingUpdate(undefined)
      setAutoUpdateStatus({ kind: 'checking' })

      try {
        const update = await checkForAppUpdate()

        if (update) {
          setPendingUpdate(update)
          setAutoUpdateStatus({ kind: 'available', update: update.info })
        } else {
          setAutoUpdateStatus(
            source === 'automatic' ? { kind: 'idle' } : { kind: 'notAvailable' },
          )
        }
      } catch (error) {
        setAutoUpdateStatus({ kind: 'failed', detail: formatError(error) })
      } finally {
        autoUpdateBusyRef.current = false
      }
    },
    [],
  )

  const installPendingUpdate = useCallback(async () => {
    if (!pendingUpdate || autoUpdateBusyRef.current) {
      return
    }

    autoUpdateBusyRef.current = true
    const updateInfo = pendingUpdate.info

    try {
      setAutoUpdateStatus({
        kind: 'downloading',
        update: updateInfo,
        downloadedBytes: 0,
      })

      await installUpdateAndRelaunch(pendingUpdate, (progress) => {
        switch (progress.kind) {
          case 'downloading':
            setAutoUpdateStatus({
              kind: 'downloading',
              update: updateInfo,
              downloadedBytes: progress.downloadedBytes,
              contentLength: progress.contentLength,
            })
            break
          case 'installing':
            setAutoUpdateStatus({ kind: 'installing', update: updateInfo })
            break
          case 'relaunching':
            setAutoUpdateStatus({ kind: 'relaunching', update: updateInfo })
            break
        }
      })
    } catch (error) {
      autoUpdateBusyRef.current = false
      setAutoUpdateStatus({ kind: 'failed', detail: formatError(error) })
    }
  }, [pendingUpdate])

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

  useEffect(() => {
    if (isOverlay) {
      return
    }

    void checkForUpdates('automatic')
  }, [checkForUpdates, isOverlay])

  const commitPatch = useCallback((patch: Partial<OverlaySettings>) => {
    settingsCommitter.commitPatch(patch)
  }, [settingsCommitter])

  const setLanguage = (language: Language) => {
    commitPatch({ language })
  }

  const recordShortcut = useCallback(
    (
      event: KeyboardShortcutEvent &
        Pick<globalThis.KeyboardEvent, 'key' | 'preventDefault' | 'stopPropagation'>,
    ) => {
      if (!isRecordingShortcut) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      if (event.key === 'Escape') {
        setIsRecordingShortcut(false)
        setShortcutError(undefined)
        return
      }

      const result = shortcutFromKeyboardEvent(event)

      if ('shortcut' in result) {
        setIsRecordingShortcut(false)
        setShortcutError(undefined)
        commitPatch({ shortcut: result.shortcut })
      } else {
        setShortcutError(result.error)
      }
    },
    [commitPatch, isRecordingShortcut],
  )

  useEffect(() => {
    if (!isRecordingShortcut) {
      return
    }

    window.addEventListener('keydown', recordShortcut, { capture: true })

    return () => {
      window.removeEventListener('keydown', recordShortcut, { capture: true })
    }
  }, [isRecordingShortcut, recordShortcut])

  const overlayVars = useMemo(
    () => overlayCssVars(normalizedSettings),
    [normalizedSettings],
  )
  const previewVars = useMemo(
    () => previewOverlayCssVars(normalizedSettings),
    [normalizedSettings],
  )

  if (isOverlay) {
    return <OverlaySurface settings={normalizedSettings} style={overlayVars} />
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
              <p className="compatibility-note">{text.compatibilityNote}</p>
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
                  className={
                    normalizedSettings.language === option.value ? 'is-active' : ''
                  }
                  aria-pressed={normalizedSettings.language === option.value}
                  onClick={() => setLanguage(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={normalizedSettings.enabled ? 'power is-on' : 'power'}
              onClick={async () => {
                const next = await toggleOverlay()
                settingsCommitter.replaceSettings(next)
                setStatus({
                  kind: next.enabled ? 'overlayEnabled' : 'overlayDisabled',
                })
              }}
            >
              {normalizedSettings.enabled ? text.powerOn : text.powerOff}
            </button>
          </div>
        </div>

        <div className="preview-frame">
          <OverlaySurface settings={normalizedSettings} style={previewVars} preview />
        </div>

        <div className="controls">
          <label className="field">
            <span>{text.fields.anchorStyle}</span>
            <select
              value={normalizedSettings.style}
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

          {partOptions.length > 1 ? (
            <div
              className="part-switch"
              role="group"
              aria-label={text.fields.anchorPart}
            >
              {partOptions.map((part) => (
                <button
                  key={part}
                  type="button"
                  className={activeStyle.activePart === part ? 'is-active' : ''}
                  aria-pressed={activeStyle.activePart === part}
                  onClick={() =>
                    commitPatch(
                      patchActiveStyleSettings(normalizedSettings, {
                        activePart: part,
                      }),
                    )
                  }
                >
                  {text.anchorParts[part]}
                </button>
              ))}
            </div>
          ) : null}

          <ShortcutField
            label={text.fields.shortcut}
            value={normalizedSettings.shortcut}
            recording={isRecordingShortcut}
            recordingLabel={text.shortcutRecording}
            hint={text.shortcutHint}
            error={shortcutError ? text.shortcutErrors[shortcutError] : undefined}
            onStartRecording={() => {
              setIsRecordingShortcut(true)
              setShortcutError(undefined)
            }}
          />

          <RangeField
            label={text.fields.opacity}
            min={0.05}
            max={1}
            step={0.01}
            value={activePart.opacity}
            suffix=""
            onChange={(opacity) =>
              commitPatch(patchActivePartSettings(normalizedSettings, { opacity }))
            }
          />

          <label className="field color-field">
            <span>{text.fields.color}</span>
            <input
              type="color"
              value={activePart.color}
              onChange={(event) =>
                commitPatch(
                  patchActivePartSettings(normalizedSettings, {
                    color: event.target.value,
                  }),
                )
              }
            />
          </label>

          {selectedPartConfig.supportsSize ? (
            <RangeField
              label={text.fields.size}
              min={selectedPartConfig.size.min}
              max={selectedPartConfig.size.max}
              step={selectedPartConfig.size.step}
              value={activePart.size}
              suffix="px"
              onChange={(size) =>
                commitPatch(patchActivePartSettings(normalizedSettings, { size }))
              }
            />
          ) : null}

          {selectedPartConfig.supportsThickness ? (
            <RangeField
              label={text.fields.thickness}
              min={1}
              max={16}
              step={1}
              value={activePart.thickness}
              suffix="px"
              onChange={(thickness) =>
                commitPatch(
                  patchActivePartSettings(normalizedSettings, { thickness }),
                )
              }
            />
          ) : null}

          {selectedPartConfig.supportsInset ? (
            <RangeField
              label={text.fields.inset}
              min={selectedPartConfig.inset.min}
              max={selectedPartConfig.inset.max}
              step={selectedPartConfig.inset.step}
              value={activePart.inset}
              suffix="px"
              onChange={(inset) =>
                commitPatch(patchActivePartSettings(normalizedSettings, { inset }))
              }
            />
          ) : null}

          <RangeField
            label={text.fields.glow}
            min={0}
            max={1}
            step={0.01}
            value={activePart.glow}
            suffix=""
            onChange={(glow) =>
              commitPatch(patchActivePartSettings(normalizedSettings, { glow }))
            }
          />

          <RangeField
            label={text.fields.backdrop}
            min={0}
            max={0.45}
            step={0.01}
            value={activeStyle.backdrop}
            suffix=""
            onChange={(backdrop) =>
              commitPatch(
                patchActiveStyleSettings(normalizedSettings, { backdrop }),
              )
            }
          />

          <RangeField
            label={text.fields.offsetY}
            min={-240}
            max={240}
            step={1}
            value={normalizedSettings.offsetY}
            suffix="px"
            onChange={(offsetY) => commitPatch({ offsetY })}
          />
        </div>

        <div className="update-row">
          <span>{formatAutoUpdateStatus(autoUpdateStatus, text)}</span>
          <div className="update-actions">
            <button
              type="button"
              onClick={() => void checkForUpdates('manual')}
              disabled={isAutoUpdateBusy(autoUpdateStatus)}
            >
              {text.updates.check}
            </button>
            {autoUpdateStatus.kind === 'available' ? (
              <button type="button" onClick={() => void installPendingUpdate()}>
                {text.updates.install}
              </button>
            ) : null}
          </div>
        </div>

        <footer className="footer-row">
          <span>{formatStatus(status, text)}</span>
          <span>
            {text.shortcut}
            {text.statusDetailSeparator}
            {formatKeyboardShortcut(normalizedSettings.shortcut)}
          </span>
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

type ShortcutFieldProps = {
  label: string
  value: string
  recording: boolean
  recordingLabel: string
  hint: string
  error?: string
  onStartRecording: () => void
}

function ShortcutField({
  label,
  value,
  recording,
  recordingLabel,
  hint,
  error,
  onStartRecording,
}: ShortcutFieldProps) {
  return (
    <label className="field shortcut-field">
      <span>{label}</span>
      <button
        type="button"
        className={recording ? 'shortcut-recorder is-recording' : 'shortcut-recorder'}
        aria-pressed={recording}
        onClick={onStartRecording}
      >
        {recording ? recordingLabel : formatKeyboardShortcut(value)}
      </button>
      <small className={error ? 'shortcut-message is-error' : 'shortcut-message'}>
        {error ?? hint}
      </small>
    </label>
  )
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
  style: CSSProperties
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
      <div className="anchor-box anchor-box-top" />
      <div className="anchor-box anchor-box-right" />
      <div className="anchor-box anchor-box-bottom" />
      <div className="anchor-box anchor-box-left" />
      <div className="anchor-t anchor-t-top" />
      <div className="anchor-t anchor-t-right" />
      <div className="anchor-t anchor-t-bottom" />
      <div className="anchor-t anchor-t-left" />
      <div className="anchor-dots anchor-dots-top" />
      <div className="anchor-dots anchor-dots-right" />
      <div className="anchor-dots anchor-dots-bottom" />
      <div className="anchor-dots anchor-dots-left" />
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

function isAutoUpdateBusy(status: AutoUpdateStatus) {
  return (
    status.kind === 'checking' ||
    status.kind === 'downloading' ||
    status.kind === 'installing' ||
    status.kind === 'relaunching'
  )
}

function formatAutoUpdateStatus(
  status: AutoUpdateStatus,
  text: ReturnType<typeof getUiText>,
) {
  switch (status.kind) {
    case 'idle':
      return text.updates.idle
    case 'checking':
      return text.updates.checking
    case 'available':
      return text.updates.available.replace('{version}', status.update.version)
    case 'notAvailable':
      return text.updates.notAvailable
    case 'downloading':
      return text.updates.downloading.replace(
        '{progress}',
        formatDownloadProgress(status.downloadedBytes, status.contentLength),
      )
    case 'installing':
      return text.updates.installing
    case 'relaunching':
      return text.updates.relaunching
    case 'failed':
      return `${text.updates.failed}${text.statusDetailSeparator}${status.detail}`
  }
}

function formatDownloadProgress(downloadedBytes: number, contentLength?: number) {
  if (contentLength && contentLength > 0) {
    return `${Math.min(100, Math.round((downloadedBytes / contentLength) * 100))}%`
  }

  return `${Math.round(downloadedBytes / 1024)} KB`
}

export default App
