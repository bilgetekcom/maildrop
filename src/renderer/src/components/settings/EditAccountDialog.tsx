import { Dialog } from '../ui/dialog'
import { AccountForm } from './AccountForm'
import type { SmtpAccount, SmtpAccountInput, SmtpTestResult } from '../../../../shared/types'
import { SMTP_PRESETS } from '../../lib/smtp-presets'
import { useT } from '../../i18n'

interface EditAccountDialogProps {
  account: SmtpAccount | null
  onClose: () => void
  onSave: (id: number, input: Partial<SmtpAccountInput>) => Promise<void>
  onTest: (input: SmtpAccountInput, sampleTo: string, locale: 'tr' | 'en') => Promise<SmtpTestResult>
}

function detectPreset(host: string): string {
  const match = SMTP_PRESETS.find((p) => p.host && p.host === host)
  return match ? match.id : 'custom'
}

export function EditAccountDialog({
  account,
  onClose,
  onSave,
  onTest
}: EditAccountDialogProps): JSX.Element {
  const { t } = useT()
  return (
    <Dialog
      open={!!account}
      onOpenChange={(o) => !o && onClose()}
      title={t('settings.editTitle')}
      description={t('settings.editDesc')}
    >
      {account && (
        <AccountForm
          initial={{
            presetId: detectPreset(account.host),
            name: account.name,
            host: account.host,
            port: account.port,
            secure: account.secure,
            user: account.user,
            fromEmail: account.fromEmail,
            isDefault: account.isDefault,
            dailyLimit: account.dailyLimit,
            cooldownSeconds: account.cooldownSeconds
          }}
          passwordPlaceholder={t('settings.form.passwordPlaceholderKeep')}
          showPassword={true}
          submitLabel={t('settings.form.saveEdit')}
          onSubmit={async (input) => {
            const partial: Partial<SmtpAccountInput> = {
              name: input.name,
              host: input.host,
              port: input.port,
              secure: input.secure,
              user: input.user,
              fromEmail: input.fromEmail,
              isDefault: input.isDefault,
              dailyLimit: input.dailyLimit,
              cooldownSeconds: input.cooldownSeconds
            }
            if (input.password) partial.password = input.password
            await onSave(account.id, partial)
            onClose()
          }}
          onTest={onTest}
        />
      )}
    </Dialog>
  )
}
