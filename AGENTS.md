# AGENTS.md: yapay zeka ajanları ve katkıcılar için rehber

Klip Stüdyo, tarayıcıda çalışan, yapay zekalı, açık kaynak bir video editörüdür. TypeScript + React ile yazılır; görüntü WebGL2, kodlama WebCodecs (Mediabunny) ile yapılır. **Tüm yapay zeka yerelde çalışır:** kullanıcının medyası hiçbir sunucuya gönderilmez. Bu kuralı bozan bir değişiklik kabul edilmez. (Tek istisna, kullanıcının kendi anahtarıyla açtığı Asistan sekmesidir; o da yalnız proje özeti ve önizleme karesi gönderir.) Önce bu dosyayı, sonra `docs/architecture.md` dosyasını okuyun.

## 1. Oryantasyon

| Okuyun | Neden |
| --- | --- |
| `docs/architecture.md` | Klasör haritası, veri modeli, önizleme/dışa aktarma hattı |
| `ROADMAP.md` | Aşama, kapsam, sıradaki işler |
| `src/core/types.ts` | Proje modeli: tüm özellikler bunun üzerine kurulur |
| `src/core/commands.ts` | Ajanların ve arayüz dışı araçların kullandığı komut katmanı |

## 2. Komutlar

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck    # her değişiklikten sonra
npm test             # birim testleri
npm run test:e2e     # uçtan uca testler (--grep @models: gerçek modeller, yerelde)
npm run build        # CI ile aynı denetim
npm run format       # Prettier
npm run mcp          # MCP sunucusu
npm run perf         # performans bütçesi
```

## 3. Kurallar

1. **Yerel öncelikli:** model çıkarımı tarayıcıda yapılır. Model dosyaları dışında ağ isteği eklemeyin.
2. **Tek geometri kaynağı:** bir katmanın ekrandaki yeri yalnızca `src/render/layout.ts` ile hesaplanır.
3. **Önizleme = dışa aktarma:** kare kurma mantığı `src/render/composeFrame.ts` içindedir; yeni görsel özellik ikisinde de aynı sonucu vermelidir. Ses için aynı kural `src/media/audio.ts` (karıştırıcı) ile `src/render/previewEngine.ts` arasında geçerlidir.
4. **Zaman çizelgesi işlemleri saf fonksiyondur:** `src/core/timeline.ts` ve `src/core/animation.ts` `Clip` alır, yeni değer döndürür. Durumu yalnızca `useEditor` (Zustand) değiştirir.
5. **Geri alınabilirlik:** kalıcı her değişiklik `mutate(..., true)` veya önce `checkpoint()` ile geçmişe yazılır. Sürükleme sırasında `record = false`.
6. **Yeni model alanı = migrasyon:** `types.ts`'e alan eklerken `src/core/migrate.ts`'e varsayılanını ekleyin; eski projeler ve `.klip` dosyaları açılmaya devam etmeli.
7. **Yeni düzenleme = komut:** arayüze eklenen her düzenleme, ajanların da kullanabilmesi için `src/core/commands.ts`'te bir komut olarak da tanımlanmalı.
8. **Ağır işler worker'da**, **büyük bağımlılıklar tembel yüklenir** (`import()`).
9. **Arayüz metinleri `tr('Türkçe metin')` ile yazılır** ve İngilizcesi `src/i18n/en.ts`'e eklenir. Kod adları İngilizce, yorumlar Türkçe ve yalnız kod kendini açıklamadığında.
10. **Effect'ten değer döndürmeyin:** `useEffect(() => { ... })` gövdesi her zaman süslü parantezli olsun (ör. `scrollTo` yeni tarayıcılarda Promise döndürür ve React çöker).

## 4. Yeni bir yapay zeka özelliği ekleme

1. Analiz/çıkarım kodunu `src/ai/` altına yazın (ağırsa worker olarak; transformers.js modelleri için `models.worker.ts`'e bir istek türü eklemek genelde yeterli).
2. Zaman çizelgesine etkisini `src/ui/aiActions.ts` içinde `runTask(...)` ile bağlayın: ilerleme ve hata kartı otomatik gelir.
3. `src/ui/AiPanel.tsx` içine bir kart, `src/core/commands.ts`'teki `run_ai` aracına bir seçenek ekleyin.
4. Model gerçekten indiriliyorsa `tests/e2e/models.spec.ts`'e bir `@models` testi ekleyin.
5. README'deki yapay zeka tablosunu (lisansıyla) ve `ROADMAP.md` dosyasını güncelleyin.

## 5. Doğrulama

- Tip kontrolü, birim ve uçtan uca testler temiz geçmeli.
- Görsel değişikliklerde tarayıcıda deneyin; önizleme ile dışa aktarılan videonun aynı göründüğünü kontrol edin.
- Arayüz metni eklediyseniz İngilizce modda (üst çubuk → EN) bakın.
