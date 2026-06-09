import type { IpcMain } from 'electron'
import { BrowserWindow } from 'electron'
import nodemailer from 'nodemailer'
import { existsSync } from 'fs'
import { getDb, decryptSecret } from '../db'
import { classifySmtpError } from '../lib/error-translator'
import { ERR } from '../../shared/errors'
import type { Campaign, CampaignLog, SendProgress } from '../../shared/types'

interface CampaignRunner {
  paused: boolean
  cancelled: boolean
  timer?: NodeJS.Timeout
}

const runners = new Map<number, CampaignRunner>()
const scheduledTimers = new Map<number, NodeJS.Timeout>()

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
  if (win && !win.isDestroyed()) win.webContents.send('campaigns:progress', progress)
}

function render(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''))
}

function buildVars(contact: Record<string, unknown>): Record<string, string> {
  const firstName = (contact.first_name as string) || ''
  const lastName = (contact.last_name as string) || ''
  const email = (contact.email as string) || ''
  const company = (contact.company as string) || ''
  let custom: Record<string, string> = {}
  try {
    custom = JSON.parse((contact.custom_fields as string) || '{}')
  } catch {
    custom = {}
  }
  return {
    Ad: firstName,
    Soyad: lastName,
    Email: email,
    Firma: company,
    FirstName: firstName,
    LastName: lastName,
    Company: company,
    ad: firstName,
    soyad: lastName,
    email,
    firma: company,
    firstname: firstName,
    lastname: lastName,
    company,
    ...custom
  }
}

async function runCampaign(campaignId: number): Promise<void> {
  const db = getDb()
  const existing = runners.get(campaignId)
  if (existing && !existing.cancelled) {
    // already running, do nothing
    return
  }

  const runner: CampaignRunner = { paused: false, cancelled: false }
  runners.set(campaignId, runner)

  try {
    const campaignRow = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId) as
      | Record<string, unknown>
      | undefined
    if (!campaignRow) {
      runners.delete(campaignId)
      return
    }
    const campaign = rowToCampaign(campaignRow)

    const ratePerSecond = (campaignRow.rate_per_second as number) || 1
    let targetIds: number[] = []
    try {
      targetIds = JSON.parse((campaignRow.target_contact_ids as string) || '[]') as number[]
    } catch {
      targetIds = []
    }
    if (targetIds.length === 0) {
      db.prepare(
        "UPDATE campaigns SET status = 'failed', finished_at = datetime('now') WHERE id = ?"
      ).run(campaignId)
      runners.delete(campaignId)
      return
    }

    const tpl = db.prepare('SELECT * FROM templates WHERE id = ?').get(campaign.templateId) as
      | Record<string, unknown>
      | undefined
    const smtp = db.prepare('SELECT * FROM smtp_accounts WHERE id = ?').get(campaign.smtpId) as
      | Record<string, unknown>
      | undefined
    if (!tpl || !smtp) {
      db.prepare(
        "UPDATE campaigns SET status = 'failed', finished_at = datetime('now') WHERE id = ?"
      ).run(campaignId)
      runners.delete(campaignId)
      return
    }

    const transport = nodemailer.createTransport({
      host: smtp.host as string,
      port: smtp.port as number,
      secure: Boolean(smtp.secure),
      auth: { user: smtp.user as string, pass: decryptSecret(smtp.encrypted_pass as string) },
      pool: true,
      maxConnections: 1,
      maxMessages: 100,
      connectionTimeout: 20_000,
      socketTimeout: 30_000
    })

    db.prepare(
      "UPDATE campaigns SET status = 'running', started_at = COALESCE(started_at, datetime('now')) WHERE id = ?"
    ).run(campaignId)

    const delayMs = Math.max(50, Math.floor(1000 / ratePerSecond))
    const logInsert = db.prepare(
      `INSERT INTO campaign_logs (campaign_id, contact_id, email, status, error_msg)
       VALUES (?, ?, ?, ?, ?)`
    )
    const updateCounts = db.prepare('UPDATE campaigns SET sent = ?, failed = ? WHERE id = ?')

    // Compute already-processed contacts so a resumed campaign skips done items.
    const processedRows = db
      .prepare<[number], { contact_id: number }>(
        'SELECT contact_id FROM campaign_logs WHERE campaign_id = ?'
      )
      .all(campaignId)
    const alreadyProcessed = new Set(processedRows.map((r) => r.contact_id))

    let sent = campaign.sent
    let failed = campaign.failed

    for (const cid of targetIds) {
      while (runner.paused && !runner.cancelled) {
        await new Promise((r) => setTimeout(r, 250))
      }
      if (runner.cancelled) break
      if (alreadyProcessed.has(cid)) continue

      const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(cid) as
        | Record<string, unknown>
        | undefined
      if (!contact) continue

      const vars = buildVars(contact)
      const subject = render(tpl.subject as string, vars)
      const html = render(tpl.body_html as string, vars)
      const attachmentPath = tpl.attachment_path as string | null | undefined
      const attachments =
        attachmentPath && existsSync(attachmentPath) ? [{ path: attachmentPath }] : undefined

      try {
        if (attachmentPath && !existsSync(attachmentPath)) {
          throw new Error(ERR.SMTP_ATTACHMENT_MISSING)
        }
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
        const err = e as Error
        const code =
          err.message === ERR.SMTP_ATTACHMENT_MISSING
            ? ERR.SMTP_ATTACHMENT_MISSING
            : classifySmtpError(err)
        logInsert.run(campaignId, cid, contact.email, 'failed', `${code}|${err.message}`)
      }

      updateCounts.run(sent, failed, campaignId)
      emitProgress({
        campaignId,
        sent,
        failed,
        total: targetIds.length,
        currentEmail: contact.email as string,
        status: runner.cancelled ? 'cancelled' : runner.paused ? 'paused' : 'running'
      })

      await new Promise((r) => setTimeout(r, delayMs))
    }

    try {
      transport.close()
    } catch {
      /* ignore */
    }

    const finalStatus: Campaign['status'] = runner.cancelled ? 'cancelled' : 'completed'
    db.prepare(
      "UPDATE campaigns SET status = ?, finished_at = datetime('now') WHERE id = ?"
    ).run(finalStatus, campaignId)
    emitProgress({
      campaignId,
      sent,
      failed,
      total: targetIds.length,
      currentEmail: null,
      status: finalStatus
    })
  } catch (e) {
    console.error('runCampaign fatal error', e)
    try {
      db.prepare(
        "UPDATE campaigns SET status = 'failed', finished_at = datetime('now') WHERE id = ?"
      ).run(campaignId)
      emitProgress({
        campaignId,
        sent: 0,
        failed: 0,
        total: 0,
        currentEmail: null,
        status: 'failed'
      })
    } catch {
      /* ignore secondary failure */
    }
  } finally {
    runners.delete(campaignId)
  }
}

