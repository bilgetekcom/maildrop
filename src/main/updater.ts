/**
 * Auto-update via electron-updater.
 *
 * Pattern matches BulkPro:
 *   1. App ready'de sessiz check
 *   2. Yeni sürüm varsa renderer'a "available" eventi → modal/banner
 *   3. Kullanıcı "indir" derse arka planda download (progress event)
 *   4. Download tamamlanınca "restart to install" sorusu
 *   5. Kullanıcı onaylarsa quitAndInstall
 *
 * Notes:
 *   - macOS code signing yoksa update indirilir ama uygulama açılışta
 *     Gatekeeper engelleyebilir. Şimdilik no-signing fallback ile çalışır.
 *   - Linux: AppImage formatında çalışır, deb için manuel.
 *   - Windows: NSIS installer ile sorunsuz.
 */

import { BrowserWindow, app } from 'electron'
import type { IpcMain } from 'electron'
import pkg from 'electron-updater'

const { autoUpdater } = pkg

interface ReleaseNoteInfo {
  version: string
  note: string | null
}

function notesToString(notes: string | ReleaseNoteInfo[] | null | undefined): string | null {
  if (!notes) return null
  if (typeof notes === 'string') return notes
  return notes.map((n) => `v${n.version}\n${n.note ?? ''}`).join('\n\n')
}

interface ProgressInfo {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

function sendToRenderer(channel: string, payload: unknown): void {
  const win = BrowserWindow.getAllWindows()[0]
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, payload)
  }
}

/**
 * macOS auto-update via electron-updater requires a signed + notarized app.
 * Without code signing the dmg/zip update path silently fails. We still let
 * renderer call `check` so the UI can tell the user there is a newer version,
 * but we never try to download — we open the bilgetek.com landing page so the
 * user can grab the signed-when-available installer manually.
 */
const isMac = process.platform === 'darwin'

export function setupAutoUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = !isMac
  autoUpdater.logger = console

  autoUpdater.on('checking-for-update', () => {
    sendToRenderer('updater:checking', null)
  })

  autoUpdater.on('update-available', (info) => {
    sendToRenderer('updater:available', {
      version: info.version,
      releaseName: info.releaseName,
      releaseNotes: notesToString(info.releaseNotes),
      releaseDate: info.releaseDate
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    sendToRenderer('updater:not-available', { version: info.version })
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    sendToRenderer('updater:progress', {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendToRenderer('updater:downloaded', {
      version: info.version,
      releaseName: info.releaseName,
      releaseNotes: notesToString(info.releaseNotes)
    })
  })

  autoUpdater.on('error', (err: Error) => {
    sendToRenderer('updater:error', { message: err.message })
  })
}

export function registerUpdaterHandlers(ipc: IpcMain): void {
  ipc.removeHandler('updater:check')
  ipc.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return {
        ok: true,
        version: result?.updateInfo?.version ?? null,
        currentVersion: app.getVersion()
      }
    } catch (e) {
      return { ok: false, error: (e as Error).message, currentVersion: app.getVersion() }
    }
  })

  ipc.removeHandler('updater:download')
  ipc.handle('updater:download', async () => {
    if (isMac) {
      return { ok: false, error: 'mac_manual_download', currentVersion: app.getVersion() }
    }
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })

  ipc.removeHandler('updater:install')
  ipc.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  ipc.removeHandler('updater:currentVersion')
  ipc.handle('updater:currentVersion', () => app.getVersion())
}

export function startBackgroundCheck(): void {
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.warn('Initial update check failed:', err.message)
    })
  }, 5000)
}

export function isMacOS(): boolean {
  return isMac
}

