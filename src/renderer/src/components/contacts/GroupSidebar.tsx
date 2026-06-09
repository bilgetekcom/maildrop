import { useState } from 'react'
import { Plus, Users, X } from 'lucide-react'
import { useContactsStore } from '../../store/contacts'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { cn } from '../../lib/utils'
import { useT } from '../../i18n'

const COLORS = ['#2E75B6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export function GroupSidebar(): JSX.Element {
  const { t } = useT()
  const { groups, activeGroupId, contacts, setActiveGroup, refresh, createGroup, removeGroup } =
    useContactsStore()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])

  async function selectGroup(id: number | null): Promise<void> {
    setActiveGroup(id)
    await refresh()
  }

  async function handleCreate(): Promise<void> {
    if (!name.trim()) return
    await createGroup(name.trim(), color)
    setName('')
    setColor(COLORS[0])
    setCreating(false)
  }

  async function handleRemove(id: number, gname: string): Promise<void> {
    if (!window.confirm(t('contacts.groups.removeConfirm', { name: gname }))) return
    await removeGroup(id)
  }

  return (
    <aside className="w-56 shrink-0 space-y-1 border-r bg-card/40 px-3 py-4">
      <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('contacts.groups.header')}
      </div>
      <button
        onClick={() => selectGroup(null)}
        className={cn(
          'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm',
          activeGroupId === null ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'
        )}
      >
        <span className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          {t('contacts.groups.all')}
        </span>
        <span className="text-xs text-muted-foreground">{contacts.length}</span>
      </button>

      {groups.map((g) => (
        <div key={g.id} className="group relative">
          <button
            onClick={() => selectGroup(g.id)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm',
              activeGroupId === g.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'
            )}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />
            <span className="truncate">{g.name}</span>
          </button>
          <button
            onClick={() => handleRemove(g.id, g.name)}
            className="absolute right-2 top-2 hidden rounded p-0.5 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground group-hover:block"
            title={t('contacts.groups.removeTitle')}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}

      {creating ? (
        <div className="rounded-md border bg-background p-2 space-y-2">
          <Input
            autoFocus
            placeholder={t('contacts.groups.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate()
              if (e.key === 'Escape') setCreating(false)
            }}
          />
          <div className="flex gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  'h-5 w-5 rounded-full border-2',
                  color === c ? 'border-foreground' : 'border-transparent'
                )}
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <Button size="sm" onClick={handleCreate} className="flex-1">
              {t('common.add')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          {t('contacts.groups.addGroup')}
        </button>
      )}
    </aside>
  )
}
