import { useEffect, useState } from 'react'
import { BarChart3, Trash2 } from 'lucide-react'
import { useCampaignsStore } from '../store/campaigns'
import type { Campaign } from '../../../shared/types'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { CampaignDetail } from '../components/reports/CampaignDetail'
import { useT } from '../i18n'

export function Reports(): JSX.Element {
  const { t } = useT()
  const { campaigns, refresh } = useCampaignsStore()
  const [detail, setDetail] = useState<Campaign | null>(null)

  useEffect(() => {
    void refresh()
  }, [refresh])

  const statusMeta = (status: Campaign['status']): { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' } => {
    const map: Record<Campaign['status'], { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
      completed: { label: t('reports.status.completed'), variant: 'success' },
      running: { label: t('reports.status.running'), variant: 'warning' },
      paused: { label: t('reports.status.paused'), variant: 'warning' },
      pending: { label: t('reports.status.pending'), variant: 'secondary' },
      failed: { label: t('reports.status.failed'), variant: 'destructive' },
      cancelled: { label: t('reports.status.cancelled'), variant: 'secondary' }
    }
    return map[status]
  }

  async function handleRemove(c: Campaign): Promise<void> {
    const ok = window.confirm(t('reports.removeConfirm', { name: c.name }))
    if (!ok) return
    await window.api.reports.removeCampaign(c.id)
    await refresh()
  }

  if (detail) {
    return (
      <div className="mx-auto max-w-5xl px-8 py-8">
        <CampaignDetail campaign={detail} onBack={() => setDetail(null)} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t('reports.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('reports.summary', { n: campaigns.length })}
        </p>
      </header>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-semibold">{t('reports.empty')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('reports.emptyDesc')}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.historyTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">
                      {t('reports.columns.campaign')}
                    </th>
                    <th className="px-3 py-2 text-left font-medium">{t('reports.columns.date')}</th>
                    <th className="px-3 py-2 text-right font-medium">
                      {t('reports.columns.total')}
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      {t('reports.columns.success')}
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      {t('reports.columns.failure')}
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      {t('reports.columns.status')}
                    </th>
                    <th className="w-10 px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => {
                    const status = statusMeta(c.status)
                    return (
                      <tr
                        key={c.id}
                        className="cursor-pointer border-t hover:bg-accent/40"
                        onClick={() => setDetail(c)}
                      >
                        <td className="px-3 py-2 font-medium">{c.name}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {c.startedAt ? new Date(c.startedAt).toLocaleString() : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">{c.total}</td>
                        <td className="px-3 py-2 text-right text-emerald-700">{c.sent}</td>
                        <td className="px-3 py-2 text-right text-red-700">{c.failed}</td>
                        <td className="px-3 py-2">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              void handleRemove(c)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
