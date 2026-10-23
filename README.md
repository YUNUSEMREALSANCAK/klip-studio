<p align="center">
  <img src="assets/icon.svg" width="112" height="112" alt="Klip Stüdyo ikonu: koyu camgöbeği bir karo üzerinde oynat üçgeni ve yapay zeka kıvılcımı">
</p>

<h1 align="center">Klip Stüdyo</h1>

<p align="center">
  <b>Tarayıcıda çalışan, yapay zekalı, açık kaynak video editörü.</b><br>
  Zaman çizelgesi, anahtar kareler, geçişler, altyazı, arka plan kaldırma ve nesne silme;<br>
  hepsi tarayıcınızda, yerel olarak. Videonuz hiçbir sunucuya yüklenmez.
</p>

<p align="center">
  <a href="https://yunusemrealsancak.github.io/klip-studio/"><img alt="Canlı demo" src="https://img.shields.io/badge/canlı%20demo-aç-22d3ee?style=flat-square"></a>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-React-3178c6?style=flat-square&logo=typescript&logoColor=white">
  <img alt="WebGL2 · WebCodecs · WebGPU" src="https://img.shields.io/badge/WebGL2%20%C2%B7%20WebCodecs%20%C2%B7%20WebGPU-tarayıcıda-22d3ee?style=flat-square">
  <img alt="Lisans: MIT / Apache-2.0" src="https://img.shields.io/badge/lisans-MIT%20%2F%20Apache--2.0-3a3a3a?style=flat-square">
  <img alt="Durum: beta" src="https://img.shields.io/badge/durum-beta-d69e2e?style=flat-square">
  <a href="https://github.com/YUNUSEMREALSANCAK/klip-studio/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/YUNUSEMREALSANCAK/klip-studio/ci.yml?branch=main&style=flat-square&label=CI"></a>
</p>

<p align="center">
  <img src="docs/images/klip-studio-demo.jpg" alt="Klip Stüdyo: Anton yazı tipiyle sarı başlık ve kutulu alt yazı eklenmiş degrade bir video, sağ üstte elips maskeli resim içinde resim üst katmanı, solda Yapay Zeka paneli, altta iki metin şeridi, üst katman ve geçişli ana video izi" width="100%">
  <br>
  <sub>Başlık ve alt yazı, elips maskeli üst katman, geçişli ana iz ve Yapay Zeka paneli.</sub>
</p>

<p align="center">
  <a href="#özellikler">Özellikler</a> ·
  <a href="#yapay-zeka-tamamen-yerel">Yapay zeka</a> ·
  <a href="#ajanlar-için">Ajanlar için</a> ·
  <a href="#kaputun-altında">Kaputun altında</a> ·
  <a href="#başlarken">Başlarken</a> ·
  <a href="ROADMAP.md">Yol haritası</a> ·
  <a href="README.en.md">English</a>
</p>

<br>

<table>
  <tr>
    <td width="25%" valign="top">
      <h3>🎬 Tanıdık</h3>
      Medya, Metin, Geçiş, Filtre, Yapay Zeka ve Asistan sekmeleri; çok izli zaman çizelgesi. Kısa video editörü kullandıysanız Klip Stüdyo'yu zaten biliyorsunuz.
    </td>
    <td width="25%" valign="top">
      <h3>⚡ GPU'da</h3>
      Önizleme 60 fps, 1 dakikalık 1080p video yaklaşık 10 saniyede dışa aktarılır (Apple M5). WebGL2 ile çizim, WebCodecs ile kodlama.
    </td>
    <td width="25%" valign="top">
      <h3>🧠 Yerel yapay zeka</h3>
      Whisper, Segment Anything, BiRefNet, MediaPipe, RNNoise, çeviri ve seslendirme modelleri tarayıcıda çalışır.
    </td>
    <td width="25%" valign="top">
      <h3>🤖 Ajanlara hazır</h3>
      Her işlem bir komuttur: arayüzden, <code>window.klip</code> API'sinden, MCP sunucusundan ya da Claude ile doğal dille.
    </td>
  </tr>
</table>

<br>

