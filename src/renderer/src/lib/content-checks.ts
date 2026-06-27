export interface ContentHint {
  severity: 'warn'
  /** i18n key under "templates.editor.hints" */
  key: string
  /** Optional vars for interpolation */
  vars?: Record<string, string | number>
}

const TRIGGER_WORDS_TR = [
  'ücretsiz',
  'bedava',
  'şimdi tıkla',
  'kazandın',
  'kazandınız',
  'son fırsat',
  '100% garanti',
  '%100 garanti',
  'risksiz',
  'acil',
  'aciliyet',
  'tıklayın',
  'hemen al'
]

const TRIGGER_WORDS_EN = [
  'free',
  'click here',
  'you won',
  'you have won',
  'last chance',
  'urgent',
  'risk-free',
  'act now',
  'buy now',
  '100% guaranteed',
  'limited time'
]

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function countImages(html: string): number {
  const m = html.match(/<img\b/gi)
  return m ? m.length : 0
}

export function analyzeContent(subject: string, bodyHtml: string): ContentHint[] {
  const hints: ContentHint[] = []
  const subjTrim = subject.trim()

  // Subject all caps (3+ kelime ve hepsi büyük harf)
  if (subjTrim.length >= 6) {
    const lettersOnly = subjTrim.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, '')
    if (lettersOnly.length >= 6 && lettersOnly === lettersOnly.toUpperCase()) {
      hints.push({ severity: 'warn', key: 'subjectAllCaps' })
    }
  }

  // Subject 3+ exclamation
  const exclaimCount = (subjTrim.match(/!/g) || []).length
  if (exclaimCount >= 3) {
    hints.push({ severity: 'warn', key: 'manyExclamations' })
  }

  // Subject too long
  if (subjTrim.length > 78) {
    hints.push({ severity: 'warn', key: 'subjectTooLong', vars: { n: subjTrim.length } })
  }

  // Trigger words (subject + body birleştirilmiş)
  const plain = (subjTrim + ' ' + stripHtml(bodyHtml)).toLowerCase()
  const found = new Set<string>()
  for (const w of [...TRIGGER_WORDS_TR, ...TRIGGER_WORDS_EN]) {
    if (plain.includes(w.toLowerCase())) found.add(w)
  }
  if (found.size > 0) {
    hints.push({
      severity: 'warn',
      key: 'triggerWords',
      vars: { words: [...found].slice(0, 5).join(', ') }
    })
  }

  // Image-only: image var ama metin <20 karakter
  const plainBody = stripHtml(bodyHtml)
  if (countImages(bodyHtml) > 0 && plainBody.length < 20) {
    hints.push({ severity: 'warn', key: 'imageOnly' })
  }

  return hints
}
