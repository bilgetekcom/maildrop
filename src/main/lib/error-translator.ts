import { ERR, type ErrorCode } from '../../shared/errors'

const RULES: Array<{ test: RegExp; code: ErrorCode }> = [
  { test: /EAUTH|Username and Password not accepted|535|authentication failed|invalid login/i, code: ERR.SMTP_AUTH },
  { test: /ETIMEDOUT|timeout|operation timed out/i, code: ERR.SMTP_TIMEOUT },
  { test: /ECONNREFUSED/i, code: ERR.SMTP_REFUSED },
  { test: /ENOTFOUND|getaddrinfo|EAI_AGAIN/i, code: ERR.SMTP_NOTFOUND },
  { test: /self.signed certificate|SELF_SIGNED_CERT_IN_CHAIN|UNABLE_TO_VERIFY_LEAF_SIGNATURE/i, code: ERR.SMTP_SSL },
  { test: /554|spam|blacklist|blocked/i, code: ERR.SMTP_SPAM },
  { test: /quota|rate limit|too many|5\.7\.0/i, code: ERR.SMTP_QUOTA },
  { test: /mailbox unavailable|550|user unknown|address rejected/i, code: ERR.SMTP_MAILBOX },
  { test: /EENVELOPE|invalid envelope/i, code: ERR.SMTP_ENVELOPE }
]

export function classifySmtpError(err: Error): ErrorCode {
  const msg = err.message || String(err)
  for (const rule of RULES) {
    if (rule.test.test(msg)) return rule.code
  }
  return ERR.SMTP_UNKNOWN
}
