# Klip Stüdyo · 3D Stüdyo

Sinematik 3D sahneleri (Remotion + React Three Fiber + Three.js) üretir ve parça parça bir **Klip Stüdyo projesine** (`.klip`) çevirir. Kurgu, ses ve son dokunuşlar editörde yapılır.

```
studio3d/
  src/kit/            Ortak 3D araç takımı: sahne, kamera yolu, son işlem (bloom, alan derinliği, AgX), malzemeler, parçalar, tema, kapanış
  src/reels/<ad>/     Bir reel: timeline.ts (seslendirme saniyeleri), scenes/, overlay/ (etiketler), Reel.tsx, Cover.tsx, ses/ (ses tasarımı)
  public/reels/<ad>/  Seslendirme, kelime zamanları, son karışım
  scripts/            render-parts.mjs (parçalar) · build-klip.mjs (.klip) · stills.mjs (kontrol kareleri)
  out/<ad>/           Üretilen parçalar: sahneler/, katman/ (şeffaf etiketler), sesler/, parts.json
```

## Akış

| Adım | Komut |
| --- | --- |
| Önizleme | `npm run studio` |
| Kontrol kareleri (kontak sayfası) | `npm run stills -- out/kare 5 12 30` |
| Parçalar: temiz 3D sahneler + her etiket ayrı şeffaf video | `npm run parts -- internet` |
| Klip projesi | `npm run klip -- internet --voice public/reels/internet/seslendirme.mp3 --sfx out/internet/sesler --out ../projeler/Fityazilim_03_Internet.klip` |
| Bitmiş video (tek parça, etiketli) | `npm run render` |

Sonra Klip Stüdyo'da (`npm run dev`, üst çubuk → **Aç**) `.klip` dosyasını açın:

- **Ana iz:** sahneler, geçişleri içinde (çapraz geçişin ortasından kesilir)
- **Üst katman:** her etiket, bölüm etiketi ve kapanış kendi şeffaf videosu (VP9 + alfa); taşınabilir, silinebilir
- **Ses:** seslendirme + her ses efekti ayrı klip; efektler konuşmada otomatik kısılır (duck)
- Dışa aktarma sesi -14 LUFS'e (Instagram) getirir

## Render modları

`InternetReel` kompozisyonu `mode` alır: `full` (bitmiş video), `clean` (yalnız 3D, etiketsiz, sessiz), `overlay` (yalnız etiketler, şeffaf; `part` ile tek parça). `render-parts.mjs` bunları kullanır.

## Yeni reel eklemek

1. `src/reels/<ad>/` aç: `timeline.ts` (sahneler ve saniyeler), `scenes/`, `overlay/Overlay.tsx` (`OVERLAY_PARTS` dışa aktarır), `Reel.tsx` (`mode`/`part` alır).
2. `src/Root.tsx` içinde kompozisyonu kaydet, `scripts/render-parts.mjs` içindeki `REELS` listesine ekle.
3. Ses dosyalarını `public/reels/<ad>/` altına koy.

## Tuzaklar

- `@react-three/postprocessing` render'da siyah kare verir; son işlem `src/kit/three/Post.tsx` içinde doğrudan `postprocessing` ile kurulu.
- Alan derinliği geçişini kapatıp açma (görüntü kayar); hep açık, `bokehScale` ile kısılır.
- Tek NaN piksel bloom ile kareyi karartır; `SanitizeEffect` bunu temizler. Kontrol: `ffmpeg -vf blackdetect=d=0.03:pix_th=0.06`.
- Kamera yolu monoton Hermite (Catmull-Rom kadrajı kaydırır).
- `postprocessing@6.39` için three `0.186` sabit.
