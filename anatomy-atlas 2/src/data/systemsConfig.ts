import {
  Bone,
  Brain,
  Droplets,
  Dumbbell,
  HeartPulse,
  PersonStanding,
  Utensils,
  Wind,
  type LucideIcon,
} from 'lucide-react';

/* ───────── Temel tipler ───────── */

/** 3B katman anahtarları (her biri ayrı bir grup/sistemdir). */
export type LayerKey = 'skin' | 'skeleton' | 'muscular' | 'organs' | 'vascular' | 'nervous';

/** Sayfadaki pin'li bölümler (scroll sırası). */
export type SectionId =
  | 'hero'
  | 'skin'
  | 'skeleton'
  | 'muscular'
  | 'organs'
  | 'vascular'
  | 'nervous'
  | 'final';

export type FocusMode = 'none' | 'respiratory' | 'digestive';

export type Vec3 = [number, number, number];

export interface CameraPreset {
  position: Vec3;
  target: Vec3;
}

/** Bedenin sahnedeki duruşu (bölüme göre tweenlenir). */
export interface BodyPose {
  rotationY: number;
  scale: number;
  y: number;
}

export interface SectionStat {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export interface SectionConfig {
  id: SectionId;
  /** Bu bölümün temsil ettiği sistem (accent ve dock eşlemesi için) */
  system: LayerKey;
  navLabel: string;
  eyebrow: string;
  titleLines: string[];
  /** 3-4 satırlık tanıtım metni (satır satır reveal edilir) */
  body: string[];
  stats: SectionStat[];
  camera: CameraPreset;
  pose: BodyPose;
  /** Her katmanın bu bölümdeki hedef "varlık" seviyesi (0..1) */
  layers: Record<LayerKey, number>;
  accent: string;
  accent2: string;
  align: 'left' | 'right' | 'center';
}

export interface SystemConfig {
  key: LayerKey;
  labelTR: string;
  labelLatin: string;
  icon: LucideIcon;
  accent: string;
  accent2: string;
  /** Dock'tan tıklanınca gidilecek scroll bölümü */
  section: SectionId;
}

/* ───────── Katmanlar ───────── */

export const LAYER_KEYS: readonly LayerKey[] = [
  'skin',
  'muscular',
  'organs',
  'skeleton',
  'vascular',
  'nervous',
] as const;

export const LAYER_LABELS: Record<LayerKey, string> = {
  skin: 'Cilt',
  muscular: 'Kas',
  organs: 'Organ',
  skeleton: 'İskelet',
  vascular: 'Damar',
  nervous: 'Sinir',
};

/* ───────── Sistemler (dock) ───────── */

export const SYSTEMS: readonly SystemConfig[] = [
  { key: 'skin', labelTR: 'Genel Bakış', labelLatin: 'Integumentum', icon: PersonStanding, accent: '#8AB4FF', accent2: '#C7D8FF', section: 'skin' },
  { key: 'skeleton', labelTR: 'İskelet', labelLatin: 'Systema skeletale', icon: Bone, accent: '#E8E2D0', accent2: '#FFF7E0', section: 'skeleton' },
  { key: 'muscular', labelTR: 'Kas', labelLatin: 'Systema musculare', icon: Dumbbell, accent: '#FF5A4E', accent2: '#FF9A5A', section: 'muscular' },
  { key: 'organs', labelTR: 'Organlar', labelLatin: 'Viscera', icon: HeartPulse, accent: '#FFB84D', accent2: '#FF7A59', section: 'organs' },
  { key: 'vascular', labelTR: 'Dolaşım', labelLatin: 'Systema cardiovasculare', icon: Droplets, accent: '#FF2D55', accent2: '#3D7BFF', section: 'vascular' },
  { key: 'nervous', labelTR: 'Sinir', labelLatin: 'Systema nervosum', icon: Brain, accent: '#B388FF', accent2: '#4DE3FF', section: 'nervous' },
] as const;

export const SYSTEM_BY_KEY: Readonly<Record<LayerKey, SystemConfig>> = SYSTEMS.reduce(
  (acc, s) => {
    acc[s.key] = s;
    return acc;
  },
  {} as Record<LayerKey, SystemConfig>,
);

/* ───────── Odak modları (bonus 7. sistem: Solunum / Sindirim) ───────── */

export interface FocusModeConfig {
  labelTR: string;
  labelLatin: string;
  icon: LucideIcon;
  accent: string;
  /** anatomyData.ts içindeki organ id'leri */
  ids: readonly string[];
}

export const FOCUS_MODES: Readonly<Record<Exclude<FocusMode, 'none'>, FocusModeConfig>> = {
  respiratory: {
    labelTR: 'Solunum',
    labelLatin: 'Systema respiratorium',
    icon: Wind,
    accent: '#4DE3FF',
    ids: ['trachea', 'lungs', 'diaphragm'],
  },
  digestive: {
    labelTR: 'Sindirim',
    labelLatin: 'Systema digestorium',
    icon: Utensils,
    accent: '#FFB84D',
    ids: ['esophagus', 'stomach', 'liver', 'pancreas', 'small-intestine', 'large-intestine'],
  },
};

/* ───────── Scroll bölümleri ───────── */

const L = (
  skin: number,
  skeleton: number,
  muscular: number,
  organs: number,
  vascular: number,
  nervous: number,
): Record<LayerKey, number> => ({ skin, skeleton, muscular, organs, vascular, nervous });

export const SECTION_ORDER: readonly SectionId[] = [
  'hero',
  'skin',
  'skeleton',
  'muscular',
  'organs',
  'vascular',
  'nervous',
  'final',
] as const;

export const SECTION_CONFIG: Readonly<Record<SectionId, SectionConfig>> = {
  hero: {
    id: 'hero',
    system: 'skin',
    navLabel: 'Giriş',
    eyebrow: 'Anatomi Atlası · 3B',
    titleLines: ['İnsan Bedeni.', 'Katman katman.'],
    body: [
      'Cildin altına, kemiğin ötesine, sinyalin kaynağına.',
      'Yaklaşık 37 trilyon hücrenin kurduğu bu mimariyi tek bir sahnede, dönerek ve açılarak keşfet.',
    ],
    stats: [],
    camera: { position: [0, 1.0, 5.2], target: [0, 0.92, 0] },
    pose: { rotationY: -0.2, scale: 0.97, y: 0 },
    layers: L(1, 0, 0, 0, 0, 0),
    accent: '#8AB4FF',
    accent2: '#C7D8FF',
    align: 'center',
  },
  skin: {
    id: 'skin',
    system: 'skin',
    navLabel: 'Genel Bakış',
    eyebrow: '01 · Genel Bakış / Cilt',
    titleLines: ['Sınır çizgisi:', 'cilt.'],
    body: [
      'Cilt, vücudun en büyük organıdır: yaklaşık 2 m² yüzey ve vücut ağırlığının yaklaşık %15’i.',
      'Epidermis, dermis ve hipodermisten oluşur; bariyer, ısı düzenleyici ve duyu organı olarak çalışır.',
      'Şimdi bu yüzeyin altına iniyoruz.',
    ],
    stats: [
      { value: 2, suffix: ' m²', prefix: '≈', label: 'cilt yüzey alanı' },
      { value: 37, suffix: ' trilyon', prefix: '≈', label: 'hücre' },
      { value: 11, label: 'ana organ sistemi' },
    ],
    camera: { position: [2.1, 1.15, 3.6], target: [0, 0.95, 0] },
    pose: { rotationY: -0.4, scale: 1, y: 0 },
    layers: L(1, 0, 0, 0, 0, 0),
    accent: '#8AB4FF',
    accent2: '#C7D8FF',
    align: 'left',
  },
  skeleton: {
    id: 'skeleton',
    system: 'skeleton',
    navLabel: 'İskelet',
    eyebrow: '02 · İskelet Sistemi',
    titleLines: ['Yapının', 'iskeleti.'],
    body: [
      'Yetişkinde 206 kemik; vücuda biçim verir, organları korur ve hareket için kaldıraç sağlar.',
      'Kemik doku sürekli yenilenir; iskeletin büyük bölümü yıllar içinde baştan yapılanır.',
      'Kafatasından ayak parmaklarına, tam bir mühendislik şaheseri.',
    ],
    stats: [
      { value: 206, label: 'yetişkin kemiği' },
      { value: 300, prefix: '≈', label: 'doğumdaki kemik/kıkırdak odağı' },
      { value: 25, prefix: '≈', suffix: '%', label: 'femur, boyun yaklaşık dörtte biri' },
    ],
    camera: { position: [-2.4, 1.2, 3.6], target: [0, 0.95, 0] },
    pose: { rotationY: 0.35, scale: 1, y: 0 },
    layers: L(0.06, 1, 0, 0, 0, 0),
    accent: '#E8E2D0',
    accent2: '#FFF7E0',
    align: 'right',
  },
  muscular: {
    id: 'muscular',
    system: 'muscular',
    navLabel: 'Kas',
    eyebrow: '03 · Kas Sistemi',
    titleLines: ['Hareketin', 'motoru.'],
    body: [
      '600’den fazla iskelet kası, vücut ağırlığının yaklaşık %40’ını oluşturur.',
      'Kaslar tendonlarla kemiğe tutunur ve kasılarak kemikleri kaldıraç gibi çeker.',
      'Lif yönleri; gücün, hızın ve hassasiyetin haritasıdır.',
    ],
    stats: [
      { value: 600, suffix: '+', label: 'iskelet kası' },
      { value: 40, prefix: '≈', suffix: '%', label: 'vücut kütlesi' },
      { value: 43, label: 'yüz kası' },
    ],
    camera: { position: [2.6, 1.1, 3.4], target: [0, 0.95, 0] },
    pose: { rotationY: -0.3, scale: 1, y: 0 },
    layers: L(0, 0.45, 1, 0, 0, 0),
    accent: '#FF5A4E',
    accent2: '#FF9A5A',
    align: 'left',
  },
  organs: {
    id: 'organs',
    system: 'organs',
    navLabel: 'Organlar',
    eyebrow: '04 · İç Organlar',
    titleLines: ['Sessiz', 'işçiler.'],
    body: [
      'Kalp günde yaklaşık 100.000 kez atar; akciğerler dakikada 12–20 nefes alıp verir.',
      'Karaciğer 500’den fazla işlevi yürütür; böbrekler kanı gün boyu süzer.',
      'Cam bir gövdenin içinde, hepsi aynı anda çalışıyor.',
    ],
    stats: [
      { value: 100000, prefix: '≈', label: 'kalp atımı / gün' },
      { value: 500, suffix: '+', label: 'karaciğer işlevi' },
      { value: 480, prefix: '≈', suffix: ' milyon', label: 'akciğer alveolü' },
    ],
    camera: { position: [0, 1.25, 2.6], target: [0, 1.18, 0] },
    pose: { rotationY: 0, scale: 1, y: 0 },
    layers: L(0.22, 0.12, 0, 1, 0, 0),
    accent: '#FFB84D',
    accent2: '#FF7A59',
    align: 'right',
  },
  vascular: {
    id: 'vascular',
    system: 'vascular',
    navLabel: 'Dolaşım',
    eyebrow: '05 · Dolaşım Sistemi',
    titleLines: ['Yaşamın', 'nehri.'],
    body: [
      'Kalp yaklaşık 5 litre kanı sürekli dolaştırır: arterler kırmızı, venler mavi.',
      'Atardamarlar kalpten uzağa, toplardamarlar kalbe doğru taşır; kılcallar alışverişi yapar.',
      'Işık darbeleri, her kalp atışında ilerleyen nabzı gösteriyor.',
    ],
    stats: [
      { value: 100000, prefix: '≈', suffix: ' km', label: 'toplam damar uzunluğu' },
      { value: 5, suffix: ' litre', label: 'dolaşan kan' },
      { value: 72, suffix: ' bpm', label: 'ortalama dinlenik nabız' },
    ],
    camera: { position: [-1.6, 1.1, 3.0], target: [0, 1.0, 0] },
    pose: { rotationY: 0.3, scale: 1, y: 0 },
    layers: L(0.1, 0, 0, 0.18, 1, 0),
    accent: '#FF2D55',
    accent2: '#3D7BFF',
    align: 'left',
  },
  nervous: {
    id: 'nervous',
    system: 'nervous',
    navLabel: 'Sinir',
    eyebrow: '06 · Sinir Sistemi ve Beyin',
    titleLines: ['Düşüncenin', 'hızı.'],
    body: [
      'Beyin yaklaşık 86 milyar nöron içerir; omurilik ve sinirlerle tüm bedene bağlanır.',
      'Miyelinli sinir liflerinde sinyaller saniyede 100 metreyi aşan hızla ilerleyebilir.',
      'Mor ve camgöbeği ışık, elektriksel sinyalin yolculuğudur.',
    ],
    stats: [
      { value: 86, prefix: '≈', suffix: ' milyar', label: 'nöron' },
      { value: 120, prefix: '≤', suffix: ' m/sn', label: 'sinyal iletim hızı' },
      { value: 31, label: 'çift spinal sinir' },
    ],
    camera: { position: [2.2, 1.25, 3.9], target: [0, 0.98, 0] },
    pose: { rotationY: 0, scale: 1, y: 0 },
    layers: L(0.08, 0.14, 0, 0, 0, 1),
    accent: '#B388FF',
    accent2: '#4DE3FF',
    align: 'right',
  },
  final: {
    id: 'final',
    system: 'skin',
    navLabel: 'Serbest Keşif',
    eyebrow: '07 · Serbest Keşif · X-Ray',
    titleLines: ['Hepsi bir', 'arada.'],
    body: [
      'Tüm katmanlar şimdi üst üste: X-ray modundasın.',
      'Sağdaki kaydırıcılarla her sistemin görünürlüğünü ayarla; bir yapıya tıklayarak ayrıntıya in.',
      'Ctrl/⌘ + K ile aradığın yapıya doğrudan git.',
    ],
    stats: [
      { value: 206, label: 'kemik' },
      { value: 600, suffix: '+', label: 'kas' },
      { value: 86, prefix: '≈', suffix: ' milyar', label: 'nöron' },
    ],
    camera: { position: [0, 1.0, 5.0], target: [0, 0.92, 0] },
    pose: { rotationY: 0, scale: 1, y: 0 },
    layers: L(0.18, 0.55, 0.25, 0.6, 0.7, 0.7),
    accent: '#8AB4FF',
    accent2: '#B388FF',
    align: 'center',
  },
};
