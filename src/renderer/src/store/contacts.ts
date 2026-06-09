import { create } from 'zustand'
import type { Contact, ContactGroup } from '../../../shared/types'

interface ContactsStore {
  contacts: Contact[]
  groups: ContactGroup[]
  loading: boolean
  search: string
  activeGroupId: number | null

  setSearch: (s: string) => void
  setActiveGroup: (id: number | null) => void

  refresh: () => Promise<void>
  refreshGroups: () => Promise<void>

  create: (input: Omit<Contact, 'id' | 'createdAt'>) => Promise<Contact>
  update: (id: number, input: Partial<Contact>) => Promise<Contact>
  remove: (ids: number[]) => Promise<void>

  createGroup: (name: string, color: string) => Promise<ContactGroup>
  removeGroup: (id: number) => Promise<void>

  previewExcel: (filePath: string) => Promise<{ headers: string[]; sample: string[][] }>
  importExcel: (
    filePath: string,
    mapping: Record<string, string>
  ) => Promise<{ inserted: number; duplicates: string[] }>
  exportExcel: (path: string, groupId?: number | null) => Promise<void>
}

export const useContactsStore = create<ContactsStore>((set, get) => ({
  contacts: [],
  groups: [],
  loading: false,
  search: '',
  activeGroupId: null,

  setSearch: (s) => set({ search: s }),
  setActiveGroup: (id) => set({ activeGroupId: id }),

  refresh: async () => {
    set({ loading: true })
    const { search, activeGroupId } = get()
    const contacts = await window.api.contacts.list(search || undefined, activeGroupId)
    set({ contacts, loading: false })
  },

  refreshGroups: async () => {
    const groups = await window.api.groups.list()
    set({ groups })
  },

  create: async (input) => {
    const c = await window.api.contacts.create(input)
    await get().refresh()
    return c
  },

  update: async (id, input) => {
    const c = await window.api.contacts.update(id, input)
    await get().refresh()
    return c
  },

  remove: async (ids) => {
    await window.api.contacts.remove(ids)
    await get().refresh()
  },

  createGroup: async (name, color) => {
    const g = await window.api.groups.create(name, color)
    await get().refreshGroups()
    return g
  },

  removeGroup: async (id) => {
    await window.api.groups.remove(id)
    await get().refreshGroups()
    if (get().activeGroupId === id) {
      set({ activeGroupId: null })
      await get().refresh()
    }
  },

  previewExcel: async (filePath) => window.api.contacts.previewExcel(filePath),

  importExcel: async (filePath, mapping) => {
    const r = await window.api.contacts.importExcel(filePath, mapping)
    await get().refresh()
    return r
  },

  exportExcel: async (path, groupId) => window.api.contacts.exportExcel(path, groupId)
}))
