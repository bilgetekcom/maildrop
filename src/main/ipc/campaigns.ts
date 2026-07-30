import type { IpcMain } from 'electron'
import { BrowserWindow } from 'electron'
import nodemailer, { type Transporter } from 'nodemailer'
import { existsSync } from 'fs'
import { getDb, decryptSecret } from '../db'
import { classifySmtpError } from '../lib/error-translator'
import { ERR } from '../../shared/errors'
import type {
  Campaign,
  CampaignLog,
  CampaignStartInput,
  SendProgress,
  UnsubscribeConfig
} from '../../shared/types'
import { isSuppressed, addSuppression } from './suppressions'
import { getUnsubscribeConfig } from './app-settings'

interface CampaignRunner {
  paused: boolean
  cancelled: boolean
  timer?: NodeJS.Timeout
}

const runners = new Map<number, CampaignRunner>()
const scheduledTimers = new Map<number, NodeJS.Timeout>()

function rowToCampaign(r: Record<string, unknown>): Campaign {
  let pool: number[] = []
  try {
    pool = JSON.parse((r.account_pool_ids as string) || '[]') as number[]
  } catch {
    pool = []
  }
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
    finishedAt: (r.finished_at as string) ?? null,
    usePool: Boolean(r.use_pool),
    accountPoolIds: pool,
    timeWindowStart: (r.time_window_start as string) ?? null,
    timeWindowEnd: (r.time_window_end as string) ?? null,
    weekdaysOnly: Boolean(r.weekdays_only),
    replyTo: (r.reply_to as string) ?? null
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
    sentAt: r.sent_at as string,
    smtpId: (r.smtp_id as number) ?? null
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

function todayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface PoolAccount {
  id: number
  host: string
  port: number
  secure: boolean
  user: string
  from_email: string | null
  encrypted_pass: string
  daily_limit: number
  cooldown_seconds: number
  daily_sent_count: number
  last_sent_at: string | null
  daily_reset_at: string | null
}

function loadAccount(id: number): PoolAccount | null {
  const db = getDb()
  const r = db.prepare('SELECT * FROM smtp_accounts WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!r) return null
  return {
    id: r.id as number,
    host: r.host as string,
    port: r.port as number,
    secure: Boolean(r.secure),
    user: r.user as string,
    from_email: (r.from_email as string) ?? null,
    encrypted_pass: r.encrypted_pass as string,
    daily_limit: (r.daily_limit as number) ?? 100,
    cooldown_seconds: (r.cooldown_seconds as number) ?? 0,
    daily_sent_count: (r.daily_sent_count as number) ?? 0,
    last_sent_at: (r.last_sent_at as string) ?? null,
    daily_reset_at: (r.daily_reset_at as string) ?? null
  }
}

function resetDailyIfNeeded(acc: PoolAccount): void {
  const today = todayKey()
  if (acc.daily_reset_at === today) return
  const db = getDb()
  db.prepare(
    'UPDATE smtp_accounts SET daily_sent_count = 0, daily_reset_at = ? WHERE id = ?'
  ).run(today, acc.id)
  acc.daily_sent_count = 0
  acc.daily_reset_at = today
}

function bumpUsage(accId: number): void {
  const db = getDb()
  db.prepare(
    "UPDATE smtp_accounts SET daily_sent_count = daily_sent_count + 1, last_sent_at = datetime('now') WHERE id = ?"
  ).run(accId)
}

/**
 * Pool'dan en uygun hesabı seç:
 *   - daily_limit > 0 ve daily_sent_count >= daily_limit ise atla
 *   - cooldown_seconds > 0 ve last_sent_at + cooldown henüz geçmediyse atla
 *   - Geri kalanlar arasında en az dailySentCount'lu olanı seç (load balancing)
 * Hiçbiri uygun değilse: { account: null, waitMs: en yakın cooldown sonu veya bir sonraki gün }
 */
function pickAccount(
  poolIds: number[]
): { account: PoolAccount | null; waitMs: number; reason: string } {
  let bestAccount: PoolAccount | null = null
  let bestUsage = Infinity
  let nextAvailableMs = Number.MAX_SAFE_INTEGER
  let allOverLimit = true
  const now = Date.now()

  for (const id of poolIds) {
    const acc = loadAccount(id)
    if (!acc) continue
    resetDailyIfNeeded(acc)

    if (acc.daily_limit > 0 && acc.daily_sent_count >= acc.daily_limit) {
      const tomorrow = new Date()
      tomorrow.setHours(24, 0, 30, 0)
      nextAvailableMs = Math.min(nextAvailableMs, tomorrow.getTime() - now)
      continue
    }
    allOverLimit = false

    let cooldownRemainingMs = 0
    if (acc.cooldown_seconds > 0 && acc.last_sent_at) {
      const lastMs = new Date(acc.last_sent_at + 'Z').getTime()
      cooldownRemainingMs = Math.max(0, lastMs + acc.cooldown_seconds * 1000 - now)
    }
    if (cooldownRemainingMs > 0) {
      nextAvailableMs = Math.min(nextAvailableMs, cooldownRemainingMs)
      continue
    }

    if (acc.daily_sent_count < bestUsage) {
      bestUsage = acc.daily_sent_count
      bestAccount = acc
    }
  }

  if (bestAccount) return { account: bestAccount, waitMs: 0, reason: 'ok' }
  if (allOverLimit) {
    return {
      account: null,
      waitMs: nextAvailableMs === Number.MAX_SAFE_INTEGER ? 60_000 : nextAvailableMs,
      reason: 'all_over_limit'
    }
  }
  return {
    account: null,
    waitMs: Math.min(nextAvailableMs, 60_000),
    reason: 'all_in_cooldown'
  }
}

/** "HH:MM" string'i dakikaya çevirir. */
function parseHHMM(s: string | null | undefined): number | null {
  if (!s) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim())
  if (!m) return null
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)))
  const mm = Math.min(59, Math.max(0, parseInt(m[2], 10)))
  return h * 60 + mm
}

