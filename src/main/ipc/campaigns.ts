import type { IpcMain, WebContents } from 'electron'
import { BrowserWindow } from 'electron'
import nodemailer from 'nodemailer'
import { getDb, decryptSecret } from '../db'
import { translateSmtpError } from '../lib/error-translator'
import type { Campaign, CampaignLog, SendProgress } from '../../shared/types'

interface CampaignRunner {
  paused: boolean
  cancelled: boolean
}

const runners = new Map<number, CampaignRunner>()

function rowToCampaign(r: Record<string, unknown>): Campaign {
  return {
    id: r.id as number,
    name: r.name as string,
    templateId: r.template_id as number,
    smtpId: r.smtp_id as number,
    total: r.total as number,
    sent: r.sent as number,
    failed: r.failed as number,
    status: r.status as Campaign['status'],
    startedAt: (r.started_at as string) ?? null,
    finishedAt: (r.finished_at as string) ?? null
  }
}

function rowToLog(r: Record<string, unknown>): CampaignLog {
  return {
    id: r.id as number,
    campaignId: r.campaign_id as number,
    contactId: r.contact_id as number,
    email: r.email as string,
    status: r.status as CampaignLog['status'],
    errorMsg: (r.error_msg as string) ?? null,
    sentAt: r.sent_at as string
  }
}

function emitProgress(progress: SendProgress): void {
  const win = BrowserWindow.getAllWindows()[0]
  if (win) win.webContents.send('campaigns:progress', progress)
}

function render(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''))
}

async function runCampaign(campaignId: number, contactIds: number[], ratePerSecond: number): Promise<void> {
  const db = getDb()
  const runner: CampaignRunner = { paused: false, cancelled: false }
  runners.set(campaignId, runner)

  const campaign = rowToCampaign(
    db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId) as Record<string, unknown>
  )
  const tpl = db.prepare('SELECT * FROM templates WHERE id = ?').get(campaign.templateId) as Record<string, unknown>
  const smtp = db.prepare('SELECT * FROM smtp_accounts WHERE id = ?').get(campaign.smtpId) as Record<string, unknown>

  const transport = nodemailer.createTransport({
    host: smtp.host as string,
    port: smtp.port as number,
    secure: Boolean(smtp.secure),
    auth: { user: smtp.user as string, pass: decryptSecret(smtp.encrypted_pass as string) }
  })

  db.prepare("UPDATE campaigns SET status = 'running', started_at = datetime('now') WHERE id = ?").run(campaignId)

  const delayMs = Math.max(50, Math.floor(1000 / ratePerSecond))
  const logInsert = db.prepare(
    `INSERT INTO campaign_logs (campaign_id, contact_id, email, status, error_msg)
     VALUES (?, ?, ?, ?, ?)`
  )
  const updateCounts = db.prepare('UPDATE campaigns SET sent = ?, failed = ? WHERE id = ?')

  let sent = 0
  let failed = 0

  for (const cid of contactIds) {
    while (runner.paused && !runner.cancelled) await new Promise((r) => setTimeout(r, 250))
    if (runner.cancelled) break

    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(cid) as Record<string, unknown>
    if (!contact) continue

    const vars: Record<string, string> = {
      Ad: (contact.first_name as string) || '',
      Soyad: (contact.last_name as string) || '',
      Email: (contact.email as string) || '',
      Firma: (contact.company as string) || '',
      ...JSON.parse((contact.custom_fields as string) || '{}')
    }

    const subject = render(tpl.subject as string, vars)
    const html = render(tpl.body_html as string, vars)
    const attachments = tpl.attachment_path
      ? [{ path: tpl.attachment_path as string }]
      : undefined

    try {
      await transport.sendMail({
        from: smtp.user as string,
        to: contact.email as string,
        subject,
        html,
        attachments
      })
      sent++
      logInsert.run(campaignId, cid, contact.email, 'success', null)
    } catch (e) {
      failed++
      const t = translateSmtpError(e as Error)
      logInsert.run(campaignId, cid, contact.email, 'failed', `${t.message} ${t.hint}`)
    }

    updateCounts.run(sent, failed, campaignId)
    emitProgress({
      campaignId,
      sent,
      failed,
      total: contactIds.length,
      currentEmail: contact.email as string,
      status: 'running'
    })

    await new Promise((r) => setTimeout(r, delayMs))
  }

  const finalStatus: Campaign['status'] = runner.cancelled ? 'cancelled' : 'completed'
  db.prepare("UPDATE campaigns SET status = ?, finished_at = datetime('now') WHERE id = ?").run(
    finalStatus,
    campaignId
  )
  emitProgress({
    campaignId,
    sent,
    failed,
    total: contactIds.length,
    currentEmail: null,
    status: finalStatus
  })
  runners.delete(campaignId)
}

