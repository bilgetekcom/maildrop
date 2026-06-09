import type { IpcMain } from 'electron'
import { dialog } from 'electron'
import { getDb } from '../db'
import type { Contact, ContactGroup } from '../../shared/types'
import * as XLSX from 'xlsx'

function rowToContact(r: Record<string, unknown>): Contact {
  return {
    id: r.id as number,
    firstName: r.first_name as string,
    lastName: r.last_name as string,
    email: r.email as string,
    company: (r.company as string) ?? null,
    customFields: JSON.parse((r.custom_fields as string) || '{}'),
    groupId: (r.group_id as number) ?? null,
    createdAt: r.created_at as string
  }
}

export function registerContactHandlers(ipc: IpcMain): void {
  ipc.handle('contacts:list', (_, search?: string, groupId?: number | null) => {
    const db = getDb()
    const where: string[] = []
    const vals: unknown[] = []
    if (search) {
      where.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR company LIKE ?)')
      const q = `%${search}%`
      vals.push(q, q, q, q)
    }
    if (groupId) { where.push('group_id = ?'); vals.push(groupId) }
    const sql = `SELECT * FROM contacts ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC`
    return db.prepare<unknown[], Record<string, unknown>>(sql).all(...vals).map(rowToContact)
  })

  ipc.handle('contacts:create', (_, input: Omit<Contact, 'id' | 'createdAt'>): Contact => {
    const db = getDb()
    const stmt = db.prepare(
      `INSERT INTO contacts (first_name, last_name, email, company, custom_fields, group_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    const result = stmt.run(
      input.firstName,
      input.lastName,
      input.email,
      input.company,
      JSON.stringify(input.customFields ?? {}),
      input.groupId
    )
    const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>
    return rowToContact(row)
  })

  ipc.handle('contacts:update', (_, id: number, input: Partial<Contact>): Contact => {
    const db = getDb()
    const sets: string[] = []
    const vals: unknown[] = []
    if (input.firstName !== undefined) { sets.push('first_name = ?'); vals.push(input.firstName) }
    if (input.lastName !== undefined) { sets.push('last_name = ?'); vals.push(input.lastName) }
    if (input.email !== undefined) { sets.push('email = ?'); vals.push(input.email) }
    if (input.company !== undefined) { sets.push('company = ?'); vals.push(input.company) }
    if (input.customFields !== undefined) { sets.push('custom_fields = ?'); vals.push(JSON.stringify(input.customFields)) }
    if (input.groupId !== undefined) { sets.push('group_id = ?'); vals.push(input.groupId) }
    if (sets.length) {
      vals.push(id)
      db.prepare(`UPDATE contacts SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    }
    const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as Record<string, unknown>
    return rowToContact(row)
  })

  ipc.handle('contacts:remove', (_, ids: number[]) => {
    const db = getDb()
    const stmt = db.prepare('DELETE FROM contacts WHERE id = ?')
    db.transaction(() => ids.forEach((id) => stmt.run(id)))()
  })

  ipc.handle('contacts:previewExcel', (_, filePath: string) => {
    const wb = XLSX.readFile(filePath)
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 }) as string[][]
    if (!rows.length) return { headers: [], sample: [] }
    return { headers: rows[0].map((h) => String(h)), sample: rows.slice(1, 6) }
  })

  ipc.handle(
    'contacts:importExcel',
    (_, filePath: string, mapping: Record<string, string>): { inserted: number; duplicates: string[] } => {
      const db = getDb()
      const wb = XLSX.readFile(filePath)
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

      const insert = db.prepare(
        `INSERT INTO contacts (first_name, last_name, email, company, custom_fields)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(email) DO NOTHING`
      )

      const duplicates: string[] = []
      let inserted = 0

      db.transaction(() => {
        for (const row of rows) {
          const emailCol = mapping.email
          const email = emailCol ? String(row[emailCol] ?? '').trim() : ''
          if (!email) continue
          const firstName = mapping.firstName ? String(row[mapping.firstName] ?? '') : ''
          const lastName = mapping.lastName ? String(row[mapping.lastName] ?? '') : ''
          const company = mapping.company ? String(row[mapping.company] ?? '') : null
          const custom: Record<string, string> = {}
          for (const [field, col] of Object.entries(mapping)) {
            if (['firstName', 'lastName', 'email', 'company'].includes(field)) continue
            if (row[col] !== undefined) custom[field] = String(row[col])
          }
          const result = insert.run(firstName, lastName, email, company, JSON.stringify(custom))
          if (result.changes > 0) inserted++
          else duplicates.push(email)
        }
      })()

      return { inserted, duplicates }
    }
  )

  ipc.handle('contacts:exportExcel', (_, path: string, groupId?: number | null) => {
    const db = getDb()
    const rows = groupId
      ? db.prepare('SELECT * FROM contacts WHERE group_id = ?').all(groupId)
      : db.prepare('SELECT * FROM contacts').all()
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Kişiler')
    XLSX.writeFile(wb, path)
  })

  ipc.handle('dialog:openExcel', async (): Promise<string | null> => {
    const r = await dialog.showOpenDialog({
      title: 'Excel veya CSV dosyası seçin',
      filters: [{ name: 'Excel/CSV', extensions: ['xlsx', 'xls', 'csv'] }],
      properties: ['openFile']
    })
    return r.canceled || !r.filePaths[0] ? null : r.filePaths[0]
  })

  ipc.handle('dialog:saveExcel', async (_, defaultName: string): Promise<string | null> => {
    const r = await dialog.showSaveDialog({
      title: 'Excel olarak kaydet',
      defaultPath: defaultName,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    })
    return r.canceled || !r.filePath ? null : r.filePath
  })

  ipc.handle('groups:list', (): ContactGroup[] => {
    const db = getDb()
    return db
      .prepare<[], Record<string, unknown>>('SELECT * FROM contact_groups ORDER BY name')
      .all()
      .map((r) => ({
        id: r.id as number,
        name: r.name as string,
        color: r.color as string,
        createdAt: r.created_at as string
      }))
  })

  ipc.handle('groups:create', (_, name: string, color: string): ContactGroup => {
    const db = getDb()
    const result = db
      .prepare('INSERT INTO contact_groups (name, color) VALUES (?, ?)')
      .run(name, color)
    const row = db
      .prepare('SELECT * FROM contact_groups WHERE id = ?')
      .get(result.lastInsertRowid) as Record<string, unknown>
    return {
      id: row.id as number,
      name: row.name as string,
      color: row.color as string,
      createdAt: row.created_at as string
    }
  })

  ipc.handle('groups:remove', (_, id: number) => {
    getDb().prepare('DELETE FROM contact_groups WHERE id = ?').run(id)
  })
}