/**
 * Zaman penceresi kontrolü.
 *   - timeWindowStart/End ikisi de null ise her zaman ok
 *   - start <= end: aynı gün içinde aralık (09:00-18:00)
 *   - start > end: gece aşan aralık (22:00-06:00)
 *   - weekdaysOnly true ise sadece pzt-cum (0=pazar, 6=cumartesi)
 * Dönüş: { allow: true } veya { allow: false, waitMs: bir sonraki açık aralığa kalan ms }
 */
function checkTimeWindow(
  startStr: string | null,
  endStr: string | null,
  weekdaysOnly: boolean
): { allow: boolean; waitMs: number } {
  const start = parseHHMM(startStr)
  const end = parseHHMM(endStr)
  const hasWindow = start !== null && end !== null && start !== end
  if (!hasWindow && !weekdaysOnly) return { allow: true, waitMs: 0 }

  const now = new Date()
  const dow = now.getDay()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const todayWeekday = dow >= 1 && dow <= 5

  if (!weekdaysOnly || todayWeekday) {
    if (!hasWindow) return { allow: true, waitMs: 0 }
    const s = start as number
    const e = end as number
    if (s < e) {
      if (minutes >= s && minutes < e) return { allow: true, waitMs: 0 }
    } else {
      // gece aşan: 22:00 - 06:00 gibi
      if (minutes >= s || minutes < e) return { allow: true, waitMs: 0 }
    }
  }

  // Pencere dışındayız; bir sonraki uygun ana kadarki ms'i bul
  for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
    const candidate = new Date(now)
    candidate.setDate(now.getDate() + dayOffset)
    const cdow = candidate.getDay()
    if (weekdaysOnly && (cdow === 0 || cdow === 6)) continue
    const baseMinutes = hasWindow ? (start as number) : 0
    candidate.setHours(Math.floor(baseMinutes / 60), baseMinutes % 60, 0, 0)
    if (candidate.getTime() <= now.getTime()) continue
    return { allow: false, waitMs: candidate.getTime() - now.getTime() }
  }
  return { allow: false, waitMs: 60 * 60 * 1000 }
}

