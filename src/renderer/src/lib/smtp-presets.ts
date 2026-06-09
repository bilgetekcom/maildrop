export interface SmtpPreset {
  id: 'gmail' | 'outlook' | 'yahoo' | 'custom'
  host: string
  port: number
  secure: boolean
  helpUrl: string
}

export const SMTP_PRESETS: SmtpPreset[] = [
  {
    id: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    helpUrl: 'https://support.google.com/accounts/answer/185833'
  },
  {
    id: 'outlook',
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    helpUrl: 'https://support.microsoft.com/help/9b94'
  },
  {
    id: 'yahoo',
    host: 'smtp.mail.yahoo.com',
    port: 465,
    secure: true,
    helpUrl: 'https://help.yahoo.com/kb/SLN15241.html'
  },
  {
    id: 'custom',
    host: '',
    port: 587,
    secure: false,
    helpUrl: ''
  }
]

export function findPreset(id: string): SmtpPreset {
  return SMTP_PRESETS.find((p) => p.id === id) ?? SMTP_PRESETS[SMTP_PRESETS.length - 1]
}
