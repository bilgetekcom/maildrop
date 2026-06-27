import { useEffect, useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import type { Suppression } from '../../../../shared/types'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { useT } from '../../i18n'
import { useToast } from '../ui/toast'

export function SuppressionsCard(): JSX.Element {
  const { t } = useT()
  const toast = useToast()
  const [items, setItems] = useState<Suppression[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [adding, setAdding] = useState(false)

  async function refresh(): Promise<void> {
    setLoading(true)
    try {
      const list = await window.api.suppressions.list()
      setItems(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function handleAdd(): Promise<void> {
    const e = newEmail.trim()
    if (!e || !e.includes('@')) return
    setAdding(true)
    try {
      await window.api.suppressions.add(e, 'manual')
      setNewEmail('')
      await refresh()
    } catch (err) {
      toast.push((err as Error).message, 'error', 4000)
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(s: Suppression): Promise<void> {
    if (!window.confirm(t('settings.suppressions.removeConfirm', { email: s.email }))) return
    await window.api.suppressions.remove(s.id)
    await refresh()
  }

  function reasonLabel(reason: string): string {
    if (reason === 'hard_bounce') return t('settings.suppressions.reason.hard_bounce')
    if (reason === 'unsubscribe') return t('settings.suppressions.reason.unsubscribe')
    return t('settings.suppressions.reason.manual')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.suppressions.cardTitle')}</CardTitle>
        <CardDescription>{t('settings.suppressions.cardDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder={t('settings.suppressions.addEmail')}
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAdd()
            }}
          />
          <Button onClick={handleAdd} disabled={adding || !newEmail.trim()}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t('settings.suppressions.addCta')}
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('settings.suppressions.empty')}</p>
        ) : (
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">
                    {t('settings.suppressions.table.email')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t('settings.suppressions.table.reason')}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t('settings.suppressions.table.added')}
                  </th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{s.email}</td>
                    <td className="px-3 py-2 text-xs">{reasonLabel(s.reason)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(s)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
