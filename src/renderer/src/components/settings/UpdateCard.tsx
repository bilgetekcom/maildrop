import { useEffect } from 'react'
import { RefreshCw, Download, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { useUpdaterStore } from '../../store/updater'
import { useT } from '../../i18n'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Alert } from '../ui/alert'

export function UpdateCard(): JSX.Element {
  const { t } = useT()
  const { status, currentVersion, available, progress, error, init, check, download, install } =
    useUpdaterStore()

  useEffect(() => {
    void init()
  }, [init])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.updates.cardTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {t('settings.updates.currentVersion')}{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">v{currentVersion}</code>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={check}
            disabled={status === 'checking' || status === 'downloading'}
          >
            {status === 'checking' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t('settings.updates.check')}
          </Button>
        </div>

        {status === 'not-available' && (
          <Alert variant="success" title={t('settings.updates.upToDate')}>
            {t('settings.updates.upToDateBody', { version: currentVersion })}
          </Alert>
        )}

        {status === 'available' && available && (
          <Alert variant="info" title={t('settings.updates.newVersion', { version: available.version })}>
            <p className="mb-3">{t('settings.updates.newVersionBody')}</p>
            {available.releaseNotes && (
              <details className="mb-3 text-xs">
                <summary className="cursor-pointer font-semibold">
                  {t('settings.updates.releaseNotes')}
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-background/50 p-2 text-[11px]">
                  {String(available.releaseNotes).slice(0, 1000)}
                </pre>
              </details>
            )}
            <Button onClick={download}>
              <Download className="h-4 w-4" />
              {t('settings.updates.download')}
            </Button>
          </Alert>
        )}

        {status === 'downloading' && progress && (
          <div className="space-y-2 rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {t('settings.updates.downloading')}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{progress.percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            {progress.bytesPerSecond > 0 && (
              <p className="text-xs text-muted-foreground">
                {(progress.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s
              </p>
            )}
          </div>
        )}

        {status === 'downloaded' && available && (
          <Alert variant="success" title={t('settings.updates.downloaded')}>
            <p className="mb-3">
              {t('settings.updates.downloadedBody', { version: available.version })}
            </p>
            <Button onClick={install}>
              <CheckCircle2 className="h-4 w-4" />
              {t('settings.updates.installNow')}
            </Button>
          </Alert>
        )}

        {status === 'error' && error && (
          <Alert variant="error" title={t('settings.updates.errorTitle')}>
            <p className="mb-1">{t('settings.updates.errorBody')}</p>
            <code className="block max-h-20 overflow-auto rounded bg-background/50 p-2 text-[11px]">
              {error}
            </code>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
