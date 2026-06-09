import { useEffect, useMemo, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Paperclip, Eye, Save, FileUp, X, Loader2 } from 'lucide-react'
import { useTemplatesStore } from '../../store/templates'
import type { Template } from '../../../../shared/types'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Alert } from '../ui/alert'
import { EditorToolbar } from './EditorToolbar'
import { VariablePanel } from './VariablePanel'
import { PreviewDialog } from './PreviewDialog'
import { useT } from '../../i18n'
import { useToast } from '../ui/toast'

interface TemplateEditorProps {
  template: Template | null
  onCreated?: (t: Template) => void
}

function extractVariables(s: string): string[] {
  const set = new Set<string>()
  const re = /\{\{\s*([\w]+)\s*\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(s)) !== null) set.add(m[1])
  return [...set]
}

export function TemplateEditor({ template, onCreated }: TemplateEditorProps): JSX.Element {
  const { t } = useT()
  const toast = useToast()
  const { create, update } = useTemplatesStore()
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [attachment, setAttachment] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ variant: 'success' | 'error'; message: string } | null>(
    null
  )
  const [showPreview, setShowPreview] = useState(false)
  const subjectRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: t('templates.editor.placeholder') })
    ],
    content: ''
  })

  useEffect(() => {
    if (!editor) return
    setName(template?.name ?? '')
    setSubject(template?.subject ?? '')
    setAttachment(template?.attachmentPath ?? null)
    editor.commands.setContent(template?.bodyHtml ?? '')
    setFeedback(null)
  }, [template, editor])

  const bodyHtml = editor?.getHTML() ?? ''
  const detected = useMemo(() => extractVariables(subject + ' ' + bodyHtml), [subject, bodyHtml])

  function insertVariable(varName: string): void {
    const token = `{{${varName}}}`
    if (document.activeElement === subjectRef.current && subjectRef.current) {
      const input = subjectRef.current
      const start = input.selectionStart ?? subject.length
      const end = input.selectionEnd ?? subject.length
      const next = subject.slice(0, start) + token + subject.slice(end)
      setSubject(next)
      requestAnimationFrame(() => {
        input.focus()
        input.setSelectionRange(start + token.length, start + token.length)
      })
      return
    }
    editor?.chain().focus().insertContent(token).run()
  }

  async function handleAttach(): Promise<void> {
    const path = await window.api.dialog.openAttachment()
    if (!path) return
    try {
      const stat = await window.api.dialog.statFile(path)
      if (stat?.sizeMB && stat.sizeMB > 25) {
        toast.push(t('toast.attachmentTooLarge', { size: stat.sizeMB.toFixed(1) }), 'error', 7000)
      }
    } catch {
      /* ignore stat failure */
    }
    setAttachment(path)
  }

  async function handleImportHtml(): Promise<void> {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.html,.htm'
    input.onchange = async (): Promise<void> => {
      const file = input.files?.[0]
      if (!file) return
      const html = await file.text()
      editor?.commands.setContent(html)
    }
    input.click()
  }

  async function handleSave(): Promise<void> {
    if (!name.trim()) {
      setFeedback({ variant: 'error', message: t('templates.editor.nameRequired') })
      return
    }
    if (!subject.trim()) {
      setFeedback({ variant: 'error', message: t('templates.editor.subjectRequired') })
      return
    }
    if (!editor || editor.isEmpty) {
      setFeedback({ variant: 'error', message: t('templates.editor.bodyRequired') })
      return
    }
    setBusy(true)
    setFeedback(null)
    try {
      const payload = {
        name: name.trim(),
        subject: subject.trim(),
        bodyHtml: editor.getHTML(),
        attachmentPath: attachment
      }
      if (template) {
        await update(template.id, payload)
      } else {
        const created = await create(payload)
        onCreated?.(created)
      }
      setFeedback({ variant: 'success', message: t('templates.editor.saved') })
    } catch (e) {
      setFeedback({ variant: 'error', message: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_280px]">
      <div className="flex h-full flex-col overflow-hidden">
        <div className="space-y-3 border-b bg-card p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">{t('templates.editor.name')}</Label>
              <Input
                id="tpl-name"
                placeholder={t('templates.editor.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-subject">{t('templates.editor.subject')}</Label>
              <Input
                id="tpl-subject"
                ref={subjectRef}
                placeholder={t('templates.editor.subjectPlaceholder')}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          </div>
        </div>

        <EditorToolbar editor={editor} />

        <div className="flex-1 overflow-auto bg-background">
          <EditorContent
            editor={editor}
            className="prose prose-sm mx-auto max-w-3xl px-6 py-6 focus:outline-none"
          />
        </div>

        <div className="space-y-3 border-t bg-card p-4">
          {attachment && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate">{attachment.split(/[\\/]/).pop()}</span>
              <button
                onClick={() => setAttachment(null)}
                className="text-muted-foreground hover:text-destructive"
                title={t('templates.editor.removeAttachment')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {feedback && <Alert variant={feedback.variant}>{feedback.message}</Alert>}
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleSave} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('templates.editor.saveTemplate')}
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="h-4 w-4" />
              {t('common.preview')}
            </Button>
            <Button variant="outline" onClick={handleAttach}>
              <Paperclip className="h-4 w-4" />
              {attachment
                ? t('templates.editor.changeAttachment')
                : t('templates.editor.addAttachment')}
            </Button>
            <Button variant="ghost" onClick={handleImportHtml}>
              <FileUp className="h-4 w-4" />
              {t('templates.editor.importHtml')}
            </Button>
          </div>
        </div>
      </div>

      <aside className="border-l bg-card/40 p-4 overflow-y-auto hidden lg:block">
        <VariablePanel detected={detected} onInsert={insertVariable} />
      </aside>

      <PreviewDialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        templateId={template?.id ?? null}
        subject={subject}
        bodyHtml={bodyHtml}
      />
    </div>
  )
}
