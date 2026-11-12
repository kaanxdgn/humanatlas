import { AIRWAY_PATH, STOMACH_PATH } from './paths';
import type { Chapter, OrganDef, OrganKey, Stop } from './types';


/* ════════════════ KALP ════════════════ */

const HEART_COLOR = (n: string): string => {
  const s = n.toLowerCase();
  if (s.includes('leaflet')) return '#e3cfc2';
  if (s.includes('papillary')) return '#8a3434';
  if (s.includes('ventricle')) return '#9a4040';
  if (s.includes('atrium')) return '#b0605c';
  if (s.includes('aort') || s.includes('trunk') || s.includes('vena') || s.includes('sinus')) return '#cfa097';
  return '#b05a58';
};
const HEART_REAL = { url: '/models/interior/heart.glb', color: HEART_COLOR, squeeze: /ventricle/i };

const heartLeft: Chapter = {
  id: 'sol',
  name: 'Sol kalp · aortdan atriyuma',
  rScale: 1.2,
  real: HEART_REAL,
  path: [[-1.03, 7.5, -0.17], [-1.04, 5.19, -0.52], [-0.36, 3.99, -0.76], [0.11, 1.52, -0.64], [1.25, 0.4, -1.01], [1.86, -0.51, -1.03], [1.8, -0.95, -1.03], [1.52, -0.41, -1.3], [1.32, 0.0, -1.64], [-0.15, 1.16, -2.48]],
  radius: [[0.0, 1.29], [0.8, 1.08], [1.6, 0.91], [2.4, 0.93], [3.2, 0.75], [4.0, 0.53], [4.8, 0.35], [5.6, 0.35], [6.4, 0.75], [7.2, 0.87], [8.0, 1.31], [8.8, 1.51], [9.6, 1.27], [10.4, 1.39], [11.2, 0.89], [12.0, 0.35]],
  colors: [[0, '#ffffff']],
  noise: 0,
  fog: { color: '#160407', density: 0.05 },
  light: { color: '#ffd9c8', intensity: 8 },
  pulse: 'heart',
  cells: [{ d0: 0, d1: 12.6, count: 70, size: 0.07, color: '#d12a35', speed: 2.2, mode: 'flow', flow: -1, spread: 0.6 }],
};

const heartRight: Chapter = {
  id: 'sag',
  name: 'Sağ kalp · vena kavadan pulmoner gövdeye',
  rScale: 1.2,
  real: HEART_REAL,
  path: [[-3.34, 9.35, -0.47], [-3.4, 6.0, -1.1], [-3.33, 2.34, -0.48], [-1.82, -0.92, 1.17], [-0.62, -1.58, 1.58], [0.8, -1.5, 2.4], [0.32, 0.91, 2.85], [1.44, 3.05, 2.17], [1.13, 4.98, 1.58], [1.08, 5.43, 0.94]],
  radius: [[0.0, 1.27], [0.8, 0.97], [1.6, 1.0], [2.4, 0.93], [3.2, 1.05], [4.0, 0.99], [4.8, 0.93], [5.6, 1.01], [6.4, 1.23], [7.2, 1.35], [8.0, 0.78], [8.8, 0.64], [9.6, 0.65], [10.4, 0.76], [11.2, 1.03], [12.0, 1.17], [12.8, 1.11], [13.6, 0.66], [14.4, 0.83], [15.2, 1.09], [16.0, 1.45], [16.8, 1.46], [17.6, 0.68], [18.4, 0.35], [19.2, 0.52], [20.0, 0.35], [20.8, 0.88], [21.6, 0.93]],
  colors: [[0, '#ffffff']],
  noise: 0,
  fog: { color: '#10060c', density: 0.05 },
  light: { color: '#ffd4cc', intensity: 8 },
  pulse: 'heart',
  cells: [{ d0: 0, d1: 22, count: 90, size: 0.07, color: '#8f2a42', speed: 2.2, mode: 'flow', flow: 1, spread: 0.6 }],
};

