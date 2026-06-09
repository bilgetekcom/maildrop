import { useEffect, useState } from 'react'
import { Sparkles, Server, Users, Mail, ArrowRight } from 'lucide-react'
import { Dialog } from './ui/dialog'
import { Button } from './ui/button'
import { useT } from '../i18n'

interface WelcomeDialogProps {
  onStart: () => void
}

const STORAGE_KEY = 'maildrop:welcomed'

export function WelcomeDialog({ onStart }: WelcomeDialogProps): JSX.Element {
  const { t } = useT()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true)
    }
  }, [])

  function close(): void {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  function startTour(): void {
    close()
    onStart()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()} title={t('welcome.title')}>
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-8 w-8" />
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">{t('welcome.subtitle')}</p>

        <div className="space-y-2">
          <Step icon={Server} title={t('welcome.step1')} desc={t('welcome.step1Desc')} />
          <Step icon={Users} title={t('welcome.step2')} desc={t('welcome.step2Desc')} />
          <Step icon={Mail} title={t('welcome.step3')} desc={t('welcome.step3Desc')} />
        </div>

        <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">{t('welcome.privacy')}</strong>{' '}
          {t('welcome.privacyBody')}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={close}>
            {t('welcome.later')}
          </Button>
          <Button onClick={startTour}>
            {t('welcome.start')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

function Step({
  icon: Icon,
  title,
  desc
}: {
  icon: typeof Server
  title: string
  desc: string
}): JSX.Element {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </div>
  )
}
