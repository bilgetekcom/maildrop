import { useEffect, useState } from 'react'
import { useT } from '../i18n'
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
  const [activePromo, setActivePromo] = useState<ResolvedPromotion | null>(null)
  const [allPromos, setAllPromos] = useState<ResolvedPromotion[]>([])
  const [appOpenCount, setAppOpenCount] = useState(0)

  useEffect(() => {
    const count = incrementAppOpenCount()
    setAppOpenCount(count)
  }, [])

  useEffect(() => {
    void (async () => {
      const resp = await fetchPromotions(locale)
      if (resp) setAllPromos(resp.promotions)
    })()
  }, [locale])

  useEffect(() => {
    const unsub = window.api.appLifecycle.onBeforeClose(async () => {
      // If a campaign is actively sending, ask before closing.
      const busy = await window.api.appLifecycle.hasActiveSending()
      if (busy) {
        const ok = window.confirm(
          locale === 'en'
            ? 'A bulk send is in progress. Closing now will cancel the remaining messages. Close anyway?'
            : 'Bir toplu gönderim devam ediyor. Şimdi kapatırsanız kalan mailler iptal edilir. Yine de kapatılsın mı?'
        )
        if (!ok) {
          await window.api.appLifecycle.cancelClose()
          return
        }
      }
      if (allPromos.length === 0) {
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
  }, [allPromos, appOpenCount, locale])

  async function handleClose(): Promise<void> {
    setActivePromo(null)
    await window.api.appLifecycle.confirmClose()
  }

  return <ExitPromotionModal promo={activePromo} onClose={handleClose} />
}
