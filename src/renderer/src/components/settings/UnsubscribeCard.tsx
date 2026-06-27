import { useEffect, useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import type { UnsubscribeConfig, UnsubscribeMethod } from '../../../../shared/types'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select } from '../ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Alert } from '../ui/alert'
import { useT } from '../../i18n'
import { useToast } from '../ui/toast'

export function UnsubscribeCard(): JSX.Element {
  const { t } = useT()
  const toast = useToast()
  const [method, setMethod] = useState<UnsubscribeMethod>('none')
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void window.api.appSettings
      .getUnsubscribe()
      .then((cfg) => {
        setMethod(cfg.method)
        setValue(cfg.value)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(): Promise<void> {
    setSaving(true)
    try {
      const cfg: UnsubscribeConfig = { method, value: value.trim() }
      await window.api.appSettings.setUnsubscribe(cfg)
      toast.push(t('settings.unsubscribe.saved'), 'success', 3000)
    } finally {
      setSaving(false)
    }
  }

  const valueLabelKey =
    method === 'mailto'
      ? 'settings.unsubscribe.valueMailto'
      : method === 'url'
        ? 'settings.unsubscribe.valueUrl'
        : 'settings.unsubscribe.valueCustom'

  const placeholderKey =
    method === 'mailto'
      ? 'settings.unsubscribe.valueMailtoPlaceholder'
      : method === 'url'
        ? 'settings.unsubscribe.valueUrlPlaceholder'
        : 'settings.unsubscribe.valueCustomPlaceholder'

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.unsubscribe.cardTitle')}</CardTitle>
        <CardDescription>{t('settings.unsubscribe.cardDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <>
            <div className="space-y-1.5 max-w-md">
              <Label htmlFor="unsub-method">{t('settings.unsubscribe.methodLabel')}</Label>
              <Select
                id="unsub-method"
                value={method}
                onChange={(e) => setMethod(e.target.value as UnsubscribeMethod)}
              >
                <option value="none">{t('settings.unsubscribe.methodNone')}</option>
                <option value="mailto">{t('settings.unsubscribe.methodMailto')}</option>
                <option value="url">{t('settings.unsubscribe.methodUrl')}</option>
                <option value="custom">{t('settings.unsubscribe.methodCustom')}</option>
              </Select>
            </div>

            {method === 'none' && (
              <Alert variant="warning">{t('settings.unsubscribe.noneHint')}</Alert>
            )}

            {method !== 'none' && (
              <div className="space-y-1.5">
                <Label htmlFor="unsub-value">{t(valueLabelKey)}</Label>
                <Input
                  id="unsub-value"
                  value={value}
                  placeholder={t(placeholderKey)}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
            )}

            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('settings.unsubscribe.save')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
