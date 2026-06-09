import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog } from '../ui/dialog'
import { Select } from '../ui/select'
import { Label } from '../ui/label'
import { Alert } from '../ui/alert'
import type { Contact } from '../../../../shared/types'
import { useT } from '../../i18n'

interface PreviewDialogProps {
  open: boolean
  onClose: () => void
  templateId: number | null
  subject: string
  bodyHtml: string
}

function render(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''))
}

export function PreviewDialog({
  open,
  onClose,
  templateId,
  subject,
  bodyHtml
}: PreviewDialogProps): JSX.Element {
  const { t } = useT()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactId, setContactId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    void (async () => {
      setBusy(true)
      const cs = await window.api.contacts.list()
      setContacts(cs)
      setContactId(cs[0]?.id ?? null)
      setBusy(false)
    })()
  }, [open])

  const contact = contacts.find((c) => c.id === contactId)
  const vars: Record<string, string> = contact
    ? {
        Ad: contact.firstName,
        Soyad: contact.lastName,
        Email: contact.email,
        Firma: contact.company ?? '',
        ...contact.customFields
      }
    : {}
  const renderedSubject = render(subject, vars)
  const renderedBody = render(bodyHtml, vars)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t('templates.preview.title')}
      description={t('templates.preview.subtitle')}
      className="max-w-3xl"
    >
      {busy ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : contacts.length === 0 ? (
        <Alert variant="info">{t('templates.preview.noContacts')}</Alert>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="prev-contact">{t('templates.preview.testContact')}</Label>
            <Select
              id="prev-contact"
              value={contactId ?? ''}
              onChange={(e) => setContactId(Number(e.target.value))}
            >
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} — {c.email}
                </option>
              ))}
            </Select>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <div className="space-y-1 border-b bg-muted/40 px-4 py-3">
              <div className="text-xs text-muted-foreground">{t('templates.preview.subjectLabel')}</div>
              <div className="font-semibold">{renderedSubject || t('templates.preview.empty')}</div>
              <div className="mt-2 text-xs text-muted-foreground">{t('templates.preview.toLabel')}</div>
              <div className="text-sm">{contact?.email}</div>
            </div>
            <div
              className="prose prose-sm max-w-none bg-background p-6"
              dangerouslySetInnerHTML={{ __html: renderedBody }}
            />
          </div>

          {!templateId && (
            <p className="text-xs text-muted-foreground">{t('templates.preview.draftNote')}</p>
          )}
        </div>
      )}
    </Dialog>
  )
}
