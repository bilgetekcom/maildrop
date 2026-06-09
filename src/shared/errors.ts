/**
 * Locale-neutral error codes thrown by main process and translated in renderer.
 * Never throw raw localized strings from main — always throw `Error(code)` where
 * code is one of these constants, then the renderer maps it to its i18n key.
 */

export const ERR = {
  // Database / safeStorage
  DB_NOT_INIT: 'db_not_initialized',
  SAFE_STORAGE_UNAVAILABLE: 'safe_storage_unavailable',

  // SMTP error categories (mirrors main/lib/error-translator codes)
  SMTP_AUTH: 'smtp.auth',
  SMTP_TIMEOUT: 'smtp.timeout',
  SMTP_REFUSED: 'smtp.refused',
  SMTP_NOTFOUND: 'smtp.notfound',
  SMTP_SSL: 'smtp.ssl',
  SMTP_SPAM: 'smtp.spam',
  SMTP_QUOTA: 'smtp.quota',
  SMTP_MAILBOX: 'smtp.mailbox',
  SMTP_ENVELOPE: 'smtp.envelope',
  SMTP_UNKNOWN: 'smtp.unknown',
  SMTP_ATTACHMENT_MISSING: 'smtp.attachment_missing',

  // Filesystem
  PATH_INVALID: 'path.invalid',
  PATH_OUTSIDE: 'path.outside'
} as const

export type ErrorCode = (typeof ERR)[keyof typeof ERR]

export interface TranslatedSmtpResult {
  /** machine-readable code; renderer translates */
  code: ErrorCode
  /** raw error message for diagnostic display */
  raw?: string
}
