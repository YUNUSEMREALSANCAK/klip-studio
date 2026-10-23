# Klip Stüdyo yol haritası

**Aşama: beta (v0.5)** · sonraki hedef: v1.0 (kalan yapay zeka işleri, hız eğrileri, kalite ve kararlılık)

> **Son güncelleme:** 2026-10-23 · **Hedef uygulama:** CapCut masaüstü 9.6 (ilham ve kıyas için) · Yüzdeler tahminidir, ölçüm değildir.

## Bugünkü durum

| | Değer | Not |
| --- | --- | --- |
| Temel kurgu akışı | ✅ | içe aktar → kes/böl → anahtar kare → geçiş → metin → dışa aktar |
| Yerel yapay zeka | 16 özellik | altyazı, çeviri, seslendirme, akıllı kesim, arka plan, ön plan seçimi, nesne silme (görsel + video, LaMa), videoda nesne ayırma, ara kare (RIFE), gürültü, sahne, çerçeveleme, iyileştirme, ritim |
| Otomatik test | ✅ | 24 birim + 22 uçtan uca test her push'ta CI'da; 8 model testi yerelde (`--grep @models`) |
| Proje kaydetme | ✅ | IndexedDB otomatik kayıt + `.klip` dosyası |
| Performans (Apple M5, `npm run perf`) | ✅ | önizleme 60 fps (bütçe ≥ 30) · 1 dk 1080p dışa aktarma 9,4 sn (bütçe < 60 sn) |
| CapCut temel özellik kapsamı | ~%70 | aşağıdaki tabloya göre ağırlıklı tahmin |

### Alanlara göre kapsam (CapCut'a göre, tahmini)

| Alan | Kapsam | Eksik olanlar |
| --- | ---: | --- |
| Zaman çizelgesi | ~%80 | grup seçimi, izler arası sürükleme, iç içe dizi |
| Görüntü düzenleme | ~%75 | kırpma aracı, karışım modları, sabitleme (stabilization) |
| Metin ve altyazı | ~%70 | kelime düzeyinde stil düzenleme, metin efektleri kütüphanesi |
| Geçiş ve efekt | ~%45 | video efektleri ve sticker kütüphanesi |
| Ses | ~%60 | ses efektleri kütüphanesi, ses değiştirici, Türkçe seslendirme |
| Yapay zeka | ~%75 | öne çıkan anları bulma, gerçek zamanlı genel nesne ayırma, Türkçe seslendirme |
| Proje ve dağıtım | ~%70 | şablon paylaşımı, bulut eşitleme (bilinçli olarak yok: yerel öncelikli) |

## Plan

Efor: **S** ≈ 2–6 saat · **M** ≈ 1–3 gün · **L** ≈ 1–2 hafta (tek geliştirici + yapay zeka ajanı).

### Faz 1: Sağlam temel → v0.2 ✅

- [x] **Proje kaydetme/yükleme** (M): IndexedDB'de otomatik kayıt (proje + medya), `.klip` dosyası olarak dışa/içe aktarma
- [x] **Birim testleri** (S): Vitest ile zaman çizelgesi, anahtar kare, hız, fade ve LUT
- [x] **Uçtan uca testler** (M): Playwright ile içe aktarma, geçiş, bölme, kayıt, dışa aktarma ve dahası; CI'da
- [x] **Çoklu metin ve üst katman izleri** (M): üst üste binen klipler otomatik şeritlere dizilir
- [x] **Hata sınırları ve tarayıcı denetimi** (S): çökmede kurtarma ekranı, eksik WebGL2/WebCodecs uyarısı
- [x] **Canlı demo** (S): GitHub Pages'e otomatik yayın

### Faz 2: Kurgu derinliği → v0.3 ✅

