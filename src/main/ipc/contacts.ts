import type { IpcMain } from 'electron'
import { dialog } from 'electron'
import { getDb } from '../db'
import type { Contact, ContactGroup } from '../../shared/types'
import ExcelJS from 'exceljs'
import { assertSafePath } from '../lib/path-guard'

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
  ipc.handle(
    'contacts:list',
    (_, search?: string, groupId?: number | null, limit?: number, offset?: number) => {
      const db = getDb()
      const where: string[] = []
      const vals: unknown[] = []
      if (search) {
        where.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR company LIKE ?)')
        const q = `%${search}%`
        vals.push(q, q, q, q)
      }
      if (groupId) {
        where.push('group_id = ?')
        vals.push(groupId)
      }
      const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : ''
      const safeLimit = Math.min(Math.max(Number(limit) || 500, 1), 5000)
      const safeOffset = Math.max(Number(offset) || 0, 0)
      const sql = `SELECT * FROM contacts ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`
      vals.push(safeLimit, safeOffset)
      return db
        .prepare<unknown[], Record<string, unknown>>(sql)
        .all(...vals)
        .map(rowToContact)
    }
  )

  ipc.handle('contacts:count', (_, search?: string, groupId?: number | null): number => {
    const db = getDb()
    const where: string[] = []
    const vals: unknown[] = []
    if (search) {
      where.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR company LIKE ?)')
      const q = `%${search}%`
      vals.push(q, q, q, q)
    }
    if (groupId) {
      where.push('group_id = ?')
      vals.push(groupId)
    }
    const sql = `SELECT COUNT(*) AS n FROM contacts ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`
    const row = db.prepare<unknown[], { n: number }>(sql).get(...vals)
    return row?.n ?? 0
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

  ipc.handle('contacts:previewExcel', async (_, filePath: string) => {
    const safe = assertSafePath(filePath)
    const wb = new ExcelJS.Workbook()
    if (/\.csv$/i.test(safe)) {
      await wb.csv.readFile(safe)
    } else {
      await wb.xlsx.readFile(safe)
    }
    const ws = wb.worksheets[0]
    if (!ws || ws.rowCount === 0) return { headers: [], sample: [] }
    const cellsToArray = (vals: unknown): string[] => {
      const arr = (Array.isArray(vals) ? vals.slice(1) : []) as unknown[]
      return arr.map((v) => (v == null ? '' : String(v)))
    }
    const headers = cellsToArray(ws.getRow(1).values)
    const sample: string[][] = []
    for (let i = 2; i <= Math.min(6, ws.rowCount); i++) {
      sample.push(cellsToArray(ws.getRow(i).values))
    }
    return { headers, sample }
  })

  ipc.handle(
    'contacts:importExcel',
    async (
      _,
      filePath: string,
      mapping: Record<string, string>
    ): Promise<{ inserted: number; duplicates: string[] }> => {
      const db = getDb()
      const safe = assertSafePath(filePath)
      const wb = new ExcelJS.Workbook()
      if (/\.csv$/i.test(safe)) {
        await wb.csv.readFile(safe)
      } else {
        await wb.xlsx.readFile(safe)
      }
      const ws = wb.worksheets[0]
      if (!ws || ws.rowCount < 2) {
        return { inserted: 0, duplicates: [] }
      }
      const rawHeaders = ws.getRow(1).values
      const headers: string[] = []
      if (Array.isArray(rawHeaders)) {
        for (let i = 1; i < rawHeaders.length; i++) {
          headers.push(rawHeaders[i] == null ? '' : String(rawHeaders[i]))
        }
      }
      // Map: header name -> column index (1-based as ExcelJS uses)
      const headerIdx: Record<string, number> = {}
      headers.forEach((h, i) => {
        if (h) headerIdx[h] = i + 1
      })

      const insert = db.prepare(
        `INSERT INTO contacts (first_name, last_name, email, company, custom_fields)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(email) DO NOTHING`
      )

      const duplicates: string[] = []
      let inserted = 0

      function cellValue(row: ExcelJS.Row, colHeader: string | undefined): string {
        if (!colHeader) return ''
        const ci = headerIdx[colHeader]
        if (!ci) return ''
        const v = row.getCell(ci).value
        if (v == null) return ''
        if (typeof v === 'object' && 'text' in (v as { text?: string })) {
          return String((v as { text: string }).text)
        }
        if (typeof v === 'object' && 'result' in (v as { result?: unknown })) {
          return String((v as { result?: unknown }).result ?? '')
        }
        return String(v)
      }

      db.transaction(() => {
        for (let r = 2; r <= ws.rowCount; r++) {
          const row = ws.getRow(r)
          const email = cellValue(row, mapping.email).trim()
          if (!email) continue
          const firstName = cellValue(row, mapping.firstName)
          const lastName = cellValue(row, mapping.lastName)
          const companyRaw = cellValue(row, mapping.company)
          const company = companyRaw || null
          const custom: Record<string, string> = {}
          for (const [field, col] of Object.entries(mapping)) {
            if (['firstName', 'lastName', 'email', 'company'].includes(field)) continue
            const val = cellValue(row, col)
            if (val) custom[field] = val
          }
          const result = insert.run(firstName, lastName, email, company, JSON.stringify(custom))
          if (result.changes > 0) inserted++
          else duplicates.push(email)
        }
      })()

      return { inserted, duplicates }
    }
  )

  ipc.handle('contacts:exportExcel', async (_, path: string, groupId?: number | null) => {
    const safe = assertSafePath(path)
    const db = getDb()
    const rows = (
      groupId
        ? db.prepare('SELECT * FROM contacts WHERE group_id = ?').all(groupId)
        : db.prepare('SELECT * FROM contacts').all()
    ) as Record<string, unknown>[]
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Kişiler')
    if (rows.length > 0) {
      const cols = Object.keys(rows[0])
      ws.columns = cols.map((c) => ({ header: c, key: c, width: 18 }))
      for (const row of rows) {
        ws.addRow(row)
      }
    }
    await wb.xlsx.writeFile(safe)
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
