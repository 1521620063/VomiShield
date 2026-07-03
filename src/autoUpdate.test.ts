import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  checkForAppUpdate,
  installUpdateAndRelaunch,
  type InstallProgress,
  type PendingUpdate,
} from './autoUpdate'

vi.mock('@tauri-apps/plugin-process', () => ({
  relaunch: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: vi.fn(),
}))

function setTauriRuntime(enabled: boolean) {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: enabled ? { __TAURI_INTERNALS__: {} } : {},
  })
}

describe('auto update', () => {
  afterEach(() => {
    vi.resetAllMocks()
    setTauriRuntime(false)
  })

  it('does not check for updates outside the Tauri runtime', async () => {
    setTauriRuntime(false)

    await expect(checkForAppUpdate()).resolves.toBeNull()

    expect(check).not.toHaveBeenCalled()
  })

  it('returns update metadata when Tauri reports an available update', async () => {
    vi.mocked(check).mockResolvedValue({
      currentVersion: '1.0.0',
      version: '1.1.0',
      date: '2026-07-03',
      body: 'Release notes',
    } as never)
    setTauriRuntime(true)

    await expect(checkForAppUpdate()).resolves.toMatchObject({
      info: {
        currentVersion: '1.0.0',
        version: '1.1.0',
        date: '2026-07-03',
        body: 'Release notes',
      },
    })
  })

  it('reports download progress and relaunches after installing', async () => {
    const progress: InstallProgress[] = []
    const downloadAndInstall = vi.fn(async (onEvent) => {
      onEvent({ event: 'Started', data: { contentLength: 100 } })
      onEvent({ event: 'Progress', data: { chunkLength: 35 } })
      onEvent({ event: 'Progress', data: { chunkLength: 65 } })
      onEvent({ event: 'Finished' })
    })
    const pending = {
      update: { downloadAndInstall },
      info: { currentVersion: '1.0.0', version: '1.1.0' },
    } as unknown as PendingUpdate

    await installUpdateAndRelaunch(pending, (event) => progress.push(event))

    expect(downloadAndInstall).toHaveBeenCalledOnce()
    expect(progress).toEqual([
      { kind: 'downloading', downloadedBytes: 0, contentLength: 100 },
      { kind: 'downloading', downloadedBytes: 35, contentLength: 100 },
      { kind: 'downloading', downloadedBytes: 100, contentLength: 100 },
      { kind: 'installing' },
      { kind: 'relaunching' },
    ])
    expect(relaunch).toHaveBeenCalledOnce()
  })
})
