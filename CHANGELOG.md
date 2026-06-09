# Changelog

Tüm önemli değişiklikler burada belgelenir. Sürümler [Semantic Versioning](https://semver.org/lang/tr/) standardını takip eder.

## [Yayınlanmamış]

### v0.1.2 — Production hardening (2026-06-09)

54 maddelik audit sonrası kapsamlı temizlik. Tüm kullanıcılara güçlü öneri: bu sürüme güncelleyin.

**Güvenlik**
- electron-updater + Electron 38 LTS'e geçildi (önceki 32.x EOL ve 17 yüksek advisory taşıyordu)
- nodemailer 8.0.10+ (ReDoS + interpretation-conflict CVE'leri kapandı)
- xlsx 0.18.5 (prototype pollution + ReDoS) tamamen kaldırıldı, exceljs ile değiştirildi
- `setWindowOpenHandler` protokol whitelist: artık sadece http/https/mailto açar, `file://`/`smb://`/`javascript:` reddediliyor
- `will-navigate` interceptor: harici linkleri her zaman dış tarayıcıya yönlendirir
- Excel/şablon IPC'sinde tüm dosya yolları `assertSafePath` ile doğrulanıyor (sistem klasörleri ve app dir engellendi)
- bilgetek-ads Worker'ında query parametre uzunluk + format whitelist'i

**Gizlilik**
- Google Fonts kaldırıldı, sistem font stack'ine geçildi ("veri lokalde kalır" iddiası tutarlı)
- README'de fetch zamanlaması düzeltildi

**i18n**
- SMTP hata sözlüğü main process'ten kalkıp ortak error code şemasına geçti, renderer her locale için doğru mesajı render eder
- SMTP test maili kullanıcının diline göre gönderilir
- Şablon değişkenleri TR + EN + lowercase alias destekler (`{{Ad}}` ve `{{FirstName}}` ikisi de çalışır)
- Settings'te SMTP/template FK delete hatası anlaşılır toast olarak
- ContactsTable LIMIT/OFFSET + count endpoint (10K kişi için temel)
- Dialog aria-label, native alert → Toast component

**Robustness**
- `runCampaign` outer try/catch + finally ile orphan state önlendi
- Startup recovery: çökme sonrası running/paused kayıtlar cancelled'a çekilir, scheduled olan timer yeniden kurulur
- `campaigns` tablosuna `scheduled_at`, `rate_per_second`, `target_contact_ids` kolonları (migration v2)
- Kampanya çalışırken app kapanması engelleniyor (kullanıcıya onay sorulur)
- Resume after restart: cache'lenmiş log'lara göre kaldığı yerden devam
- Attachment dosyası gönderim öncesi `existsSync` ile doğrulanır
- 25 MB üstü ek dosya seçiminde toast uyarısı

**Pipeline**
- release.yml: tag/package.json version consistency check
- release publish: CHANGELOG.md'den release notes çıkarımı
- bilgetek.com/api/maildrop/latest cache TTL 1h → 5dk, `?refresh` param ile manuel bypass
- bilgetek-ads private repo'ya alındı (`bilgetekcom/bilgetek-ads`)
- embedded-fallback localhost URL'leri prod URL'e çevrildi

**UX**
- Sidebar versiyon artık dinamik (IPC üzerinden `app.getVersion()`)
- Promotions client APP_VERSION dinamik
- Toast component (native alert kaldırıldı)
- Templates delete confirm gerçek "emin misiniz" mesajı

**Geriye uyumluluk**
- macOS auto-update kod imzasız çalışmadığı için Settings'te "manuel indir" alternatif gösterilir
- v0.1.1 kullanıcıları electron-updater ile v0.1.2'yi otomatik alır

### Sprint 9 — Production deploy + görsel altyapı + E2E (2026-06-09)
- **bilgetek-ads Cloudflare'e deploy edildi:** Worker `https://app.bilgetek.com`, R2 bucket `bilgetek-ads`, KV `ADS_CACHE`, otomatik DNS + SSL
- **Görsel reklam altyapısı:** Worker'a `/api/assets/:filename` route, R2 + embedded base64 fallback, 640×280 BulkPro test bannerları (TR+EN) üretildi ve R2'ya yüklendi
- **Playwright E2E test suite:** 3 test (TR modal+görsel+sayaç+CTA, EN dil değişimi, opt-out), prod Cloudflare endpoint'ine karşı 3/3 geçti
- **CSP düzeltmesi:** `img-src` ve `connect-src`'e localhost + bilgetek.com eklendi
- **DevTools auto-open dev modunda** + renderer console main stdout'a yönlendirildi (debugging için)
- **Preload path düzeltmesi:** `.mjs` uzantısı (electron-vite çıktı formatı)

### Sprint 8 — Çoklu dil + reklam altyapısı (2026-06-09)
- **i18n altyapısı:** `i18n/` klasörü, `useT()` hook, `LocaleProvider`, locale chain (de-DE → de → fallback), 300+ çeviri key (Türkçe + İngilizce)
- **Dil seçici:** Settings sayfasında, anlık değişim, localStorage'da kalıcı
- **Tüm UI i18n:** Sidebar, Home, Contacts, Templates, Sending, Reports, Settings, WelcomeDialog, dialog'lar, tüm form mesajları, SMTP preset isimleri
- **bilgetek-ads servisi** ayrı repoya çekildi (`C:\Users\COMP\Projects\Active\bilgetek-ads\`): Cloudflare Worker (Hono) + R2 + KV cache, locale-aware filter + fallback chain, schema v1, 6 dil hazır (tr/en/de/es/it/fr)
- **Reklam tüketicisi:** Exit modal (uygulama kapanırken), 3 saniye sayaç (kapat butonu disabled), görsel banner + 2 CTA, frequency cap (24h cooldown + haftalık limit), opt-out toggle
- **before-close handshake:** Main process e.preventDefault + IPC üzerinden renderer'a sorma + reklam göster/kapat onayı + app.quit()
- **Gizlilik:** Anonim GET, sadece app/locale/version/platform query parametreleri, tracking yok, README'ye saydam açıklama

### Sprint 7 — Windows installer üretimi (2026-06-09)
- 512×512 marka ikonu (mavi gradient, beyaz M harfi) `build/icon.png` ile üretildi
- `electron-builder --win --x64` ile NSIS installer: `release/0.1.0/MailDrop-Setup-0.1.0.exe` (84 MB)
- better-sqlite3 native modülü asar-unpacked olarak paketlendi
- Code signing yapılmadı (sertifika yok, ilk yayında uyarı çıkacaktır)
- `npm run build:win` komutu artık tek adımda installer üretir
- docs/QUICKSTART.md kullanıcı rehberi eklendi (5 dakikalık başlangıç + sık hatalar tablosu)

### Sprint 6 — Setup & Türkçe hata sözlüğü (2026-06-09)
- `src/main/lib/error-translator.ts`: SMTP/Nodemailer hata kodlarını (EAUTH, ETIMEDOUT, ECONNREFUSED, ENOTFOUND, 554, quota, 550, vb.) anlaşılır Türkçeye çeviren sözlük (9 kural). Her mesaj "ne oldu + ne yapmalısın" formatında.
- `ErrorBoundary` component: React render hataları beyaz ekran yapmaz, "Yeniden dene" butonu sunar
- `WelcomeDialog`: localStorage flag ile ilk açılışta gösterilir, 3 adım rehberi + gizlilik mesajı + Ayarlar'a yönlendirme
- Smtp.ts ve campaigns.ts artık translateSmtpError kullanır

### Sprint 5 — Raporlar (2026-06-09)
- `pages/Reports.tsx`: kampanya tablosu (tarih, toplam, başarılı, başarısız, durum badge'i)
- `CampaignDetail`: detay sayfası, log tablosu (Başarılı/Başarısız filtresi), başarı oranı, retry, Excel export
- `src/main/ipc/reports.ts`: kampanya Excel export (Özet + Detay sayfaları), kampanya silme
- Live `progress` subscription tüm sayfalarda aynı store'dan

### Sprint 4 — Gönderim (2026-06-09)
- 4 adımlı stepper: Kişiler → Şablon → Ayarlar → Onay → Çalışan
- `ContactPicker`: grup filtreleme, arama, "görünenleri ekle"
- `TemplatePicker`: kart düzeni, kullanılan değişkenleri rozet olarak gösterir
- Hız kontrolü (0.5–5 mail/sn), zamanlama (datetime-local)
- Onay özet ekranı: alıcı, gönderen, hız, tahmini süre
- `CampaignConsole`: canlı ilerleme barı, başarılı/başarısız/kalan, duraklat, devam et, iptal, başarısızı tekrar dene
- Main process'te scheduleAt için setTimeout, zamanlanmış kampanyalar

### Sprint 3 — Şablonlar (2026-06-09)
- TipTap rich text editör + StarterKit + Link + Placeholder
- `EditorToolbar`: undo/redo, H2/H3, bold/italic/underline/strike, listeler, blockquote, link
- `VariablePanel`: Ad/Soyad/Email/Firma + kişilerden çıkarılan custom field'lar, tıklayıp konu veya gövdeye ekleme, kullanım rozeti
- Konu satırı değişkeni desteği (PRD §3.3 P0)
- `PreviewDialog`: test kişisi seç → render edilmiş mail önizlemesi
- Ek dosya seçimi + HTML import (P1+P2)
- `TemplateList`: sol panelde liste, seçim, silme
- `@tailwindcss/typography` plugin + prose styling

### Sprint 2 — Kişiler (2026-06-09)
- `GroupSidebar`: grup CRUD (renkli noktalar, 6 hazır renk), aktif grup filtresi
- `ContactsTable`: çoklu seçim, satır içi düzenle/sil
- `ContactDialog`: manuel kişi ekle/düzenle, grup atama, e-posta validasyonu, UNIQUE hatası Türkçe
- `ImportWizard`: 3 adımlı sihirbaz (dosya seç → otomatik sütun eşleştirme → önizleme + import), tekrar kontrol (duplicate listesi)
- Arama: debounced (200ms)
- Excel export (tüm liste veya aktif grup)

### Sprint 1 — SMTP Ayarları (2026-06-09)
- shadcn-pattern UI primitives: Button, Input, Label, Card, Badge, Switch, Select, Dialog, Alert
- SMTP presetler: Gmail / Outlook / Yahoo / Özel — otomatik host+port+SSL
- Settings sayfası: bağlı hesaplar listesi (varsayılan rozeti, sil/düzenle/varsayılan yap), yeni hesap formu, düzenle dialog'u
- "Test Et" butonu: gerçek nodemailer.verify + örnek mail; Türkçe hata mesajları (auth, timeout, refused)
- Zustand smtp store, optimistic refresh
- Home ekranı: gerçek istatistikleri çeker (kişi/şablon/SMTP/son kampanya), 3 adım tamamlandı rozeti, "Yeni Gönderim Başlat" disabled gating
- ESM warning fix: package.json `type: module`

### Sprint 0 — İskelet
- Proje iskeleti: Electron + Vite + React + TypeScript + Tailwind
- SQLite veritabanı şeması ve migration mekanizması (smtp_accounts, contacts, contact_groups, templates, campaigns, campaign_logs)
- SMTP CRUD ve bağlantı testi (Nodemailer)
- Kişi CRUD, Excel/CSV import (mapping), Excel export (SheetJS)
- Şablon CRUD, otomatik değişken çıkarımı (`{{Ad}}`), önizleme
- Kampanya başlat/duraklat/iptal/retry, canlı ilerleme IPC eventi
- Sol navigasyon, 5 ana sayfa iskeleti

## [0.1.0] - 2026-06-09

İlk iskelet sürümü. Henüz çalıştırılabilir installer üretilmiyor.
