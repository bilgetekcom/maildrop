import { Pencil, Trash2 } from 'lucide-react'
import type { Contact, ContactGroup } from '../../../../shared/types'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { useT } from '../../i18n'

interface ContactsTableProps {
  contacts: Contact[]
  groups: ContactGroup[]
  selected: Set<number>
  onToggleSelect: (id: number) => void
  onToggleSelectAll: () => void
  onEdit: (c: Contact) => void
  onRemove: (c: Contact) => void
}

export function ContactsTable({
  contacts,
  groups,
  selected,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onRemove
}: ContactsTableProps): JSX.Element {
  const { t } = useT()
  const groupById = new Map(groups.map((g) => [g.id, g]))
  const allSelected = contacts.length > 0 && selected.size === contacts.length

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="w-10 px-3 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                className="h-4 w-4"
                aria-label={t('contacts.selectAll')}
              />
            </th>
            <th className="px-3 py-2 text-left font-medium">{t('contacts.columns.name')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('contacts.columns.email')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('contacts.columns.company')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('contacts.columns.group')}</th>
            <th className="w-24 px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => {
            const group = c.groupId ? groupById.get(c.groupId) : null
            return (
              <tr key={c.id} className="border-t hover:bg-accent/30">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => onToggleSelect(c.id)}
                    className="h-4 w-4"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium">
                    {c.firstName} {c.lastName}
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{c.email}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.company || '—'}</td>
                <td className="px-3 py-2">
                  {group ? (
                    <Badge
                      variant="outline"
                      style={{ borderColor: group.color, color: group.color }}
                    >
                      {group.name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(c)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
