# MailDrop Hızlı Başlangıç

İlk açılışta bu yolu izleyin — 5 dakikada ilk toplu mailinizi göndereceksiniz.

## 1. E-posta hesabınızı bağlayın (1 dk)

1. Sol panelden **Ayarlar**'a tıklayın
2. Sağlayıcınızı seçin: Gmail / Outlook / Yahoo / Özel SMTP
3. E-posta adresinizi girin
4. **Şifre** alanı için:
   - **Gmail kullanıyorsanız:** Normal Google şifreniz çalışmaz. [Uygulama şifresi oluşturun](https://support.google.com/accounts/answer/185833) (önce 2 adımlı doğrulamayı açın)
   - **Outlook kullanıyorsanız:** Hesabınızda 2 adımlı doğrulama açıksa uygulama şifresi gerekir, kapalıysa normal şifre çalışır
   - **Yahoo:** Uygulama şifresi zorunlu
5. **Test Et** butonuna basın — kendi adresinize örnek mail gönderilir. Gelen kutunuza düştü mü?
6. Başarılıysa **Hesabı kaydet**

## 2. Kişi listenizi yükleyin (1 dk)

### Excel'den
1. Sol panelden **Kişiler**'e gidin
2. **Excel'den içe aktar** butonuna basın
3. .xlsx, .xls veya .csv dosyanızı seçin
4. Sütunlar otomatik eşleştirilir (Ad, Soyad, E-posta, Firma). Yanlışsa düzeltin
5. Önizlemeden kontrol edin, **İçe aktar**'a basın
6. Mükerrer e-posta adresleri atlanır

### Manuel
**Kişi ekle** butonu ile form üzerinden tek tek de ekleyebilirsiniz.

### Gruplar (opsiyonel)
Sol paneldeki **Grup ekle** ile "Tedarikçiler", "Müşteriler" gibi gruplar oluşturup kişileri ayrı tutabilirsiniz.

## 3. İlk şablonunuzu yazın (2 dk)

1. Sol panelden **Şablonlar**'a gidin
2. **Yeni şablon** butonuna basın
3. Şablon adı (örn. "Bakiye Hatırlatma") ve konu girin
4. Mail gövdesini yazın
5. Sağdaki **Değişkenler** panelinden `Ad`, `Soyad`, `Firma` gibi alanlara tıklayıp metne ekleyin
   - Örnek: `Merhaba {{Ad}},` yazdığınızda gönderim sırasında her kişi için "Merhaba Ahmet," gibi kişiselleşir
6. Konu satırına da değişken eklenebilir
7. **Önizle** butonu ile test kişisinde nasıl görüneceğine bakın
8. Gerekirse **Ek dosya ekle** ile fatura/PDF iliştirin (max 10 MB)
9. **Şablonu kaydet**

## 4. Toplu maili gönderin (1 dk + gönderim süresi)

1. Sol panelden **Gönderim**'e gidin
2. **Kişiler:** Hangi kişilere göndereceğinizi seçin (tümünü veya bir grubu)
3. **Şablon:** Hangi şablonu kullanacağınızı seçin
4. **Ayarlar:**
   - Gönderen hesabı seçin (varsayılan otomatik)
   - **Saniyede mail sayısı:** Önerilen 1/sn. Gmail/Outlook günlük limitlerini aşmamak için
   - **Zamanla:** İleri tarihte göndermek isterseniz tarih+saat seçin
5. **Onay:** Özet ekranını kontrol edin. Kaç kişiye, hangi hesaptan, ne kadar sürede gönderileceği görünür
6. **Şimdi gönder**'e basın
7. Canlı ilerleme çubuğunu izleyin. İstediğiniz an **Duraklat** veya **İptal** edebilirsiniz

## 5. Sonuçları görün

Gönderim bittikten sonra:
- **Raporlar** sekmesinden kampanya geçmişini görün
- Bir kampanyaya tıklayıp detay loga bakın (kimlere gitti, kimlere gitmedi, hata sebebi)
- **Başarısızları tekrar dene** ile sadece hatalıları yeniden gönderebilirsiniz
- **Excel'e aktar** ile detay raporu indirebilirsiniz

## Sık karşılaşılan hatalar

| Hata mesajı | Anlamı | Çözüm |
|---|---|---|
| Kullanıcı adı veya şifre hatalı | Gmail/Outlook için uygulama şifresi gerekir | Sağlayıcınızın hesap güvenlik sayfasından uygulama şifresi oluşturun |
| Sunucu yanıt vermedi | Zaman aşımı | İnternetinizi ve host/port'u kontrol edin |
| Gönderim limiti aşıldı | Günlük sınırı geçtiniz | Gmail ~500/gün, Outlook ~300/gün. 24 saat bekleyin |
| Sunucu maili reddetti (spam) | Spam filtresi tetiklendi | İçeriği yumuşatın, gönderim hızını düşürün, az kişiye gönderin |

## Gizlilik

- **Tüm verileriniz** bilgisayarınızın `AppData\Roaming\MailDrop\data\maildrop.db` dosyasında kalır
- **SMTP şifreniz** işletim sisteminizin güvenli alanında (Windows DPAPI / macOS Keychain) şifrelenir
- Hiçbir veri sunucumuza, bulutuna veya üçüncü tarafa gitmez