const heartStops: Stop[] = [
  {
    id: 'aort', chapter: 0, d: 0.4, title: 'Çıkan aort', latin: 'Aorta ascendens',
    text: 'Yolculuğa vücudun en büyük damarından, aorttan giriyorsun; kan akışına ters yönde, kalbe doğru ilerliyorsun. Önünde aort kapağının üç yaprakçığı görünüyor. Aort duvarı elastik liflerle örülüdür: kalp kasılınca genişleyip kanı depolar, gevşeyince geri çekilip akışı sürdürür. Çevrendeki kırmızı hücreler senin tersine, vücuda doğru akıyor.',
    fact: 'Kalp dakikada yaklaşık 5 litre, günde yaklaşık 7.000 litre kanı bu damardan pompalar. Hücreler okunabilsin diye büyütülmüştür.',
    marks: [{ d: 0, at: [-0.35, 2.7, -0.55], text: 'Aort kapağı' }],
  },
  {
    id: 'aort-kapagi', chapter: 0, d: 2.9, title: 'Aort kapağı', latin: 'Valva aortae',
    text: 'Üç yarımay (semilunar) yaprakçık birleşerek “Y” biçimli bir kapanma çizgisi oluşturur. Sol ventrikül kasılınca (sistol) yaprakçıklar duvara yaslanıp açılır, kan geçer; ventrikül gevşeyince geri dönen kan yaprakçıkların cebini doldurup üçünü birden kapatır. Yaprakçıkların arkasındaki cepler Valsalva sinüsleridir; sağ ve sol koroner arterler bu sinüslerden çıkar.',
    fact: 'Kapanma sesi, kalbi dinlerken duyulan “dup”un ikinci yarısıdır. Açıklığı sağlıklı yetişkinde yaklaşık 3–4 cm²’dir.',
    marks: [
      { d: 0, at: [-0.6, 2.7, 0.2], text: 'Sağ koroner küspis' },
      { d: 0, at: [0.3, 2.9, -0.8], text: 'Sol koroner küspis' },
      { d: 0, at: [-0.8, 2.6, -1.0], text: 'Koroner olmayan küspis' },
    ],
  },
  {
    id: 'sol-ventrikul', chapter: 0, d: 6.3, title: 'Sol ventrikül', latin: 'Ventriculus sinister',
    text: 'Kapaktan geçip vücudun en güçlü pompasının içindesin. Duvarı 8–12 mm kalınlıkta kas; sistemik dolaşımı yenmek için yaklaşık 120 mmHg basınç üretir. Ventrikül her atışta kasılıp küçülür; bu hareketi sahnede izleyebilirsin. İç yüzeyde kas demetleri ve duvardan çıkan papiller kaslar var.',
    fact: 'Sağlıklı bir sol ventrikül her atışta kendi hacminin yaklaşık %55–70’ini dışarı atar (ejeksiyon fraksiyonu).',
    pose: { pitch: -0.1 },
  },
  {
    id: 'papiller', chapter: 0, d: 8.0, title: 'Papiller kaslar ve kordalar', latin: 'Mm. papillares · Chordae tendineae',
    text: 'Duvardan parmak gibi çıkan kaslar papiller kaslardır. Uçlarından kapağa uzanan ince beyaz iplikler kordalardır (chordae tendineae). Ventrikül kasılırken kapak yaprakçıkları atriyuma doğru dönmesin diye paraşüt ipi gibi onları geride tutarlar.',
    fact: 'Bir kordanın kopması ya da papiller kasın iskemisi mitral kapağın sızdırmasına yol açabilir.',
    marks: [{ d: 0, at: [4.5, -2.2, -0.1], text: 'Alt papiller kas' }],
  },
  {
    id: 'mitral', chapter: 0, d: 9.9, title: 'Mitral (iki yapraklı) kapak', latin: 'Valva mitralis · Valva atrioventricularis sinistra',
    text: 'Sol atriyum ile sol ventrikül arasındaki kapak iki yaprakçıklıdır; piskopos külahına (mitra) benzediği için mitral denir. Diyastolde açılıp kanı ventriküle alır, sistolde sıkıca kapanıp kanın geri kaçmasını önler. Kordalar yaprakçıkların serbest kenarlarına tutunur.',
    fact: 'Kalbin iki kapak çifti sırayla çalışır: AV kapaklar kapanınca “lub”, yarımay kapaklar kapanınca “dup” duyulur.',
    marks: [{ d: 0, at: [2.2, -0.9, -2.3], text: 'Mitral yaprakçığı' }],
  },
  {
    id: 'sol-atriyum', chapter: 0, d: 12.0, title: 'Sol atriyum', latin: 'Atrium sinistrum',
    text: 'Kapağı geçip akciğerlerden gelen oksijenli kanın toplandığı odadasın. Duvar ince ve pürüzsüzdür; arka duvara dört pulmoner ven açılır. Yolculuğun bu bölümü burada sona erer: kan buraya yukarıdan geldi, sen ise aşağıdan, aorttan girdin.',
    fact: 'Sol atriyumun kulakçığı (appendix) atriyal fibrilasyonda pıhtı oluşumuna en yatkın bölgedir.',
  },
  {
    id: 'vena-kava', chapter: 1, d: 1.5, title: 'Üst vena kava', latin: 'Vena cava superior',
    text: 'Şimdi kan akışıyla birlikte sağ kalbe giriyorsun. Baş, boyun ve kollardan oksijeni azalmış kan bu damarla gelir; koyu kırmızı hücreler seninle aynı yöne akıyor. Damarın sağ atriyuma açıldığı bölgenin yakınında kalbin doğal pili, sinoatriyal nod bulunur.',
    fact: 'Sinoatriyal nod her atış için elektrik sinyalini başlatır; dinlenirken dakikada yaklaşık 60–100 kez.',
    marks: [{ d: 0, at: [-3.4, 7.0, -1.1], text: 'Üst vena kava' }],
  },
  {
    id: 'sag-atriyum', chapter: 1, d: 5.2, title: 'Sağ atriyum', latin: 'Atrium dextrum',
    text: 'Sağ atriyum, vücuttan dönen kanın toplandığı geniş bir oda. Üst vena kavanın yanında alt vena kava ve kalbin kendi toplardamarlarını boşaltan koroner sinüs de bu odaya açılır. Atriyum kasılınca kan alttaki triküspit kapaktan ventriküle geçer.',
    fact: 'Kalp odacıkları arasında kan yalnızca tek yönde akar; yönü kapaklar belirler.',
    pose: { pitch: -0.15 },
  },
  {
    id: 'tri-kuspit', chapter: 1, d: 7.6, title: 'Triküspit (üç yapraklı) kapak', latin: 'Valva tricuspidalis',
    text: 'Sağ atriyum ile sağ ventrikül arasındaki kapak üç yaprakçıktan oluşur. Atriyum kasılıp ventrikül gevşediğinde açılıp kanı ventriküle bırakır; ventrikül kasılınca kapanır. Altındaki kordalar bu kapağı da geriden tutar.',
    fact: 'Üç yaprakçığın adı anterior, posterior ve septal yaprakçıktır.',
    marks: [
      { d: 0, at: [-0.5, 0.1, -0.1], text: 'Septal yaprakçık' },
      { d: 0, at: [-1.9, -2.3, 0.3], text: 'Alt yaprakçık' },
    ],
  },
  {
    id: 'sag-ventrikul', chapter: 1, d: 12.8, title: 'Sağ ventrikül', latin: 'Ventriculus dexter',
    text: 'Sağ ventrikül kanı yalnızca akciğerlere gönderir; bu yüzden duvarı sol ventrikülden çok daha ince (3–5 mm), basıncı düşüktür (yaklaşık 25/5 mmHg). İç yüzeyde papiller kaslar ve kas demetleri (trabeküller) görülür.',
    fact: 'Sağ ventrikülün kanı pompalama işi, akciğer damarlarının düşük direnci sayesinde daha az güç gerektirir.',
    marks: [
      { d: 0, at: [1.3, -3.1, 3.6], text: 'Ön papiller kas' },
      { d: 0, at: [0.6, 0.3, 1.0], text: 'Septal papiller kas' },
    ],
  },
  {
    id: 'pulmoner-kapak', chapter: 1, d: 17.6, title: 'Pulmoner kapak', latin: 'Valva trunci pulmonalis',
    text: 'Ventrikülün çıkış yolunda aort kapağına benzeyen, üç yarımay yaprakçıklı pulmoner kapak var. Sistolde açılır, diyastolde kanın ventriküle geri dönmesini engeller.',
    fact: 'Pulmoner kapak, kalbin dört kapağı içinde göğüs kafesine en yakın olanıdır.',
    marks: [
      { d: 0, at: [1.6, 3.0, 2.4], text: 'Ön yaprakçık' },
      { d: 0, at: [1.6, 3.0, 0.9], text: 'Sol yaprakçık' },
      { d: 0, at: [0.1, 3.3, 1.9], text: 'Sağ yaprakçık' },
    ],
  },
  {
    id: 'pulmoner-govde', chapter: 1, d: 21.0, title: 'Pulmoner gövde', latin: 'Truncus pulmonalis',
    text: 'Kapağın ötesinde pulmoner gövde yükseliyor. Kısa bir yolculuktan sonra sağ ve sol pulmoner artere ayrılır ve kanı akciğerlere, gaz değişimine taşır. Akciğer içindeki yolculuğu bir sonraki organda sürdürebilirsin.',
    fact: 'Pulmoner arterler vücutta oksijeni azalmış kan taşıyan nadir arterlerdir; damarın adı kanın içeriğini değil yönünü belirtir.',
    marks: [{ d: 0, at: [1.0, 5.2, 1.5], text: 'Pulmoner gövde' }],
  },
];

