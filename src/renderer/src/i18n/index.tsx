import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import tr from './locales/tr.json'
import en from './locales/en.json'

export type Locale = 'tr' | 'en'

export const SUPPORTED_LOCALES: { id: Locale; label: string; native: string }[] = [
  { id: 'tr', label: 'Türkçe', native: 'Türkçe' },
  { id: 'en', label: 'English', native: 'English' }
]

const dictionaries: Record<Locale, Record<string, unknown>> = { tr, en }
const STORAGE_KEY = 'maildrop:locale'

function getByPath(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.')
  let cur: unknown = obj
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p]
    } else {
      return undefined
    }
  }
  return typeof cur === 'string' ? cur : undefined
}

function interpolate(template: string, vars: Record<string, string | number> | undefined): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k]
    return v === undefined ? `{${k}}` : String(v)
  })
}

function detectInitialLocale(): Locale {
  const saved = (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null) as Locale | null
  if (saved && saved in dictionaries) return saved
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'tr'
  const base = nav.toLowerCase().split('-')[0]
  if (base === 'tr') return 'tr'
  return 'en'
}

interface I18nContextValue {
  locale: Locale
  setLocale: (loc: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }): JSX.Element {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = (loc: Locale): void => {
    localStorage.setItem(STORAGE_KEY, loc)
    setLocaleState(loc)
  }

  const t = (key: string, vars?: Record<string, string | number>): string => {
    const dict = dictionaries[locale]
    const value = getByPath(dict, key)
    if (value !== undefined) return interpolate(value, vars)
    if (locale !== 'en') {
      const fallback = getByPath(dictionaries.en, key)
      if (fallback !== undefined) return interpolate(fallback, vars)
    }
    return key
  }

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>
}

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used within I18nProvider')
  return ctx
}
