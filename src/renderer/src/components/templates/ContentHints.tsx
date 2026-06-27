import { useMemo } from 'react'
import { AlertTriangle, Sparkles } from 'lucide-react'
import { analyzeContent } from '../../lib/content-checks'
import { useT } from '../../i18n'

interface ContentHintsProps {
  subject: string
  bodyHtml: string
}

export function ContentHints({ subject, bodyHtml }: ContentHintsProps): JSX.Element {
  const { t } = useT()
  const hints = useMemo(() => analyzeContent(subject, bodyHtml), [subject, bodyHtml])

  return (
    <div className="rounded-lg border bg-card p-3">
      <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        {t('templates.editor.hintsTitle')}
      </h3>
      {hints.length === 0 ? (
        <p className="text-xs text-emerald-700">{t('templates.editor.hintsClean')}</p>
      ) : (
        <ul className="space-y-1.5">
          {hints.map((h, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{t(`templates.editor.hints.${h.key}`, h.vars)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