/* ════════════════ AKCİĞER ════════════════ */

const AIR_COLOR = (n: string): string => (n.toLowerCase().includes('trachea') ? '#cf9a90' : '#c98b82');

const lungPath: Chapter = {
  id: 'hava',
  name: 'Solunum yolu · trakeadan segmenter bronşa',
  rScale: 0.8,
  speed: 1.4,
  real: { url: '/models/interior/airway.glb', color: AIR_COLOR },
  path: AIRWAY_PATH,
  radius: [[0.0, 0.67], [1.0, 0.67], [2.0, 0.65], [3.0, 0.64], [4.0, 0.66], [5.0, 0.67], [6.0, 0.64], [7.0, 0.65], [8.0, 0.66], [9.0, 0.64], [10.0, 0.68], [11.0, 0.74], [12.0, 0.73], [13.0, 0.71], [14.0, 0.7], [15.0, 0.66], [16.0, 0.61], [17.0, 0.57], [18.0, 0.51], [19.0, 0.47], [20.0, 0.44], [21.0, 0.32], [22.0, 0.24], [23.0, 0.39], [24.0, 0.34], [25.0, 0.26], [26.0, 0.12], [27.0, 0.21], [28.0, 0.41], [29.0, 0.46]],
  colors: [[0, '#ffffff']],
  noise: 0,
  fog: { color: '#2a1622', density: 0.05 },
  light: { color: '#ffe9e4', intensity: 3.6 },
  pulse: 'breath',
  cells: [{ d0: 0, d1: 29, count: 160, size: 0.018, color: '#9fc4e6', speed: 1.0, mode: 'breath', glow: 0.25, spread: 0.7 }],
};