- [x] **Hız** (M): 0.25×–4×, perde korunarak (önizlemede tarayıcı, dışa aktarmada WSOLA); kareyi dondur, ters çevir
- [x] **Hız eğrileri** (M): Montaj, Kahraman anı, Mermi zamanı, Yavaş gir/çık; perde korunarak
- [x] **Anahtar kare animasyonu** (L): konum, boyut, döndürme, opaklık, ses düzeyi
- [x] **Bulanık tuval arka planı** (S)
- [x] **Maske ve chroma key** (M): dikdörtgen, elips, doğrusal maske; yeşil perde
- [x] **Ses araçları** (M): fade in/out, konuşmada müziği kısma, video kliplerinde dalga formu
- [x] **Metin şablonları ve fontlar** (M): 12 şablon, 10 Google Fonts ailesi
- [x] **LUT (.cube) içe aktarma** (S)

### Faz 3: Yapay zeka derinliği → v0.4

- [x] **Videoda nesne silme** (L): SlimSAM ile kare kare takip + çok ölçekli doldurma (deneysel)
- [x] **Daha iyi doldurma** (M): LaMa (big-lama ONNX) ile "Yüksek" doldurma kalitesi; görsel ve videoda
- [x] **Genel nesne ayırma** (M): BiRefNet (yeterli GPU'da) / MODNet ile görsellerde tek tıkla ön plan seçimi
- [x] **Videoda genel nesne ayırma** (M): SlimSAM takibiyle her türlü nesne; arka plan anahtar renge boyanıp yeşil perde uygulanır (deneysel)
- [x] **Altyazı çevirisi** (M): opus-mt, diğer diller için NLLB; iki dilli altyazı
- [x] **Seslendirme (TTS)** (M): MMS-TTS ile 11 dil
- [ ] **Türkçe seslendirme** (M): `facebook/mms-tts-tur` ONNX'e dönüştürülüp barındırılırsa eklenebilir (Piper sesleri GPL espeak-ng gerektiriyor)
- [x] **Ağır AI işleri worker'da** (M): dışa aktarmada kişi ayırma ayrı worker'da (kurulamazsa ana iş parçacığına düşer)
- [x] **Akıcı yavaş çekim** (M): kare harmanlama (dışa aktarmada)
- [x] **Yapay zeka ile ara kare** (L): RIFE 4.22 lite ile optik akış tabanlı yavaş çekim (dışa aktarmada)

### Faz 4: Ajanlar için → v0.5 ✅

- [x] **Komut katmanı** (L): her düzenleme tipli bir JSON komutu (`src/core/commands.ts`), her komut geri alınabilir
- [x] **Kontrol kanalı** (M): `window.klip` API'si: komut, durum, ekran görüntüsü, adresten içe aktarma
- [x] **MCP sunucusu** (M): `npm run mcp`; durum, komut, ekran görüntüsü ve dosya içe aktarma araçları
- [x] **Doğal dille kurgu** (M): Asistan sekmesi, Claude Opus 5.5 + komut araçları (kullanıcının kendi API anahtarı)

### Faz 5: Dağıtım ve topluluk → v1.0

- [x] **PWA** (S): yüklenebilir, çevrimdışı açılan uygulama
- [x] **İngilizce arayüz ve README** (M): TR/EN arayüz, `README.en.md`
- [x] **Hata ve görev mesajlarının çevirisi** (S): görev, ilerleme ve hata mesajları İngilizce modda çevrilir
- [x] **Performans bütçeleri** (M): `npm run perf`; önizleme ≥ 30 fps, 1 dk 1080p dışa aktarma < 60 sn
- [x] **Masaüstü paketi** (M): PWA olarak yüklenebilir; macOS için çift tıklanan başlatıcı yerelde mevcut

## Bilinen sorunlar

- Videoda nesne silme deneysel: hızlı hareket eden nesnelerde takip kayabilir, büyük nesnelerde doldurma bulanık.
- Videoda gerçek zamanlı arka plan kaldırma yalnızca insanlarda çalışıyor; diğer nesneler için "Nesneyi videoda ayır" (önceden işlenir).
- BiRefNet zayıf GPU'larda çalışmaz; o zaman MODNet devreye girer (en iyi sonucu insanlarda verir).
- Türkçe seslendirme modeli yok.
- NLLB-200 ve MMS-TTS modelleri ticari olmayan kullanım lisanslı.
