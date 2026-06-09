import type { IpcMain } from 'electron'
import { dialog } from 'electron'
import { getDb } from '../db'
import type { Template } from '../../shared/types'

function extractVariables(text: string): string[] {
  const regex = /\{\{\s*([\w]+)\s*\}\}/g
  const set = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) set.add(m[1])
  return [...set]
}

function rowToTemplate(r: Record<string, unknown>): Template {
  return {
    id: r.id as number,
    name: r.name as string,
    subject: r.subject as string,
    bodyHtml: r.body_html as string,
    variables: JSON.parse((r.variables as string) || '[]'),
    attachmentPath: (r.attachment_path as string) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string
  }
}

export function registerTemplateHandlers(ipc: IpcMain): void {
  ipc.handle('templates:list', (): Template[] => {
    const db = getDb()
    return db
      .prepare<[], Record<string, unknown>>('SELECT * FROM templates ORDER BY updated_at DESC')
      .all()
      .map(rowToTemplate)
  })

  ipc.handle('templates:get', (_, id: number): Template => {
    const row = getDb().prepare('SELECT * FROM templates WHERE id = ?').get(id) as Record<string, unknown>
    return rowToTemplate(row)
  })

  ipc.handle(
    'templates:create',
    (_, input: { name: string; subject: string; bodyHtml: string; attachmentPath: string | null }): Template => {
      const db = getDb()
      const vars = JSON.stringify(extractVariables(input.subject + ' ' + input.bodyHtml))
      const result = db
        .prepare(
          `INSERT INTO templates (name, subject, body_html, variables, attachment_path)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(input.name, input.subject, input.bodyHtml, vars, input.attachmentPath)
      const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>
      return rowToTemplate(row)
    }
  )

  ipc.handle('templates:update', (_, id: number, input: Partial<Template>): Template => {
    const db = getDb()
    const sets: string[] = []
    const vals: unknown[] = []
    if (input.name !== undefined) { sets.push('name = ?'); vals.push(input.name) }
    if (input.subject !== undefined) { sets.push('subject = ?'); vals.push(input.subject) }
    if (input.bodyHtml !== undefined) { sets.push('body_html = ?'); vals.push(input.bodyHtml) }
    if (input.attachmentPath !== undefined) { sets.push('attachment_path = ?'); vals.push(input.attachmentPath) }
    if (input.subject !== undefined || input.bodyHtml !== undefined) {
      const current = db.prepare('SELECT subject, body_html FROM templates WHERE id = ?').get(id) as {
        subject: string
        body_html: string
      }
      const subject = input.subject ?? current.subject
      const body = input.bodyHtml ?? current.body_html
      sets.push('variables = ?')
      vals.push(JSON.stringify(extractVariables(subject + ' ' + body)))
    }
    sets.push("updated_at = datetime('now')")
    vals.push(id)
    db.prepare(`UPDATE templates SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as Record<string, unknown>
    return rowToTemplate(row)
  })

  ipc.handle('templates:remove', (_, id: number) => {
    getDb().prepare('DELETE FROM templates WHERE id = ?').run(id)
  })

  ipc.handle('templates:preview', (_, id: number, contactId: number) => {
    const db = getDb()
    const tpl = rowToTemplate(db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as Record<string, unknown>)
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId) as Record<string, unknown>
    const merged: Record<string, string> = {
      Ad: (contact.first_name as string) || '',
      Soyad: (contact.last_name as string) || '',
      Email: (contact.email as string) || '',
      Firma: (contact.company as string) || '',
      ...JSON.parse((contact.custom_fields as string) || '{}')
    }
    const render = (s: string): string =>
      s.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_, k) => (merged[k] !== undefined ? merged[k] : ''))
    return { subject: render(tpl.subject), html: render(tpl.bodyHtml) }
  })

  ipc.handle('dialog:openAttachment', async (): Promise<string | null> => {
    const r = await dialog.showOpenDialog({
      title: 'Ek dosya seçin',
      properties: ['openFile']
    })
    return r.canceled || !r.filePaths[0] ? null : r.filePaths[0]
  })
}
