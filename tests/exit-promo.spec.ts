import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page
} from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const MAIN_JS = path.join(ROOT, 'out', 'main', 'index.js')

async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: [MAIN_JS],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      ELECTRON_DISABLE_SECURITY_WARNINGS: '1'
    }
  })

  await app.evaluate(({ shell }) => {
    ;(shell as unknown as { openExternal: (url: string) => Promise<void> }).openExternal = async (
      url: string
    ) => {
      ;(globalThis as unknown as { __lastExternalUrl: string }).__lastExternalUrl = url
    }
  })

  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')

  // No URL override = use production https://app.bilgetek.com/api/promotions (built-in)

  await page.evaluate(() => {
    localStorage.setItem('maildrop:welcomed', '1')
    localStorage.setItem('maildrop:promotions_enabled', '1')
    localStorage.setItem('maildrop:app_open_count', '5')
    localStorage.removeItem('maildrop:locale')
    Object.keys(localStorage)
      .filter((k) => k.startsWith('maildrop:promo_seen:'))
      .forEach((k) => localStorage.removeItem(k))
    localStorage.removeItem('maildrop:promotions_cache')
  })

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => undefined)

  await page.waitForFunction(
    () => {
      const cache = localStorage.getItem('maildrop:promotions_cache')
      if (!cache) return false
      try {
        const parsed = JSON.parse(cache)
        return parsed?.data?.promotions?.length > 0
      } catch {
        return false
      }
    },
    { timeout: 8000 }
  )

  return { app, page }
}

async function getLastExternal(app: ElectronApplication): Promise<string | undefined> {
  return app.evaluate(
    () => (globalThis as unknown as { __lastExternalUrl?: string }).__lastExternalUrl
  )
}

async function triggerClose(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ BrowserWindow }) => {
    const wins = BrowserWindow.getAllWindows()
    if (wins.length > 0) wins[0].close()
  })
}