## Özellikler

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/images/klip-studio-transitions.jpg" alt="İki degrade klip arasındaki Daire aç geçişinin tam ortası; solda geçiş listesi, hedef kesim ve süre ayarı" width="100%">
      <br>
      <sub>"Daire aç" geçişinin tam ortası; hedef kesim ve süre ayarı.</sub>
      <h3>Geçişler, renk ve efektler</h3>
      12 geçiş, kesimdeki ◆ işaretine tıklayarak eklenir ve otomatik önizlenir. Parlaklık, kontrast, doygunluk, sıcaklık, keskinlik, vinyet, 9 filtre ön ayarı ve <b>.cube LUT</b> içe aktarma.
      <br><br>
      Şekil maskeleri (dikdörtgen, elips, doğrusal), <b>yeşil perde</b> (chroma key) ve dikey videolar için <b>bulanık tuval</b> arka planı.
    </td>
    <td width="50%" valign="top">
      <img src="docs/images/klip-studio-keyframes.jpg" alt="Döndürülmüş ve elips maskeli üst katman seçili; sağda hız ve anahtar kareli konum/boyut ayarları, zaman çizelgesinde klip üzerinde anahtar kare işaretleri, solda Asistan paneli" width="100%">
      <br>
      <sub>Döndürülmüş üst katman, anahtar kareler ve Asistan paneli.</sub>
      <h3>Kurgu</h3>
      <ul>
        <li>Manyetik ana iz, üst üste binen klipler için otomatik şeritler</li>
        <li>Sürükle-bırak, kırpma, bölme (S), geri al/yinele</li>
        <li><b>Anahtar kareler:</b> konum, boyut, döndürme, opaklık, ses düzeyi</li>
        <li><b>Hız</b> 0.25×–4× ve <b>hız eğrileri</b> (perde korunur), kareyi dondur, ters çevir</li>
        <li>Ses fade in/out, konuşmada müziği kısma (ducking)</li>
        <li>10 yazı tipi, 12 metin şablonu, karaoke altyazı</li>
      </ul>
    </td>
  </tr>
</table>

**Proje** otomatik kaydedilir (IndexedDB) ve `.klip` dosyası olarak saklanıp açılabilir. Uygulama **yüklenebilir** (PWA) ve çevrimdışı açılır. Arayüz **Türkçe ve İngilizce**.

## Yapay zeka, tamamen yerel

