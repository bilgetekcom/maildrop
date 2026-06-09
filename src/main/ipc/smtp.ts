import type { IpcMain } from 'electron'
import { getDb, encryptSecret } from '../db'
import type { SmtpAccount, SmtpAccountInput, SmtpTestResult } from '../../shared/types'
import { ERR } from '../../shared/errors'
import nodemailer from 'nodemailer'
import { classifySmtpError } from '../lib/error-translator'

function rowToAccount(r: Record<string, unknown>): SmtpAccount {
  return {
    id: r.id as number,
    name: r.name as string,
    host: r.host as string,
    port: r.port as number,
    secure: Boolean(r.secure),
    user: r.user as string,
    encryptedPass: r.encrypted_pass as string,
    isDefault: Boolean(r.is_default),
    createdAt: r.created_at as string
  }
}

const TEST_MAIL = {
  tr: {
    subject: 'MailDrop bağlantı testi',
    body: 'Bu mail MailDrop SMTP bağlantı testi tarafından gönderildi. Bağlantı çalışıyor.'
  },
  en: {
    subject: 'MailDrop connection test',
    body: 'This message was sent by the MailDrop SMTP connection test. The connection works.'
  }
}

export function registerSmtpHandlers(ipc: IpcMain): void {
  ipc.handle('smtp:list', () => {
    const db = getDb()
    return db
      .prepare<[], Record<string, unknown>>('SELECT * FROM smtp_accounts ORDER BY id DESC')
      .all()
      .map(rowToAccount)
  })

  ipc.handle('smtp:create', (_, input: SmtpAccountInput): SmtpAccount => {
    const db = getDb()
    const encrypted = encryptSecret(input.password)
    const stmt = db.prepare(
      `INSERT INTO smtp_accounts (name, host, port, secure, user, encrypted_pass, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    const result = stmt.run(
      input.name,
      input.host,
      input.port,
      input.secure ? 1 : 0,
      input.user,
      encrypted,
      input.isDefault ? 1 : 0
    )
    const row = db
      .prepare('SELECT * FROM smtp_accounts WHERE id = ?')
      .get(result.lastInsertRowid) as Record<string, unknown>
    return rowToAccount(row)
  })

  ipc.handle(
    'smtp:test',
    async (
      _,
      input: SmtpAccountInput,
      sampleTo: string,
      locale: 'tr' | 'en' = 'tr'
    ): Promise<SmtpTestResult> => {
      const mail = TEST_MAIL[locale] ?? TEST_MAIL.tr
      try {
        const transport = nodemailer.createTransport({
          host: input.host,
          port: input.port,
          secure: input.secure,
          auth: { user: input.user, pass: input.password }
        })
        await transport.verify()
        await transport.sendMail({
          from: input.user,
          to: sampleTo,
          subject: mail.subject,
          text: mail.body
        })
        return { ok: true, code: '' }
      } catch (e) {
        const err = e as Error
        return { ok: false, code: classifySmtpError(err), raw: err.message }
      }
    }
  )

  ipc.handle('smtp:remove', (_, id: number) => {
    getDb().prepare('DELETE FROM smtp_accounts WHERE id = ?').run(id)
  })

  ipc.handle('smtp:setDefault', (_, id: number) => {
    const db = getDb()
    db.transaction(() => {
      db.prepare('UPDATE smtp_accounts SET is_default = 0').run()
      db.prepare('UPDATE smtp_accounts SET is_default = 1 WHERE id = ?').run(id)
    })()
  })

  ipc.handle('smtp:update', (_, id: number, input: Partial<SmtpAccountInput>): SmtpAccount => {
    const db = getDb()
    const sets: string[] = []
    const vals: unknown[] = []
    if (input.name !== undefined) { sets.push('name = ?'); vals.push(input.name) }
    if (input.host !== undefined) { sets.push('host = ?'); vals.push(input.host) }
    if (input.port !== undefined) { sets.push('port = ?'); vals.push(input.port) }
    if (input.secure !== undefined) { sets.push('secure = ?'); vals.push(input.secure ? 1 : 0) }
    if (input.user !== undefined) { sets.push('user = ?'); vals.push(input.user) }
    if (input.password !== undefined) {
      sets.push('encrypted_pass = ?')
      vals.push(encryptSecret(input.password))
    }
    if (sets.length) {
      vals.push(id)
      db.prepare(`UPDATE smtp_accounts SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    }
    const row = db.prepare('SELECT * FROM smtp_accounts WHERE id = ?').get(id) as Record<
      string,
      unknown
    >
    return rowToAccount(row)
  })
}

export { ERR }
