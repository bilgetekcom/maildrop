import { useEffect, useState } from 'react'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'
import { Alert } from '../ui/alert'
import { useT } from '../../i18n'

interface EmailPreviewDialogProps {
  open: boolean
  onClose: () => void
  templateId: number | null
  /** Önizlenecek alıcı(lar). Birden fazlaysa aralarında gezinilir. */
  contactIds: number[]
  initialIndex?: number
  title?: string
  subtitle?: string
}

/**
 * Bir şablonu, gerçek bir alıcının merge verisiyle GÖNDERİMLE BİREBİR AYNI şekilde
 * render edip gösterir (templates:preview IPC — gönderimdeki buildVars ile aynı).
 * Hem gönderim onay adımında (ne gidecek) hem kampanya detayında (ne gitti) kullanılır.
 */
export function EmailPreviewDialog({
  open,
  onClose,
  templateId,
  contactIds,
  initialIndex = 0,
  title,
  subtitle
}: EmailPreviewDialogProps): JSX.Element {
  const { t } = useT()
  const [idx, setIdx] = useState(initialIndex)
  const [data, setData] = useState<{ to: string; subject: string; html: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setIdx(initialIndex)
  }, [open, initialIndex])

  const total = contactIds.length
  const contactId = contactIds[idx] ?? null

  useEffect(() => {
    if (!open || templateId == null || contactId == null) return
    let cancelled = false
    setBusy(true)
    window.api.templates
      .preview(templateId, contactId)
      .then((r) => !cancelled && setData(r))
      .catch(() => !cancelled && setData(null))
      .finally(() => !cancelled && setBusy(false))
    return () => {
      cancelled = true
    }
  }, [open, templateId, contactId])

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={title ?? t('templates.preview.title')}
      description={subtitle ?? t('templates.preview.subtitle')}
      className="max-w-3xl"
    >
      {templateId == null ? (
        <Alert variant="info">{t('emailPreview.noTemplate')}</Alert>
      ) : (
        <div className="space-y-3">
          {total > 1 && (
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                disabled={idx === 0 || busy}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {t('emailPreview.recipientPager', { i: idx + 1, n: total })}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
                disabled={idx >= total - 1 || busy}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border">
            <div className="space-y-1 border-b bg-muted/40 px-4 py-3">
              <div className="text-xs text-muted-foreground">{t('templates.preview.toLabel')}</div>
              <div className="text-sm">{data?.to ?? '—'}</div>
              <div className="mt-2 text-xs text-muted-foreground">
                {t('templates.preview.subjectLabel')}
              </div>
              <div className="font-semibold">{data?.subject || '—'}</div>
            </div>
            {busy ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div
                className="prose prose-sm max-w-none bg-background p-6"
                dangerouslySetInnerHTML={{ __html: data?.html ?? '' }}
              />
            )}
          </div>
        </div>
      )}
    </Dialog>
  )
}
