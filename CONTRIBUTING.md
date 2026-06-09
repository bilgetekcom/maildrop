# Katkı Rehberi / Contributing

Türkçe / English below.

## Türkçe

MailDrop'a katkıda bulunmak ister misin? Süper! Aşağıdaki adımları takip et.

### Geliştirme ortamı

- **Node.js 20+** (Electron 32 native rebuild için)
- **npm 10+**
- Windows, macOS veya Linux

```bash
git clone https://github.com/bilgetekcom/maildrop.git
cd maildrop
npm install
npm run dev
```

### Yapı

```
src/
├── main/           # Electron main process (Node.js)
│   ├── db/         # SQLite + migrations
│   ├── ipc/        # IPC handlers (smtp, contacts, templates, campaigns, reports)
│   └── lib/        # Yardımcılar (hata sözlüğü, vb.)
├── preload/        # contextBridge (window.api)
├── renderer/       # React UI (Vite)
│   └── src/
│       ├── components/  # UI bileşenleri
│       ├── pages/       # Sayfalar (Home, Contacts, ...)
│       ├── store/       # Zustand store'ları
│       ├── lib/         # Yardımcılar
│       └── i18n/        # Çeviriler (tr.json, en.json)
└── shared/         # main + renderer ortak tipler
```

### Kurallar

1. **Türkçe + İngilizce** her ikisi de desteklenmeli. UI string'leri `src/renderer/src/i18n/locales/` altında, key bazlı.
2. **TypeScript strict** — `any` kullanma, tipler net olsun.
3. **Bağımlılık eklemeden önce düşün** — minimal kalmaya gayret ediyoruz.
4. **DB değişikliği** → yeni migration ekle (`src/main/db/migrations.ts`), mevcut migration'ı düzenleme.
5. **Gizlilik** — kullanıcı verisi sunucuya gitmemeli. Sadece anonim tanıtım fetch'i hariç (opt-out edilebilir).

### PR akışı

1. Fork → branch (`feat/...`, `fix/...`, `docs/...`)
2. Değişikliklerini yap
3. `npm run typecheck && npm run lint` çalıştır
4. PR aç, açıklayıcı bir başlık ve özet ekle
5. CI yeşil olunca review bekle

### Yeni dil eklemek

1. `src/renderer/src/i18n/locales/<lang>.json` oluştur (`en.json`'u baz al)
2. `src/renderer/src/i18n/index.tsx`'te `SUPPORTED_LOCALES` listesine ekle
3. `dictionaries` map'ine ekle
4. PR

## English

Want to contribute to MailDrop? Awesome. Follow these steps.

### Development setup

- **Node.js 20+** (for Electron 32 native rebuild)
- **npm 10+**
- Windows, macOS, or Linux

```bash
git clone https://github.com/bilgetekcom/maildrop.git
cd maildrop
npm install
npm run dev
```

### Structure

See Turkish section above; folder structure is identical.

### Guidelines

1. **Both Turkish and English** must be supported. UI strings live in `src/renderer/src/i18n/locales/` as key-based JSON.
2. **TypeScript strict** — avoid `any`, keep types tight.
3. **Think before adding dependencies** — we keep the surface minimal.
4. **DB schema change** → add a new migration in `src/main/db/migrations.ts`. Never edit an existing migration.
5. **Privacy** — user data must never leave the local machine. The only exception is the anonymous promotion fetch (opt-out available).

### PR flow

1. Fork → branch (`feat/...`, `fix/...`, `docs/...`)
2. Make your changes
3. Run `npm run typecheck && npm run lint`
4. Open a PR with a clear title and summary
5. Wait for review once CI is green

### Adding a new language

1. Create `src/renderer/src/i18n/locales/<lang>.json` (copy from `en.json`)
2. Add to `SUPPORTED_LOCALES` in `src/renderer/src/i18n/index.tsx`
3. Add to the `dictionaries` map
4. Open a PR
