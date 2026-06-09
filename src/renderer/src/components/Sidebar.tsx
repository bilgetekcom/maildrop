import { Home, Users, Mail, Send, BarChart3, Settings } from 'lucide-react'
import type { Section } from '../App'
import { cn } from '../lib/utils'
import { useT } from '../i18n'

interface SidebarProps {
  active: Section
  onSelect: (s: Section) => void
}

export function Sidebar({ active, onSelect }: SidebarProps): JSX.Element {
  const { t } = useT()
  const items: { id: Section; label: string; icon: typeof Home }[] = [
    { id: 'home', label: t('nav.home'), icon: Home },
    { id: 'contacts', label: t('nav.contacts'), icon: Users },
    { id: 'templates', label: t('nav.templates'), icon: Mail },
    { id: 'sending', label: t('nav.sending'), icon: Send },
    { id: 'reports', label: t('nav.reports'), icon: BarChart3 },
    { id: 'settings', label: t('nav.settings'), icon: Settings }
  ]

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-card">
      <div className="flex items-center gap-2 px-5 py-5 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground text-lg font-bold">
          M
        </div>
        <div>
          <div className="text-base font-semibold leading-tight">{t('appName')}</div>
          <div className="text-xs text-muted-foreground">Bilgetek</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = item.id === active
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground/80 hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          )
        })}
      </nav>
      <div className="px-5 py-4 border-t text-xs text-muted-foreground">
        {t('version', { version: '0.1.0' })}
      </div>
    </aside>
  )
}
