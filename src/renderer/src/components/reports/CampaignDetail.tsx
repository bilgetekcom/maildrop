import { useEffect, useState } from 'react'
import { Download, ArrowLeft, CheckCircle2, XCircle, Loader2, RotateCw } from 'lucide-react'
import type { Campaign, CampaignLog } from '../../../../shared/types'
import { useCampaignsStore } from '../../store/campaigns'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useT } from '../../i18n'

interface CampaignDetailProps {
  campaign: Campaign
  onBack: () => void
}

export function CampaignDetail({ campaign, onBack }: CampaignDetailProps): JSX.Element {
  const { t } = useT()
  const { logs, retryFailed, refresh } = useCampaignsStore()
  const [items, setItems] = useState<CampaignLog[]>([])
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setItems(await logs(campaign.id))
      setLoading(false)
    })()
  }, [campaign.id, logs])

  async function handleExport(): Promise<void> {
    const path = await window.api.reports.exportCampaign(campaign.id)
    if (path) alert(t('reports.detail.exportSaved', { path }))
  }

  async function handleRetry(): Promise<void> {
    await retryFailed(campaign.id)
    await refresh()
    onBack()
  }

  const filtered = items.filter((l) =>
    filter === 'all' ? true : filter === 'success' ? l.status === 'success' : l.status === 'failed'
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          {t('reports.detail.back')}
        </Button>
        <div className="flex gap-2">
          {campaign.failed > 0 && (
            <Button variant="outline" onClick={handleRetry}>
              <RotateCw className="h-4 w-4" />
              {t('sending.console.retryFailed')}
            </Button>
          )}
          <Button onClick={handleExport}>
            <Download className="h-4 w-4" />
            {t('contacts.exportExcel')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{campaign.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label={t('reports.detail.totalLabel')} value={campaign.total} />
            <Stat label={t('reports.detail.successLabel')} value={campaign.sent} tone="success" />
            <Stat label={t('reports.detail.failureLabel')} value={campaign.failed} tone="error" />
            <Stat
              label={t('reports.detail.successRate')}
              value={`${campaign.total > 0 ? Math.round((campaign.sent / campaign.total) * 100) : 0}%`}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">{t('reports.detail.startedAt')}</div>
              <div>{campaign.startedAt ? new Date(campaign.startedAt).toLocaleString() : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('reports.detail.finishedAt')}</div>
              <div>{campaign.finishedAt ? new Date(campaign.finishedAt).toLocaleString() : '—'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{t('reports.detail.detailsTitle')}</CardTitle>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              {t('reports.detail.filterAll', { n: items.length })}
            </Button>
            <Button
              size="sm"
              variant={filter === 'success' ? 'default' : 'outline'}
              onClick={() => setFilter('success')}
            >
              {t('reports.detail.filterSuccess', {
                n: items.filter((i) => i.status === 'success').length
              })}
            </Button>
            <Button
              size="sm"
              variant={filter === 'failed' ? 'default' : 'outline'}
              onClick={() => setFilter('failed')}
            >
              {t('reports.detail.filterFailure', {
                n: items.filter((i) => i.status === 'failed').length
              })}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t('reports.detail.noRecords')}
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="w-10 px-3 py-2"></th>
                    <th className="px-3 py-2 text-left font-medium">
                      {t('reports.detail.colEmail')}
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      {t('reports.detail.colError')}
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      {t('reports.detail.colTime')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id} className="border-t">
                      <td className="px-3 py-2">
                        {l.status === 'success' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </td>
                      <td className="px-3 py-2">{l.email}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {l.errorMsg ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {new Date(l.sentAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({
  label,
  value,
  tone
}: {
  label: string
  value: number | string
  tone?: 'success' | 'error'
}): JSX.Element {
  const colors =
    tone === 'success'
      ? 'text-emerald-700'
      : tone === 'error'
        ? 'text-red-700'
        : 'text-foreground'
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${colors}`}>{value}</div>
    </div>
  )
}
