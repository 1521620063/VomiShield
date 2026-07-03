import { relaunch } from '@tauri-apps/plugin-process'
import { check, type DownloadEvent, type Update } from '@tauri-apps/plugin-updater'
import { isTauriRuntime } from './tauri'

export type AvailableUpdateInfo = {
  currentVersion: string
  version: string
  date?: string
  body?: string
}

export type PendingUpdate = {
  update: Update
  info: AvailableUpdateInfo
}

export type InstallProgress =
  | {
      kind: 'downloading'
      downloadedBytes: number
      contentLength?: number
    }
  | { kind: 'installing' }
  | { kind: 'relaunching' }

export async function checkForAppUpdate(): Promise<PendingUpdate | null> {
  if (!isTauriRuntime()) {
    return null
  }

  const update = await check()

  if (!update) {
    return null
  }

  return {
    update,
    info: {
      currentVersion: update.currentVersion,
      version: update.version,
      date: update.date,
      body: update.body,
    },
  }
}

export async function installUpdateAndRelaunch(
  pending: PendingUpdate,
  onProgress: (progress: InstallProgress) => void,
): Promise<void> {
  let downloadedBytes = 0
  let contentLength: number | undefined

  await pending.update.downloadAndInstall((event: DownloadEvent) => {
    switch (event.event) {
      case 'Started':
        contentLength = event.data.contentLength
        downloadedBytes = 0
        onProgress({ kind: 'downloading', downloadedBytes, contentLength })
        break
      case 'Progress':
        downloadedBytes += event.data.chunkLength
        onProgress({ kind: 'downloading', downloadedBytes, contentLength })
        break
      case 'Finished':
        onProgress({ kind: 'installing' })
        break
    }
  })

  onProgress({ kind: 'relaunching' })
  await relaunch()
}
