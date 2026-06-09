interface TranslatedError {
  message: string
  hint: string
}

const RULES: Array<{ test: RegExp | string; out: TranslatedError }> = [
  {
    test: /EAUTH|Username and Password not accepted|535|authentication failed|invalid login/i,
    out: {
      message: 'Kullanıcı adı veya şifre hatalı.',
      hint: 'Gmail kullanıyorsanız normal şifrenizle değil "uygulama şifresi" ile giriş yapmalısınız.'
    }
  },
  {
    test: /ETIMEDOUT|timeout|operation timed out/i,
    out: {
      message: 'Sunucu yanıt vermedi (zaman aşımı).',
      hint: 'İnternet bağlantınızı kontrol edin. Host ve port doğru mu?'
    }
  },
  {
    test: /ECONNREFUSED/i,
    out: {
      message: 'Sunucu bağlantıyı reddetti.',
      hint: 'Port numarasını ve SSL ayarını kontrol edin. Çoğu sağlayıcı 465 (SSL) veya 587 (TLS) kullanır.'
    }
  },
  {
    test: /ENOTFOUND|getaddrinfo|EAI_AGAIN/i,
    out: {
      message: 'SMTP sunucusu bulunamadı.',
      hint: 'Sunucu adresi yanlış olabilir veya internetiniz yok.'
    }
  },
  {
    test: /self.signed certificate|SELF_SIGNED_CERT_IN_CHAIN|UNABLE_TO_VERIFY_LEAF_SIGNATURE/i,
    out: {
      message: 'Sunucunun SSL sertifikası doğrulanamadı.',
      hint: 'Bu özel sunucu için SSL/TLS ayarını kapatmayı deneyin veya yöneticinizle görüşün.'
    }
  },
  {
    test: /554|spam|blacklist|blocked/i,
    out: {
      message: 'Sunucu maili reddetti (spam veya kara liste şüphesi).',
      hint: 'Daha az kişiye gönderin, gönderim hızını düşürün, içeriği kontrol edin.'
    }
  },
  {
    test: /quota|rate limit|too many|5\.7\.0/i,
    out: {
      message: 'Gönderim limiti aşıldı.',
      hint: 'Gmail günde ~500, Outlook ~300 mail sınırına sahiptir. Bir süre bekleyin.'
    }
  },
  {
    test: /mailbox unavailable|550|user unknown|address rejected/i,
    out: {
      message: 'Alıcı adresi geçersiz veya bulunamadı.',
      hint: 'E-posta adresinin doğru yazıldığından emin olun.'
    }
  },
  {
    test: /EENVELOPE|invalid envelope/i,
    out: {
      message: 'Mail zarfı (gönderen/alıcı) geçersiz.',
      hint: 'Gönderen ve alıcı adreslerini kontrol edin.'
    }
  }
]

export function translateSmtpError(err: Error): TranslatedError {
  const msg = err.message || String(err)
  for (const rule of RULES) {
    const regex = rule.test instanceof RegExp ? rule.test : new RegExp(rule.test, 'i')
    if (regex.test(msg)) return rule.out
  }
  return {
    message: 'Bilinmeyen bir hata oluştu.',
    hint: 'Detaylı bilgi için aşağıdaki teknik mesaja bakabilirsiniz.'
  }
}

export function formatSmtpError(err: Error): string {
  const t = translateSmtpError(err)
  return `${t.message} ${t.hint}`
}
