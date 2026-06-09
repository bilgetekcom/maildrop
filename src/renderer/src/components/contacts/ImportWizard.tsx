import { useState } from 'react'
import { FileSpreadsheet, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Select } from '../ui/select'
import { Alert } from '../ui/alert'
import { useContactsStore } from '../../store/contacts'
import { useT } from '../../i18n'

interface ImportWizardProps {
  open: boolean
  onClose: () => void
}

type Step = 'pick' | 'map' | 'done'

function guessMapping(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  const lower = headers.map((h) => h.toLowerCase())
  const find = (...keys: string[]): string | null => {
    for (const k of keys) {
      const i = lower.findIndex((h) => h.includes(k))
      if (i >= 0) return headers[i]
    }
    return null
  }
  const fn = find('ad', 'isim', 'first', 'name')
  const ln = find('soyad', 'last')
  const em = find('email', 'mail', 'e-posta', 'eposta')
  const co = find('firma', 'şirket', 'sirket', 'company')
  if (fn) map.firstName = fn
  if (ln) map.lastName = ln
  if (em) map.email = em
  if (co) map.company = co
  return map
}

export function ImportWizard({ open, onClose }: ImportWizardProps): JSX.Element {
  const { t } = useT()
  const { previewExcel, importExcel } = useContactsStore()
  const [step, setStep] = useState<Step>('pick')
  const [filePath, setFilePath] = useState<string | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [sample, setSample] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [customFields, setCustomFields] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ inserted: number; duplicates: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const FIELDS: { key: string; label: string }[] = [
    { key: 'firstName', label: t('contacts.import.fieldFirstName') },
    { key: 'lastName', label: t('contacts.import.fieldLastName') },
    { key: 'email', label: t('contacts.import.fieldEmail') },
    { key: 'company', label: t('contacts.import.fieldCompany') }
  ]

  function reset(): void {
    setStep('pick')
    setFilePath(null)
    setHeaders([])
    setSample([])
    setMapping({})
    setCustomFields([])
    setResult(null)
    setError(null)
  }

  function handleClose(): void {
    reset()
    onClose()
  }

  async function pickFile(): Promise<void> {
    setError(null)
    const path = await window.api.dialog.openExcel()
    if (!path) return
    setBusy(true)
    try {
      const { headers: h, sample: s } = await previewExcel(path)
      if (h.length === 0) {
        setError(t('contacts.import.fileReadError'))
        return
      }
      setFilePath(path)
      setHeaders(h)
      setSample(s)
      const guess = guessMapping(h)
      setMapping(guess)
      const usedCols = new Set(Object.values(guess))
      setCustomFields(h.filter((col) => !usedCols.has(col)))
      setStep('map')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function doImport(): Promise<void> {
    if (!filePath) return
    if (!mapping.email) {
      setError(t('contacts.import.emailRequired'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const fullMapping = { ...mapping }
      customFields.forEach((col) => {
        fullMapping[col] = col
      })
      const r = await importExcel(filePath, fullMapping)
      setResult(r)
      setStep('done')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && handleClose()}
      title={t('contacts.import.title')}
      description={t('contacts.import.subtitle')}
      className="max-w-2xl"
    >
      {step === 'pick' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-dashed bg-card/50 p-10 text-center">
            <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {t('contacts.import.supportedFiles')}
            </p>
            <Button onClick={pickFile} disabled={busy} className="mt-4">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              {t('contacts.import.pickFile')}
            </Button>
          </div>
          {error && <Alert variant="error">{error}</Alert>}
        </div>
      )}

      {step === 'map' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label>{f.label}</Label>
                <Select
                  value={mapping[f.key] ?? ''}
                  onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                >
                  <option value="">{t('contacts.import.noneSelected')}</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>

          {sample.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                {t('contacts.import.preview', { n: sample.length })}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      {headers.map((h) => (
                        <th
                          key={h}
                          className="px-2 py-1 text-left font-medium text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sample.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {row.map((cell, j) => (
                          <td key={j} className="truncate px-2 py-1">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">{t('contacts.import.customFieldsNote')}</p>

          {error && <Alert variant="error">{error}</Alert>}

          <div className="flex justify-between gap-2 pt-2">
            <Button variant="ghost" onClick={() => setStep('pick')} disabled={busy}>
              ← {t('common.back')}
            </Button>
            <Button onClick={doImport} disabled={busy || !mapping.email}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {t('contacts.import.doImport')}
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <div className="space-y-4">
          <Alert variant="success" title={t('contacts.import.doneTitle')}>
            {t('contacts.import.doneInserted', { n: result.inserted })}
            {result.duplicates.length > 0 && (
              <>
                <br />
                {t('contacts.import.doneDuplicates', { n: result.duplicates.length })}
              </>
            )}
          </Alert>

          {result.duplicates.length > 0 && (
            <div className="max-h-40 overflow-auto rounded-lg border bg-muted/20 p-3 text-xs">
              <div className="mb-1 font-semibold text-muted-foreground">
                {t('contacts.import.skippedAddresses')}
              </div>
              {result.duplicates.slice(0, 50).map((d) => (
                <div key={d}>{d}</div>
              ))}
              {result.duplicates.length > 50 && (
                <div className="mt-1 italic text-muted-foreground">
                  {t('contacts.import.andMore', { n: result.duplicates.length - 50 })}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={handleClose}>
              <CheckCircle2 className="h-4 w-4" />
              {t('common.finish')}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