/** Şematik son bölüm: bronşiyol → alveol (gerçek modelde bu ölçek yok). */
const alveoli: Chapter = {
  id: 'alveol',
  name: 'Alveol bölgesi (şematik)',
  path: [[-10.6, -8.6, 0.4], [-10.9, -10.6, 0.4], [-10.6, -12.4, 0.4], [-9.9, -14, 0.4], [-9, -16, 0.4], [-8.4, -18, 0.4]],
  radius: [[0, 0.3], [1.2, 0.24], [3.2, 0.23], [4.2, 0.42], [5.8, 0.9], [7.2, 2.0], [8.6, 2.2], [9.3, 0.5]],
  colors: [[0, '#e4a5a5'], [9.3, '#e9aeb0']],
  bump: (d, a) => {
    const alv = Math.min(1, Math.max(0, (d - 3.2) / 2.4));
    const pocket = Math.pow(Math.max(0, Math.sin(d * 4.2) * Math.sin(a * 8 + d * 0.7)), 0.55);
    return alv * 0.3 * pocket;
  },
  noise: 0.03,
  fog: { color: '#2a1622', density: 0.035 },
  light: { color: '#ffe9e4', intensity: 8 },
  pulse: 'breath',
  strands: [{ d0: 4.2, d1: 8.8, count: 22, r: 0.022, color: '#b8222c' }],
  cells: [
    { d0: 0, d1: 8.6, count: 200, size: 0.026, color: '#9fc4e6', speed: 1.0, mode: 'breath', glow: 0.3, spread: 0.85 },
    { d0: 4.2, d1: 8.8, count: 80, size: 0.05, color: '#d12a35', speed: 0.5, mode: 'breath', glow: 0.5, spread: 0.7 },
  ],
};

