import { create } from 'zustand'

interface PreferencesStore {
  promotionsEnabled: boolean
  togglePromotions: (next: boolean) => void
}

const KEY = 'maildrop:promotions_enabled'

function readInitial(): boolean {
  if (typeof localStorage === 'undefined') return true
  const v = localStorage.getItem(KEY)
  return v === null ? true : v === '1'
}

export const usePreferencesStore = create<PreferencesStore>((set) => ({
  promotionsEnabled: readInitial(),
  togglePromotions: (next) => {
    localStorage.setItem(KEY, next ? '1' : '0')
    set({ promotionsEnabled: next })
  }
}))
