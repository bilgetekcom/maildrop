import { useEffect, useState } from 'react'
import { Mail } from 'lucide-react'
import { useTemplatesStore } from '../store/templates'
import { TemplateList } from '../components/templates/TemplateList'
import { TemplateEditor } from '../components/templates/TemplateEditor'
import { LibraryDialog } from '../components/templates/LibraryDialog'
import type { Template } from '../../../shared/types'
import type { LibraryTemplate } from '../../../shared/template-library'
import { useT, type Locale } from '../i18n'
import { useToast } from '../components/ui/toast'

export function Templates(): JSX.Element {
  const { t, locale } = useT()
  const toast = useToast()
  const { templates, selectedId, refresh, select, remove, create } = useTemplatesStore()
  const [draftMode, setDraftMode] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function handleCopyFromLibrary(item: LibraryTemplate): Promise<void> {
    const lang: Locale = locale
    const created = await create({
      name: item.name[lang],
      subject: item.subject[lang],
      bodyHtml: item.bodyHtml[lang],
      attachmentPath: null
    })
    select(created.id)
    setDraftMode(false)
  }

  const selected = templates.find((tpl) => tpl.id === selectedId) ?? null

  async function handleRemove(tpl: Template): Promise<void> {
    const ok = window.confirm(t('templates.removeConfirm', { name: tpl.name }))
    if (!ok) return
    try {
      await remove(tpl.id)
    } catch (e) {
      const msg = (e as Error).message
      if (msg.includes('FOREIGN KEY') || msg.includes('RESTRICT')) {
        toast.push(t('toast.templateDeleteBlocked'), 'error', 6000)
      } else {
        toast.push(msg, 'error', 6000)
      }
    }
  }

  function handleCreate(): void {
    select(null)
    setDraftMode(true)
  }

  function handleSelect(id: number | null): void {
    select(id)
    setDraftMode(false)
  }

  const showEditor = draftMode || selected !== null

  return (
    <div className="flex h-full">
      <TemplateList
        templates={templates}
        selectedId={selectedId}
        onSelect={handleSelect}
        onCreate={handleCreate}
        onOpenLibrary={() => setLibraryOpen(true)}
        onRemove={handleRemove}
      />
      <LibraryDialog
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onCopied={handleCopyFromLibrary}
      />
      <div className="flex-1 min-w-0">
        {showEditor ? (
          <TemplateEditor
            template={selected}
            onCreated={(tt) => {
              setDraftMode(false)
              select(tt.id)
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <Mail className="h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">{t('templates.selectPrompt')}</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {t('templates.selectDesc', { example1: '{{Ad}}', example2: '{{Firma}}' })}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