/**
 * Recover state at app startup:
 *   - any campaign left in 'running' or 'paused' is marked 'cancelled'
 *     (we cannot safely auto-resume after a crash without user confirmation)
 *   - any 'pending' campaign with a future scheduled_at is re-armed
 *     with setTimeout
 */
export function recoverCampaignsOnStartup(): void {
  const db = getDb()
  try {
    db.prepare(
      "UPDATE campaigns SET status = 'cancelled', finished_at = datetime('now') WHERE status IN ('running','paused')"
    ).run()

    const scheduled = db
      .prepare<[], Record<string, unknown>>(
        "SELECT id, scheduled_at FROM campaigns WHERE status = 'pending' AND scheduled_at IS NOT NULL"
      )
      .all()
    const now = Date.now()
    for (const row of scheduled) {
      const id = row.id as number
      const ts = new Date((row.scheduled_at as string) ?? '').getTime()
      if (Number.isNaN(ts)) continue
      const ms = Math.max(0, ts - now)
      const t = setTimeout(() => {
        scheduledTimers.delete(id)
        void runCampaign(id)
      }, ms)
      scheduledTimers.set(id, t)
    }
  } catch (e) {
    console.warn('recoverCampaignsOnStartup failed', e)
  }
}

/**
 * Block app quit while a campaign is actively sending. Returns true if there
 * is at least one campaign whose runner is in flight (not paused).
 */
export function hasActiveSendingCampaign(): boolean {
  for (const r of runners.values()) {
    if (!r.paused && !r.cancelled) return true
  }
  return false
}

