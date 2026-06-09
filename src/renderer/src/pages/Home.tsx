import { useEffect, useState } from 'react'
import { Send, Users, Mail, BarChart3, Server } from 'lucide-react'
import type { Section } from '../App'
import { useT } from '../i18n'

interface HomeProps {
  onNavigate: (s: Section) => void
}

interface Stats {
  contacts: number
  templates: number
  smtpAccounts: number
  lastCampaign: string
}

export function Home({ onNavigate }: HomeProps): JSX.Element {
  const { t } = useT()
  const [stats, setStats] = useState<Stats>({
    contacts: 0,
    templates: 0,
    smtpAccounts: 0,
    lastCampaign: t('home.noCampaign')
  })

  useEffect(() => {
    void (async () => {
      const [contacts, templates, smtp, campaigns] = await Promise.all([
        window.api.contacts.list(),
        window.api.templates.list(),
        window.api.smtp.list(),
        window.api.campaigns.list()
      ])
      const last = campaigns[0]
      setStats({
        contacts: contacts.length,
        templates: templates.length,
        smtpAccounts: smtp.length,
        lastCampaign: last ? `${last.name} (${last.sent}/${last.total})` : t('home.noCampaign')
      })
    })()
  }, [t])

  const hasSmtp = stats.smtpAccounts > 0

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('home.welcome')}</h1>
        <p className="mt-2 text-muted-foreground">{t('home.subtitle')}</p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StepCard
          icon={Server}
          step="1"
          title={t('home.step1Title')}
          desc={t('home.step1Desc')}
          cta={t('home.step1Cta')}
          stepLabel={t('home.stepLabel', { n: 1 })}
          doneLabel={t('home.stepDone')}
          done={hasSmtp}
          onClick={() => onNavigate('settings')}
        />
        <StepCard
          icon={Users}
          step="2"
          title={t('home.step2Title')}
          desc={t('home.step2Desc')}
          cta={t('home.step2Cta')}
          stepLabel={t('home.stepLabel', { n: 2 })}
          doneLabel={t('home.stepDone')}
          done={stats.contacts > 0}
          onClick={() => onNavigate('contacts')}
        />
        <StepCard
          icon={Mail}
          step="3"
          title={t('home.step3Title')}
          desc={t('home.step3Desc')}
          cta={t('home.step3Cta')}
          stepLabel={t('home.stepLabel', { n: 3 })}
          doneLabel={t('home.stepDone')}
          done={stats.templates > 0}
          onClick={() => onNavigate('templates')}
        />
      </section>

      <section className="mt-10 rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t('home.quickSend')}</h2>
            <p className="text-sm text-muted-foreground">
              {hasSmtp && stats.contacts > 0 && stats.templates > 0
                ? t('home.quickSendReady')
                : t('home.quickSendNotReady')}
            </p>
          </div>
          <button
            onClick={() => onNavigate('sending')}
            disabled={!hasSmtp || stats.contacts === 0 || stats.templates === 0}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            {t('home.newCampaign')}
          </button>
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat icon={Users} label={t('home.totalContacts')} value={String(stats.contacts)} />
        <Stat icon={Mail} label={t('home.savedTemplates')} value={String(stats.templates)} />
        <Stat icon={BarChart3} label={t('home.lastCampaign')} value={stats.lastCampaign} />
      </section>
    </div>
  )
}

function StepCard({
  icon: Icon,
  title,
  desc,
  cta,
  stepLabel,
  doneLabel,
  done,
  onClick
}: {
  icon: typeof Send
  step: string
  title: string
  desc: string
  cta: string
  stepLabel: string
  doneLabel: string
  done: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            done ? 'bg-emerald-100 text-emerald-700' : 'bg-primary/10 text-primary'
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={`text-xs font-semibold ${
            done ? 'text-emerald-700' : 'text-muted-foreground'
          }`}
        >
          {done ? doneLabel : stepLabel}
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <button onClick={onClick} className="mt-4 text-sm font-medium text-primary hover:underline">
        {cta} →
      </button>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Send
  label: string
  value: string
}): JSX.Element {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="truncate text-xl font-semibold">{value}</div>
        </div>
      </div>
    </div>
  )
}
