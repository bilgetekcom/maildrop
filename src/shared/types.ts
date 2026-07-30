export type Id = number

export interface SmtpAccount {
  id: Id
  name: string
  host: string
  port: number
  secure: boolean
  user: string
  /** Gönderen (From) adresi. Boşsa `user` kullanılır. SMTP login ile From'un farklı olduğu durumlar için (ör. Brevo relay). */
  fromEmail: string
  encryptedPass: string
  isDefault: boolean
  createdAt: string
  /** Günlük maksimum gönderim adedi (varsayılan 100). 0 = sınırsız. */
  dailyLimit: number
  /** İki gönderim arası minimum saniye (varsayılan 0). */
  cooldownSeconds: number
  /** Bugün gönderilen mail sayısı (daily_reset_at'e göre sıfırlanır). */
  dailySentCount: number
  /** Bu hesaptan en son gönderim zamanı (ISO). cooldown check için. */
  lastSentAt: string | null
  /** Günlük sayacın sıfırlandığı tarih (YYYY-MM-DD). */
  dailyResetAt: string | null
}

export interface SmtpAccountInput {
  name: string
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  fromEmail?: string
  isDefault?: boolean
  dailyLimit?: number
  cooldownSeconds?: number
}

export interface Contact {
  id: Id
  firstName: string
  lastName: string
  email: string
  company: string | null
  customFields: Record<string, string>
  groupId: Id | null
  createdAt: string
}

export interface ContactGroup {
  id: Id
  name: string
  color: string
  createdAt: string
}

export interface Template {
  id: Id
  name: string
  subject: string
  bodyHtml: string
  variables: string[]
  attachmentPath: string | null
  createdAt: string
  updatedAt: string
}

export type CampaignStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'

export interface Campaign {
  id: Id
  name: string
  templateId: Id
  /** Tek hesap modunda kullanılan birincil hesap; havuz modunda bile bir başlangıç hesabı tutulur. */
  smtpId: Id
  total: number
  sent: number
  failed: number
  status: CampaignStatus
  startedAt: string | null
  finishedAt: string | null
  /** true ise her gönderim için en uygun havuz hesabı seçilir. */
  usePool: boolean
  /** Havuzdaki hesap ID'leri (usePool true ise dolu). */
  accountPoolIds: Id[]
  /** Gönderim saat aralığı başlangıcı, "HH:MM" formatında. Boş = aralık yok. */
  timeWindowStart: string | null
  timeWindowEnd: string | null
  /** true ise sadece pazartesi-cuma gönderilir. */
  weekdaysOnly: boolean
  /** Reply-To adresi (opsiyonel). */
  replyTo: string | null
}

export type SendStatus = 'success' | 'failed'

export interface CampaignLog {
  id: Id
  campaignId: Id
  contactId: Id
  email: string
  status: SendStatus
  errorMsg: string | null
  sentAt: string
  /** Hangi SMTP hesabından gönderildi (havuz modunda hesap bazında izleme). */
  smtpId: Id | null
}

export interface CampaignStartInput {
  name: string
  templateId: Id
  /** Tek hesap modunda zorunlu, havuz modunda accountPoolIds'in ilki. */
  smtpId: Id
  contactIds: Id[]
  ratePerSecond?: number
  scheduleAt?: string
  usePool?: boolean
  accountPoolIds?: Id[]
  timeWindowStart?: string | null
  timeWindowEnd?: string | null
  weekdaysOnly?: boolean
  replyTo?: string | null
}

export interface Suppression {
  id: Id
  email: string
  /** 'manual' | 'hard_bounce' | 'unsubscribe' */
  reason: string
  /** Hangi kampanyadan veya hangi kaynaktan eklendi. */
  source: string | null
  createdAt: string
}

export type UnsubscribeMethod = 'none' | 'mailto' | 'url' | 'custom'

export interface UnsubscribeConfig {
  method: UnsubscribeMethod
  /** mailto: e-posta adresi; url: tam URL; custom: serbest metin */
  value: string
}

export interface SendProgress {
  campaignId: Id
  sent: number
  failed: number
  total: number
  currentEmail: string | null
  status: CampaignStatus
}

export interface SmtpTestResult {
  ok: boolean
  /** Error code if !ok; renderer maps to localized message. Empty string on success. */
  code: string
  /** Raw upstream error message for diagnostics (may include vendor English text) */
  raw?: string
}

export interface SendLocale {
  /** UI locale, propagated to main so test mails and dynamic strings come out in user's language */
  locale: 'tr' | 'en'
}
