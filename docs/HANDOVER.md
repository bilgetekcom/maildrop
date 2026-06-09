# MailDrop — Cold-start Handover

> Yeni oturumun ilk 5 dakikası için. Detaylı PRD için: `docs/MailDrop_PRD_v1.0.docx`.

## TL;DR

- **Ne:** Ücretsiz, açık kaynak, Türkçe toplu mail gönderim masaüstü uygulaması.
- **Stack:** Electron 32 + React 18 + TypeScript + Tailwind + shadcn pattern + better-sqlite3 + Nodemailer + xlsx.
- **Build tool:** electron-vite (resmi, modern, HMR).
- **Hedef:** Windows 10/11 ve macOS 11+. Linux opsiyonel.
- **Repo (planlanan):** `github.com/bilgetekcom/maildrop`.
- **Lisans:** MIT.

## Klasör Haritası

| Yol | İçerik |
|---|---|
| `docs/` | PRD docx (tek doğruluk kaynağı), bu dosya |
| `src/main/` | Electron main process |
| `src/main/db/` | SQLite başlatma, migration'lar, safeStorage şifreleme |
| `src/main/ipc/` | smtp.ts, contacts.ts, templates.ts, campaigns.ts |
| `src/preload/` | contextBridge köprüsü, `window.api` ile tip-güvenli |
| `src/renderer/` | React UI (Vite root) |
| `src/renderer/src/components/` | Sidebar, PlaceholderPage, ileride shadcn primitives |
| `src/renderer/src/pages/` | Home, Contacts, Templates, Sending, Reports, Settings |
| `src/shared/` | main + renderer ortak TypeScript tipleri |
| `resources/` | Tray/dock icon, splash |
| `build/` | electron-builder resources (icon.ico, icon.icns) |

## IPC Sözleşmesi

Renderer'dan main'e çağrı `window.api.<namespace>.<method>(...)` ile yapılır. Tipler `src/preload/index.ts` ve `src/shared/types.ts` içinde tek doğruluk kaynağı.

Namespace'ler:
- `smtp` — list, create, update, remove, test, setDefault
- `contacts` — list, create, update, remove, importExcel, previewExcel, exportExcel
- `groups` — list, create, remove
- `templates` — list, get, create, update, remove, preview
- `campaigns` — list, get, logs, start, pause, resume, cancel, retryFailed, onProgress
- `dialog` — openExcel, saveExcel, openAttachment

`campaigns:progress` eventi main'den renderer'a `webContents.send` ile yayınlanır. `window.api.campaigns.onProgress(cb)` ile dinlenir, dönüş değeri unsubscribe.

## Veritabanı

Konum: `app.getPath('userData')/data/maildrop.db`

Migration: `src/main/db/migrations.ts` içinde versiyonlu liste. `_migrations` tablosu hangi versiyonun uygulandığını tutar. Şema değişiklikleri yeni migration olarak eklenir, mevcut olanlar düzenlenmez.

SMTP şifresi `safeStorage.encryptString` ile şifrelenir, base64 olarak `encrypted_pass` sütununda saklanır. macOS Keychain, Windows DPAPI kullanılır.

## MVP Yol Haritası (PRD §6)

| Sprint | Kapsam | Durum |
|---|---|---|
| Sprint 0 | İskelet, IPC sözleşmesi, DB şeması | ✅ 2026-06-09 |
| Sprint 1 | Settings: SMTP CRUD + test + Gmail/Outlook/Yahoo presetler | ✅ 2026-06-09 |
| Sprint 2 | Contacts: Excel import sihirbazı, manuel, gruplar, arama, export | ✅ 2026-06-09 |
| Sprint 3 | Templates: TipTap editör, değişken paneli, önizleme, ek dosya, HTML import | ✅ 2026-06-09 |
| Sprint 4 | Sending: 4 adımlı sihirbaz, hız, zamanlama, canlı ilerleme | ✅ 2026-06-09 |
| Sprint 5 | Reports: kampanya geçmişi, detay log, retry, Excel export | ✅ 2026-06-09 |
| Sprint 6 | Türkçe hata sözlüğü, ErrorBoundary, WelcomeDialog | ✅ 2026-06-09 |
| Sprint 7 | electron-builder Windows .exe / macOS .dmg installer üretimi | Bekliyor |
| Sprint 8 | electron-updater + GitHub Releases otomatik güncelleme | Bekliyor |

**PRD MVP kapsamı (P0+P1+P2) tamamlandı.** Geriye sadece installer üretimi ve auto-update kaldı.

## Önemli Kütüphane Kararları

- **TipTap 3.x** (ProseMirror): StarterKit + Link + Placeholder. Underline mark string ile (`'underline' as never`) toggle ediliyor.
- **juice**: Email gönderirken HTML'i inline CSS'e çevirmek için kuruldu. Şu an campaigns.ts'te inline edilmiyor — TipTap zaten inline-uyumlu HTML üretiyor. Gelecekte daha kompleks template'lerde devreye girer.
- **zustand**: Her sayfa için ayrı store (smtp, contacts, templates, campaigns). `subscribe()` campaigns store'da progress event'ini sürekli dinler.
- **better-sqlite3 11.x**: Senkron API. Migration tek versiyonlu, foreign keys ON, WAL.
- **@tailwindcss/typography**: TipTap çıktısı `prose` sınıfı ile stillenir.

## Kritik Kurallar (PRD §4)

1. **SIFIR öğrenme eğrisi.** Her ekran tek ana aksiyon. Menü kalabalığı yasak.
2. **TÜRKÇE her şey.** Hata mesajları dahil. "Connection refused" yerine "Bağlantı kurulamadı".
3. **Onay mekanizmaları.** Toplu işlem öncesi özet: "150 kişiye mail göndereceksin. Devam?"
4. **Anlaşılır hatalar.** Her hata mesajı = ne oldu + ne yapmalısın.
5. **Hızlı başlangıç.** 3 adımlı setup sihirbazı.
6. **Görsel geri bildirim.** Her işlem yeşil tik / kırmızı uyarı.
7. **Klavye dostu.** Tab + Enter ile mouse'suz kullanım.

## Geliştirme Komutları

```bash
npm install              # ilk kurulum (~3-5 dk)
npm run dev              # geliştirme, hot reload
npm run build            # production bundle
npm run typecheck        # main + renderer
npm run lint
npm run format
npm run build:win        # NSIS installer
npm run build:mac        # universal dmg
```

## Bilinen Açık Konular

- `better-sqlite3` native bağımlılık. `postinstall` script'i `electron-builder install-app-deps` çağırır, ama Electron sürümü değişirse rebuild gerekir.
- Gmail uygulama şifresi vs OAuth2: MVP'de uygulama şifresi yeterli. OAuth2 v2.0'a ertelendi.
- Rich text editör seçimi: TipTap (ProseMirror tabanlı) Sprint 3'te değerlendirilecek.
- electron-store + safeStorage çakışması yok — store sadece UI tercihleri için, secret yok.

## Dağıtım

- GitHub Releases üzerinden `.exe` (NSIS) ve `.dmg` (universal).
- Code signing: Sprint 7 öncesi karar (sertifika maliyeti, EV vs OV).
- Landing: `bilgetek.com/maildrop`. CTA: "Ücretsiz indir" + "BulkPro'ya bakın".

## Bilgetek bağlantıları

MailDrop ücretsiz ve açık kaynak. Bilgetek tarafından sunulan diğer ürünlerle uygun yerlerde (footer, çıkış tanıtımı) çapraz bağlantılar var. Tracking pixel YOK (PRD §6.4 kapsam dışı).
