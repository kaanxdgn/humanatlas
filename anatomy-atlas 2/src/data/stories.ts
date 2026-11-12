export interface StoryStep {
  id: string;
  text: string;
}
export interface Story {
  id: string;
  title: string;
  blurb: string;
  /** Adımlar arası süre (ms) */
  stepMs?: number;
  /** null: yapının kendi özeti altyazı olur */
  steps: StoryStep[] | null;
}

export const STORIES: readonly Story[] = [
  {
    id: 'organs',
    title: 'Organ turu',
    blurb: 'Başlıca organlar sırayla, yalnızca kendisi kalarak.',
    steps: null,
  },
  {
    id: 'lokma',
    title: 'Bir lokmanın yolculuğu',
    blurb: 'Yutulan lokma yemek borusundan bağırsağın sonuna kadar ilerler.',
    steps: [
      { id: 'esophagus', text: 'Yutulan lokma yemek borusunda dalgalı kasılmalarla (peristaltizm) aşağı itilir; yer çekiminden bağımsız olarak baş aşağı bile ilerleyebilir.' },
      { id: 'stomach', text: 'Midede asit ve enzimlerle karıştırılır; 2–4 saat içinde yarı sıvı bir bulamaca (kimus) dönüşür.' },
      { id: 'pancreas', text: 'Pankreas, ince bağırsağa sindirim enzimleri ve asidi nötrleyen bikarbonat salgılar.' },
      { id: 'liver', text: 'Karaciğer yağların sindirimi için safra üretir ve emilen besinleri işler.' },
      { id: 'small-intestine', text: 'Besinlerin çoğu burada, milyonlarca parmak benzeri villus aracılığıyla kana geçer.' },
      { id: 'large-intestine', text: 'Kalın bağırsak su ve tuzları geri emer; geriye kalan atığı dışarı atmaya hazırlar.' },
    ],
  },
  {
    id: 'nefes',
    title: 'Bir nefesin yolculuğu',
    blurb: 'Soluk borusundan akciğere, oradan kana.',
    steps: [
      { id: 'thyroid', text: 'Nefes boğazdan geçerken soluk borusunun önünde tiroit bezi yer alır; hava yolu ile doğrudan ilgisi yoktur ama aynı bölgeyi paylaşırlar.' },
      { id: 'trachea', text: 'Soluk borusu, kıkırdak halkalarla açık tutulan ve nemli bir zarla kaplı hava yoludur; ikiye ayrılarak bronşlara dönüşür.' },
      { id: 'lungs', text: 'Bronşlar giderek incelir ve alveol denilen milyonlarca küçük kesede son bulur; gaz alışverişi burada olur.' },
      { id: 'diaphragm', text: 'Diyafram aşağı inerek göğüs boşluğunu genişletir; nefes almanın asıl motoru budur.' },
      { id: 'pulmonary-veins', text: 'Oksijenlenen kan akciğer toplardamarlarıyla kalbe geri döner.' },
    ],
  },
  {
    id: 'kan',
    title: 'Bir kan damlasının yolculuğu',
    blurb: 'Kalpten çıkıp bedeni dolaşır ve geri döner.',
    steps: [
      { id: 'heart', text: 'Kalbin sol karıncığı oksijenli kanı güçlü bir kasılmayla aorta pompalar.' },
      { id: 'aorta', text: 'Aort, bedenin en büyük atardamarıdır; kanı baştan ayağa dağıtan ana yoldur.' },
      { id: 'carotid-arteries', text: 'Karotis arterler beyne giden kanı taşır; beyin vücut oksijeninin yaklaşık beşte birini tüketir.' },
      { id: 'renal-vessels', text: 'Böbrek damarları kanı süzmek için böbreklere taşır ve temizlenmiş kanı geri getirir.' },
      { id: 'vena-cava', text: 'Oksijeni azalmış kan alt ve üst ana toplardamarla kalbin sağ tarafına döner.' },
      { id: 'pulmonary-arteries', text: 'Akciğer arterleri kanı oksijen alması için akciğere gönderir; döngü yeniden başlar.' },
    ],
  },
  {
    id: 'sinyal',
    title: 'Bir sinir sinyalinin yolculuğu',
    blurb: 'Beyinden omuriliğe, oradan kasa.',
    steps: [
      { id: 'frontal-lobe', text: 'Hareket kararı ön lobda doğar; milyarlarca nöron elektriksel darbelerle haberleşir.' },
      { id: 'brainstem', text: 'Sinyal beyin sapından geçer; bu bölge solunum ve kalp ritmi gibi temel işleri de yönetir.' },
      { id: 'spinal-cord', text: 'Omurilik, beyinle beden arasındaki ana otoyoldur; refleksler beyne varmadan burada işlenebilir.' },
      { id: 'brachial-plexus', text: 'Omurilikten çıkan sinirler omuz bölgesinde ağ oluşturur ve kola dağılır.' },
      { id: 'sciatic-nerve', text: 'Siyatik sinir, bedendeki en kalın sinirdir ve bacak kaslarına komut taşır.' },
    ],
  },
];

export const getStory = (id: string): Story => STORIES.find((s) => s.id === id) ?? STORIES[0]!;

export interface Pathology {
  id: 'smoker' | 'fatty';
  organ: string;
  title: string;
  healthy: string;
  sick: string;
  tint: string;
}

export const PATHOLOGIES: readonly Pathology[] = [
  {
    id: 'smoker',
    organ: 'lungs',
    title: 'Sigara ve akciğer',
    healthy: 'Sağlıklı akciğer pembe ve esnektir; alveoller oksijeni kana kolayca geçirir.',
    sick: 'Uzun süreli sigara kullanımında katran birikir, doku grileşir/kararır ve esnekliğini yitirir (KOAH, amfizem riski).',
    tint: '#3d3835',
  },
  {
    id: 'fatty',
    organ: 'liver',
    title: 'Yağlı karaciğer',
    healthy: 'Sağlıklı karaciğer koyu kırmızı-kahverengidir ve pürüzsüzdür.',
    sick: 'Yağ birikince karaciğer sarımsı ve büyük görünür; ilerlerse iltihaplanma ve fibrozis gelişebilir.',
    tint: '#d6b04a',
  },
];
