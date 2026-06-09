import { useEffect } from 'react'
import { Pause, Play, X, CheckCircle2, AlertCircle, Loader2, RotateCw } from 'lucide-react'
import { useCampaignsStore } from '../../store/campaigns'
import type { Campaign } from '../../../../shared/types'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { useT } from '../../i18n'

interface CampaignConsoleProps {
  campaign: Campaign
  onDone: () => void
}

export function CampaignConsole({ campaign, onDone }: CampaignConsoleProps): JSX.Element {
  const { t } = useT()
  const { progress, pause, resume, cancel, retryFailed, refresh } = useCampaignsStore()
  const live = progress[campaign.id]
  const sent = live?.sent ?? campaign.sent
  const failed = live?.failed ?? campaign.failed
  const total = campaign.total
  const status = live?.status ?? campaign.status
  const done = status === 'completed' || status === 'cancelled' || status === 'failed'
  const percent = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0

  useEffect(() => {
    void refresh()
  }, [refresh])

  const statusLabel: Record<typeof status, string> = {
    pending: t('sending.console.pending'),
    running: t('sending.console.running'),
    paused: t('sending.console.paused'),
    completed: t('sending.console.completed'),
    cancelled: t('sending.console.cancelled'),
    failed: t('sending.console.failed')
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>{campaign.name}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{statusLabel[status]}</p>
        </div>
        <Badge variant={done ? (failed === 0 ? 'success' : 'warning') : 'secondary'}>
          {percent}%
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('sending.console.progress')}</span>
            <span>
              {sent + failed} / {total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all ${
                failed > 0 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg border bg-emerald-50/50 p-3">
            <div className="text-xs text-muted-foreground">{t('sending.console.success')}</div>
            <div className="mt-1 text-xl font-semibold text-emerald-700">{sent}</div>
          </div>
          <div className="rounded-lg border bg-red-50/50 p-3">
            <div className="text-xs text-muted-foreground">{t('sending.console.failure')}</div>
            <div className="mt-1 text-xl font-semibold text-red-700">{failed}</div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">{t('sending.console.remaining')}</div>
            <div className="mt-1 text-xl font-semibold">{Math.max(0, total - sent - failed)}</div>
          </div>
        </div>

        {live?.currentEmail && status === 'running' && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('sending.console.sending', { email: live.currentEmail })}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {status === 'running' && (
            <>
              <Button variant="outline" onClick={() => pause(campaign.id)}>
                <Pause className="h-4 w-4" />
                {t('sending.console.pause')}
              </Button>
              <Button variant="destructive" onClick={() => cancel(campaign.id)}>
                <X className="h-4 w-4" />
                {t('sending.console.cancel')}
              </Button>
            </>
          )}
          {status === 'paused' && (
            <>
              <Button onClick={() => resume(campaign.id)}>
                <Play className="h-4 w-4" />
                {t('sending.console.resume')}
              </Button>
              <Button variant="destructive" onClick={() => cancel(campaign.id)}>
                <X className="h-4 w-4" />
                {t('sending.console.cancel')}
              </Button>
            </>
          )}
          {done && (
            <>
              {failed > 0 && (
                <Button variant="outline" onClick={() => retryFailed(campaign.id)}>
                  <RotateCw className="h-4 w-4" />
                  {t('sending.console.retryFailed')}
                </Button>
              )}
              <Button onClick={onDone}>
                {failed === 0 ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {t('common.finish')}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