const lungStops: Stop[] = [
  {
    id: 'trakea', chapter: 0, d: 2.2, title: 'Trakea (soluk borusu)', latin: 'Trachea',
    text: 'Burun ve boğazdan geçen hava, 10–12 cm uzunluğundaki bu borudan akciğerlere iner. Duvarı C biçimli kıkırdak halkalarla desteklenir; halkalar borunun çökmesini önler, arkadaki açık kısmı yemek borusuyla komşu olan kas kapatır. İç yüzeyi silli bir epitel ve mukusla kaplıdır: toz ve mikroplar mukusa yapışır, kirpikler mukusu boğaza doğru taşır.',
    fact: 'Trakeada yaklaşık 16–20 kıkırdak halka vardır. Sigara kirpiklere zarar verir; mukus temizliği yavaşlar ve enfeksiyon riski artar.',
    marks: [{ d: 4.2, ang: 1.57, text: 'Kıkırdak halkalar' }],
  },
  {
    id: 'karina', chapter: 0, d: 7.4, title: 'Karina ve ana bronşlar', latin: 'Carina tracheae · Bronchi principales',
    text: 'Trakea burada ikiye ayrılır; bölünme çıkıntısına karina denir ve çok duyarlıdır, dokununca öksürük refleksi başlar. Sen sağ ana bronşa giriyorsun. Sağ bronş sola göre daha geniş, kısa ve dik olduğu için yutulan yabancı cisimler daha sık buraya kaçar.',
    fact: 'Sağ akciğer üç, sol akciğer iki lobdan oluşur; sol tarafta kalbe yer açmak için bir çentik vardır.',
    marks: [{ d: 9.2, ang: 0.0, text: 'Karina' }],
  },
  {
    id: 'ana-bronsh', chapter: 0, d: 11.6, title: 'Ana ve lober bronşlar', latin: 'Bronchus principalis · Bronchi lobares',
    text: 'Ana bronş, akciğere girdikten sonra lobar bronşlara ayrılır: sağda üst, orta ve alt lob için üç dal. Duvardaki yan açıklıklar diğer dalların girişleridir. Daldıkça borular daralır ve kıkırdak halkalar parça parça plaklara dönüşür.',
    fact: 'Havanın alveole ulaşmadan geçtiği yolun toplamı yaklaşık 23 dallanma basamağıdır.',
  },
  {
    id: 'lober', chapter: 0, d: 16.5, title: 'Alt lob bronşu', latin: 'Bronchus lobaris inferior',
    text: 'Alt lob bronşu, akciğerin en büyük bölümüne hava taşır. Bronşların iç yüzeyi pembe, parlak ve nemlidir; yüzeydeki mukus bakteri ve tozları yakalar.',
    fact: 'Sağ akciğerin alt lobu, yutulan yabancı maddelerin en sık yerleştiği bölgedir.',
  },
  {
    id: 'segmenter', chapter: 0, d: 23.0, title: 'Segmenter bronşlar', latin: 'Bronchi segmentales',
    text: 'Lober bronşlar bronkopulmoner segmentlere ayrılır; sağ akciğerde 10 segment vardır. Her segmentin kendi bronşu ve damarı olduğu için cerrahlar bir segmenti ayrı olarak çıkarabilir. Borular artık milimetrik çapa iniyor.',
    fact: 'Segmentler akciğerin cerrahi birimleridir; tek bir segmenti çıkarmak mümkündür.',
  },
  {
    id: 'bronsiyol', chapter: 1, d: 1.2, title: 'Bronşiyoller ve terminal bronşiyol', latin: 'Bronchioli · Bronchiolus terminalis',
    text: 'Buradan sonrası şematik bir canlandırmadır; gerçek model bu ölçekte yok. Çapı 1 mm’nin altına inen bronşiyollerde kıkırdak tamamen kaybolur; duvarı düz kas sarar. Bu kas büzülüp gevşeyerek hava akışını ayarlar. Astım krizinde işte bu kas aşırı büzülür ve yol daralır.',
    fact: 'İletim bölgesi gaz değişimine katılmaz; buradaki hava “ölü boşluk” olarak adlandırılır (yaklaşık 150 mL).',
  },
  {
    id: 'alveol-kanal', chapter: 1, d: 4.6, title: 'Alveoler kanal', latin: 'Ductus alveolaris',
    text: 'Kanalın duvarı baştan sona alveol ağızlarıyla dolu; üzüm salkımı gibi. Alveoller arasındaki ince perdelerde (septumlar) kırmızı kılcal damar ağı görünüyor.',
    fact: 'Her akciğerde yaklaşık 150 milyon, toplamda 300–500 milyon alveol vardır.',
  },
  {
    id: 'alveol', chapter: 1, d: 7.3, title: 'Alveol keseleri', latin: 'Sacculi alveolares',
    text: 'Yolculuğun sonu: gaz değişiminin gerçekleştiği alveol kesesi. Duvar, tek hücre kalınlığında bir epitel ve kılcal damar ağı ile sarılıdır; kan-hava bariyeri yaklaşık 0,5 mikrometredir. Oksijen buradan kana, karbondioksit kandan havaya geçer. Tip II hücreler yüzey gerilimini düşüren sürfaktanı salgılar.',
    fact: 'Alveollerin toplam yüzeyi yaklaşık 70 m²’dir. Gerçek bir alveol 0,2–0,3 mm çapındadır.',
    marks: [{ d: 7.6, ang: 3.0, text: 'Kılcal damar ağı' }],
  },
];

