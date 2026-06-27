import { Mail, Star, Pencil, Trash2 } from 'lucide-react'
import type { SmtpAccount } from '../../../../shared/types'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { useT } from '../../i18n'

interface AccountCardProps {
  account: SmtpAccount
  onSetDefault: (id: number) => void
  onEdit: (account: SmtpAccount) => void
  onRemove: (account: SmtpAccount) => void
}

export function AccountCard({
  account,
  onSetDefault,
  onEdit,
  onRemove
}: AccountCardProps): JSX.Element {
  const { t } = useT()
  return (
    <div className="flex items-start gap-4 rounded-xl border bg-card p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Mail className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold">{account.name}</h3>
          {account.isDefault && (
            <Badge variant="success" className="gap-1">
              <Star className="h-3 w-3" />
              {t('settings.card.default')}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{account.user}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {account.host}:{account.port} · {account.secure ? 'SSL' : 'STARTTLS'}
        </p>
        {account.dailyLimit > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t('settings.card.todayUsage', {
              sent: account.dailySentCount,
              limit: account.dailyLimit
            })}
            {account.cooldownSeconds > 0 && (
              <span> · {t('settings.card.cooldown', { s: account.cooldownSeconds })}</span>
            )}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!account.isDefault && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSetDefault(account.id)}
            title={t('settings.card.setDefault')}
          >
            <Star className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => onEdit(account)} title={t('common.edit')}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(account)}
          title={t('common.delete')}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
