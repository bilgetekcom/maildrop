import { create } from 'zustand'

type UpdaterStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

interface UpdateMeta {
  version: string
  releaseName?: string | null
  releaseNotes?: string | null
  releaseDate?: string
}

interface UpdaterStore {
  status: UpdaterStatus
  currentVersion: string
  available: UpdateMeta | null
  progress: { percent: number; bytesPerSecond: number } | null
  error: string | null
  initialized: boolean

  init: () => Promise<void>
  check: () => Promise<void>
  download: () => Promise<void>
  install: () => Promise<void>
  setStatus: (s: UpdaterStatus) => void
}

export const useUpdaterStore = create<UpdaterStore>((set, get) => ({
  status: 'idle',
  currentVersion: '',
  available: null,
  progress: null,
  error: null,
  initialized: false,

  init: async () => {
    if (get().initialized) return
    const v = await window.api.updater.currentVersion()
    set({ currentVersion: v, initialized: true })

    window.api.updater.onEvent((event, payload) => {
      switch (event) {
        case 'updater:checking':
          set({ status: 'checking', error: null })
          break
        case 'updater:available':
          set({ status: 'available', available: payload as UpdateMeta, error: null })
          break
        case 'updater:not-available':
          set({ status: 'not-available', available: null, error: null })
          break
        case 'updater:progress':
          set({
            status: 'downloading',
            progress: payload as { percent: number; bytesPerSecond: number }
          })
          break
        case 'updater:downloaded':
          set({
            status: 'downloaded',
            available: payload as UpdateMeta,
            progress: null
          })
          break
        case 'updater:error':
          set({
            status: 'error',
            error: (payload as { message: string }).message
          })
          break
      }
    })
  },

  check: async () => {
    set({ status: 'checking', error: null })
    const r = await window.api.updater.check()
    if (!r.ok) {
      set({ status: 'error', error: r.error ?? 'unknown' })
    }
  },

  download: async () => {
    set({ status: 'downloading', progress: { percent: 0, bytesPerSecond: 0 } })
    const r = await window.api.updater.download()
    if (!r.ok) {
      set({ status: 'error', error: r.error ?? 'unknown' })
    }
  },

  install: async () => {
    await window.api.updater.install()
  },

  setStatus: (s) => set({ status: s })
}))
