/**
 * Translates main-process error codes into the user's locale.
 *
 * Main never throws localized text. It throws an Error whose .message is an
 * ErrorCode (see src/shared/errors.ts). For SMTP failures specifically, we
 * also persist the code prefix in campaign_logs.error_msg as "code|raw"
 * (see ipc/campaigns.ts) so the renderer can format the right localized
 * sentence at view time, even when the original send happened in a different
 * locale or version.
 */

type T = (key: string, vars?: Record<string, string | number>) => string

const CODE_TO_KEYS: Record<string, { title: string; hint: string }> = {
  'smtp.auth': { title: 'errors.smtp.auth', hint: 'errors.smtp.authHint' },
  'smtp.timeout': { title: 'errors.smtp.timeout', hint: 'errors.smtp.timeoutHint' },
  'smtp.refused': { title: 'errors.smtp.refused', hint: 'errors.smtp.refusedHint' },
  'smtp.notfound': { title: 'errors.smtp.notfound', hint: 'errors.smtp.notfoundHint' },
  'smtp.ssl': { title: 'errors.smtp.ssl', hint: 'errors.smtp.sslHint' },
  'smtp.spam': { title: 'errors.smtp.spam', hint: 'errors.smtp.spamHint' },
  'smtp.quota': { title: 'errors.smtp.quota', hint: 'errors.smtp.quotaHint' },
  'smtp.mailbox': { title: 'errors.smtp.mailbox', hint: 'errors.smtp.mailboxHint' },
  'smtp.envelope': { title: 'errors.smtp.envelope', hint: 'errors.smtp.envelopeHint' },
  'smtp.unknown': { title: 'errors.smtp.unknown', hint: 'errors.smtp.unknownHint' },
  'smtp.attachment_missing': {
    title: 'errors.smtp.attachmentMissing',
    hint: 'errors.smtp.attachmentMissingHint'
  },
  db_not_initialized: { title: 'errors.dbNotInit', hint: 'errors.dbNotInitHint' },
  safe_storage_unavailable: {
    title: 'errors.safeStorage',
    hint: 'errors.safeStorageHint'
  },
  'path.invalid': { title: 'errors.pathInvalid', hint: 'errors.pathInvalidHint' },
  'path.outside': { title: 'errors.pathOutside', hint: 'errors.pathOutsideHint' }
}

export function translateCode(code: string, t: T): string {
  const map = CODE_TO_KEYS[code]
  if (!map) {
    return code
  }
  return `${t(map.title)} ${t(map.hint)}`
}

/**
 * Parses a campaign_logs.error_msg value (stored as "code|raw") and returns
 * the localized message. Falls back to the raw text if format is unexpected.
 */
export function translateLogMessage(stored: string | null | undefined, t: T): string {
  if (!stored) return ''
  const idx = stored.indexOf('|')
  if (idx < 0) {
    // legacy or non-code prefix
    return stored
  }
  const code = stored.slice(0, idx)
  return translateCode(code, t)
}

export function translateSmtpResult(
  code: string,
  raw: string | undefined,
  t: T
): { ok: false; message: string; raw?: string } | { ok: true; message: string } {
  if (!code) {
    return { ok: true, message: t('smtp.testSuccess') }
  }
  return { ok: false, message: translateCode(code, t), raw }
}