function buildUnsubscribeHeader(cfg: UnsubscribeConfig): Record<string, string> | undefined {
  if (cfg.method === 'mailto' && cfg.value) {
    return {
      'List-Unsubscribe': `<mailto:${cfg.value}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    }
  }
  if (cfg.method === 'url' && cfg.value) {
    return {
      'List-Unsubscribe': `<${cfg.value}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    }
  }
  return undefined
}

function buildUnsubscribeFooter(cfg: UnsubscribeConfig, locale: 'tr' | 'en' = 'tr'): string {
  if (cfg.method === 'none' || !cfg.value) return ''
  const label = locale === 'tr' ? 'Listeden çıkmak için tıklayın' : 'Click here to unsubscribe'
  const style =
    'font-size:11px;color:#888;text-align:center;margin-top:24px;padding-top:12px;border-top:1px solid #eee;'
  if (cfg.method === 'mailto') {
    return `<p style="${style}"><a href="mailto:${cfg.value}?subject=Unsubscribe" style="color:#888;">${label}</a></p>`
  }
  if (cfg.method === 'url') {
    return `<p style="${style}"><a href="${cfg.value}" style="color:#888;">${label}</a></p>`
  }
  // custom: serbest metin
  return `<p style="${style}">${cfg.value}</p>`
}

const HARD_BOUNCE_CODES = new Set<string>([
  ERR.SMTP_NOTFOUND,
  ERR.SMTP_MAILBOX,
  ERR.SMTP_ENVELOPE
])

