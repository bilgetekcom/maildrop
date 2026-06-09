import type { PromotionsResponse, ResolvedPromotion } from './promotions-types'

declare global {
  interface Window {
    __MAILDROP_ADS_URL_OVERRIDE?: string
  }
}

function resolveAdsBaseUrl(): string {
  if (typeof window !== 'undefined' && window.__MAILDROP_ADS_URL_OVERRIDE) {
    return window.__MAILDROP_ADS_URL_OVERRIDE
  }
  return import.meta.env.DEV
    ? 'http://localhost:8787/api/promotions'
    : 'https://app.bilgetek.com/api/promotions'
}

const APP_NAME = 'maildrop'
const APP_VERSION = '0.1.0'
const CACHE_KEY = 'maildrop:promotions_cache'
const APP_OPEN_KEY = 'maildrop:app_open_count'
const SEEN_KEY_PREFIX = 'maildrop:promo_seen:'

interface CachedPayload {
  fetchedAt: string
  cacheUntil: string
  data: PromotionsResponse
}

function getPlatform(): string {
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('mac')) return 'darwin'
  if (ua.includes('linux')) return 'linux'
  return 'win32'
}

export function incrementAppOpenCount(): number {
  const cur = Number(localStorage.getItem(APP_OPEN_KEY) || '0') + 1
  localStorage.setItem(APP_OPEN_KEY, String(cur))
  return cur
}

export function getAppOpenCount(): number {
  return Number(localStorage.getItem(APP_OPEN_KEY) || '0')
}

export async function fetchPromotions(locale: string): Promise<PromotionsResponse | null> {
  const cached = readCache()
  if (
    !import.meta.env.DEV &&
    cached &&
    new Date(cached.cacheUntil).getTime() > Date.now() &&
    cached.data.locale === locale
  ) {
    return cached.data
  }

  try {
    const url = new URL(resolveAdsBaseUrl())
    url.searchParams.set('app', APP_NAME)
    url.searchParams.set('locale', locale)
    url.searchParams.set('version', APP_VERSION)
    url.searchParams.set('platform', getPlatform())

    const resp = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store'
    })
    if (!resp.ok) return cached?.data ?? null
    const data = (await resp.json()) as PromotionsResponse
    writeCache({ fetchedAt: new Date().toISOString(), cacheUntil: data.cacheUntil, data })
    return data
  } catch {
    return cached?.data ?? null
  }
}

function readCache(): CachedPayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CachedPayload
  } catch {
    return null
  }
}

function writeCache(p: CachedPayload): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(p))
  } catch {
    /* quota */
  }
}

interface SeenRecord {
  lastShownAt: string
  weekStartedAt: string
  weeklyCount: number
}

function readSeen(id: string): SeenRecord | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY_PREFIX + id)
    if (!raw) return null
    return JSON.parse(raw) as SeenRecord
  } catch {
    return null
  }
}

function writeSeen(id: string, rec: SeenRecord): void {
  localStorage.setItem(SEEN_KEY_PREFIX + id, JSON.stringify(rec))
}

export function recordShown(id: string): void {
  const now = new Date()
  const prev = readSeen(id)
  let weekStartedAt = prev?.weekStartedAt
  let weeklyCount = prev?.weeklyCount ?? 0
  if (!weekStartedAt || now.getTime() - new Date(weekStartedAt).getTime() > 7 * 24 * 60 * 60 * 1000) {
    weekStartedAt = now.toISOString()
    weeklyCount = 0
  }
  weeklyCount += 1
  writeSeen(id, { lastShownAt: now.toISOString(), weekStartedAt, weeklyCount })
}

export function pickExitPromotion(
  promos: ResolvedPromotion[],
  appOpenCount: number
): ResolvedPromotion | null {
  const candidates = promos.filter((p) => p.type === 'exit_modal')
  const now = Date.now()
  const eligible = candidates.filter((p) => {
    if (p.frequency.showAfterAppOpenCount && appOpenCount < p.frequency.showAfterAppOpenCount) {
      return false
    }
    const seen = readSeen(p.id)
    if (seen) {
      const last = new Date(seen.lastShownAt).getTime()
      if (now - last < p.frequency.cooldownHours * 60 * 60 * 1000) return false
      if (p.frequency.maxPerWeek != null && seen.weeklyCount >= p.frequency.maxPerWeek) {
        const weekStart = new Date(seen.weekStartedAt).getTime()
        if (now - weekStart < 7 * 24 * 60 * 60 * 1000) return false
      }
    }
    return true
  })
  if (eligible.length === 0) return null
  eligible.sort((a, b) => b.priority - a.priority)
  return eligible[0]
}
