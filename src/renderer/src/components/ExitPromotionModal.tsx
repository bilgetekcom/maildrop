import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { ResolvedPromotion } from '../lib/promotions-types'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { useT } from '../i18n'

interface ExitPromotionModalProps {
  promo: ResolvedPromotion | null
  onClose: () => void
}

export function ExitPromotionModal({ promo, onClose }: ExitPromotionModalProps): JSX.Element | null {
  const { t } = useT()
  const [remaining, setRemaining] = useState(promo?.behavior.minDisplaySeconds ?? 3)

  useEffect(() => {
    if (!promo) return
    setRemaining(promo.behavior.minDisplaySeconds)
    const tick = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1))
    }, 1000)
    return () => clearInterval(tick)
  }, [promo])

  useEffect(() => {
    if (!promo) return
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && promo.behavior.blockEscape) e.preventDefault()
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [promo])

  if (!promo) return null

  const canClose = remaining === 0
  const c = promo.content
  const primary = c.ctas.find((x) => x.variant === 'primary') ?? c.ctas[0]
  const secondary = c.ctas.find((x) => x.variant === 'ghost') ?? c.ctas[1] ?? null

  async function handleCta(url: string | undefined): Promise<void> {
    if (url) {
      await window.api.appLifecycle.openExternal(url)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {c.image && (
          <div className="relative">
            <img
              src={c.image.url}
              alt={c.image.alt}
              width={c.image.width}
              height={c.image.height}
              className="h-48 w-full object-cover"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
            {c.badge && (
              <span className="absolute left-4 top-4 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                {c.badge}
              </span>
            )}
          </div>
        )}

        <div className="space-y-3 p-6">
          {!c.image && c.badge && (
            <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {c.badge}
            </span>
          )}
          <h2 className="text-xl font-bold tracking-tight">{c.title}</h2>
          {c.subtitle && <p className="text-sm font-medium text-muted-foreground">{c.subtitle}</p>}
          <p className="text-sm text-foreground/80 leading-relaxed">{c.description}</p>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {primary && (
              <Button
                onClick={() => handleCta(primary.url)}
                style={c.accentColor ? { background: c.accentColor } : undefined}
                className="flex-1"
              >
                {primary.label}
              </Button>
            )}
            {secondary && (
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={!canClose}
                className={cn(!canClose && 'opacity-50')}
              >
                {secondary.label}
              </Button>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              disabled={!canClose}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-opacity',
                canClose
                  ? 'hover:bg-accent hover:text-foreground'
                  : 'cursor-not-allowed opacity-50'
              )}
            >
              <X className="h-3 w-3" />
              {canClose ? t('promotion.close') : t('promotion.closeIn', { n: remaining })}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