async function runCampaign(campaignId: number): Promise<void> {
  const db = getDb()
  const existing = runners.get(campaignId)
  if (existing && !existing.cancelled) return

  const runner: CampaignRunner = { paused: false, cancelled: false }
  runners.set(campaignId, runner)
  const transports = new Map<number, Transporter>()
  const closeAllTransports = (): void => {
    for (const t of transports.values()) {
      try {
        t.close()
      } catch {
        /* ignore */
      }
    }
    transports.clear()
  }

  try {
    const campaignRow = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId) as
      | Record<string, unknown>
      | undefined
    if (!campaignRow) {
      runners.delete(campaignId)
      return
    }
    const campaign = rowToCampaign(campaignRow)
    const baseRate = (campaignRow.rate_per_second as number) || 1
    const unsubscribeCfg = getUnsubscribeConfig()
    const unsubHeader = buildUnsubscribeHeader(unsubscribeCfg)
    const unsubFooter = buildUnsubscribeFooter(unsubscribeCfg)

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
    if (!tpl) {
      db.prepare(
        "UPDATE campaigns SET status = 'failed', finished_at = datetime('now') WHERE id = ?"
      ).run(campaignId)
      runners.delete(campaignId)
      return
    }

    // Havuzu tespit et: kullan_pool ise pool listesi, değilse tek hesap
    const poolIds: number[] = campaign.usePool && campaign.accountPoolIds.length
      ? campaign.accountPoolIds
      : [campaign.smtpId]

    db.prepare(
      "UPDATE campaigns SET status = 'running', started_at = COALESCE(started_at, datetime('now')) WHERE id = ?"
    ).run(campaignId)

    const baseDelayMs = Math.max(50, Math.floor(1000 / baseRate))
    const logInsert = db.prepare(
      `INSERT INTO campaign_logs (campaign_id, contact_id, email, status, error_msg, smtp_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    const updateCounts = db.prepare('UPDATE campaigns SET sent = ?, failed = ? WHERE id = ?')

    const processedRows = db
      .prepare<[number], { contact_id: number }>(
        'SELECT contact_id FROM campaign_logs WHERE campaign_id = ?'
      )
      .all(campaignId)
    const alreadyProcessed = new Set(processedRows.map((r) => r.contact_id))

    let sent = campaign.sent
    let failed = campaign.failed

    function jitter(ms: number): number {
      // ±%25 jitter
      const factor = 0.75 + Math.random() * 0.5
      return Math.max(50, Math.floor(ms * factor))
    }

    function getTransport(acc: PoolAccount): Transporter {
      const cached = transports.get(acc.id)
      if (cached) return cached
      const t = nodemailer.createTransport({
        host: acc.host,
        port: acc.port,
        secure: acc.secure,
        auth: { user: acc.user, pass: decryptSecret(acc.encrypted_pass) },
        pool: true,
        maxConnections: 1,
        maxMessages: 100,
        connectionTimeout: 20_000,
        socketTimeout: 30_000
      })
      transports.set(acc.id, t)
      return t
    }

    async function sleepWithPauseCheck(totalMs: number): Promise<void> {
      const step = 500
      let remaining = totalMs
      while (remaining > 0 && !runner.cancelled) {
        const chunk = Math.min(step, remaining)
        await new Promise((r) => setTimeout(r, chunk))
        remaining -= chunk
        // pause olursa bekle, cancel olursa çık
        while (runner.paused && !runner.cancelled) {
          await new Promise((r) => setTimeout(r, 250))
        }
      }
    }

    for (const cid of targetIds) {
      while (runner.paused && !runner.cancelled) {
        await new Promise((r) => setTimeout(r, 250))
      }
      if (runner.cancelled) break
      if (alreadyProcessed.has(cid)) continue

      // Zaman penceresi + hesap uygunlugu BIRLIKTE saglanana kadar bekle.
      // Hesap beklemesi (gunluk limit dolunca) gece yarisini asar; bu yuzden hesap
      // musaitlesince pencere TEKRAR kontrol edilmeli. Yoksa limiti dolu kampanya
      // gunluk sayac sifirlaninca 00:00'da pencere disina 1 mail sizdirir.
      let selectedAccount: PoolAccount | null = null
      while (!runner.cancelled) {
        const wnd = checkTimeWindow(
          campaign.timeWindowStart,
          campaign.timeWindowEnd,
          campaign.weekdaysOnly
        )
        if (!wnd.allow) {
          emitProgress({
            campaignId,
            sent,
            failed,
            total: targetIds.length,
            currentEmail: null,
            status: 'paused'
          })
          await sleepWithPauseCheck(Math.min(wnd.waitMs, 5 * 60 * 1000))
          continue
        }
        const pick = pickAccount(poolIds)
        if (!pick.account) {
          emitProgress({
            campaignId,
            sent,
            failed,
            total: targetIds.length,
            currentEmail: null,
            status: 'paused'
          })
          await sleepWithPauseCheck(Math.min(pick.waitMs, 5 * 60 * 1000))
          continue
        }
        selectedAccount = pick.account
        break
      }
      if (!selectedAccount || runner.cancelled) break

      const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(cid) as
        | Record<string, unknown>
        | undefined
      if (!contact) continue

      const email = (contact.email as string) || ''
      if (isSuppressed(email)) {
        failed++
        logInsert.run(campaignId, cid, email, 'failed', `suppressed|`, selectedAccount.id)
        updateCounts.run(sent, failed, campaignId)
        emitProgress({
          campaignId,
          sent,
          failed,
          total: targetIds.length,
          currentEmail: email,
          status: runner.cancelled ? 'cancelled' : 'running'
        })
        continue
      }

      const vars = buildVars(contact)
      const subject = render(tpl.subject as string, vars)
      let html = render(tpl.body_html as string, vars)
      if (unsubFooter) html = html + unsubFooter
      const attachmentPath = tpl.attachment_path as string | null | undefined
      const attachments =
        attachmentPath && existsSync(attachmentPath) ? [{ path: attachmentPath }] : undefined

      try {
        if (attachmentPath && !existsSync(attachmentPath)) {
          throw new Error(ERR.SMTP_ATTACHMENT_MISSING)
        }
        await getTransport(selectedAccount).sendMail({
          from: selectedAccount.from_email || selectedAccount.user,
          to: email,
          subject,
          html,
          replyTo: campaign.replyTo || undefined,
          headers: unsubHeader,
          attachments
        })
        sent++
        bumpUsage(selectedAccount.id)
        logInsert.run(campaignId, cid, email, 'success', null, selectedAccount.id)
      } catch (e) {
        failed++
        const err = e as Error
        const code =
          err.message === ERR.SMTP_ATTACHMENT_MISSING
            ? ERR.SMTP_ATTACHMENT_MISSING
            : classifySmtpError(err)
        logInsert.run(campaignId, cid, email, 'failed', `${code}|${err.message}`, selectedAccount.id)
        if (HARD_BOUNCE_CODES.has(code)) {
          addSuppression(email, 'hard_bounce', `campaign:${campaignId}`)
        }
      }

      updateCounts.run(sent, failed, campaignId)
      emitProgress({
        campaignId,
        sent,
        failed,
        total: targetIds.length,
        currentEmail: email,
        status: runner.cancelled ? 'cancelled' : runner.paused ? 'paused' : 'running'
      })

      await sleepWithPauseCheck(jitter(baseDelayMs))
    }

    closeAllTransports()

    // Hiç gönderim başarılı olmadıysa "completed" değil "failed" olmalı; yoksa
    // tamamen başarısız bir kampanya "tamamlandı" görünüp kullanıcıyı yanıltır.
    const finalStatus: Campaign['status'] = runner.cancelled
      ? 'cancelled'
      : sent === 0 && failed > 0
        ? 'failed'
        : 'completed'
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
    closeAllTransports()
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

export function recoverCampaignsOnStartup(): void {
  const db = getDb()
  try {
    // Uygulama kapanip acilinca, calisiyor durumundaki kampanyayi IPTAL ETME; kaldigi
    // yerden DEVAM ETTIR. Gunluk otomatik gonderim (zaman penceresi + gunluk limit)
    // ancak boyle surdurulebilir. Zaten gonderilenler campaign_logs'tan atlanir.
    // 'paused' olanlara dokunulmaz: onu kullanici bilerek duraklatmistir.
    const interrupted = db
      .prepare<[], { id: number }>("SELECT id FROM campaigns WHERE status = 'running'")
      .all()
    for (const row of interrupted) void runCampaign(row.id)

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
    async (_, input: CampaignStartInput): Promise<Campaign> => {
      const db = getDb()
      const rate = input.ratePerSecond ?? 1
      const targetJson = JSON.stringify(input.contactIds)
      const usePool = Boolean(input.usePool && input.accountPoolIds && input.accountPoolIds.length > 1)
      const poolIds = usePool ? input.accountPoolIds! : []
      const primarySmtp = usePool ? poolIds[0] : input.smtpId

      const result = db
        .prepare(
          `INSERT INTO campaigns
             (name, template_id, smtp_id, total, sent, failed, status,
              scheduled_at, rate_per_second, target_contact_ids,
              use_pool, account_pool_ids, time_window_start, time_window_end, weekdays_only, reply_to)
           VALUES (?, ?, ?, ?, 0, 0, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          input.name,
          input.templateId,
          primarySmtp,
          input.contactIds.length,
          input.scheduleAt ?? null,
          rate,
          targetJson,
          usePool ? 1 : 0,
          JSON.stringify(poolIds),
          input.timeWindowStart ?? null,
          input.timeWindowEnd ?? null,
          input.weekdaysOnly ? 1 : 0,
          input.replyTo ?? null
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
        `INSERT INTO campaigns
           (name, template_id, smtp_id, total, status, rate_per_second, target_contact_ids,
            use_pool, account_pool_ids, time_window_start, time_window_end, weekdays_only, reply_to)
         VALUES (?, ?, ?, ?, 'pending', 1, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        `${c.name} (yeniden)`,
        c.templateId,
        c.smtpId,
        failed.length,
        JSON.stringify(failed),
        c.usePool ? 1 : 0,
        JSON.stringify(c.accountPoolIds),
        c.timeWindowStart,
        c.timeWindowEnd,
        c.weekdaysOnly ? 1 : 0,
        c.replyTo
      )
    void runCampaign(result.lastInsertRowid as number)
  })
}
