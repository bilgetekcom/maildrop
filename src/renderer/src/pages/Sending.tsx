import { useEffect, useState } from 'react'
import { Send, ArrowRight, ArrowLeft, Users, Mail, Settings, AlertCircle } from 'lucide-react'
import { useSmtpStore } from '../store/smtp'
import { useTemplatesStore } from '../store/templates'
import { useCampaignsStore } from '../store/campaigns'
import { ContactPicker } from '../components/sending/ContactPicker'
import { TemplatePicker } from '../components/sending/TemplatePicker'
import { CampaignConsole } from '../components/sending/CampaignConsole'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select } from '../components/ui/select'
import { Alert } from '../components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import type { Campaign } from '../../../shared/types'
import { cn } from '../lib/utils'
import { useT } from '../i18n'

type Step = 'contacts' | 'template' | 'settings' | 'confirm' | 'running'

export function Sending(): JSX.Element {
  const { t } = useT()
  const { accounts, refresh: refreshSmtp } = useSmtpStore()
  const { templates, refresh: refreshTemplates } = useTemplatesStore()
  const { start, subscribe } = useCampaignsStore()

  const [step, setStep] = useState<Step>('contacts')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [templateId, setTemplateId] = useState<number | null>(null)
  const [smtpId, setSmtpId] = useState<number | null>(null)
  const [rate, setRate] = useState(1)
  const [scheduleAt, setScheduleAt] = useState('')
  const [name, setName] = useState('')
  const [active, setActive] = useState<Campaign | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void refreshSmtp()
    void refreshTemplates()
    const unsub = subscribe()
    return unsub
  }, [refreshSmtp, refreshTemplates, subscribe])

  useEffect(() => {
    if (smtpId === null && accounts.length > 0) {
      const def = accounts.find((a) => a.isDefault) ?? accounts[0]
      setSmtpId(def.id)
    }
  }, [accounts, smtpId])

  const template = templates.find((tpl) => tpl.id === templateId) ?? null

  function reset(): void {
    setStep('contacts')
    setSelected(new Set())
    setTemplateId(null)
    setRate(1)
    setScheduleAt('')
    setName('')
    setActive(null)
    setError(null)
  }

  async function handleStart(): Promise<void> {
    if (!templateId || !smtpId || selected.size === 0) return
    setError(null)
    try {
      const c = await start({
        name: name.trim() || `${template?.name ?? 'Send'} — ${new Date().toLocaleString()}`,
        templateId,
        smtpId,
        contactIds: [...selected],
        ratePerSecond: rate,
        scheduleAt: scheduleAt || undefined
      })
      setActive(c)
      setStep('running')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-8 py-10">
        <Alert variant="info" title={t('sending.noSmtpTitle')}>
          {t('sending.noSmtpDesc')}
        </Alert>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-8 py-10">
        <Alert variant="info" title={t('sending.noTemplateTitle')}>
          {t('sending.noTemplateDesc')}
        </Alert>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t('sending.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('sending.subtitle')}</p>
      </header>

      <Stepper current={step} />

      <div className="mt-6">
        {step === 'contacts' && (
          <div className="space-y-4">
            <ContactPicker selected={selected} onChange={setSelected} />
            <div className="flex justify-end">
              <Button onClick={() => setStep('template')} disabled={selected.size === 0}>
                {t('sending.nextTemplate')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'template' && (
          <div className="space-y-4">
            <TemplatePicker selectedId={templateId} onChange={setTemplateId} />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('contacts')}>
                <ArrowLeft className="h-4 w-4" />
                {t('common.back')}
              </Button>
              <Button onClick={() => setStep('settings')} disabled={!templateId}>
                {t('sending.nextSettings')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'settings' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('sending.settings.cardTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="campaign-name">{t('sending.settings.campaignName')}</Label>
                  <Input
                    id="campaign-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="smtp">{t('sending.settings.fromAccount')}</Label>
                  <Select
                    id="smtp"
                    value={smtpId ?? ''}
                    onChange={(e) => setSmtpId(Number(e.target.value))}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.user}) {a.isDefault ? `— ${t('common.default')}` : ''}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rate">{t('sending.settings.rate')}</Label>
                  <Select id="rate" value={rate} onChange={(e) => setRate(Number(e.target.value))}>
                    <option value={0.5}>{t('sending.settings.rateOptions.half')}</option>
                    <option value={1}>{t('sending.settings.rateOptions.one')}</option>
                    <option value={2}>{t('sending.settings.rateOptions.two')}</option>
                    <option value={5}>{t('sending.settings.rateOptions.five')}</option>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t('sending.settings.rateHint')}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="schedule">{t('sending.settings.schedule')}</Label>
                  <Input
                    id="schedule"
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('sending.settings.scheduleHint')}
                  </p>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('template')}>
                <ArrowLeft className="h-4 w-4" />
                {t('common.back')}
              </Button>
              <Button onClick={() => setStep('confirm')}>
                {t('sending.nextConfirm')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('sending.confirm.cardTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row
                  label={t('sending.confirm.recipientCount')}
                  value={t('sending.confirm.recipientCountValue', { n: selected.size })}
                />
                <Row label={t('sending.confirm.templateLabel')} value={template?.name ?? '—'} />
                <Row label={t('sending.confirm.subjectLabel')} value={template?.subject ?? '—'} />
                <Row
                  label={t('sending.confirm.fromLabel')}
                  value={accounts.find((a) => a.id === smtpId)?.user ?? '—'}
                />
                <Row label={t('sending.confirm.rateLabel')} value={t('sending.confirm.rateValue', { n: rate })} />
                <Row
                  label={t('sending.confirm.estimatedDuration')}
                  value={t('sending.confirm.minutes', {
                    n: Math.ceil(selected.size / rate / 60)
                  })}
                />
                {scheduleAt && (
                  <Row
                    label={t('sending.confirm.scheduleLabel')}
                    value={new Date(scheduleAt).toLocaleString()}
                  />
                )}
              </CardContent>
            </Card>

            <Alert variant="info" title={t('sending.confirm.doubleCheckTitle')}>
              {t('sending.confirm.doubleCheckBody', {
                count: selected.size,
                from: accounts.find((a) => a.id === smtpId)?.user ?? ''
              })}
            </Alert>

            {error && (
              <Alert variant="error" title={t('sending.confirm.errorTitle')}>
                <span className="inline-flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {error}
                </span>
              </Alert>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('settings')}>
                <ArrowLeft className="h-4 w-4" />
                {t('common.back')}
              </Button>
              <Button onClick={handleStart}>
                <Send className="h-4 w-4" />
                {scheduleAt ? t('sending.confirm.schedule') : t('sending.confirm.sendNow')}
              </Button>
            </div>
          </div>
        )}

        {step === 'running' && active && (
          <div className="space-y-4">
            <CampaignConsole campaign={active} onDone={reset} />
          </div>
        )}
      </div>
    </div>
  )
}

function Stepper({ current }: { current: Step }): JSX.Element {
  const { t } = useT()
  const steps: { id: Step; label: string; icon: typeof Users }[] = [
    { id: 'contacts', label: t('sending.steps.contacts'), icon: Users },
    { id: 'template', label: t('sending.steps.template'), icon: Mail },
    { id: 'settings', label: t('sending.steps.settings'), icon: Settings },
    { id: 'confirm', label: t('sending.steps.confirm'), icon: Send }
  ]
  const currentIndex = current === 'running' ? steps.length : steps.findIndex((s) => s.id === current)

  return (
    <div className="flex items-center">
      {steps.map((s, i) => {
        const Icon = s.icon
        const done = i < currentIndex
        const isCurrent = i === currentIndex
        return (
          <div key={s.id} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors',
                  done && 'border-emerald-500 bg-emerald-500 text-white',
                  isCurrent && 'border-primary bg-primary text-primary-foreground',
                  !done && !isCurrent && 'border-muted bg-muted text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  'mt-1.5 text-xs',
                  isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'
                )}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('mx-2 h-px flex-1', done ? 'bg-emerald-500' : 'bg-border')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex justify-between border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
