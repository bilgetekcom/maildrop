export interface PromotionImage {
  url: string
  width: number
  height: number
  alt: string
}

export interface PromotionCta {
  label: string
  variant?: 'primary' | 'secondary' | 'ghost'
  action?: 'open_url' | 'dismiss'
  url?: string
}

export interface PromotionContent {
  badge?: string
  title: string
  subtitle?: string
  description: string
  image?: PromotionImage
  ctas: PromotionCta[]
  accentColor?: string
}

export interface PromotionBehavior {
  minDisplaySeconds: number
  blockEscape?: boolean
  blockOutsideClick?: boolean
}

export interface PromotionFrequency {
  cooldownHours: number
  maxPerWeek?: number
  showAfterAppOpenCount?: number
}

export interface ResolvedPromotion {
  id: string
  type: 'exit_modal' | 'home_card' | 'announcement_banner'
  content: PromotionContent
  behavior: PromotionBehavior
  frequency: PromotionFrequency
  priority: number
}

export interface PromotionsResponse {
  schemaVersion: number
  locale: string
  resolvedLocale: string | null
  promotions: ResolvedPromotion[]
  cacheUntil: string
}