export function registerCampaignHandlers(ipc: IpcMain): void {
  ipc.handle('campaigns:list', (): Campaign[] => {
    const db = getDb()
    return db
      .prepare<[], Record<string, unknown>>('SELECT * FROM campaigns ORDER BY id DESC')
      .all()
      .map(rowToCampaign)
  })

  ipc.handle('campaigns:get', (_, id: number): Campaign => {
    return rowToCampaign(getDb().prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as Record<string, unknown>)
  })

  ipc.handle('campaigns:logs', (_, id: number): CampaignLog[] => {
    return getDb()
      .prepare<[number], Record<string, unknown>>('SELECT * FROM campaign_logs WHERE campaign_id = ? ORDER BY id')
      .all(id)
      .map(rowToLog)
  })

  ipc.handle(
    'campaigns:start',
    async (
      _,
      input: {
        name: string
        templateId: number
        smtpId: number
        contactIds: number[]
        ratePerSecond?: number
        scheduleAt?: string
      }
    ): Promise<Campaign> => {
      const db = getDb()
      const result = db
        .prepare(
          `INSERT INTO campaigns (name, template_id, smtp_id, total, sent, failed, status)
           VALUES (?, ?, ?, ?, 0, 0, 'pending')`
        )
        .run(input.name, input.templateId, input.smtpId, input.contactIds.length)
      const campaignId = result.lastInsertRowid as number

      const rate = input.ratePerSecond ?? 1
      const ids = input.contactIds
      if (input.scheduleAt) {
        const ms = Math.max(0, new Date(input.scheduleAt).getTime() - Date.now())
        setTimeout(() => void runCampaign(campaignId, ids, rate), ms)
      } else {
        void runCampaign(campaignId, ids, rate)
      }
      return rowToCampaign(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId) as Record<string, unknown>)
    }
  )

  ipc.handle('campaigns:pause', (_, id: number) => {
    const r = runners.get(id)
    if (r) {
      r.paused = true
      getDb().prepare("UPDATE campaigns SET status = 'paused' WHERE id = ?").run(id)
    }
  })

  ipc.handle('campaigns:resume', (_, id: number) => {
    const r = runners.get(id)
    if (r) {
      r.paused = false
      getDb().prepare("UPDATE campaigns SET status = 'running' WHERE id = ?").run(id)
    }
  })

  ipc.handle('campaigns:cancel', (_, id: number) => {
    const r = runners.get(id)
    if (r) r.cancelled = true
  })

  ipc.handle('campaigns:retryFailed', async (_, id: number) => {
    const db = getDb()
    const failed = db
      .prepare<[number], { contact_id: number }>(
        "SELECT contact_id FROM campaign_logs WHERE campaign_id = ? AND status = 'failed'"
      )
      .all(id)
      .map((r) => r.contact_id)
    if (!failed.length) return
    const c = rowToCampaign(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as Record<string, unknown>)
    const result = db
      .prepare(
        `INSERT INTO campaigns (name, template_id, smtp_id, total, status)
         VALUES (?, ?, ?, ?, 'pending')`
      )
      .run(`${c.name} (yeniden)`, c.templateId, c.smtpId, failed.length)
    void runCampaign(result.lastInsertRowid as number, failed, 1)
  })
}

export type { WebContents }
