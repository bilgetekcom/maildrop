# MailDrop

Ücretsiz, açık kaynak, Türkçe toplu kişiselleştirilmiş e-posta gönderim masaüstü uygulaması.

Bilgisayarınızdaki Excel listenizden, kendi e-posta hesabınız üzerinden kişiselleştirilmiş toplu mail gönderir. Veri sunucuya yüklenmez, her şey lokalde çalışır.

## Felsefe

5 dakikada ilk toplu mail. Hiçbir kurulum kılavuzu okumadan, hiçbir teknik bilgi gerektirmeden.

## Özellikler (MVP v1.0)

- SMTP bağlantısı (Gmail, Outlook, Yahoo, özel) ve bağlantı testi
- Excel/CSV içe aktarımı ile otomatik sütun eşleştirme
- Manuel kişi ekleme, gruplar, arama
- Zengin metin şablon editörü ve `{{Ad}}` değişken sistemi
- Önizleme: göndermeden önce gerçek veri ile birleştirilmiş mail
- Toplu gönderim, canlı ilerleme, duraklat, iptal
- Başarısız gönderimleri yeniden gönderme
- Kampanya geçmişi ve detay logları
- Tüm arayüz Türkçe, anlaşılır hata mesajları

## Teknoloji

- **Framework:** Electron 32
- **Frontend:** React 18 + TypeScript
- **UI:** Tailwind CSS + shadcn/ui pattern + lucide-react
- **Build:** electron-vite
- **Veritabanı:** SQLite (better-sqlite3), lokal `AppData` altında
- **E-posta:** Nodemailer
- **Excel:** SheetJS (xlsx)
- **Şifreleme:** Electron `safeStorage` (OS keychain)
- **Paketleme:** electron-builder

## Geliştirme

```bash
npm install
npm run dev          # geliştirme modu, hot reload
npm run build        # production build
npm run build:win    # Windows .exe (NSIS installer)
npm run build:mac    # macOS .dmg (universal)
npm run typecheck    # main + renderer tip kontrolü
```

## Sistem Gereksinimleri

- Windows 10/11 veya macOS 11+
- 4 GB RAM (8 GB önerilir)
- 200 MB disk
- SMTP sunucusu için internet bağlantısı
- Kurulum yönetici yetkisi gerektirmez

## Klasör Yapısı

```
MailDrop/
├── docs/                       # PRD, HANDOVER, mimari
├── src/
│   ├── main/                   # Electron main process
│   │   ├── db/                 # SQLite + migrations
│   │   ├── ipc/                # IPC handler'ları (smtp/contacts/templates/campaigns)
│   │   └── index.ts
│   ├── preload/                # IPC köprüsü (contextBridge)
│   ├── renderer/               # React UI
│   │   └── src/
│   │       ├── components/
│   │       ├── pages/
│   │       ├── lib/
│   │       └── styles/
│   └── shared/                 # main + renderer ortak tipler
├── resources/                  # ikonlar, build asset'leri
├── build/                      # electron-builder build resources
└── docs/MailDrop_PRD_v1.0.docx # tek doğruluk kaynağı
```

## Gizlilik

- **Tüm verileriniz** (kişiler, şablonlar, SMTP şifreleri) bilgisayarınızda kalır. Hiçbir bilgi sunucumuza yüklenmez.
- **SMTP şifreniz** işletim sisteminizin güvenli alanında (Windows DPAPI / macOS Keychain) şifrelenir.
- **Tanıtım önerileri:** Uygulama açıldığında bir kez `https://app.bilgetek.com/api/promotions` adresinden anonim olarak tanıtım içeriklerini çeker (6 saat cache). Bu istekte yalnızca uygulamanın adı, sürümü, dil seçimi ve işletim sistemi gönderilir. Kişisel veri, kişi listeniz, e-posta adresleriniz veya kullanım istatistikleriniz **gönderilmez**. Ayarlar sayfasından bu özelliği tamamen kapatabilirsiniz.
- Telemetry, tracking pixel veya kullanım analytics **yoktur**.
- Kodun tamamı [açık kaynaktır](https://github.com/bilgetekcom/maildrop), kendi gözlerinizle inceleyebilirsiniz.

## Lisans

MIT. Detaylar için [LICENSE](LICENSE).

## Bilgetek

MailDrop, [Bilgetek](https://bilgetek.com) tarafından geliştirilen ücretsiz ve açık kaynak bir uygulamadır. Aynı ekibin diğer ürünlerini [bilgetek.com](https://bilgetek.com) üzerinde bulabilirsiniz.