export function registerCampaignHandlers(ipc: IpcMain): void {
  ipc.removeHandler('campaigns:list')
  ipc.handle('campaigns:list', (): Campaign[] => {
    const db = getDb()
    return db
      .prepare<[], Record<string, unknown>>('SELECT * FROM campaigns ORDER BY id DESC')
      .all()
      .map(rowToCampaign)
  })

  ipc.removeHandler('campaigns:get')
  ipc.handle('campaigns:get', (_, id: number): Campaign => {
    return rowToCampaign(
      getDb().prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as Record<string, unknown>
    )
  })

  ipc.removeHandler('campaigns:logs')
  ipc.handle('campaigns:logs', (_, id: number): CampaignLog[] => {
    return getDb()
      .prepare<[number], Record<string, unknown>>(
        'SELECT * FROM campaign_logs WHERE campaign_id = ? ORDER BY id'
      )
      .all(id)
      .map(rowToLog)
  })

  ipc.removeHandler('campaigns:start')
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
      const rate = input.ratePerSecond ?? 1
      const targetJson = JSON.stringify(input.contactIds)

      const result = db
        .prepare(
          `INSERT INTO campaigns (name, template_id, smtp_id, total, sent, failed, status, scheduled_at, rate_per_second, target_contact_ids)
           VALUES (?, ?, ?, ?, 0, 0, 'pending', ?, ?, ?)`
        )
        .run(
          input.name,
          input.templateId,
          input.smtpId,
          input.contactIds.length,
          input.scheduleAt ?? null,
          rate,
          targetJson
        )
      const campaignId = result.lastInsertRowid as number

      if (input.scheduleAt) {
        const ms = Math.max(0, new Date(input.scheduleAt).getTime() - Date.now())
        const t = setTimeout(() => {
          scheduledTimers.delete(campaignId)
          void runCampaign(campaignId)
        }, ms)
        scheduledTimers.set(campaignId, t)
      } else {
        void runCampaign(campaignId)
      }
      return rowToCampaign(
        db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId) as Record<string, unknown>
      )
    }
  )

  ipc.removeHandler('campaigns:pause')
  ipc.handle('campaigns:pause', (_, id: number) => {
    const r = runners.get(id)
    if (r) {
      r.paused = true
      getDb().prepare("UPDATE campaigns SET status = 'paused' WHERE id = ?").run(id)
    }
  })

  ipc.removeHandler('campaigns:resume')
  ipc.handle('campaigns:resume', (_, id: number) => {
    const r = runners.get(id)
    if (r) {
      r.paused = false
      getDb().prepare("UPDATE campaigns SET status = 'running' WHERE id = ?").run(id)
    } else {
      // Runner is gone (app restart, crash). Re-launch from where the logs left off.
      void runCampaign(id)
    }
  })

  ipc.removeHandler('campaigns:cancel')
  ipc.handle('campaigns:cancel', (_, id: number) => {
    const r = runners.get(id)
    if (r) {
      r.cancelled = true
      r.paused = false
    }
    const t = scheduledTimers.get(id)
    if (t) {
      clearTimeout(t)
      scheduledTimers.delete(id)
    }
    getDb()
      .prepare(
        "UPDATE campaigns SET status = 'cancelled', finished_at = datetime('now') WHERE id = ? AND status != 'completed'"
      )
      .run(id)
  })

  ipc.removeHandler('campaigns:retryFailed')
  ipc.handle('campaigns:retryFailed', async (_, id: number) => {
    const db = getDb()
    const failed = db
      .prepare<[number], { contact_id: number }>(
        "SELECT contact_id FROM campaign_logs WHERE campaign_id = ? AND status = 'failed'"
      )
      .all(id)
      .map((r) => r.contact_id)
    if (!failed.length) return
    const c = rowToCampaign(
      db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as Record<string, unknown>
    )
    const result = db
      .prepare(
        `INSERT INTO campaigns (name, template_id, smtp_id, total, status, rate_per_second, target_contact_ids)
         VALUES (?, ?, ?, ?, 'pending', 1, ?)`
      )
      .run(`${c.name} (yeniden)`, c.templateId, c.smtpId, failed.length, JSON.stringify(failed))
    void runCampaign(result.lastInsertRowid as number)
  })
}
