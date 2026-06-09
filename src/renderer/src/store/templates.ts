import { create } from 'zustand'
import type { Template } from '../../../shared/types'

interface TemplatesStore {
  templates: Template[]
  loading: boolean
  selectedId: number | null

  refresh: () => Promise<void>
  select: (id: number | null) => void

  create: (input: {
    name: string
    subject: string
    bodyHtml: string
    attachmentPath: string | null
  }) => Promise<Template>
  update: (id: number, input: Partial<Template>) => Promise<Template>
  remove: (id: number) => Promise<void>
  preview: (id: number, contactId: number) => Promise<{ subject: string; html: string }>
}

export const useTemplatesStore = create<TemplatesStore>((set, get) => ({
  templates: [],
  loading: false,
  selectedId: null,

  refresh: async () => {
    set({ loading: true })
    const templates = await window.api.templates.list()
    set({ templates, loading: false })
  },

  select: (id) => set({ selectedId: id }),

  create: async (input) => {
    const t = await window.api.templates.create(input)
    await get().refresh()
    set({ selectedId: t.id })
    return t
  },

  update: async (id, input) => {
    const t = await window.api.templates.update(id, input)
    await get().refresh()
    return t
  },

  remove: async (id) => {
    await window.api.templates.remove(id)
    await get().refresh()
    if (get().selectedId === id) set({ selectedId: null })
  },

  preview: async (id, contactId) => window.api.templates.preview(id, contactId)
}))
