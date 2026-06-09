import { useEffect, useState } from 'react'
import { Users, Search } from 'lucide-react'
import { useContactsStore } from '../../store/contacts'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'
import type { Contact } from '../../../../shared/types'
import { useT } from '../../i18n'

interface ContactPickerProps {
  selected: Set<number>
  onChange: (next: Set<number>) => void
}

export function ContactPicker({ selected, onChange }: ContactPickerProps): JSX.Element {
  const { t } = useT()
  const { groups, refreshGroups } = useContactsStore()
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null)

  useEffect(() => {
    void refreshGroups()
  }, [refreshGroups])

  useEffect(() => {
    void (async () => {
      const list = await window.api.contacts.list(search || undefined, activeGroupId)
      setAllContacts(list)
    })()
  }, [search, activeGroupId])

  function toggle(id: number): void {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }

  function selectAllVisible(): void {
    const next = new Set(selected)
    allContacts.forEach((c) => next.add(c.id))
    onChange(next)
  }

  function clearAll(): void {
    onChange(new Set())
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveGroupId(null)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium',
              activeGroupId === null ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}
          >
            {t('sending.contactPicker.all')}
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setActiveGroupId(g.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                activeGroupId === g.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />
              {g.name}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('sending.contactPicker.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={selectAllVisible}>
            {t('sending.contactPicker.addVisible')}
          </Button>
          {selected.size > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              {t('sending.contactPicker.clearSelection')}
            </Button>
          )}
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {allContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-10 text-center text-sm text-muted-foreground">
            <Users className="h-8 w-8" />
            <p className="mt-2">{t('sending.contactPicker.noMatch')}</p>
          </div>
        ) : (
          allContacts.map((c) => {
            const isSel = selected.has(c.id)
            return (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-3 border-b px-4 py-2 last:border-0 hover:bg-accent/40"
              >
                <input
                  type="checkbox"
                  checked={isSel}
                  onChange={() => toggle(c.id)}
                  className="h-4 w-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">
                    {c.firstName} {c.lastName}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{c.email}</div>
                </div>
                {c.company && (
                  <Badge variant="outline" className="shrink-0">
                    {c.company}
                  </Badge>
                )}
              </label>
            )
          })
        )}
      </div>

      <div className="border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
        {t('sending.contactPicker.selectedCount', { n: selected.size })}
      </div>
    </div>
  )
}
