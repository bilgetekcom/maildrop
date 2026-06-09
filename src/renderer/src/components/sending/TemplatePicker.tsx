import { useEffect } from 'react'
import { Mail } from 'lucide-react'
import { useTemplatesStore } from '../../store/templates'
import { cn } from '../../lib/utils'
import { useT } from '../../i18n'

interface TemplatePickerProps {
  selectedId: number | null
  onChange: (id: number | null) => void
}

export function TemplatePicker({ selectedId, onChange }: TemplatePickerProps): JSX.Element {
  const { t } = useT()
  const { templates, refresh } = useTemplatesStore()

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (templates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card/50 p-10 text-center">
        <Mail className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">{t('sending.noTemplatesYet')}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {templates.map((tpl) => (
        <button
          key={tpl.id}
          onClick={() => onChange(tpl.id)}
          className={cn(
            'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors',
            selectedId === tpl.id ? 'border-primary bg-primary/5' : 'hover:bg-accent'
          )}
        >
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
              selectedId === tpl.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}
          >
            <Mail className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-semibold">{tpl.name}</div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{tpl.subject}</div>
            {tpl.variables.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tpl.variables.slice(0, 4).map((v) => (
                  <span
                    key={v}
                    className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-800"
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
                {tpl.variables.length > 4 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{tpl.variables.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