| Özellik | Ne yapar | Model / yöntem |
| --- | --- | --- |
| Otomatik altyazı | Konuşmayı kelime zamanlarıyla metne çevirir, karaoke altyazı ekler, SRT indirir | [Whisper](https://huggingface.co/onnx-community/whisper-base_timestamped) |
| Altyazı çevirisi | Altyazıları çevirir; iki dilli altyazı | [opus-mt](https://huggingface.co/Xenova/opus-mt-tr-en), diğer diller için [NLLB-200](https://huggingface.co/Xenova/nllb-200-distilled-600M) ¹ |
| Seslendirme | Metni 11 dilde seslendirir | [MMS-TTS](https://huggingface.co/Xenova/mms-tts-eng) ¹ |
| Akıllı kesim | Sessizlikleri ve "eee, şey, um" gibi dolgu kelimelerini keser | RMS enerji + Whisper kelime zamanları |
| Arka planı kaldır (video) | Kişiyi gerçek zamanlı ayırır | MediaPipe Selfie Segmenter |
| Ön planı seç (görsel) | Her türlü nesneyi tek tıkla ayırır | [BiRefNet](https://huggingface.co/onnx-community/BiRefNet_lite-ONNX) (güçlü GPU) / [MODNet](https://huggingface.co/Xenova/modnet) |
| Nesne seç ve sil | Tıklanan nesneyi görselden veya **videonun tamamından** siler (deneysel); hızlı veya yüksek kaliteli doldurma | [SlimSAM](https://huggingface.co/Xenova/slimsam-77-uniform) + takip + [LaMa](https://huggingface.co/Carve/LaMa-ONNX) |
| Nesneyi videoda ayır | Her türlü nesneyi videoda takip edip arka planını kaldırır (deneysel) | SlimSAM takibi + otomatik yeşil perde |
| Akıcı yavaş çekim | Yavaşlatılmış kliplerde yapay zekayla ara kare üretir | [RIFE 4.22 lite](https://huggingface.co/square-zero-labs/rife-onnx) ² |
| Gürültü azaltma | Uğultu ve arka plan gürültüsünü temizler | RNNoise (WebAssembly) |
| Sahne tespiti · Akıllı çerçeveleme · Ritim · Otomatik renk | Videoyu sahnelerden böler, 9:16 için yüzü takip eder, müzikte vuruşları işaretler, rengi dengeler | Kare farkı · MediaPipe Face Detector · spectral flux · görüntü istatistikleri |

Modeller ilk kullanımda indirilir ve tarayıcı önbelleğinde kalır.
¹ NLLB-200 ve MMS-TTS modellerinin lisansı ticari olmayan kullanıma izin verir (CC-BY-NC 4.0); ticari projelerde bu iki özelliği kullanmadan önce lisansı kontrol edin.
² RIFE kodu MIT lisanslıdır; kullanılan ONNX dönüşümünün deposunda lisans belirtilmemiş.

## Ajanlar için

Editördeki her işlem tipli bir JSON komutudur (`src/core/commands.ts`). Aynı komutları dört yoldan çalıştırabilirsiniz:

| Yol | Nasıl |
| --- | --- |
| Arayüz | Her düğme aynı komutları kullanır; hepsi geri alınabilir |
| Tarayıcı API'si | `await window.klip.execute({ name: 'split', time: 3.2 })`, `window.klip.state()`, `window.klip.screenshot()` |
| MCP sunucusu | `npm run mcp`, editörde Proje ayarları → "Ajan bağlantısı" açık |
| Asistan sekmesi | Claude'a doğal dille yazın: "sessizlikleri kes, Türkçe altyazı ekle, 9:16 yap" |

Claude Code'a MCP sunucusunu eklemek için:

```bash
claude mcp add klip-studio -- node /tam/yol/klip-studio/mcp/server.mjs
```

Araçlar: `klip_state`, `klip_commands`, `klip_execute`, `klip_screenshot`, `klip_import_file`.

Asistan sekmesi kendi Anthropic API anahtarınızla çalışır. Anahtar yalnızca tarayıcınızda saklanır. Claude'a proje özeti ve önizleme kareleri gönderilir; medya dosyalarınız gönderilmez.

## Kaputun altında

```
src/
  core/     Proje modeli, zaman çizelgesi işlemleri, anahtar kareler, komut katmanı, kayıt
  render/   WebGL2 derleyici, geçiş/filtre/maske/LUT shader'ları, metin, önizleme motoru
  media/    İçe aktarma, ses karıştırma, zaman esnetme (WSOLA), ducking, ters çevirme, LUT
  ai/       Whisper, SAM ve model worker'ları, videoda nesne silme, ses/video analizi
  agent/    window.klip API'si, MCP köprüsü, Claude asistanı
  export/   Kare kare render ve MP4 kodlama (Mediabunny + WebCodecs)
  ui/       React arayüzü
mcp/        MCP sunucusu (Node)
```

- **Önizleme = dışa aktarma:** ikisi de `render/composeFrame.ts` ile aynı kareyi kurar.
- **Tek geometri kaynağı:** önizleme, seçim kutusu ve dışa aktarma `render/layout.ts`'i paylaşır.
- **Ağır işler worker'da:** Whisper, SAM, LaMa, RIFE, çeviri, seslendirme ve dışa aktarmadaki kişi ayırma ayrı Web Worker'larda çalışır.

Ayrıntı: [docs/architecture.md](docs/architecture.md).

## Başlarken

**Deneyin:** [canlı demo](https://yunusemrealsancak.github.io/klip-studio/). Güncel Chrome veya Edge önerilir.

**Yerelde çalıştırın** (Node.js 20.19+):

```bash
git clone https://github.com/YUNUSEMREALSANCAK/klip-studio.git
cd klip-studio
npm install
npm run dev
```

| Komut | Ne yapar |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm test` | Birim testleri (Vitest) |
| `npm run test:e2e` | Uçtan uca testler (Playwright); `--grep @models` ile gerçek modelleri de dener |
| `npm run typecheck` · `npm run build` | Tip kontrolü · üretim derlemesi |
| `npm run mcp` | Ajanlar için MCP sunucusu |
| `npm run perf` | Performans bütçesi ölçümü (ffmpeg gerekir) |

**Kısayollar:** Boşluk oynat/duraklat · <kbd>S</kbd> böl · <kbd>Sil</kbd> kaldır · <kbd>⌘Z</kbd> / <kbd>⇧⌘Z</kbd> geri al/yinele · <kbd>←</kbd> <kbd>→</kbd> kare kare

## Güvenlik

Açıkları herkese açık issue yerine [SECURITY.md](SECURITY.md) içindeki yolla bildirin.

## Lisans ve teşekkür

Klip Stüdyo, [MIT](LICENSE-MIT) veya [Apache-2.0](LICENSE-APACHE) lisanslarından biriyle kullanılabilir. Modeller kendi lisanslarıyla çalışma anında indirilir (yukarıdaki nota bakın).

Kullanılan açık kaynak projeler: [transformers.js](https://github.com/huggingface/transformers.js), [Whisper](https://github.com/openai/whisper), [SlimSAM](https://github.com/czg1225/SlimSAM), [BiRefNet](https://github.com/ZhengPeng7/BiRefNet), [MODNet](https://github.com/ZHKKKe/MODNet), [MediaPipe](https://github.com/google-ai-edge/mediapipe), [RNNoise](https://github.com/xiph/rnnoise), [Mediabunny](https://github.com/Vanilagy/mediabunny), [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk), [React](https://react.dev), [Zustand](https://github.com/pmndrs/zustand), [Vite](https://vite.dev). Kısa video editörlerinden, özellikle CapCut'ın iş akışından ilham alınmıştır; CapCut kodu veya modeli içermez.
