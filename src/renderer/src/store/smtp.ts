import { create } from 'zustand'
import type { SmtpAccount, SmtpAccountInput, SmtpTestResult } from '../../../shared/types'

interface SmtpStore {
  accounts: SmtpAccount[]
  loading: boolean
  refresh: () => Promise<void>
  create: (input: SmtpAccountInput) => Promise<SmtpAccount>
  update: (id: number, input: Partial<SmtpAccountInput>) => Promise<SmtpAccount>
  remove: (id: number) => Promise<void>
  setDefault: (id: number) => Promise<void>
  test: (input: SmtpAccountInput, sampleTo: string, locale: 'tr' | 'en') => Promise<SmtpTestResult>
}

export const useSmtpStore = create<SmtpStore>((set, get) => ({
  accounts: [],
  loading: false,

  refresh: async () => {
    set({ loading: true })
    const accounts = await window.api.smtp.list()
    set({ accounts, loading: false })
  },

  create: async (input) => {
    const account = await window.api.smtp.create(input)
    await get().refresh()
    return account
  },

  update: async (id, input) => {
    const account = await window.api.smtp.update(id, input)
    await get().refresh()
    return account
  },

  remove: async (id) => {
    await window.api.smtp.remove(id)
    await get().refresh()
  },

  setDefault: async (id) => {
    await window.api.smtp.setDefault(id)
    await get().refresh()
  },

  test: async (input, sampleTo, locale) => {
    return window.api.smtp.test(input, sampleTo, locale)
  }
}))
