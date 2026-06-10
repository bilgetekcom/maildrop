import { useEffect, useState } from 'react'
import { Plus, Mail } from 'lucide-react'
import { useSmtpStore } from '../store/smtp'
import type { SmtpAccount } from '../../../shared/types'
import { AccountCard } from '../components/settings/AccountCard'
import { AccountForm } from '../components/settings/AccountForm'
import { EditAccountDialog } from '../components/settings/EditAccountDialog'
import { UpdateCard } from '../components/settings/UpdateCard'
import { Button } from '../components/ui/button'
import { Select } from '../components/ui/select'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useT, SUPPORTED_LOCALES, type Locale } from '../i18n'
import { useToast } from '../components/ui/toast'

export function Settings(): JSX.Element {
  const { t, locale, setLocale } = useT()
  const toast = useToast()
  const { accounts, loading, refresh, create, update, remove, setDefault, test } = useSmtpStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SmtpAccount | null>(null)

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!loading && accounts.length === 0) setShowForm(true)
  }, [loading, accounts.length])

  async function handleRemove(account: SmtpAccount): Promise<void> {
    const ok = window.confirm(t('settings.removeConfirm', { name: account.name }))
    if (!ok) return
    try {
      await remove(account.id)
    } catch (e) {
      const msg = (e as Error).message
      if (msg.includes('FOREIGN KEY') || msg.includes('RESTRICT')) {
        toast.push(t('toast.smtpDeleteBlocked'), 'error', 6000)
      } else {
        toast.push(msg, 'error', 6000)
      }
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('settings.subtitle')}</p>
      </header>

      <section className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.language.cardTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-1.5 max-w-xs">
                <Label htmlFor="locale">{t('settings.language.label')}</Label>
                <Select
                  id="locale"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as Locale)}
                >
                  {SUPPORTED_LOCALES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.native}
                    </option>
                  ))}
                </Select>
              </div>
              <p className="pb-2 text-xs text-muted-foreground">{t('settings.language.hint')}</p>
            </div>
          </CardContent>
        </Card>

        <UpdateCard />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>{t('settings.accountsCardTitle')}</CardTitle>
              <CardDescription>
                {accounts.length === 0
                  ? t('settings.noAccountsYet')
                  : t('settings.accountsCount', { n: accounts.length })}
              </CardDescription>
            </div>
            {accounts.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
                <Plus className="h-4 w-4" />
                {t('settings.newAccount')}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loading && accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : accounts.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-card/50 p-8 text-center">
                <Mail className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">{t('settings.emptyHint')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onSetDefault={setDefault}
                    onEdit={setEditing}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.formCardTitle')}</CardTitle>
              <CardDescription>{t('settings.formCardDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <AccountForm
                submitLabel={t('settings.form.save')}
                onSubmit={async (input) => {
                  await create(input)
                  if (accounts.length > 0) setShowForm(false)
                }}
                onTest={test}
              />
            </CardContent>
          </Card>
        )}
      </section>

      <EditAccountDialog
        account={editing}
        onClose={() => setEditing(null)}
        onSave={async (id, input) => {
          await update(id, input)
        }}
        onTest={test}
      />
    </div>
  )
}
