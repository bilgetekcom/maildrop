import { useEffect, useState } from 'react'
import { Plus, Upload, Download, Search, Trash2, Users } from 'lucide-react'
import { useContactsStore } from '../store/contacts'
import { GroupSidebar } from '../components/contacts/GroupSidebar'
import { ContactsTable } from '../components/contacts/ContactsTable'
import { ContactDialog } from '../components/contacts/ContactDialog'
import { ImportWizard } from '../components/contacts/ImportWizard'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import type { Contact } from '../../../shared/types'
import { useT } from '../i18n'

export function Contacts(): JSX.Element {
  const { t } = useT()
  const {
    contacts,
    groups,
    loading,
    search,
    activeGroupId,
    setSearch,
    refresh,
    refreshGroups,
    remove,
    exportExcel
  } = useContactsStore()

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)

  useEffect(() => {
    void refresh()
    void refreshGroups()
  }, [refresh, refreshGroups])

  useEffect(() => {
    const t = setTimeout(() => {
      void refresh()
    }, 200)
    return () => clearTimeout(t)
  }, [search, refresh])

  function toggleSelect(id: number): void {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll(): void {
    if (selected.size === contacts.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(contacts.map((c) => c.id)))
    }
  }

  async function handleRemoveSelected(): Promise<void> {
    if (selected.size === 0) return
    const ok = window.confirm(t('contacts.confirmRemoveMany', { n: selected.size }))
    if (!ok) return
    await remove([...selected])
    setSelected(new Set())
  }

  async function handleRemoveSingle(c: Contact): Promise<void> {
    const ok = window.confirm(t('contacts.confirmRemoveOne', { email: c.email }))
    if (!ok) return
    await remove([c.id])
  }

  async function handleExport(): Promise<void> {
    const groupName = activeGroupId
      ? groups.find((g) => g.id === activeGroupId)?.name ?? 'group'
      : null
    const defaultName = groupName
      ? t('contacts.exportFileNameGroup', { group: groupName })
      : t('contacts.exportFileNameAll')
    const path = await window.api.dialog.saveExcel(defaultName)
    if (!path) return
    await exportExcel(path, activeGroupId)
    alert(t('contacts.exportSaved'))
  }

  const activeGroup = activeGroupId ? groups.find((g) => g.id === activeGroupId) : null

  return (
    <div className="flex h-full">
      <GroupSidebar />
      <div className="flex-1 px-8 py-8 overflow-y-auto">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {activeGroup ? activeGroup.name : t('contacts.title')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading ? t('common.loading') : t('contacts.count', { n: contacts.length })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4" />
              {t('contacts.importExcel')}
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={contacts.length === 0}>
              <Download className="h-4 w-4" />
              {t('contacts.exportExcel')}
            </Button>
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" />
              {t('contacts.addContact')}
            </Button>
          </div>
        </header>

        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('contacts.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {selected.size > 0 && (
            <Button variant="destructive" onClick={handleRemoveSelected}>
              <Trash2 className="h-4 w-4" />
              {t('contacts.removeSelected', { n: selected.size })}
            </Button>
          )}
        </div>

        {contacts.length === 0 && !loading ? (
          <div className="rounded-lg border border-dashed bg-card/50 p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 font-semibold">
              {search ? t('contacts.emptyMatching') : t('contacts.emptyTitle')}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search ? t('contacts.emptyMatchingDesc') : t('contacts.emptyDesc')}
            </p>
            {!search && (
              <div className="mt-4 flex justify-center gap-2">
                <Button onClick={() => setShowImport(true)}>
                  <Upload className="h-4 w-4" />
                  {t('contacts.importExcel')}
                </Button>
                <Button variant="outline" onClick={() => setShowAdd(true)}>
                  <Plus className="h-4 w-4" />
                  {t('contacts.addContact')}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <ContactsTable
            contacts={contacts}
            groups={groups}
            selected={selected}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onEdit={setEditing}
            onRemove={handleRemoveSingle}
          />
        )}
      </div>

      <ContactDialog open={showAdd} contact={null} onClose={() => setShowAdd(false)} />
      <ContactDialog open={!!editing} contact={editing} onClose={() => setEditing(null)} />
      <ImportWizard open={showImport} onClose={() => setShowImport(false)} />
    </div>
  )
}
