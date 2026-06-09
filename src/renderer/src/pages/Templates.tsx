import { useEffect, useState } from 'react'
import { Mail } from 'lucide-react'
import { useTemplatesStore } from '../store/templates'
import { TemplateList } from '../components/templates/TemplateList'
import { TemplateEditor } from '../components/templates/TemplateEditor'
import type { Template } from '../../../shared/types'
import { useT } from '../i18n'

export function Templates(): JSX.Element {
  const { t } = useT()
  const { templates, selectedId, refresh, select, remove } = useTemplatesStore()
  const [draftMode, setDraftMode] = useState(false)

  useEffect(() => {
    void refresh()
  }, [refresh])

  const selected = templates.find((t) => t.id === selectedId) ?? null

  async function handleRemove(t: Template): Promise<void> {
    const ok = window.confirm(`${t.name}`)
    if (!ok) return
    await remove(t.id)
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
        onRemove={handleRemove}
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
