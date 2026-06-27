import type { IpcMain } from 'electron'
import { getDb } from '../db'
import type { UnsubscribeConfig } from '../../shared/types'

const KEY_UNSUBSCRIBE = 'unsubscribe'

function readJson<T>(key: string, fallback: T): T {
  const db = getDb()
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  if (!row) return fallback
  try {
    return JSON.parse(row.value) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  const db = getDb()
  db.prepare(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, JSON.stringify(value))
}

export function getUnsubscribeConfig(): UnsubscribeConfig {
  return readJson<UnsubscribeConfig>(KEY_UNSUBSCRIBE, { method: 'none', value: '' })
}

export function registerAppSettingsHandlers(ipc: IpcMain): void {
  ipc.removeHandler('settings:getUnsubscribe')
  ipc.handle('settings:getUnsubscribe', (): UnsubscribeConfig => getUnsubscribeConfig())

  ipc.removeHandler('settings:setUnsubscribe')
  ipc.handle('settings:setUnsubscribe', (_, cfg: UnsubscribeConfig): void => {
    writeJson(KEY_UNSUBSCRIBE, cfg)
  })
}
