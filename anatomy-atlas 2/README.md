# İnsan Anatomisi Atlası

Scroll ile yönetilen, sinematik, 3B ve etkileşimli bir insan anatomisi atlası.
Vite + React 18 + TypeScript (strict) · three.js / R3F / drei / postprocessing · GSAP + ScrollTrigger · Framer Motion · Lenis · Zustand · Tailwind.

> Bu site eğitim amaçlıdır, tıbbi tavsiye değildir. Modeller şematiktir; ölçüler yaklaşıktır.

## Kurulum

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # tsc --noEmit
npm run build && npm run preview
```

Node 18+ gerekir. Harici dosya veya ağ isteği olmadan çalışır (Google Fonts hariç, sistem fontlarına düşer).

## Kullanım

| Eylem | Sonuç |
| --- | --- |
| Scroll | Bölümler arasında gez, sistem dönüşür |
| Alt dock | Sisteme git (ok tuşları, Home/End ile klavye gezinmesi) |
| Sürükle | Bedeni döndür (serbest keşif/seçimde tekerlek zoom'u da açık) |
| Hover / Tıkla | Ad ipucu / kameraya uçuş + bilgi paneli |
| Esc | Paneli veya paleti kapat |
| Ctrl/⌘ + K | Yapı veya bölüm ara |
| Sağdaki Katmanlar | Cilt, kas, organ, iskelet, damar, sinir opaklığı; X-Ray ve Sıfırla |
| Organ bölümünde Odak | Solunum / Sindirim odak modu |

## Proje yapısı

```
src/
├── main.tsx · App.tsx · index.css
├── store/useAtlasStore.ts        Zustand: bölüm, seçim, katmanlar, kamera hedefi, performans kademesi
├── data/
│   ├── anatomyData.ts            73 yapı (TR/Latince metin, kamera noktaları, arama)
│   └── systemsConfig.ts          sistemler, renkler, bölüm metinleri/istatistikleri/kamera/katman seviyeleri
├── hooks/                        useLenis, useScrollSystemSync (goToSection), useCameraRig, useReducedMotion
├── scene/
│   ├── AtlasCanvas · CameraRig · Lighting · Effects · Environment
│   ├── Body/
│   │   ├── HumanBody.tsx         katman seviyeleri, duruş, picking (tek merkez)
│   │   ├── Skin/Skeleton/Muscle/Organs/Vascular/NervousLayer.tsx
│   │   └── helpers/              geometri üreticiler (layout.ts = tüm yerleşimin tek kaynağı)
│   └── shaders/                  dissolve (tarama çizgisi), fresnel (cilt), flowLine (akan ışık)
├── components/                   Preloader, Navbar, SystemDock, InfoPanel, LayerSlider, CommandPalette, ScrollSections ...
└── utils/                        gsapSetup, math, scrollState
```

## Nasıl çalışır?

- **Tek sabit sahne:** `AtlasCanvas` sayfanın arkasında `fixed` durur; içerik üstünde kayar. Sahne yeniden yüklenmez.
- **Veri akışı:** scroll, dock ve palet yalnızca store aksiyonlarını çağırır (`setActiveSection`, `selectStructure`, `flyTo`). `HumanBody` bu durumu GSAP ile katman seviyelerine çevirir; katmanlar seviyeleri her karede okur (React render'ı yok).
- **Geçiş:** eski katman tepeden aşağı tarama çizgisiyle çözülür, yenisi gecikmeyle "inşa edilir" (`dissolve.ts`).
- **Pin:** bölümler `position: sticky` ile sabitlenir; ScrollTrigger scrub zaman çizelgeleri metni ve ilerleme çizgilerini sürer.
- **Koordinat sözleşmesi:** 1 birim = 1 m, ayak y=0, beden +Z'ye bakar, anatomik sağ = −X, sol = +X.
- **Kalite kademeleri:** `high` (Bloom + DOF + Noise + Vignette) → `medium` (Bloom + Vignette) → `low` (efekt yok). `PerformanceMonitor` otomatik düşürür; mobil `medium`'dan başlar.

## Yerleşimi ince ayarlama

Bir kemik/kas/organ yanlış yerdeyse:

1. Eklem ve organ merkezleri: `scene/Body/helpers/layout.ts`
2. Gövde kesiti (cilt, kaburga, kas sarma): `layout.ts` içindeki `TORSO_PROFILE`
3. Tekil yapı geometrisi: `createBone.ts`, `createMuscle.ts`, `createOrgan.ts`
4. Damar ve sinir yolları: `createNetwork.ts`
5. Kamera açıları: `anatomyData.ts` içindeki hedef noktaları ve `cam(...)` argümanları

## GLB model ekleme (opsiyonel yükseltme)

`public/models/` içine şu dosyalardan biri veya birkaçı konursa, o katman prosedürel model yerine GLB'yi kullanır. Dosya yoksa veya bozuksa otomatik olarak prosedürel modele dönülür.

| Dosya | Katman |
| --- | --- |
| `skeleton.glb` | İskelet |
| `muscles.glb` | Kas |
| `organs.glb` | İç organlar |
| `vascular.glb` | Damar |
| `nervous.glb` | Sinir ve beyin |

Cilt (`skin`) her zaman prosedürel kalır (fresnel shader'ı gereği).

### Adım adım: BodyParts3D → GLB

1. **İndir.** BodyParts3D (DBCLS) parçaları OBJ olarak sunar; her parça bir FMA numarasıyla adlandırılmıştır. Lisansı CC BY-SA 2.1 JP'dir: **atıf zorunludur** ve türev işler aynı lisansla paylaşılır. Sketchfab için her modelin lisansını ayrı kontrol edin (CC-BY atıf ister, NC ticari kullanımı yasaklar).
2. **Blender'a aktar** (File → Import → Wavefront OBJ). Aynı yapının parçalarını (örn. tüm kaburgalar) seçip `Ctrl+J` ile birleştirin; sağ-sol tek mesh veya `_L`/`_R` sonekli iki mesh olabilir.
3. **Ölçek ve yönelim.**
   - Birim **metre**: boy ≈ 1,75 m (BodyParts3D milimetre ise `0.001` ile ölçekleyin).
   - Ayak tabanı **y = 0**; beden Blender'da **−Y yönüne** bakmalı (standart "front" görünümü). glTF dışa aktarımı bunu +Z'ye çevirir.
   - **Anatomik sol = +X** (glTF uzayında).
   - `Ctrl+A → All Transforms` ile ölçek/dönüşü uygulayın.
4. **Adlandır.** Mesh adı `anatomyData.ts` içindeki `id` ile eşleşmeli (tablo aşağıda). `femur`, `femur_L`, `femur.001`, `Femur Right` hepsi `femur` sayılır. Eşleşmeyen mesh çizilir ama tıklanamaz.
5. **Dışa aktar.** File → Export → glTF 2.0 (`.glb`). Materyal ve doku gerekmez (atlas kendi materyalini uygular). "Apply Modifiers" açık olsun.
6. **Optimize et** (önerilir):
   ```bash
   npx @gltf-transform/cli optimize skeleton.glb skeleton.opt.glb --compress meshopt
   ```
   Meshopt, ağ isteği gerektirmez. Draco'yu seçerseniz drei, çözücüyü Google'ın CDN'inden yükler (çevrimdışı çalışmaz).
7. Dosyayı `public/models/skeleton.glb` olarak kaydedin ve sayfayı yenileyin.

> GLB katmanları tüm katmanı değiştirir. Kalp atışı ve akciğer nefesi gibi prosedürel animasyonlar prosedürel modele özgüdür. Damar/sinir GLB'lerinde akan ışık yoktur, yalnızca renkli yüzey çizilir.

### Eşleşen id listesi

- **İskelet:** `skull` `cervical-spine` `thoracic-spine` `lumbar-spine` `sacrum` `ribs` `sternum` `clavicle` `scapula` `humerus` `radius` `ulna` `hand-bones` `pelvis` `femur` `patella` `tibia` `fibula` `foot-bones`
- **Kas:** `pectoralis-major` `deltoid` `biceps-brachii` `triceps-brachii` `rectus-abdominis` `external-oblique` `trapezius` `latissimus-dorsi` `gluteus-maximus` `quadriceps` `hamstrings` `gastrocnemius` `sartorius` `sternocleidomastoid` `forearm-flexors` `tibialis-anterior` `adductors`
- **Organ:** `brain` `heart` `lungs` `liver` `stomach` `pancreas` `spleen` `kidneys` `small-intestine` `large-intestine` `bladder` `diaphragm` `thyroid` `esophagus` `trachea`
- **Damar:** `aorta` `vena-cava` `pulmonary-arteries` `pulmonary-veins` `carotid-arteries` `jugular-veins` `coronary-arteries` `renal-vessels` `femoral-vessels` `portal-vein` `brachial-vessels`
- **Sinir:** `frontal-lobe` `parietal-lobe` `temporal-lobe` `occipital-lobe` `cerebellum` `brainstem` `spinal-cord` `brachial-plexus` `sciatic-nerve` `vagus-nerve`

Yeni yapı eklemek için `anatomyData.ts` içine bir giriş ekleyin, sonra ilgili `create*.ts` dosyasında aynı `id` ile geometri üretin (veya GLB'de aynı adı verin).

## Sık karşılaşılan sorunlar

- **Boş/siyah sahne:** WebGL kapalı olabilir (`about:gpu`). Sahne çökerse sayfa metni çalışır ve uyarı kartı görünür. Konsolu kontrol edin.
- **Preloader'da takılma:** sahne 40 kare çizmeden bitmezse perde 12 sn sonra kendiliğinden kalkar. Yükleme sırasında ECG'nin takılması normaldir: katmanlar geometrilerini ana iş parçacığında üretir.
- **Dock/palet bölüme gidince sahne ara bölümlerden geçiyor:** `goToSection` bunu kilitle önler; kendi kodunuzdan `scrollToTarget` ile kaydırırsanız kilit devreye girmez, `goToSection` kullanın.
- **Bölüm sınırları kayık:** fontlar yerleştikten sonra `ScrollTrigger.refresh()` otomatik çağrılır; elle yükseklik değiştirirseniz tekrar çağırın.
- **Düşük FPS:** `Effects.tsx` kademelerini ve `Environment.tsx` içindeki `COUNTS` değerlerini düşürün; `dpr` üst sınırı `AtlasCanvas.tsx` içindeki `TIER_DPR`'dedir.
- **Mobilde sayfa kaydırma:** dikey kaydırma sayfaya, yatay sürükleme sahneye aittir (`touch-action: pan-y`). Sahnede dikey sürükleyerek döndürme bilinçli olarak kapalıdır.
- **Katman kaydırıcısı yavaş tepki veriyor:** `HumanBody.tsx` içindeki seviye tween süreleri (1.0 / 1.6 sn) kaydırıcıyı yumuşatır; kısaltabilirsiniz.
- **Sürüm uyumu:** three r162, R3F 8, drei 9 ve postprocessing 2.16 birlikte sabitlenmiştir. Birini yükseltirseniz diğerlerini de kontrol edin.

## Erişilebilirlik

Klavye ile dock gezinmesi, `aria-label`'lar, odak halkaları, bilgi panelinde odak tuzağı ve Esc, `prefers-reduced-motion` desteği ve ekran okuyucular için tüm yapıları listeleyen gizli bir bölüm vardır.

## Gerçekçi cilt (skin.glb)
`public/models/skin.glb` varsa Genel Bakış'ta opak, gerçekçi insan bedeni gösterilir; iç katmanlar açılırken
soğuk, yarı saydam bir silüete dönüşür. Dosya yoksa eski prosedürel cam gövde kullanılır.
Yeniden üretmek için: `blender --background --python tools/build_skin.py -- "<Regions of human body100.fbx>" <calib.json> public/models/skin.glb`
(`calib.json`, `tools/build_models.py` çalıştırılınca oluşur.)

Model atfı: Z-Anatomy (CC BY-SA 4.0) ve BodyParts3D (CC BY-SA 2.1 JP). Footer'da atıf verin.

## Performans notları
- Model bütçeleri düşürüldü (toplam ≈0,87 M üçgen); `tools/build_models.py` içindeki `BUDGET` ile ayarlanır.
- GLB mesh'lerine BVH (three-mesh-bvh) kuruldu: fare üstü seçim testi hızlandı.
- DepthOfField/Noise kaldırıldı, DPR sınırları düşürüldü; başlangıç kalitesi `medium`, FPS iyiyse otomatik `high`.

## Ek özellikler
- **Otomatik tur (T):** bölümleri 9 sn arayla kendiliğinden gezer; kaydırma/dokunma ile durur.
- **Bul ve tıkla oyunu (Q):** 8 soruluk anatomi oyunu; ipucu (kamera bölgeye uçar), geç, puan ve sonuç ekranı.
- **Kısayollar (?):** ← / → bölüm, + / − yakınlaştır, Esc kapat. Sol kenardaki araç çubuğundan da erişilir.
- **Yaklaştırma çubuğu**, sürüklenebilir **katmanlar paneli** ve sisteme göre değişen **arka planlar**.

## Organ içi gezinti ("İçine gir")

Kalp, akciğer veya mide seçilince bilgi panelindeki **İçine gir** düğmesi organın içine girer. Sahne **gerçek Z-Anatomy geometrisini** kullanır (`public/models/interior/*.glb`):

- **Kalp** – aorttan girilir: aort kapağı (3 yaprakçık), sol ventrikül, papiller kaslar ve kordalar, mitral kapak, sol atriyum. "Sağ kalp" sekmesi: üst vena kava, sağ atriyum, triküspit kapak, sağ ventrikül, pulmoner kapak, pulmoner gövde. Ventriküller kalp atışıyla büzülür.
- **Akciğer** – gerçek trakea (C kıkırdak halkaları), karina, ana/lober/segmenter bronşlar. Son bölüm (alveol) modelde olmadığı için şematiktir.
- **Mide** – yemek borusunun alt ucu, kardia, fundus, korpus, antrum, pilor, duodenum.

Kontroller: tekerlek / ↑ ↓ / W S ile ilerle, sürükleyerek etrafına bak, ← → (ya da Boşluk) ile önceki/sonraki durak, Esc ile çık.

Araçlar: `tools/build_interior.py` (FBX → GLB, birim cm), `tools/centerline.py` ve `tools/refine_path.py` (kamera yolu için merkez hattı). Duraklar, yollar ve metinler `src/interior/organs.ts` içindedir. Gerçek geometri kapakları statiktir; hareket olarak yalnızca ventrikül büzülmesi ve kan hücreleri vardır.

## Yeni özellikler (aşama 1)
- **Organ izolasyonu:** bir yapıya tıklayınca yalnızca o kalır, etrafında dönebilir/yakınlaşabilirsin.
- **Kan akışı / sinir sinyali:** damarlarda kırmızı-mavi akan ışık (kalp atışıyla nabız), sinirlerde turkuaz sinyal darbeleri.
- **Kesit düzlemi (X):** yatay / yan / ön-arka kesit kaydırıcısı.
- **Sinematik tur (C):** organ organ uçuş, film altyazısı gibi anlatım. Esc veya tekerlek ile durur.

## Yeni özellikler (aşama 2-3)
Sol altta/sağ altta ikinci araç şeridi ve kısayollar:
- **X-ray mercek (L):** fareyi gezdir; mercek içinde cilt ve kas delinir, iskelet/organlar görünür.
- **Egzersiz modu:** efor kaydırıcısı nabzı/nefesi hızlandırır, kaslar parlar.
- **Sağlıklı ↔ hastalıklı:** sigara & akciğer, yağlı karaciğer (eğitim amaçlı görsel).
- **Yolculuk hikâyeleri:** lokma, nefes, kan damlası, sinir sinyali; kamera yapı yapı gezer.
- **Ses (M):** sentezlenmiş kalp atışı ve nefes sesi. **Ekran görüntüsü (P).**
- **Odak bulanıklığı:** seçili yapı netken arka plan bulanır (yüksek kalite kademesi).
- Genel bakışta bedenin hafif nefes alışı; iç gezintide çukurlu alyuvarlar ve süzülen parçacıklar.