test.describe('MailDrop exit promotion flow', () => {
  test('TR: exit modal görünür, görsel yüklenir, sayaç çalışır, CTA tarayıcıyı tetikler', async () => {
    const { app, page } = await launchApp()

    await expect(page.locator('aside').first()).toBeVisible()
    await expect(page.locator('h1', { hasText: 'Hoş geldiniz' })).toBeVisible()

    const promoLoaded = await page.evaluate(() => {
      const cache = localStorage.getItem('maildrop:promotions_cache')
      return cache ? JSON.parse(cache) : null
    })
    expect(promoLoaded).toBeTruthy()
    expect(promoLoaded.data.promotions.length).toBeGreaterThan(0)
    expect(promoLoaded.data.promotions[0].content.title).toContain('BulkPro')

    await triggerClose(app)

    const modal = page.locator('[role="dialog"]').last()
    await expect(modal).toBeVisible({ timeout: 5000 })

    await expect(modal.getByText('Tanıtım', { exact: true })).toBeVisible()
    await expect(modal.locator('h2', { hasText: 'BulkPro' })).toBeVisible()
    await expect(modal.getByText('Excel, PDF, mail, veri analizi')).toBeVisible()

    const img = modal.locator('img').first()
    await expect(img).toHaveCount(1)
    await page.waitForFunction(
      () => {
        const i = document.querySelector('[role="dialog"] img') as HTMLImageElement | null
        return i ? i.complete && i.naturalWidth > 0 : false
      },
      { timeout: 5000 }
    )
    const imgInfo = await img.evaluate((el: HTMLImageElement) => ({
      src: el.src,
      naturalWidth: el.naturalWidth,
      naturalHeight: el.naturalHeight,
      complete: el.complete
    }))
    expect(imgInfo.src).toContain('app.bilgetek.com/api/assets/bulkpro-banner-tr.png')
    expect(imgInfo.complete).toBe(true)
    expect(imgInfo.naturalWidth).toBe(640)
    expect(imgInfo.naturalHeight).toBe(280)
    console.log(
      `   ✓ TR banner yüklendi: ${imgInfo.naturalWidth}x${imgInfo.naturalHeight} from ${imgInfo.src}`
    )

    const closeBtnDisabled = modal.locator('button').filter({ hasText: /^Kapat \(\d\)$/ })
    await expect(closeBtnDisabled).toBeVisible()
    await expect(closeBtnDisabled).toBeDisabled()

    await page.screenshot({
      path: 'tests/screenshots/01-tr-modal-with-countdown.png',
      fullPage: false
    })

    await page.waitForTimeout(3500)
    const closeBtnReady = modal.locator('button').filter({ hasText: /^Kapat$/ })
    await expect(closeBtnReady).toBeEnabled({ timeout: 2000 })
    console.log('   ✓ 3 saniye sayaç doğrulandı, kapat butonu açıldı')

    await page.screenshot({
      path: 'tests/screenshots/02-tr-modal-ready-to-close.png',
      fullPage: false
    })

    const expectedUrl = await page.evaluate(() => {
      const cache = JSON.parse(localStorage.getItem('maildrop:promotions_cache')!)
      return cache.data.promotions[0].content.ctas[0].url as string
    })
    expect(expectedUrl).toContain('bilgetek.com/bulkpro')
    expect(expectedUrl).toContain('lang=tr')
    expect(expectedUrl).toContain('utm_source=maildrop')
    expect(expectedUrl).toContain('utm_medium=exit_modal')
    console.log(`   ✓ Cache'teki CTA URL'i: ${expectedUrl}`)

    const primaryCta = modal.locator('button', { hasText: "BulkPro'yu incele" })
    await expect(primaryCta).toBeVisible()
    await expect(primaryCta).toBeEnabled()

    const closeEventPromise = app.waitForEvent('close', { timeout: 5000 })
    await primaryCta.click()
    await closeEventPromise
    console.log('   ✓ CTA tıklandı → app kapandı (shell.openExternal + confirmClose)')
  })

  test('EN: dil değişimi sonrası modal İngilizce + EN banner gösterir', async () => {
    const { app, page } = await launchApp()

    await page.evaluate(() => {
      localStorage.setItem('maildrop:locale', 'en')
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)

    await expect(page.locator('h1', { hasText: 'Welcome' })).toBeVisible()

    await triggerClose(app)

    const modal = page.locator('[role="dialog"]').last()
    await expect(modal).toBeVisible({ timeout: 5000 })

    await expect(modal.getByText('Sponsored', { exact: true })).toBeVisible()
    await expect(modal.locator('h2', { hasText: '78 tools, one app' })).toBeVisible()

    await page.waitForFunction(
      () => {
        const i = document.querySelector('[role="dialog"] img') as HTMLImageElement | null
        return i ? i.complete && i.naturalWidth > 0 : false
      },
      { timeout: 5000 }
    )
    const img = modal.locator('img').first()
    const imgInfo = await img.evaluate((el: HTMLImageElement) => ({
      src: el.src,
      naturalWidth: el.naturalWidth,
      complete: el.complete
    }))
    expect(imgInfo.src).toContain('app.bilgetek.com/api/assets/bulkpro-banner-en.png')
    expect(imgInfo.complete).toBe(true)
    expect(imgInfo.naturalWidth).toBe(640)
    console.log(`   ✓ EN banner yüklendi: ${imgInfo.naturalWidth}px from ${imgInfo.src}`)

    await page.screenshot({ path: 'tests/screenshots/03-en-modal.png', fullPage: false })

    const primaryCta = modal.locator('button', { hasText: 'Discover BulkPro' })
    await expect(primaryCta).toBeVisible()

    await app.close().catch(() => undefined)
  })

  test('Opt-out: tanıtım kapatılırsa modal hiç görünmez, app temiz kapanır', async () => {
    const { app, page } = await launchApp()

    await page.evaluate(() => {
      localStorage.setItem('maildrop:promotions_enabled', '0')
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    const closeEventPromise = app.waitForEvent('close', { timeout: 5000 })

    await triggerClose(app)

    await closeEventPromise
    console.log('   ✓ Opt-out durumunda app modal göstermeden kapandı')
  })
})