/* ════════════════ MİDE ════════════════ */

const STOM_COLOR = (n: string): string => {
  const s = n.toLowerCase();
  if (s.includes('duoden')) return '#e5a58f';
  if (s.includes('oesoph')) return '#cf8e86';
  return '#dc9080';
};

const stomachPath: Chapter = {
  id: 'sindirim',
  name: 'Sindirim yolu · yemek borusundan duodenuma',
  rScale: 1.8,
  speed: 1.4,
  real: { url: '/models/interior/stomach.glb', color: STOM_COLOR, fold: (n) => (/stomach/i.test(n) ? 0.55 : /duoden/i.test(n) ? 0.3 : 0.2) },
  path: STOMACH_PATH,
  radius: [[0.0, 0.23], [1.2, 0.24], [2.4, 0.23], [3.6, 0.43], [4.8, 1.16], [6.0, 1.68], [7.2, 2.22], [8.4, 2.79], [9.6, 3.0], [10.8, 2.92], [12.0, 2.84], [13.2, 2.48], [14.4, 2.05], [15.6, 1.82], [16.8, 1.79], [18.0, 1.69], [19.2, 1.42], [20.4, 1.04], [21.6, 1.0], [22.8, 1.05], [24.0, 1.03], [25.2, 0.96], [26.4, 0.96], [27.6, 1.0], [28.8, 1.06], [30.0, 1.08], [31.2, 0.98], [32.4, 1.0]],
  colors: [[0, '#ffffff']],
  noise: 0,
  fog: { color: '#1a0b08', density: 0.05 },
  light: { color: '#fff0d8', intensity: 8 },
  pulse: 'breath',
  cells: [{ d0: 4, d1: 22, count: 120, size: 0.07, color: '#aab85a', speed: 0.8, mode: 'breath', glow: 0.22, spread: 0.7 }],
};

