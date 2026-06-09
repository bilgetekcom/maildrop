export type Id = number

export interface SmtpAccount {
  id: Id
  name: string
  host: string
  port: number
  secure: boolean
  user: string
  encryptedPass: string
  isDefault: boolean
  createdAt: string
}

export interface SmtpAccountInput {
  name: string
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  isDefault?: boolean
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
  smtpId: Id
  total: number
  sent: number
  failed: number
  status: CampaignStatus
  startedAt: string | null
  finishedAt: string | null
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
