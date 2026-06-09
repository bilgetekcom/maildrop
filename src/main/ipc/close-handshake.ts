import { BrowserWindow, ipcMain, shell, app } from 'electron'

let pendingConfirm = false

export function registerCloseHandshake(win: BrowserWindow): void {
  win.on('close', (e) => {
    if (pendingConfirm) return
    e.preventDefault()
    pendingConfirm = true
    win.webContents.send('app:beforeClose')
  })

  ipcMain.removeHandler('app:confirmClose')
  ipcMain.handle('app:confirmClose', () => {
    pendingConfirm = true
    setTimeout(() => app.quit(), 50)
  })

  ipcMain.removeHandler('app:cancelClose')
  ipcMain.handle('app:cancelClose', () => {
    pendingConfirm = false
  })

  ipcMain.removeHandler('app:openExternal')
  ipcMain.handle('app:openExternal', async (_, url: string) => {
    try {
      const u = new URL(url)
      if (u.protocol !== 'https:' && u.protocol !== 'http:') {
        throw new Error('only_http_https_allowed')
      }
      await shell.openExternal(url)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  })
}
