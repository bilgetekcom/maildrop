/**
 * MailDrop hazır şablon kütüphanesi.
 *
 * Kullanıcı bu listeden bir şablon seçer; uygulama, seçilen şablonu kullanıcının
 * kendi `templates` tablosuna bir kopya olarak ekler. Orijinal kütüphane bozulmaz.
 *
 * Her şablon:
 *   - kullanıcı dostu kısa bir görev tanımı
 *   - TR + EN subject ve gövde
 *   - 4-6 paragraflık nötr business tonu
 *   - {{Ad}}, {{Firma}} gibi sade değişken seti
 *   - spam trigger word taşımaz, image-only değildir
 */

export type LibraryCategory =
  | 'welcome'
  | 'announcement'
  | 'promotion'
  | 'event'
  | 'newsletter'
  | 'crm'
  | 'b2b'
  | 'education'
  | 'ngo'

export interface LibraryTemplate {
  id: string
  category: LibraryCategory
  name: { tr: string; en: string }
  subject: { tr: string; en: string }
  bodyHtml: { tr: string; en: string }
}

const intro = (greeting: string): string => `<p>${greeting}</p>`

function wrap(htmlBody: string, signature: { tr: string; en: string }, lang: 'tr' | 'en'): string {
  return `${htmlBody}\n<p style="margin-top:24px;">${signature[lang]}</p>`
}

const SIG = {
  tr: 'Saygılarımızla,<br>{{Firma}}',
  en: 'Best regards,<br>{{Firma}}'
}

