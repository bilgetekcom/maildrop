import { useState, type FormEvent } from 'react'
import { Send, Save, Loader2, ExternalLink } from 'lucide-react'
import { SMTP_PRESETS, findPreset } from '../../lib/smtp-presets'
import type { SmtpAccountInput, SmtpTestResult } from '../../../../shared/types'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select } from '../ui/select'
import { Switch } from '../ui/switch'
import { Alert } from '../ui/alert'
import { useT } from '../../i18n'

interface AccountFormProps {
  initial?: Partial<SmtpAccountInput> & { presetId?: string }
  showPassword?: boolean
  passwordPlaceholder?: string
  submitLabel: string
  onSubmit: (input: SmtpAccountInput) => Promise<void>
  onTest: (input: SmtpAccountInput, sampleTo: string) => Promise<SmtpTestResult>
}

export function AccountForm({
  initial,
  showPassword = true,
  passwordPlaceholder,
  submitLabel,
  onSubmit,
  onTest
}: AccountFormProps): JSX.Element {
  const { t } = useT()
  const [presetId, setPresetId] = useState(initial?.presetId ?? 'gmail')
  const preset = findPreset(presetId)

  const [name, setName] = useState(initial?.name ?? '')
  const [host, setHost] = useState(initial?.host ?? preset.host)
  const [port, setPort] = useState(initial?.port ?? preset.port)
  const [secure, setSecure] = useState(initial?.secure ?? preset.secure)
  const [user, setUser] = useState(initial?.user ?? '')
  const [password, setPassword] = useState('')
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false)

  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)
  const [feedback, setFeedback] = useState<{ variant: 'success' | 'error'; message: string } | null>(
    null
  )

  function handlePresetChange(id: string): void {
    setPresetId(id)
    const p = findPreset(id)
    if (id !== 'custom') {
      setHost(p.host)
      setPort(p.port)
      setSecure(p.secure)
    }
    setFeedback(null)
  }

  function buildInput(): SmtpAccountInput {
    return {
      name: name.trim() || user.trim() || 'New Account',
      host: host.trim(),
      port: Number(port) || 587,
      secure,
      user: user.trim(),
      password,
      isDefault
    }
  }

  function validate(forTest = false): string | null {
    if (!host.trim()) return t('settings.form.hostRequired')
    if (!user.trim() || !user.includes('@')) return t('settings.form.emailRequired')
    if ((forTest || showPassword) && !password) return t('settings.form.passwordRequired')
    return null
  }

  async function handleTest(): Promise<void> {
    const err = validate(true)
    if (err) {
      setFeedback({ variant: 'error', message: err })
      return
    }
    setTesting(true)
    setFeedback(null)
    try {
      const result = await onTest(buildInput(), user.trim())
      setFeedback({ variant: result.ok ? 'success' : 'error', message: result.message })
    } catch (e) {
      setFeedback({ variant: 'error', message: (e as Error).message })
    } finally {
      setTesting(false)
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    const err = validate(false)
    if (err) {
      setFeedback({ variant: 'error', message: err })
      return
    }
    setBusy(true)
    setFeedback(null)
    try {
      await onSubmit(buildInput())
      setFeedback({ variant: 'success', message: t('settings.form.saved') })
      if (!initial) {
        setName('')
        setUser('')
        setPassword('')
        setIsDefault(false)
      }
    } catch (e) {
      setFeedback({ variant: 'error', message: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="preset">{t('settings.form.provider')}</Label>
          <Select
            id="preset"
            value={presetId}
            onChange={(e) => handlePresetChange(e.target.value)}
          >
            {SMTP_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {t(`smtp.presets.${p.id}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">{t('settings.form.accountName')}</Label>
          <Input
            id="name"
            placeholder={t('settings.form.accountNamePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="host">{t('settings.form.host')}</Label>
          <Input
            id="host"
            value={host}
            disabled={presetId !== 'custom'}
            onChange={(e) => setHost(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="port">{t('settings.form.port')}</Label>
          <Input
            id="port"
            type="number"
            value={port}
            disabled={presetId !== 'custom'}
            onChange={(e) => setPort(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="secure"
          checked={secure}
          onChange={(e) => setSecure(e.target.checked)}
          disabled={presetId !== 'custom'}
          label={t('settings.form.secure')}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="user">{t('settings.form.email')}</Label>
        <Input
          id="user"
          type="email"
          placeholder="ad@example.com"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          autoComplete="email"
        />
      </div>

      {showPassword && (
        <div className="space-y-1.5">
          <Label htmlFor="password">{t('settings.form.password')}</Label>
          <Input
            id="password"
            type="password"
            placeholder={passwordPlaceholder ?? '••••••••'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            {t(`smtp.hints.${preset.id}`)}{' '}
            {preset.helpUrl && (
              <a
                href={preset.helpUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {t('common.help')}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </p>
        </div>
      )}

      <Switch
        id="isDefault"
        checked={isDefault}
        onChange={(e) => setIsDefault(e.target.checked)}
        label={t('settings.form.isDefault')}
      />

      {feedback && <Alert variant={feedback.variant}>{feedback.message}</Alert>}

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button type="submit" disabled={busy || testing}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={handleTest} disabled={busy || testing}>
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t('common.test')}
        </Button>
        <p className="ml-auto text-xs text-muted-foreground">{t('settings.form.testHint')}</p>
      </div>
    </form>
  )
}
