import type { IpcMain } from 'electron'
import { getDb } from '../db'
import type { Suppression } from '../../shared/types'

function rowToSup(r: Record<string, unknown>): Suppression {
  return {
    id: r.id as number,
    email: r.email as string,
    reason: r.reason as string,
    source: (r.source as string) ?? null,
    createdAt: r.created_at as string
  }
}

export function isSuppressed(email: string): boolean {
  const db = getDb()
  const row = db
    .prepare('SELECT 1 FROM suppressions WHERE email = ? LIMIT 1')
    .get(email.toLowerCase().trim())
  return Boolean(row)
}

export function addSuppression(email: string, reason: string, source: string | null): void {
  const db = getDb()
  const e = email.toLowerCase().trim()
  if (!e) return
  db.prepare(
    `INSERT OR IGNORE INTO suppressions (email, reason, source) VALUES (?, ?, ?)`
  ).run(e, reason, source)
}

export function registerSuppressionHandlers(ipc: IpcMain): void {
  ipc.removeHandler('suppressions:list')
  ipc.handle('suppressions:list', (): Suppression[] => {
    return getDb()
      .prepare<[], Record<string, unknown>>(
        'SELECT * FROM suppressions ORDER BY created_at DESC'
      )
      .all()
      .map(rowToSup)
  })

  ipc.removeHandler('suppressions:add')
  ipc.handle(
    'suppressions:add',
    (_, email: string, reason?: string): Suppression => {
      const e = email.toLowerCase().trim()
      if (!e) throw new Error('email_required')
      const db = getDb()
      db.prepare(
        `INSERT OR IGNORE INTO suppressions (email, reason, source) VALUES (?, ?, ?)`
      ).run(e, reason ?? 'manual', 'user')
      const row = db
        .prepare('SELECT * FROM suppressions WHERE email = ?')
        .get(e) as Record<string, unknown>
      return rowToSup(row)
    }
  )

  ipc.removeHandler('suppressions:remove')
  ipc.handle('suppressions:remove', (_, id: number): void => {
    getDb().prepare('DELETE FROM suppressions WHERE id = ?').run(id)
  })

  ipc.removeHandler('suppressions:has')
  ipc.handle('suppressions:has', (_, email: string): boolean => isSuppressed(email))
}
