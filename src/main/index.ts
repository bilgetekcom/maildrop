import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerCloseHandshake } from './ipc/close-handshake'
import { registerSmtpHandlers } from './ipc/smtp'
import { registerContactHandlers } from './ipc/contacts'
import { registerTemplateHandlers } from './ipc/templates'
import { registerCampaignHandlers } from './ipc/campaigns'
import { registerReportHandlers } from './ipc/reports'
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
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  registerCloseHandshake(mainWindow)

  return mainWindow
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.bilgetek.maildrop')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  initDatabase()

  registerSmtpHandlers(ipcMain)
  registerContactHandlers(ipcMain)
  registerTemplateHandlers(ipcMain)
  registerCampaignHandlers(ipcMain)
  registerReportHandlers(ipcMain)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
