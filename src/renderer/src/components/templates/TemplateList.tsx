import { Mail, Plus, Trash2, BookOpen } from 'lucide-react'
import type { Template } from '../../../../shared/types'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { useT } from '../../i18n'

interface TemplateListProps {
  templates: Template[]
  selectedId: number | null
  onSelect: (id: number | null) => void
  onCreate: () => void
  onOpenLibrary: () => void
  onRemove: (t: Template) => void
}

export function TemplateList({
  templates,
  selectedId,
  onSelect,
  onCreate,
  onOpenLibrary,
  onRemove
}: TemplateListProps): JSX.Element {
  const { t } = useT()
  return (
    <aside className="flex w-72 shrink-0 flex-col border-r bg-card/40">
      <div className="border-b p-3 space-y-2">
        <Button onClick={onCreate} className="w-full">
          <Plus className="h-4 w-4" />
          {t('templates.newTemplate')}
        </Button>
        <Button onClick={onOpenLibrary} variant="outline" className="w-full">
          <BookOpen className="h-4 w-4" />
          {t('templates.library.openCta')}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {templates.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            {t('templates.empty')}
          </div>
        ) : (
          templates.map((tpl) => (
            <div
              key={tpl.id}
              className={cn(
                'group relative cursor-pointer rounded-md border px-3 py-2.5 transition-colors',
                selectedId === tpl.id
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent hover:bg-accent'
              )}
              onClick={() => onSelect(tpl.id)}
            >
              <div className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">{tpl.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {tpl.subject || t('templates.noSubject')}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(tpl)
                }}
                className="absolute right-2 top-2 hidden rounded p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground group-hover:block"
                title={t('templates.removeTitle')}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
