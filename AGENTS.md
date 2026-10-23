# AGENTS.md: yapay zeka ajanları ve katkıcılar için rehber

Klip Stüdyo, tarayıcıda çalışan, yapay zekalı, açık kaynak bir video editörüdür. TypeScript + React ile yazılır; görüntü WebGL2, kodlama WebCodecs (Mediabunny) ile yapılır. **Tüm yapay zeka yerelde çalışır:** kullanıcının medyası hiçbir sunucuya gönderilmez. Bu kuralı bozan bir değişiklik kabul edilmez. Önce bu dosyayı, sonra `docs/architecture.md` dosyasını okuyun.

## 1. Oryantasyon

| Okuyun | Neden |
| --- | --- |
| `docs/architecture.md` | Klasör haritası, veri modeli, önizleme/dışa aktarma hattı |
| `ROADMAP.md` | Aşama, kapsam, sıradaki işler |
| `src/core/types.ts` | Proje modeli: tüm özellikler bunun üzerine kurulur |

## 2. Komutlar

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # her değişiklikten sonra çalıştırın
npm run build      # CI ile aynı denetim
```

## 3. Kurallar

1. **Yerel öncelikli:** model çıkarımı tarayıcıda yapılır. Model dosyaları dışında ağ isteği eklemeyin.
2. **Tek geometri kaynağı:** bir katmanın ekrandaki yeri yalnızca `src/render/layout.ts` ile hesaplanır. Önizleme, seçim kutusu ve dışa aktarma bunu paylaşır.
3. **Önizleme = dışa aktarma:** kare kurma mantığı `src/render/composeFrame.ts` içindedir. Yeni görsel özellik ikisinde de aynı sonucu vermelidir.
4. **Zaman çizelgesi işlemleri saf fonksiyondur:** `src/core/timeline.ts` içindeki fonksiyonlar `Clip[]` alır, yeni `Clip[]` döndürür. Durumu yalnızca `useEditor` (Zustand) değiştirir.
5. **Geri alınabilirlik:** kalıcı her değişiklik `mutate(..., true)` veya önce `checkpoint()` ile geçmişe yazılır. Sürükleme sırasında `record = false`.
6. **Ağır işler worker'da:** model çıkarımı `src/ai/*.worker.ts` içinde yapılır; ana iş parçacığını bloklamayın.
7. **Büyük bağımlılıklar tembel yüklenir:** megabaytlarca wasm/model içeren paketleri `import()` ile, özellik kullanılınca yükleyin.
8. **Arayüz metni Türkçedir.** Kod adları İngilizce, yorumlar Türkçe ve yalnızca kod kendini açıklamadığında yazılır.

## 4. Yeni bir yapay zeka özelliği ekleme

1. Analiz/çıkarım kodunu `src/ai/` altına yazın (ağırsa worker olarak).
2. Zaman çizelgesine etkisini `src/ui/aiActions.ts` içinde `runTask(...)` ile bağlayın: ilerleme ve hata kartı otomatik gelir.
3. `src/ui/AiPanel.tsx` içine bir kart ekleyin (başlık, model rozeti, kısa açıklama).
4. README'deki yapay zeka tablosunu ve `ROADMAP.md` dosyasını güncelleyin.

## 5. Doğrulama

- Tip kontrolü ve derleme temiz olmalı.
- Görsel değişikliklerde tarayıcıda deneyin: içe aktar → zaman çizelgesine ekle → önizleme → dışa aktar.
- Önizleme ile dışa aktarılan videonun aynı göründüğünü kontrol edin.
