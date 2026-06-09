import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { usePreferencesStore } from '../store/preferences'
import {
  fetchPromotions,
  incrementAppOpenCount,
  pickExitPromotion,
  recordShown
} from '../lib/promotions-client'
import type { ResolvedPromotion } from '../lib/promotions-types'
import { ExitPromotionModal } from './ExitPromotionModal'

export function ExitGuard(): JSX.Element {
  const { locale } = useT()
  const { promotionsEnabled } = usePreferencesStore()
  const [activePromo, setActivePromo] = useState<ResolvedPromotion | null>(null)
  const [allPromos, setAllPromos] = useState<ResolvedPromotion[]>([])
  const [appOpenCount, setAppOpenCount] = useState(0)

  useEffect(() => {
    const count = incrementAppOpenCount()
    setAppOpenCount(count)
  }, [])

  useEffect(() => {
    if (!promotionsEnabled) {
      setAllPromos([])
      return
    }
    void (async () => {
      const resp = await fetchPromotions(locale)
      if (resp) setAllPromos(resp.promotions)
    })()
  }, [locale, promotionsEnabled])

  useEffect(() => {
    const unsub = window.api.appLifecycle.onBeforeClose(async () => {
      if (!promotionsEnabled || allPromos.length === 0) {
        await window.api.appLifecycle.confirmClose()
        return
      }
      const pick = pickExitPromotion(allPromos, appOpenCount)
      if (!pick) {
        await window.api.appLifecycle.confirmClose()
        return
      }
      recordShown(pick.id)
      setActivePromo(pick)
    })
    return unsub
  }, [allPromos, appOpenCount, promotionsEnabled])

  async function handleClose(): Promise<void> {
    setActivePromo(null)
    await window.api.appLifecycle.confirmClose()
  }

  return <ExitPromotionModal promo={activePromo} onClose={handleClose} />
}
