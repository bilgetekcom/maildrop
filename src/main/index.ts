import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerCloseHandshake } from './ipc/close-handshake'
import { setupAutoUpdater, registerUpdaterHandlers, startBackgroundCheck } from './updater'
import { registerSmtpHandlers } from './ipc/smtp'
import { registerContactHandlers } from './ipc/contacts'
import { registerTemplateHandlers } from './ipc/templates'
import {
  registerCampaignHandlers,
  recoverCampaignsOnStartup,
  hasActiveSendingCampaign
} from './ipc/campaigns'
import { registerReportHandlers } from './ipc/reports'
import { registerSuppressionHandlers } from './ipc/suppressions'
import { registerAppSettingsHandlers } from './ipc/app-settings'
import { initDatabase } from './db'

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: 'MailDrop',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (is.dev) mainWindow.webContents.openDevTools({ mode: 'detach' })
  })

  mainWindow.webContents.on('console-message', (_e, level, message, line, source) => {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR']
    console.log(`[RENDERER ${levels[level] ?? level}] ${source}:${line} — ${message}`)
  })

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[RENDERER GONE]', details)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const u = new URL(details.url)
      if (u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:') {
        shell.openExternal(details.url)
      }
    } catch {
      /* invalid URL, drop */
    }
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (process.env['ELECTRON_RENDERER_URL'] && url.startsWith(process.env['ELECTRON_RENDERER_URL'])) {
      return
    }
    event.preventDefault()
    try {
      const u = new URL(url)
      if (u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:') {
        shell.openExternal(url)
      }
    } catch {
      /* drop */
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  registerCloseHandshake(mainWindow)

  return mainWindow
}

// Dev (electron-vite) ile paketlenmis surum AYNI userData klasorunu (Roaming/MailDrop)
// kullansin diye app adini sabitle; yoksa dev'de ad "Electron" olup Roaming/Electron
// altinda BOS bir DB acilir (SMTP hesabi + kisiler gorunmez). Tek-ornek kilidi de
// dogru userData'ya baglansin diye whenReady'den ONCE.
app.setName('MailDrop')

// TEK-ORNEK KILIDI: gunluk otomatik gonderim icin Gorev Zamanlayici uygulamayi
// zaten acikken tetikleyebilir; ikinci ornek ayni SQLite'a yazip veriyi bozardi
// (bu daha once yasandi). Ikinci ornek acilmaz, var olan pencereye odaklanir.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.bilgetek.maildrop')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    initDatabase()
    recoverCampaignsOnStartup()

    registerSmtpHandlers(ipcMain)
    registerContactHandlers(ipcMain)
    registerTemplateHandlers(ipcMain)
    registerCampaignHandlers(ipcMain)
    registerReportHandlers(ipcMain)
    registerSuppressionHandlers(ipcMain)
    registerAppSettingsHandlers(ipcMain)
    registerUpdaterHandlers(ipcMain)
    setupAutoUpdater()

    ipcMain.handle('app:hasActiveSending', () => hasActiveSendingCampaign())

    createWindow()
    if (!is.dev) startBackgroundCheck()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
