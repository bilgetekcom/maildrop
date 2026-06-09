import { useEffect, useState } from 'react'
import { Variable, Plus } from 'lucide-react'
import { useT } from '../../i18n'

interface VariablePanelProps {
  detected: string[]
  onInsert: (varName: string) => void
}

const BUILTIN = ['Ad', 'Soyad', 'Email', 'Firma']

export function VariablePanel({ detected, onInsert }: VariablePanelProps): JSX.Element {
  const { t } = useT()
  const [customFields, setCustomFields] = useState<string[]>([])

  useEffect(() => {
    void (async () => {
      const contacts = await window.api.contacts.list()
      const set = new Set<string>()
      contacts.forEach((c) => {
        Object.keys(c.customFields ?? {}).forEach((k) => set.add(k))
      })
      setCustomFields([...set])
    })()
  }, [])

  const used = new Set(detected)
  const all = [...BUILTIN, ...customFields.filter((c) => !BUILTIN.includes(c))]

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Variable className="h-3 w-3" />
          {t('templates.variables.header')}
        </div>
        <p className="mb-3 text-xs text-muted-foreground">{t('templates.variables.hint')}</p>
        <div className="flex flex-wrap gap-1.5">
          {all.map((v) => {
            const isUsed = used.has(v)
            return (
              <button
                key={v}
                onClick={() => onInsert(v)}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent ${
                  isUsed
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-input'
                }`}
                title={isUsed ? t('templates.variables.used') : t('templates.variables.addTooltip')}
              >
                <Plus className="h-3 w-3" />
                {v}
              </button>
            )
          })}
        </div>
      </div>

      {detected.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('templates.variables.detected')}
          </div>
          <div className="flex flex-wrap gap-1">
            {detected.map((v) => (
              <span
                key={v}
                className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800"
              >
                {`{{${v}}}`}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
