import { useMemo, useState } from 'react'
import { BookOpen, Copy, X } from 'lucide-react'
import {
  TEMPLATE_LIBRARY,
  LIBRARY_CATEGORIES,
  type LibraryCategory,
  type LibraryTemplate
} from '../../../../shared/template-library'
import { Button } from '../ui/button'
import { useT, type Locale } from '../../i18n'
import { useToast } from '../ui/toast'
import { cn } from '../../lib/utils'

interface LibraryDialogProps {
  open: boolean
  onClose: () => void
  onCopied: (template: LibraryTemplate) => Promise<void>
}

export function LibraryDialog({ open, onClose, onCopied }: LibraryDialogProps): JSX.Element | null {
  const { t, locale } = useT()
  const toast = useToast()
  const [category, setCategory] = useState<LibraryCategory | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const items = useMemo(() => {
    return category === 'all'
      ? TEMPLATE_LIBRARY
      : TEMPLATE_LIBRARY.filter((t) => t.category === category)
  }, [category])

  const selected = items.find((i) => i.id === selectedId) ?? items[0] ?? null

  if (!open) return null

  async function handleCopy(): Promise<void> {
    if (!selected) return
    setBusy(true)
    try {
      await onCopied(selected)
      toast.push(t('templates.library.copied'), 'success', 3000)
      onClose()
    } catch (e) {
      toast.push((e as Error).message, 'error', 5000)
    } finally {
      setBusy(false)
    }
  }

  const lang: Locale = locale

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[640px] max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-semibold">{t('templates.library.title')}</h2>
              <p className="text-xs text-muted-foreground">{t('templates.library.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Categories sidebar */}
          <aside className="w-52 shrink-0 border-r bg-muted/20 p-2 overflow-y-auto">
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('templates.library.categories')}
            </p>
            <button
              onClick={() => {
                setCategory('all')
                setSelectedId(null)
              }}
              className={cn(
                'w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-accent',
                category === 'all' && 'bg-accent font-medium'
              )}
            >
              {t('templates.library.all')} ({TEMPLATE_LIBRARY.length})
            </button>
            {LIBRARY_CATEGORIES.map((c) => {
              const count = TEMPLATE_LIBRARY.filter((tpl) => tpl.category === c).length
              return (
                <button
                  key={c}
                  onClick={() => {
                    setCategory(c)
                    setSelectedId(null)
                  }}
                  className={cn(
                    'mt-0.5 w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-accent',
                    category === c && 'bg-accent font-medium'
                  )}
                >
                  {t(`templates.library.category.${c}`)} ({count})
                </button>
              )
            })}
          </aside>

          {/* Templates list */}
          <div className="w-72 shrink-0 border-r overflow-y-auto">
            {items.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => setSelectedId(tpl.id)}
                className={cn(
                  'w-full border-b px-4 py-3 text-left hover:bg-accent',
                  (selected?.id === tpl.id) && 'bg-accent'
                )}
              >
                <div className="truncate text-sm font-medium">{tpl.name[lang]}</div>
                <div className="truncate text-xs text-muted-foreground">{tpl.subject[lang]}</div>
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {selected ? (
              <>
                <div className="border-b bg-muted/20 px-5 py-3">
                  <h3 className="text-sm font-semibold">{selected.name[lang]}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('templates.library.preview')}: {selected.subject[lang]}
                  </p>
                </div>
                <div
                  className="prose prose-sm max-w-none flex-1 overflow-y-auto p-5"
                  dangerouslySetInnerHTML={{ __html: selected.bodyHtml[lang] }}
                />
                <div className="border-t bg-card px-5 py-3 flex justify-end">
                  <Button onClick={handleCopy} disabled={busy}>
                    <Copy className="h-4 w-4" />
                    {t('templates.library.copy')}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                {t('common.select')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
