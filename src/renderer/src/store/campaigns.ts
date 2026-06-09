import { create } from 'zustand'
import type { Campaign, CampaignLog, SendProgress } from '../../../shared/types'

interface CampaignsStore {
  campaigns: Campaign[]
  loading: boolean
  progress: Record<number, SendProgress>

  refresh: () => Promise<void>
  logs: (id: number) => Promise<CampaignLog[]>

  start: (input: {
    name: string
    templateId: number
    smtpId: number
    contactIds: number[]
    ratePerSecond?: number
    scheduleAt?: string
  }) => Promise<Campaign>

  pause: (id: number) => Promise<void>
  resume: (id: number) => Promise<void>
  cancel: (id: number) => Promise<void>
  retryFailed: (id: number) => Promise<void>

  subscribe: () => () => void
}

export const useCampaignsStore = create<CampaignsStore>((set, get) => ({
  campaigns: [],
  loading: false,
  progress: {},

  refresh: async () => {
    set({ loading: true })
    const campaigns = await window.api.campaigns.list()
    set({ campaigns, loading: false })
  },

  logs: async (id) => window.api.campaigns.logs(id),

  start: async (input) => {
    const c = await window.api.campaigns.start(input)
    await get().refresh()
    return c
  },

  pause: async (id) => {
    await window.api.campaigns.pause(id)
    await get().refresh()
  },

  resume: async (id) => {
    await window.api.campaigns.resume(id)
    await get().refresh()
  },

  cancel: async (id) => {
    await window.api.campaigns.cancel(id)
    await get().refresh()
  },

  retryFailed: async (id) => {
    await window.api.campaigns.retryFailed(id)
    await get().refresh()
  },

  subscribe: () => {
    return window.api.campaigns.onProgress((p) => {
      set((state) => ({ progress: { ...state.progress, [p.campaignId]: p } }))
      if (p.status === 'completed' || p.status === 'cancelled' || p.status === 'failed') {
        void get().refresh()
      }
    })
  }
}))