const stomachStops: Stop[] = [
  {
    id: 'ozofagus', chapter: 0, d: 0.8, title: 'Yemek borusunun alt ucu', latin: 'Oesophagus',
    text: 'Lokma, yaklaşık 25 cm’lik kas boruda yutulduktan sonra peristaltik dalgalarla aşağı itilir; yerçekimine ihtiyaç duymaz. Boşken borunun duvarları birbirine yaslanır, lümen dar bir yarık gibidir. Önünde midenin girişi, kardia var.',
    fact: 'Üst üçte bir iskelet kası, alt üçte ikilik kısım düz kastır. Bir lokmanın mideye ulaşması 5–10 saniye sürer.',
  },
  {
    id: 'kardia', chapter: 0, d: 3.0, title: 'Kardia ve alt özofagus sfinkteri', latin: 'Cardia · Sphincter oesophagi inferior',
    text: 'Yemek borusunun mideye açıldığı yerde kalınlaşmış bir kas halka bulunur. Normalde kapalı durur ve mide asidinin geri kaçmasını önler; yutkunurken gevşer. Mideye girdin: duvar artık geniş bir odayı çevreliyor.',
    fact: 'Bu halka zayıfladığında mide asidi yemek borusuna kaçar: gastroözofageal reflü.',
  },
  {
    id: 'fundus', chapter: 0, d: 6.0, title: 'Fundus', latin: 'Fundus gastricus',
    text: 'Girişin üstünde kubbe gibi yükselen fundus var; yutulan hava burada gaz kabarcığı oluşturur. Duvardaki bezlerde parietal hücreler hidroklorik asit (pH yaklaşık 1,5–3,5) ve B12 emilimi için gereken intrinsik faktörü, ana hücreler pepsinojen salgılar. Sarı-yeşil noktalar asitli mide suyunu temsil ediyor.',
    fact: 'İntrinsik faktör olmadan B12 emilemez; bu yüzden mide ameliyatı geçirenlere B12 desteği gerekebilir.',
    pose: { pitch: -0.12 },
  },
  {
    id: 'korpus', chapter: 0, d: 10.5, title: 'Korpus', latin: 'Corpus gastricum',
    text: 'Midenin ana gövdesindesin. Mide boşken yaklaşık 50 mL’dir, yemekle 1–1,5 litreye genişleyebilir; duvardaki kıvrımlar (rugae) bu sırada düzleşir. Duvarda üç kas tabakası (boyuna, dairesel, oblik) yiyecekleri yoğuran dalgalar üretir. Yüzeyi yapışkan, bikarbonatlı bir mukus tabakası asitten korur.',
    fact: 'Mide yaklaşık dakikada 3 kez kasılarak lokmayı mide suyuyla karıştırıp kıvama getirir (kimus).',
  },
  {
    id: 'antrum', chapter: 0, d: 16.5, title: 'Antrum', latin: 'Antrum pyloricum',
    text: 'Mide, pilora doğru daralıp antrumu oluşturur. Kasılmalar burada daha güçlüdür; yiyecekler öğütülür. Duvardaki G hücreleri gastrin hormonunu salgılayarak asit üretimini uyarır.',
    fact: 'Mideyi boşaltma süresi yiyeceğin yapısına göre 2–4 saat arasındadır; yağlı yemekler daha uzun bekler.',
  },
  {
    id: 'pilor', chapter: 0, d: 20.0, title: 'Pilor', latin: 'Pylorus',
    text: 'Midenin çıkışındaki güçlü kas halka pilordur. Her dalgada yalnızca birkaç mililitre kimusu duodenuma geçirir; geri kalanını geri iter.',
    fact: 'Bebeklerde pilor kasının kalınlaşması (pilor stenozu) projektil kusmaya yol açabilir.',
  },
  {
    id: 'duodenum', chapter: 0, d: 26.0, title: 'Duodenum', latin: 'Duodenum',
    text: 'İnce bağırsağın ilk bölümü, yaklaşık 25 cm uzunlukta C biçimli bir kıvrım yapar. Safra ve pankreas salgısı bu bölümde kimusa karışarak yağ, protein ve karbonhidratın parçalanmasını başlatır; duvardaki bezler asidi nötralize eden bikarbonat salgılar.',
    fact: 'İnce bağırsağın emilim yüzeyi kıvrımlar, villus ve mikrovilluslarla çok büyür; kaynaklara göre onlarca metrekareye ulaşır.',
  },
];

/* ════════════════ Kayıt ════════════════ */

export const ORGANS: Record<OrganKey, OrganDef> = {
  heart: {
    id: 'heart', nameTR: 'Kalp', accent: '#ff5a6e',
    intro: 'Aorttan içeri giriyorsun. Önce sol kalbi, sonra sağ kalbi gez.',
    tabs: ['Sol kalp', 'Sağ kalp'], chapters: [heartLeft, heartRight], stops: heartStops,
  },
  lungs: {
    id: 'lungs', nameTR: 'Akciğer', accent: '#6cc7ff',
    intro: 'Trakeadan alveole kadar solunum yolunu izle.',
    tabs: ['Hava yolu', 'Alveol (şematik)'], chapters: [lungPath, alveoli], stops: lungStops,
  },
  stomach: {
    id: 'stomach', nameTR: 'Mide', accent: '#ffb35a',
    intro: 'Yemek borusundan mideye, oradan duodenuma uzanan yolculuk.',
    chapters: [stomachPath], stops: stomachStops,
  },
};