export const TEMPLATE_LIBRARY: LibraryTemplate[] = [
  // --------------------------- WELCOME ---------------------------
  {
    id: 'welcome-new-member',
    category: 'welcome',
    name: { tr: 'Yeni üye karşılama', en: 'New member welcome' },
    subject: { tr: 'Hoş geldiniz {{Ad}}!', en: 'Welcome {{Ad}}!' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>{{Firma}} ailesine hoş geldiniz. Aramıza katıldığınız için teşekkür ederiz.</p><p>Önümüzdeki günlerde size hizmetlerimizi en iyi şekilde anlatmak için elimizden geleni yapacağız. Herhangi bir sorunuz olursa bu maile yanıt vermeniz yeterli.</p><p>Başlamak için aşağıdaki kısa adımları takip edebilirsiniz: profilinizi tamamlayın, ilgi alanlarınızı seçin ve ilk ihtiyaçlarınızı bizimle paylaşın.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>Welcome to the {{Firma}} family. Thank you for joining us.</p><p>Over the next few days we'll do our best to introduce you to our services. If you have any questions, simply reply to this email.</p><p>To get started, complete your profile, choose your interests, and share your initial needs with us.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'welcome-first-purchase-thanks',
    category: 'welcome',
    name: { tr: 'İlk satın alma teşekkürü', en: 'First purchase thank you' },
    subject: { tr: 'Teşekkürler {{Ad}} — siparişiniz alındı', en: 'Thank you {{Ad}} — your order is in' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>İlk siparişiniz için çok teşekkür ederiz. Sizi {{Firma}} müşterileri arasında görmek bizim için kıymetli.</p><p>Siparişiniz hazırlanma aşamasında. Kargoya verildiği anda ayrı bir bilgilendirme mesajı alacaksınız.</p><p>Yaşadığınız deneyim hakkında geri bildiriminizi her zaman bekleriz. Bu mail'e doğrudan yanıt verebilirsiniz.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>Thank you for your first order. We're glad to count you among {{Firma}} customers.</p><p>Your order is being prepared. You'll receive a separate notification as soon as it ships.</p><p>We always welcome your feedback. Feel free to reply to this email directly.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'welcome-getting-started',
    category: 'welcome',
    name: { tr: 'Kullanım rehberi', en: 'Getting started guide' },
    subject: { tr: '{{Firma}} ile başlamak için 3 kısa adım', en: '3 quick steps to get started with {{Firma}}' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>İlk gününüze hoş geldiniz. Sistemden en iyi şekilde faydalanmanız için 3 kısa adımı tamamlamanızı öneriyoruz:</p><ol><li><strong>Profilinizi tamamlayın</strong> — kişisel bilgilerinizi ve tercihlerinizi ayarlayın.</li><li><strong>İlk içeriği oluşturun</strong> — boş bir sayfa ile başlayın veya örnek şablonu kullanın.</li><li><strong>Ekibinizi davet edin</strong> — birden fazla kişi ile çalışıyorsanız onları sisteme ekleyin.</li></ol><p>Takıldığınız her noktada bu mail'e yanıt verebilirsiniz.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>Welcome to your first day. To get the most out of the platform, we recommend completing these 3 quick steps:</p><ol><li><strong>Complete your profile</strong> — set your personal information and preferences.</li><li><strong>Create your first item</strong> — start with a blank page or use the sample template.</li><li><strong>Invite your team</strong> — if you work with others, add them to the workspace.</li></ol><p>If you get stuck anywhere, just reply to this email.</p>`,
        SIG,
        'en'
      )
    }
  },

  // --------------------------- ANNOUNCEMENT ---------------------------
  {
    id: 'announcement-policy-update',
    category: 'announcement',
    name: { tr: 'Politika değişikliği', en: 'Policy update' },
    subject: { tr: 'Önemli: Kullanım politikamızda güncelleme', en: 'Important: Our policy has been updated' },
    bodyHtml: {
      tr: wrap(
        `${intro('Sayın {{Ad}},')}<p>Kullanım politikamızda bazı güncellemeler yaptık. Bu güncellemeler {{Tarih}} itibarıyla yürürlüğe girecek.</p><p>Başlıca değişiklikler:</p><ul><li>Veri saklama sürelerinin netleştirilmesi</li><li>Üçüncü taraf entegrasyonlarına dair şartlar</li><li>Hesap iptal sürecinin sadeleştirilmesi</li></ul><p>Yeni politikanın tam metnini sayfamızdan inceleyebilirsiniz. Soru veya endişeniz olursa lütfen bizimle iletişime geçin.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Dear {{Ad}},')}<p>We have made some updates to our usage policy. These changes will take effect on {{Tarih}}.</p><p>Key changes:</p><ul><li>Clearer data retention periods</li><li>Terms regarding third-party integrations</li><li>Simplified account cancellation process</li></ul><p>You can read the full new policy on our website. Please get in touch if you have questions or concerns.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'announcement-service-update',
    category: 'announcement',
    name: { tr: 'Hizmet güncellemesi', en: 'Service update' },
    subject: { tr: '{{Firma}} hizmetimizde yeni bir gelişme', en: 'A new development in your {{Firma}} service' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>Hizmetimizi geliştirmek için çalıştığımız iki yeni özelliği sizinle paylaşmak istiyoruz.</p><p>Bu hafta yayına aldığımız iyileştirmeler şunlar:</p><ul><li>Daha hızlı arama deneyimi</li><li>Geliştirilmiş raporlama ekranı</li></ul><p>Yeni özellikler hesabınızda otomatik olarak aktif. Herhangi bir kurulum yapmanıza gerek yok.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>We'd like to share two new features we've been working on to improve our service.</p><p>The improvements released this week:</p><ul><li>Faster search experience</li><li>Improved reporting screen</li></ul><p>The new features are automatically enabled in your account. No setup required.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'announcement-maintenance',
    category: 'announcement',
    name: { tr: 'Bakım çalışması bildirimi', en: 'Scheduled maintenance notice' },
    subject: { tr: 'Planlı bakım — {{Tarih}}', en: 'Scheduled maintenance — {{Tarih}}' },
    bodyHtml: {
      tr: wrap(
        `${intro('Sayın {{Ad}},')}<p>{{Tarih}} tarihinde planlı bir bakım çalışması gerçekleştireceğiz. Bu süre boyunca hizmetimize yaklaşık 2 saat erişilemeyecek.</p><p>Bakım çalışmasının amacı altyapımızın güvenlik güncellemelerini almak ve performansı artırmaktır. Hiçbir veriniz etkilenmeyecek.</p><p>Anlayışınız için teşekkür eder, herhangi bir sorunuz olursa cevap vermek için hazır olduğumuzu bilmenizi isteriz.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Dear {{Ad}},')}<p>We will be performing scheduled maintenance on {{Tarih}}. During this time the service will be unavailable for approximately 2 hours.</p><p>The purpose is to apply infrastructure security updates and improve performance. None of your data will be affected.</p><p>Thank you for your patience. We're here if you have any questions.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'announcement-new-feature',
    category: 'announcement',
    name: { tr: 'Yeni özellik duyurusu', en: 'New feature announcement' },
    subject: { tr: 'Beklediğiniz özellik artık burada {{Ad}}', en: 'The feature you asked for is here, {{Ad}}' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>Sizden gelen geri bildirimler doğrultusunda yeni bir özellik hazırladık. Artık raporlarınızı tek tıkla PDF olarak dışa aktarabilirsiniz.</p><p>Özelliği kullanmaya başlamak için raporlar sayfasında <strong>İndir</strong> butonuna tıklamanız yeterli.</p><p>Geri bildirimleriniz için teşekkürler. Önceliklerimizi belirlerken sizin önerilerinizi dikkate alıyoruz.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>Based on your feedback, we've built a new feature. You can now export your reports to PDF with a single click.</p><p>To start using it, just click the <strong>Download</strong> button on the reports page.</p><p>Thank you for your feedback. Your suggestions shape our priorities.</p>`,
        SIG,
        'en'
      )
    }
  },

  // --------------------------- PROMOTION ---------------------------
  {
    id: 'promotion-discount',
    category: 'promotion',
    name: { tr: 'İndirim duyurusu', en: 'Discount announcement' },
    subject: { tr: 'Size özel bir teklif {{Ad}}', en: 'A special offer for you, {{Ad}}' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>Sizi düşündüğümüzü göstermek için seçili ürünlerimizde özel bir indirim hazırladık.</p><p>Bu hafta boyunca geçerli tekliflerden faydalanmak için sayfamızı ziyaret edebilirsiniz. Sorularınız olursa cevap vermekten mutluluk duyarız.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>To show that we appreciate you, we've prepared a special discount on selected items.</p><p>You can visit our page to browse the offers valid this week. We're happy to answer any questions.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'promotion-seasonal',
    category: 'promotion',
    name: { tr: 'Sezon kampanyası', en: 'Seasonal campaign' },
    subject: { tr: 'Yaz seçkimiz sizi bekliyor', en: 'Our summer selection is waiting' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>Yaz sezonu için özenle hazırladığımız yeni koleksiyonumuz yayında. Sizin için en uygun seçenekleri bir araya getirdik.</p><p>Koleksiyonu sayfamızdan inceleyebilir, beğendiğiniz parçaları kolayca sipariş edebilirsiniz.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>Our carefully prepared new summer collection is now live. We've put together the best picks for you.</p><p>Browse the collection on our page and order your favorites with ease.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'promotion-flash-sale',
    category: 'promotion',
    name: { tr: 'Flash sale', en: 'Flash sale' },
    subject: { tr: '48 saatlik özel fiyat', en: '48-hour special pricing' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>Önümüzdeki 48 saat boyunca seçili ürünlerimizde özel bir fiyat sunuyoruz. Stoklar sınırlı olduğu için karar vermek isteyenler için bu mail bir hatırlatma.</p><p>Detaylar için sayfamıza göz atabilirsiniz.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>For the next 48 hours we're offering special pricing on selected items. As stock is limited, this email is a heads-up.</p><p>You can check our page for details.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'promotion-coupon',
    category: 'promotion',
    name: { tr: 'Kupon kodu paylaşımı', en: 'Coupon code sharing' },
    subject: { tr: '{{Ad}}, size özel kupon kodu', en: '{{Ad}}, your personal coupon code' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>Sizi tekrar görmekten memnuniyet duyacağız. Bir sonraki alışverişinizde kullanabileceğiniz kişisel kupon kodunuz:</p><p style="text-align:center;font-family:monospace;font-size:18px;letter-spacing:2px;background:#f5f5f5;padding:12px;border-radius:6px;">SIZE-OZEL-2026</p><p>Kupon önümüzdeki 30 gün boyunca geçerli. Sepetinizde otomatik olarak uygulanır.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>We'd love to see you again. Here is your personal coupon code for your next order:</p><p style="text-align:center;font-family:monospace;font-size:18px;letter-spacing:2px;background:#f5f5f5;padding:12px;border-radius:6px;">JUST-FOR-YOU-2026</p><p>The coupon is valid for the next 30 days and is applied automatically at checkout.</p>`,
        SIG,
        'en'
      )
    }
  },

  // --------------------------- EVENT ---------------------------
  {
    id: 'event-invitation',
    category: 'event',
    name: { tr: 'Etkinlik daveti', en: 'Event invitation' },
    subject: { tr: 'Sizi etkinliğimize davet ediyoruz', en: 'You are invited to our event' },
    bodyHtml: {
      tr: wrap(
        `${intro('Sayın {{Ad}},')}<p>{{Firma}} olarak düzenleyeceğimiz etkinliğimize sizi de aramızda görmek isteriz.</p><p><strong>Tarih:</strong> {{Tarih}}<br><strong>Konum:</strong> Detaylar için kayıt sayfasını ziyaret edin.</p><p>Katılım ücretsiz olup yer sayısı sınırlıdır. Katılımınızı önceden bildirmenizi rica ederiz.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Dear {{Ad}},')}<p>We would love to see you at our upcoming event hosted by {{Firma}}.</p><p><strong>Date:</strong> {{Tarih}}<br><strong>Location:</strong> See the registration page for details.</p><p>Attendance is free and seating is limited. Please confirm your attendance in advance.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'event-reminder',
    category: 'event',
    name: { tr: 'Etkinlik hatırlatma', en: 'Event reminder' },
    subject: { tr: 'Yarın görüşelim {{Ad}}', en: 'See you tomorrow, {{Ad}}' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>Yarınki etkinliğimiz için kısa bir hatırlatma yapmak istedik. Sizi aramızda görmek için sabırsızlanıyoruz.</p><p>Etkinlik {{Tarih}} tarihinde gerçekleşecek. Konum ve saat bilgisi kayıt sayfasında mevcut.</p><p>Son dakika değişikliği yaşarsanız bu mail'e yanıt vermeniz yeterli.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>Just a quick reminder about tomorrow's event. We're looking forward to seeing you.</p><p>The event takes place on {{Tarih}}. Location and time details are on the registration page.</p><p>If something comes up last minute, just reply to this email.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'event-post-thanks',
    category: 'event',
    name: { tr: 'Etkinlik sonrası teşekkür', en: 'Post-event thank you' },
    subject: { tr: 'Aramızda olduğunuz için teşekkürler', en: 'Thank you for joining us' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>Etkinliğimize katıldığınız için çok teşekkür ederiz. Sizinle aynı odada olmak bizim için kıymetliydi.</p><p>Etkinlik sunumlarını ve kayıtlarını önümüzdeki günlerde sizinle paylaşacağız. Geri bildirimlerinizi her zaman bekliyoruz.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>Thank you for joining our event. It meant a lot to share the room with you.</p><p>We will share the presentations and recordings with you over the coming days. We always welcome your feedback.</p>`,
        SIG,
        'en'
      )
    }
  },

  // --------------------------- NEWSLETTER ---------------------------
  {
    id: 'newsletter-monthly',
    category: 'newsletter',
    name: { tr: 'Aylık bülten', en: 'Monthly newsletter' },
    subject: { tr: 'Bu ayın özeti', en: 'This month at a glance' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>Geçen ay öne çıkan üç önemli güncellemeyi sizinle paylaşmak istedik:</p><ol><li><strong>Yeni özellik:</strong> Raporlarınızı artık tek tıkla dışa aktarabiliyorsunuz.</li><li><strong>Topluluk:</strong> Ay boyunca düzenlediğimiz oturumların özetleri sayfamızda.</li><li><strong>Yakında:</strong> Önümüzdeki ay yayına alacağımız değişiklikler için kısa bir önizleme.</li></ol><p>Yorumlarınızı bu maile yanıt vererek paylaşabilirsiniz.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>Here are three highlights from the last month:</p><ol><li><strong>New feature:</strong> You can now export your reports with a single click.</li><li><strong>Community:</strong> Summaries of our sessions throughout the month are on our page.</li><li><strong>Coming soon:</strong> A quick preview of what we're shipping next month.</li></ol><p>Reply to this email to share your thoughts.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'newsletter-industry-summary',
    category: 'newsletter',
    name: { tr: 'Sektör özeti', en: 'Industry summary' },
    subject: { tr: 'Sektörden bu hafta', en: 'This week in the industry' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>Sektörümüzü etkileyen üç gelişmeyi derledik. Hafta sonu rahatça okuyabilirsiniz:</p><ul><li>Yeni düzenlemelerin işletmelere etkisi</li><li>Teknolojide bu hafta dikkatimizi çeken haberler</li><li>Müşteri davranışında öne çıkan eğilimler</li></ul><p>Detaylar için sayfamızdaki bültene göz atabilirsiniz.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>We've gathered three developments that affect our industry. A light weekend read:</p><ul><li>How new regulations will affect businesses</li><li>Tech news that caught our attention this week</li><li>Trends standing out in customer behaviour</li></ul><p>For the details, take a look at the newsletter on our page.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'newsletter-year-end',
    category: 'newsletter',
    name: { tr: 'Yıl sonu retrospektif', en: 'Year-end retrospective' },
    subject: { tr: 'Birlikte geçirdiğimiz bir yıl', en: 'A year together' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>Geride bıraktığımız yılı birlikte özetlemek istedik. Yıl boyunca yanımızda olduğunuz için teşekkür ederiz.</p><p>Bu yıl üç önemli adım attık: yeni bir ürün yayınladık, müşteri sayımızı iki katına çıkardık ve daha hızlı destek sağlamak için ekibimizi büyüttük.</p><p>Önümüzdeki yıl için planladığımız değişiklikleri yakında sizinle paylaşacağız. İyi bir yılbaşı dileriz.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>We wanted to look back on the past year together. Thank you for being with us throughout.</p><p>This year we took three important steps: we launched a new product, doubled our customer base, and grew our team to provide faster support.</p><p>We'll share what we're planning for next year soon. Wishing you a great new year.</p>`,
        SIG,
        'en'
      )
    }
  },

  // --------------------------- CRM ---------------------------
  {
    id: 'crm-birthday',
    category: 'crm',
    name: { tr: 'Doğum günü kutlaması', en: 'Birthday greeting' },
    subject: { tr: 'Doğum gününüz kutlu olsun {{Ad}}', en: 'Happy birthday {{Ad}}' },
    bodyHtml: {
      tr: wrap(
        `${intro('Sevgili {{Ad}},')}<p>Yeni yaşınızı içtenlikle kutlarız. Önümüzdeki yıl size sağlık, mutluluk ve sevdiklerinizle dolu güzel anılar getirsin.</p><p>Bizim için kıymetli bir ortak olduğunuzu hatırlatmak istedik.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Dear {{Ad}},')}<p>Wishing you a sincere happy birthday. May the year ahead bring you health, happiness, and great moments with those you love.</p><p>We wanted to remind you how much we value our partnership.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'crm-anniversary',
    category: 'crm',
    name: { tr: 'Yıldönümü kutlaması', en: 'Anniversary greeting' },
    subject: { tr: 'Bir yılı geride bıraktık {{Ad}}', en: 'One year together, {{Ad}}' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>Bizimle birlikte bir yılı geride bıraktınız. Bu süre boyunca güveniniz için içtenlikle teşekkür ederiz.</p><p>Önümüzdeki yıl da size daha iyi hizmet sunmak için çalışmaya devam edeceğiz. Görüş ve önerilerinizi her zaman dinliyoruz.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>You have been with us for a full year. Thank you sincerely for your trust during this time.</p><p>We will keep working to serve you better next year. Your thoughts and suggestions are always welcome.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'crm-reactivation',
    category: 'crm',
    name: { tr: 'Reaktivasyon', en: 'Reactivation' },
    subject: { tr: 'Sizi özledik {{Ad}}', en: 'We missed you, {{Ad}}' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>Bir süredir görüşmüyoruz. Size kısa bir merhaba demek ve eklediğimiz yenilikleri paylaşmak istedik.</p><p>Son ziyaretinizden bu yana arayüzü sadeleştirdik, performansı iyileştirdik ve birkaç yeni özellik ekledik. Tekrar göz atmak isterseniz hesabınız hâlâ aktif.</p><p>Sizi nelerin geri getirebileceğine dair önerilerinizi merak ediyoruz.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>It has been a while. We wanted to say a quick hello and share what we have been adding.</p><p>Since your last visit we've simplified the interface, improved performance, and added a few new features. Your account is still active if you would like to take another look.</p><p>We would love to hear what would bring you back.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'crm-satisfaction-survey',
    category: 'crm',
    name: { tr: 'Memnuniyet anketi', en: 'Satisfaction survey' },
    subject: { tr: 'Sizi dinlemek istiyoruz {{Ad}}', en: 'We would love your feedback, {{Ad}}' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>Hizmetimizi daha iyi sunabilmek için sizden kısa bir geri bildirim almak istiyoruz. Anket yaklaşık 2 dakikanızı alacak.</p><p>Verdiğiniz cevaplar sayesinde önceliklerimizi daha doğru belirleyebileceğiz. Açık uçlu sorulara yazacağınız her cümle bizim için kıymetli.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>To serve you better we would like a short piece of feedback. The survey takes about 2 minutes.</p><p>Your answers help us set the right priorities. Every sentence you share with us in the open questions is valuable.</p>`,
        SIG,
        'en'
      )
    }
  },

  // --------------------------- B2B ---------------------------
  {
    id: 'b2b-cold-outreach',
    category: 'b2b',
    name: { tr: 'Soğuk satış', en: 'Cold outreach' },
    subject: { tr: 'Kısa bir tanışma önerisi', en: 'A quick introduction' },
    bodyHtml: {
      tr: wrap(
        `${intro('Sayın {{Ad}},')}<p>{{Firma}} olarak benzer sektörlerdeki ekiplere yardımcı oluyoruz. Çalışmalarınızı uzaktan takip ediyor ve çözümümüzün size de değer katabileceğini düşünüyoruz.</p><p>Önümüzdeki iki haftada uygun olduğunuz 20 dakikalık bir görüşme planlamak isteriz. Size ne yaptığımızı kısaca anlatmak ve ihtiyaçlarınızı dinlemek istiyoruz.</p><p>İlginiz yoksa hiç sorun değil, bu maile yanıt vermeniz yeterli.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Dear {{Ad}},')}<p>At {{Firma}} we help teams in similar industries. We follow your work from a distance and think our solution could add value for you too.</p><p>We would love to schedule a 20-minute conversation at a time that works for you in the next two weeks. Just to briefly introduce what we do and listen to your needs.</p><p>If this is not the right moment, no problem. A quick reply is enough.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'b2b-follow-up',
    category: 'b2b',
    name: { tr: 'Takip mesajı (follow-up)', en: 'Follow-up' },
    subject: { tr: 'Geçen haftaki görüşmemiz hakkında', en: 'About our chat last week' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>Geçen haftaki kısa görüşmemiz için tekrar teşekkür ederim. Bahsettiğimiz konuyu özetlemek ve bir sonraki adım için kısa bir öneri sunmak istedim.</p><p>Konuştuğumuz noktaları paylaşacağım kısa belgeyi hazırlıyorum, bu hafta içinde size ulaştırabilirim. İncelemek için zamanınız uygun olursa bana yanıt vermeniz yeterli.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>Thanks again for our brief conversation last week. I wanted to summarize what we discussed and suggest a small next step.</p><p>I'm preparing a short document covering the points we talked about. I can send it your way this week. Just reply when you have time to take a look.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'b2b-partnership',
    category: 'b2b',
    name: { tr: 'Partnership önerisi', en: 'Partnership proposal' },
    subject: { tr: '{{Firma}} ile iş birliği düşünüyoruz', en: 'Considering a partnership with {{Firma}}' },
    bodyHtml: {
      tr: wrap(
        `${intro('Sayın {{Ad}},')}<p>Sizin alanınızda yaptıklarınızı yakından takip ediyoruz. Ortak müşteri tabanımız ve birbirini tamamlayan ürünlerimiz olduğunu düşünüyoruz.</p><p>Eğer ilginizi çekerse, müşterilerimize karşılıklı değer sunabileceğimiz bir iş birliği modelini konuşmak isteriz. Önümüzdeki günlerde uygun olduğunuz bir saat ayırabilir miyiz?</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Dear {{Ad}},')}<p>We have been following your work in your area closely. We believe we share a customer base and our products are complementary.</p><p>If this is of interest, we would love to discuss a partnership model that creates mutual value for our customers. Could you spare an hour in the coming days?</p>`,
        SIG,
        'en'
      )
    }
  },

  // --------------------------- EDUCATION ---------------------------
  {
    id: 'education-registration-open',
    category: 'education',
    name: { tr: 'Kayıt açılışı', en: 'Registration open' },
    subject: { tr: 'Yeni dönem kayıtları açıldı', en: 'New term registration is open' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>Yeni dönem kayıtlarımız bugün itibarıyla başlamıştır. Kontenjan sınırlı olduğu için kayıt için erken davranmanızı öneririz.</p><p>Programımız temel kavramlardan başlayıp ileri seviye uygulamalara kadar uzanan bir izlek sunuyor. Detaylı içerik haritasını sayfamızdan inceleyebilirsiniz.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>Registration for the new term is open as of today. As seats are limited, we recommend registering early.</p><p>Our program covers everything from the fundamentals to advanced practice. You can review the detailed content map on our page.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'education-class-reminder',
    category: 'education',
    name: { tr: 'Ders hatırlatma', en: 'Class reminder' },
    subject: { tr: 'Yarınki dersiniz için hatırlatma', en: 'Reminder for tomorrow\'s class' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>Yarın saat 19:00\'da gerçekleşecek dersiniz için kısa bir hatırlatma yapmak istedik.</p><p>Ders öncesinde önceki haftanın notlarını gözden geçirmenizi öneririz. Görüşmek üzere.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>A quick reminder for your class tomorrow at 19:00.</p><p>We recommend going over last week's notes before class. See you then.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'education-certificate',
    category: 'education',
    name: { tr: 'Sertifika gönderimi', en: 'Certificate delivery' },
    subject: { tr: 'Tebrikler {{Ad}} — sertifikanız hazır', en: 'Congratulations {{Ad}} — your certificate is ready' },
    bodyHtml: {
      tr: wrap(
        `${intro('Sevgili {{Ad}},')}<p>Programımızı başarıyla tamamladığınız için sizi içtenlikle tebrik ederiz. Sertifikanız aşağıdaki bağlantıdan indirilebilir.</p><p>Bu süreçte gösterdiğiniz emek için teşekkür ederiz. Öğrendiklerinizi pratiğe dökerken size başarılar dileriz.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Dear {{Ad}},')}<p>Sincere congratulations on successfully completing our program. Your certificate is available at the link below.</p><p>Thank you for the effort you put in. We wish you the best as you put what you've learned into practice.</p>`,
        SIG,
        'en'
      )
    }
  },

  // --------------------------- NGO ---------------------------
  {
    id: 'ngo-donation-appeal',
    category: 'ngo',
    name: { tr: 'Bağış çağrısı', en: 'Donation appeal' },
    subject: { tr: 'Bir adım da sizinle atmak istiyoruz', en: 'We would like to take this step with you' },
    bodyHtml: {
      tr: wrap(
        `${intro('Sayın {{Ad}},')}<p>{{Firma}} olarak yıllardır sürdürdüğümüz çalışmalarda destekçilerimizin katkısı en büyük gücümüz oldu.</p><p>Bu dönem yürüttüğümüz proje için bağışlarınıza ihtiyacımız var. Küçük bir katkı bile birçok kişinin hayatında somut bir fark yaratıyor.</p><p>Detayları ve bağış sürecini sayfamızdan inceleyebilirsiniz.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Dear {{Ad}},')}<p>The contributions of our supporters have been our greatest strength throughout {{Firma}}'s work over the years.</p><p>For our current project we need your support. Even a small contribution makes a concrete difference in many lives.</p><p>You can find the details and the donation process on our page.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'ngo-campaign-update',
    category: 'ngo',
    name: { tr: 'Kampanya güncellemesi', en: 'Campaign update' },
    subject: { tr: 'Kampanyamızdan iyi haberler {{Ad}}', en: 'Good news from our campaign, {{Ad}}' },
    bodyHtml: {
      tr: wrap(
        `${intro('Merhaba {{Ad}},')}<p>Birlikte yürüttüğümüz kampanyada hedefimizin yarısını geride bıraktık. Bu mümkün oldu çünkü sizin gibi destekçilerimiz var.</p><p>Bağışlarınızla ulaştığımız somut sonuçları sayfamızda paylaşıyoruz. Devamı için desteğiniz değerli olmaya devam ediyor.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Hi {{Ad}},')}<p>We have passed the halfway mark on our campaign. This is only possible because of supporters like you.</p><p>We share the tangible results your donations have enabled on our page. Your continued support means a great deal.</p>`,
        SIG,
        'en'
      )
    }
  },
  {
    id: 'ngo-donor-thanks',
    category: 'ngo',
    name: { tr: 'Bağışçı teşekkürü', en: 'Donor thank you' },
    subject: { tr: 'Desteğiniz için teşekkür ederiz', en: 'Thank you for your support' },
    bodyHtml: {
      tr: wrap(
        `${intro('Sevgili {{Ad}},')}<p>Bağışınız bize ulaştı. İçtenlikle teşekkür ederiz.</p><p>Yaptığınız katkı, çalışmalarımızı yürütmemizi sağlayan zincirin önemli bir halkası. Yıl boyunca neler başardığımızı ayrıntılı bir raporla sizinle paylaşacağız.</p>`,
        SIG,
        'tr'
      ),
      en: wrap(
        `${intro('Dear {{Ad}},')}<p>Your donation has reached us. Thank you sincerely.</p><p>Your contribution is an important link in the chain that lets us carry out our work. We'll share a detailed report of what we achieve throughout the year.</p>`,
        SIG,
        'en'
      )
    }
  }
]

export function getLibraryByCategory(category: LibraryCategory): LibraryTemplate[] {
  return TEMPLATE_LIBRARY.filter((t) => t.category === category)
}

export const LIBRARY_CATEGORIES: LibraryCategory[] = [
  'welcome',
  'announcement',
  'promotion',
  'event',
  'newsletter',
  'crm',
  'b2b',
  'education',
  'ngo'
]
