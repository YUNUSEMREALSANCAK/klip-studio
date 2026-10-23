# Klip Stüdyo yol haritası

**Aşama: erken alfa (v0.1)** · sonraki hedef: beta (v0.5): kayıt/yükleme, testler, kurgu derinliği

> **Son güncelleme:** 2026-10-23 · **Hedef uygulama:** CapCut masaüstü 9.6 (ilham ve kıyas için) · Yüzdeler tahminidir.

## Bugünkü durum

| | Değer | Not |
| --- | --- | --- |
| Temel kurgu akışı | ✅ çalışıyor | içe aktar → kes/böl → geçiş → metin → dışa aktar |
| Yerel AI özellikleri | 9 özellik | altyazı, akıllı kesim, arka plan, nesne sil, gürültü, sahne, çerçeveleme, iyileştirme, ritim |
| CapCut temel özellik kapsamı | ~%35 | aşağıdaki tabloya göre ağırlıklı tahmin |
| Otomatik test | ✅ | Vitest birim testleri + Playwright uçtan uca testleri, her push'ta CI'da |
| Proje kaydetme | ✅ | IndexedDB otomatik kayıt + `.klip` dosyası |

### Alanlara göre kapsam (CapCut'a göre, tahmini)

| Alan | Kapsam | Eksik olanlar |
| --- | ---: | --- |
| Zaman çizelgesi | ~%50 | çoklu metin/üst katman izi, hız, ters oynatma, dondurma, grup seçimi |
| Görüntü düzenleme | ~%40 | anahtar kare, maske, chroma key, döndürme, kırpma, karışım modları, bulanık tuval arka planı |
| Metin ve altyazı | ~%45 | metin şablonları, font seçimi, altyazı çevirisi, kelime düzeyinde stil |
| Geçiş ve efekt | ~%30 | video efektleri, sticker kütüphanesi, LUT içe aktarma |
| Ses | ~%25 | fade, ducking, ses anahtar karesi, ses efektleri, TTS |
| Yapay zeka | ~%40 | videoda zamana yayılan nesne silme, genel nesne matting, TTS, çeviri, öne çıkan anlar |
| Proje ve dağıtım | ~%10 | kayıt/yükleme, otomatik kayıt, PWA, şablon paylaşımı |

## Plan

Efor: **S** ≈ 2–6 saat · **M** ≈ 1–3 gün · **L** ≈ 1–2 hafta (tek geliştirici + yapay zeka ajanı).

### Faz 1: Sağlam temel → v0.2

Amaç: kullanıcı işini kaybetmesin, her değişiklik testle korunsun.

- [x] **Proje kaydetme/yükleme** (M): IndexedDB'de otomatik kayıt; medya dosyaları OPFS'de; `.klip` dosyası olarak dışa/içe aktarma
- [x] **Birim testleri** (S): Vitest ile `core/timeline.ts` (rippleDelete, splitClip, packMainTrack, buildCaptions)
- [x] **Uçtan uca testler** (M): Playwright ile içe aktar, geçiş, altyazı, dışa aktarma; CI'da çalışsın
- [x] **Çoklu metin ve üst katman izleri** (M): aynı anda iki metin üst üste binmesin; izler otomatik çoğalsın
- [x] **Hata sınırları ve tarayıcı denetimi** (S): WebGL2/WebCodecs yoksa açık uyarı
- [x] **Canlı demo** (S): GitHub Pages veya Vercel'e otomatik yayın

### Faz 2: Kurgu derinliği → v0.3

Amaç: CapCut'ın günlük kullanılan kurgu araçları.

- [x] **Hız** (M): 0.25×–4×, ses perdesi korunarak; hız eğrileri
- [x] **Anahtar kare animasyonu** (L): konum, ölçek, döndürme, opaklık, ses düzeyi
- [x] **Bulanık tuval arka planı** (S): 16:9 videoyu 9:16'ya koyunca boşluklar bulanık dolsun
- [x] **Maske ve chroma key** (M): dikdörtgen/daire/çizgi maskeleri, yeşil perde
- [x] **Ses araçları** (M): fade in/out, müzik ducking, video kliplerinde dalga formu
- [x] **Metin şablonları ve fontlar** (M): hazır animasyonlu başlıklar, Google Fonts seçici
- [x] **LUT (.cube) içe aktarma** (S): filtre shader'ına 3D LUT dokusu

### Faz 3: Yapay zeka derinliği → v0.4

Amaç: CapCut'ın yerelde yaptıklarına yetişmek, bulut gerektirmeden.

- [x] **Videoda nesne silme** (L): SlimSAM ile kare kare nesne takibi + çok ölçekli doldurma (deneysel; LaMa ile kalite artışı sonraki adım)
- [x] **Genel nesne ayırma** (M): BiRefNet (yeterli GPU'da) / MODNet ile görsel ve karelerde tek tıkla ön plan seçimi
- [ ] **Videoda genel nesne matting** (M): Robust Video Matting ile titremesiz, insan dışı nesneler için
- [x] **Altyazı çevirisi** (M): opus-mt, diğer diller için NLLB; iki dilli altyazı
- [x] **Seslendirme (TTS)** (M): MMS-TTS ile 11 dil (Türkçe model henüz yok)
- [ ] **Ağır AI işleri worker'da** (M): dışa aktarmada arka plan kaldırma şu an ana iş parçacığında
- [x] **Akıcı yavaş çekim** (M): kare harmanlama (dışa aktarmada)
- [ ] **Yapay zeka ile ara kare** (L): RIFE ile optik akış tabanlı yavaş çekim

### Faz 4: Ajanlar için → v0.5 (beta)

Amaç: PhotoCraft ve CapCut'ın yeni ajan yaklaşımı gibi, her işlem programla da yapılabilsin.

- [ ] **Komut katmanı** (L): her düzenleme tipli bir JSON komutu; geri al da komutlar üzerinden
- [ ] **Kontrol kanalı** (M): `window.klip` API'si, komut çalıştırma ve kare görüntüsü alma
- [ ] **MCP sunucusu** (M): Claude gibi ajanlar editörü sürebilsin
- [ ] **Doğal dille kurgu paneli** (M): "sessizlikleri kes, altyazı ekle, 9:16 yap" → komutlar (Claude API)

### Faz 5: Dağıtım ve topluluk → v1.0

- [ ] **PWA** (S): kurulabilir, çevrimdışı çalışan uygulama
- [ ] **İngilizce arayüz ve README** (M): i18n altyapısı, TR/EN
- [ ] **Performans bütçeleri** (M): 1080p önizlemede 30 fps, 1 dk videonun dışa aktarması < 1 dk
- [ ] **Masaüstü paketi** (M, isteğe bağlı): tek tıkla açılan uygulama

## Bilinen sorunlar

- Videoda nesne silme deneysel: hızlı hareket eden nesnelerde takip kayabilir, büyük nesnelerde doldurma bulanık.
- Videoda gerçek zamanlı arka plan kaldırma yalnızca insanlarda çalışıyor.
- Türkçe seslendirme modeli yok.
- BiRefNet zayıf GPU'larda çalışmaz; o zaman MODNet devreye girer.
