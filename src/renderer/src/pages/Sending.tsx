import { useEffect, useState } from 'react'
import { Send, ArrowRight, ArrowLeft, Users, Mail, Settings, AlertCircle, Eye } from 'lucide-react'
import { useSmtpStore } from '../store/smtp'
import { useTemplatesStore } from '../store/templates'
import { useCampaignsStore } from '../store/campaigns'
import { ContactPicker } from '../components/sending/ContactPicker'
import { TemplatePicker } from '../components/sending/TemplatePicker'
import { CampaignConsole } from '../components/sending/CampaignConsole'
import { EmailPreviewDialog } from '../components/sending/EmailPreviewDialog'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select } from '../components/ui/select'
import { Switch } from '../components/ui/switch'
import { Alert } from '../components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import type { Campaign, UnsubscribeConfig } from '../../../shared/types'
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
  const [usePool, setUsePool] = useState(false)
  const [poolIds, setPoolIds] = useState<Set<number>>(new Set())
  const [rate, setRate] = useState(1)
  const [scheduleAt, setScheduleAt] = useState('')
  const [timeWindowStart, setTimeWindowStart] = useState('')
  const [timeWindowEnd, setTimeWindowEnd] = useState('')
  const [weekdaysOnly, setWeekdaysOnly] = useState(false)
  const [replyTo, setReplyTo] = useState('')
  const [name, setName] = useState('')
  const [active, setActive] = useState<Campaign | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [unsubCfg, setUnsubCfg] = useState<UnsubscribeConfig | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    void refreshSmtp()
    void refreshTemplates()
    void window.api.appSettings.getUnsubscribe().then(setUnsubCfg)
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
  const hasUnsubConfigured = unsubCfg && unsubCfg.method !== 'none' && unsubCfg.value.trim() !== ''

  function reset(): void {
    setStep('contacts')
    setSelected(new Set())
    setTemplateId(null)
    setUsePool(false)
    setPoolIds(new Set())
    setRate(1)
    setScheduleAt('')
    setTimeWindowStart('')
    setTimeWindowEnd('')
    setWeekdaysOnly(false)
    setReplyTo('')
    setName('')
    setActive(null)
    setError(null)
  }

  async function handleStart(): Promise<void> {
    if (!templateId || selected.size === 0) return
    const pool = [...poolIds]
    const primary = usePool ? (pool[0] ?? smtpId) : smtpId
    if (!primary) return
    setError(null)
    try {
      const c = await start({
        name: name.trim() || `${template?.name ?? 'Send'} — ${new Date().toLocaleString()}`,
        templateId,
        smtpId: primary,
        contactIds: [...selected],
        ratePerSecond: rate,
        scheduleAt: scheduleAt || undefined,
        usePool,
        accountPoolIds: usePool ? pool : undefined,
        timeWindowStart: timeWindowStart || null,
        timeWindowEnd: timeWindowEnd || null,
        weekdaysOnly,
        replyTo: replyTo.trim() || null
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

  function togglePool(id: number): void {
    setPoolIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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

                <div className="space-y-2">
                  <Switch
                    id="use-pool"
                    checked={usePool}
                    onChange={(e) => setUsePool(e.target.checked)}
                    label={t('sending.settings.usePoolLabel')}
                  />
                  <p className="text-xs text-muted-foreground">{t('sending.settings.usePoolHint')}</p>
                </div>

                {usePool ? (
                  <div className="space-y-1.5">
                    <Label>{t('sending.settings.poolAccounts')}</Label>
                    <div className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-2">
                      {accounts.map((a) => (
                        <label
                          key={a.id}
                          className="flex cursor-pointer items-start gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={poolIds.has(a.id)}
                            onChange={() => togglePool(a.id)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="font-medium">{a.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {a.user}
                            </span>
                            {a.dailyLimit > 0 && (
                              <span className="block text-xs text-muted-foreground">
                                {t('settings.card.todayUsage', {
                                  sent: a.dailySentCount,
                                  limit: a.dailyLimit
                                })}
                              </span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                    {poolIds.size < 2 && (
                      <p className="text-xs text-amber-600">{t('sending.settings.poolMinHint')}</p>
                    )}
                  </div>
                ) : (
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
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="reply-to">{t('sending.settings.replyTo')}</Label>
                  <Input
                    id="reply-to"
                    type="email"
                    placeholder="info@bilgetek.com"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{t('sending.settings.replyToHint')}</p>
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
                  <Label>{t('sending.settings.timeWindow')}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={timeWindowStart}
                      onChange={(e) => setTimeWindowStart(e.target.value)}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">→</span>
                    <Input
                      type="time"
                      value={timeWindowEnd}
                      onChange={(e) => setTimeWindowEnd(e.target.value)}
                      className="w-32"
                    />
                    {(timeWindowStart || timeWindowEnd) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setTimeWindowStart('')
                          setTimeWindowEnd('')
                        }}
                      >
                        {t('common.clear')}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('sending.settings.timeWindowHint')}
                  </p>
                </div>

                <Switch
                  id="weekdays-only"
                  checked={weekdaysOnly}
                  onChange={(e) => setWeekdaysOnly(e.target.checked)}
                  label={t('sending.settings.weekdaysOnly')}
                />

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
              <Button
                onClick={() => setStep('confirm')}
                disabled={usePool && poolIds.size < 2}
              >
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
                  value={
                    usePool
                      ? t('sending.confirm.poolValue', { n: poolIds.size })
                      : accounts.find((a) => a.id === smtpId)?.user ?? '—'
                  }
                />
                {replyTo && <Row label={t('sending.confirm.replyToLabel')} value={replyTo} />}
                {(timeWindowStart && timeWindowEnd) && (
                  <Row
                    label={t('sending.confirm.timeWindowLabel')}
                    value={`${timeWindowStart} – ${timeWindowEnd}${weekdaysOnly ? ' · ' + t('sending.confirm.weekdaysShort') : ''}`}
                  />
                )}
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

            <Button variant="outline" className="w-full" onClick={() => setShowPreview(true)}>
              <Eye className="h-4 w-4" />
              {t('sending.confirm.previewButton')}
            </Button>

            <EmailPreviewDialog
              open={showPreview}
              onClose={() => setShowPreview(false)}
              templateId={templateId}
              contactIds={[...selected]}
              title={t('sending.confirm.previewTitle')}
              subtitle={t('sending.confirm.previewSubtitle')}
            />

            <Alert variant="info" title={t('sending.confirm.doubleCheckTitle')}>
              {t('sending.confirm.doubleCheckBody', {
                count: selected.size,
                from: usePool ? t('sending.confirm.poolValue', { n: poolIds.size }) : (accounts.find((a) => a.id === smtpId)?.user ?? '')
              })}
            </Alert>

            {!hasUnsubConfigured && (
              <Alert variant="warning" title={t('sending.confirm.unsubWarnTitle')}>
                {t('sending.confirm.unsubWarnBody')}
              </Alert>
            )}

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
