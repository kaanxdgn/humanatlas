import type { LayerKey, Vec3 } from './systemsConfig';

export interface AnatomyItem {
  id: string;
  system: LayerKey;
  nameTR: string;
  nameLatin: string;
  summary: string;
  function: string;
  location: string;
  facts: string[]; // 3 adet
  related: string[];
  cameraPosition: Vec3;
  cameraTarget: Vec3;
}

type Facts = [string, string, string];

/** Hedef noktadan, azimut (0 = önden, π/2 = yandan, π = arkadan) ve yükseklik açısıyla kamera konumu. */
function cam(target: Vec3, dist: number, az: number, el: number): Vec3 {
  const r2 = (n: number): number => Math.round(n * 100) / 100;
  return [
    r2(target[0] + dist * Math.sin(az) * Math.cos(el)),
    r2(target[1] + dist * Math.sin(el)),
    r2(target[2] + dist * Math.cos(az) * Math.cos(el)),
  ];
}

function item(
  system: LayerKey,
  id: string,
  nameTR: string,
  nameLatin: string,
  summary: string,
  fn: string,
  location: string,
  facts: Facts,
  related: string[],
  target: Vec3,
  dist: number,
  az = 0.35,
  el = 0.12,
): AnatomyItem {
  return {
    id,
    system,
    nameTR,
    nameLatin,
    summary,
    function: fn,
    location,
    facts,
    related,
    cameraPosition: cam(target, dist, az, el),
    cameraTarget: target,
  };
}

type ItemArgs = Parameters<typeof item> extends [unknown, ...infer R] ? R : never;
const bone = (...a: ItemArgs): AnatomyItem => item('skeleton', ...a);
const musc = (...a: ItemArgs): AnatomyItem => item('muscular', ...a);
const organ = (...a: ItemArgs): AnatomyItem => item('organs', ...a);
const vasc = (...a: ItemArgs): AnatomyItem => item('vascular', ...a);
const nerv = (...a: ItemArgs): AnatomyItem => item('nervous', ...a);

/* ═══════════════ CİLT ═══════════════ */
const SKIN: AnatomyItem[] = [
  item(
    'skin', 'skin', 'Cilt', 'Cutis',
    'Cilt vücudun en büyük organıdır ve epidermis, dermis ile hipodermis (deri altı) olmak üzere üç katmandan oluşur. Vücudu dış ortama karşı sınırlar.',
    'Mekanik ve mikrobiyal bariyer oluşturur, su kaybını önler, ısıyı düzenler, dokunma ve ağrıyı algılar, güneş ışığıyla D vitamini sentezine katılır.',
    'Tüm vücut yüzeyi.',
    [
      'Yetişkinde yüzey alanı yaklaşık 1,5-2 m², ağırlığı ise vücut ağırlığının yaklaşık %15’idir.',
      'Üst katman epidermis yaklaşık dört haftada tamamen yenilenir.',
      'Kalınlık bölgeye göre değişir: göz kapağında yaklaşık 0,5 mm iken ayak tabanında 4 mm’ye kadar çıkabilir.',
    ],
    [], [0, 0.95, 0], 3.2, 0.5, 0.1,
  ),
];

/* ═══════════════ İSKELET (19) ═══════════════ */
const SKELETON: AnatomyItem[] = [
  bone(
    'skull', 'Kafatası', 'Cranium',
    'Kafatası beyni koruyan kemik kutu (nörokranyum) ile yüzü oluşturan kemiklerden (viserokranyum) meydana gelir. Kemikler sütür denen oynamaz eklemlerle birleşir.',
    'Beyni, gözleri ve iç kulağı korur; çiğneme ve yüz kaslarına tutunma yüzeyi sağlar.',
    'Omurganın üstünde, atlas (C1) ile eklemleşir.',
    [
      'Erişkin kafatası 22 kemikten oluşur (8 kranyal, 14 yüz kemiği).',
      'Alt çene (mandibula), kulak kemikçikleri dışında kafatasının tek hareketli kemiğidir.',
      'Yenidoğanda kemikler arasında fontaneller (bıngıldaklar) bulunur; bu esneklik doğuma ve beyin büyümesine olanak tanır.',
    ],
    ['cervical-spine', 'brain', 'sternocleidomastoid'], [0, 1.65, 0.0], 0.6, 0.45, 0.08,
  ),
  bone(
    'cervical-spine', 'Boyun Omurları', 'Vertebrae cervicales',
    'Yedi servikal omur kafatasını taşır ve boyna geniş hareket alanı kazandırır. İlk ikisi, atlas (C1) ve axis (C2), diğerlerinden farklı yapıdadır.',
    'Başı destekler, boyun hareketlerini sağlar ve omuriliği korur.',
    'Kafatası tabanı ile T1 omuru arasında, boyunda.',
    [
      'Atlas kafatasıyla ‘evet’ yönünde başı eğme, axis ile birlikte ‘hayır’ yönünde dönme hareketine olanak verir.',
      'Zürafanın da insanla aynı sayıda, yani yedi boyun omuru vardır.',
      'Servikal omurların yan çıkıntılarındaki deliklerden beyni besleyen vertebral arter geçer.',
    ],
    ['skull', 'thoracic-spine', 'spinal-cord', 'sternocleidomastoid'], [0, 1.53, -0.035], 0.5, 1.2, 0.08,
  ),
  bone(
    'thoracic-spine', 'Sırt Omurları', 'Vertebrae thoracicae',
    'On iki torasik omur kaburgalarla eklem yapar ve göğüs kafesinin arka duvarını oluşturur. Bu bölge omurganın hafif arkaya dışbükey (kifotik) kıvrımıdır.',
    'Göğüs kafesine sabitlik sağlar, kaburgaları taşır ve omuriliği korur.',
    'Boyun omurlarının altı ile bel omurlarının üstü arasında, sırtta.',
    [
      '12 torasik omur, 12 çift kaburgayla eklemleşir.',
      'Omur gövdeleri yukarıdan aşağıya büyür, çünkü taşıdıkları yük artar.',
      'Torasik bölgede omurlar arası hareket, kaburgaların desteği nedeniyle diğer bölgelere göre sınırlıdır.',
    ],
    ['ribs', 'sternum', 'spinal-cord', 'lumbar-spine'], [0, 1.33, -0.08], 0.8, 1.3, 0.05,
  ),
  bone(
    'lumbar-spine', 'Bel Omurları', 'Vertebrae lumbales',
    'Beş lomber omur omurganın en büyük ve en dayanıklı omurlarıdır. Bu bölge hafif öne dışbükey (lordotik) bir kıvrım yapar.',
    'Üst gövdenin ağırlığını taşır, gövde bükülmesine ve dönmesine olanak tanır.',
    'Torasik omurlar ile sakrum arasında, belde.',
    [
      'Vücut ağırlığının büyük kısmını taşıdıkları için gövdeleri en kalın omurlardır.',
      'Omurlar arası diskler akışkan bir çekirdek içerir; gün boyu su kaybedip hafifçe incelir, gece toparlanır.',
      'Bu nedenle sabah boyunuz akşamdan bir iki santim kadar uzun ölçülebilir.',
    ],
    ['sacrum', 'pelvis', 'thoracic-spine', 'spinal-cord'], [0, 1.1, -0.065], 0.7, 1.3, 0.05,
  ),
  bone(
    'sacrum', 'Sakrum', 'Os sacrum',
    'Sakrum, beş sakral omurun kaynaşmasıyla oluşan üçgen biçimli bir kemiktir. Pelvisin arka duvarını yapar ve altında kuyruk sokumu kemiği (koksiks) bulunur.',
    'Gövde ağırlığını pelvise ve bacaklara aktarır; pelvis halkasını arkadan tamamlar.',
    'Bel omurlarının altında, iki kalça kemiğinin arasında.',
    [
      'İki yanda kalça kemikleriyle sakroiliyak eklemleri oluşturur.',
      'Koksiks, 3-5 kaynaşmış omurdan oluşan küçük bir kuyruk kalıntısıdır.',
      'Sinirlerin geçtiği sakral foramenler, sakrum ön ve arka yüzünde sıralanır.',
    ],
    ['pelvis', 'lumbar-spine', 'sciatic-nerve', 'gluteus-maximus'], [0, 0.96, -0.065], 0.5, 2.7, 0.1,
  ),
  bone(
    'ribs', 'Kaburgalar', 'Costae',
    'İnsanda 12 çift kaburga vardır. Arkada torasik omurlarla eklemleşir, önde çoğu kıkırdakla sternuma bağlanır ve göğüs kafesini oluşturur.',
    'Kalbi ve akciğerleri korur, solunum hareketine eşlik ederek göğüs boşluğunu genişletir.',
    'Göğüs kafesinin yan ve ön duvarlarında, omurgadan sternuma.',
    [
      'İlk 7 çift gerçek kaburgadır, 8-10 yalancı, 11-12 ise yüzen kaburgadır.',
      'Nefes alırken kaburgalar yukarı ve dışa doğru hareket ederek göğüs boşluğunu genişletir.',
      'Kaburga kırıkları çoğunlukla alçıya alınmadan, kendiliğinden kaynar.',
    ],
    ['sternum', 'thoracic-spine', 'lungs', 'heart'], [0, 1.28, 0.0], 1.0, 0.5, 0.1,
  ),
  bone(
    'sternum', 'Göğüs Kemiği', 'Sternum',
    'Sternum göğsün ortasında yer alan düz bir kemiktir. Manubrium, gövde (korpus) ve ksifoid çıkıntı olmak üzere üç bölümden oluşur.',
    'Kaburgaları öndeki kıkırdaklarla bağlayarak göğüs kafesini kapatır ve kalbi korur.',
    'Göğüs kafesinin ön orta hattında.',
    [
      'Yaklaşık 15-20 cm uzunluğundadır.',
      'Üst ucundaki çentik (jugular çentik) boyun kökünde elle hissedilir.',
      'Kırmızı kemik iliği içerir; kemik iliği örneği alınabilen bölgelerden biridir.',
    ],
    ['ribs', 'clavicle', 'heart', 'pectoralis-major'], [0, 1.29, 0.1], 0.6, 0.0, 0.08,
  ),
  bone(
    'clavicle', 'Köprücük Kemiği', 'Clavicula',
    'Hafif S biçimli uzun bir kemiktir. Bir ucu sternuma, diğer ucu kürek kemiğinin akromiyonuna bağlanır.',
    'Kolu gövdeye bağlayan tek kemik bağlantısını sağlar ve omzu gövdeden uzak tutar.',
    'Göğsün üst kısmında, boyun kökünden omza uzanır.',
    [
      'Kolu gövdeye bağlayan tek kemikli bağlantıdır.',
      'Düşme ve darbelerde en sık kırılan kemiklerden biridir.',
      'İç ucundaki büyüme plağı yaklaşık 25 yaşına dek kapanmaz; vücutta en geç kaynayan kemiklerdendir.',
    ],
    ['sternum', 'scapula', 'humerus', 'trapezius'], [0, 1.435, 0.07], 0.5, 0.3, 0.1,
  ),
  bone(
    'scapula', 'Kürek Kemiği', 'Scapula',
    'Kürek kemiği sırtın üst kısmında, kaburgaların üzerinde yer alan üçgen biçimli düz bir kemiktir. Omuz ekleminin çukur kısmını (glenoid) oluşturur.',
    'Omuz eklemine zemin hazırlar ve kolun geniş hareketleri için kasların tutunma yeridir.',
    'Sırtta, 2. ile 7. kaburgalar düzeyinde, omurganın iki yanında.',
    [
      'Omuz eklemi, kürek kemiğinin glenoid çukuru ile humerus başından oluşan top-yuva eklemidir.',
      'Gövdeye kemik bir eklemle değil, yalnızca kaslarla tutunur.',
      'Hareket genişliği sayesinde omuz, vücudun en hareketli eklemidir.',
    ],
    ['clavicle', 'humerus', 'trapezius', 'latissimus-dorsi'], [0.12, 1.35, -0.085], 0.6, Math.PI, 0.1,
  ),
  bone(
    'humerus', 'Kol Kemiği', 'Humerus',
    'Üst kolun tek kemiğidir. Üstte kürek kemiğiyle, altta dirsekte önkol kemikleriyle eklem yapar.',
    'Üst kola şekil verir, omuz ve dirsek hareketleri için kaldıraç görevi görür.',
    'Omuzdan dirseğe uzanan üst kolda.',
    [
      'Kolun en uzun ve en kalın kemiğidir.',
      'Gövdesinin arkasından geçen radyal sinir, humerus kırıklarında zedelenebilir.',
      'Dirsekte medial epikondil arkasından geçen ulnar sinire çarpmak, ‘funny bone’ denen elektriklenme hissini yaratır.',
    ],
    ['scapula', 'radius', 'ulna', 'biceps-brachii', 'triceps-brachii', 'brachial-plexus'], [0.228, 1.26, 0.0], 0.6, 0.5, 0.05,
  ),
  bone(
    'radius', 'Önkol Kemiği (Dış)', 'Radius',
    'Önkolun başparmak tarafındaki kemiğidir. Üst ucu küçük, alt ucu bilekte büyüktür.',
    'Bilek eklemini oluşturur ve önkolun dönme hareketini (pronasyon-supinasyon) sağlar.',
    'Önkolda, başparmak tarafında.',
    [
      'Bilek eklemine ulnadan daha fazla katılır.',
      'Önkol dönerken radius, ulnanın çevresinde döner.',
      'Elin üzerine düşmede sık görülen bilek kırığı (Colles kırığı) radiusun alt ucunda olur.',
    ],
    ['ulna', 'humerus', 'hand-bones', 'forearm-flexors'], [0.28, 1.0, 0.02], 0.55, 0.5, 0.05,
  ),
  bone(
    'ulna', 'Dirsek Kemiği', 'Ulna',
    'Önkolun serçe parmak tarafındaki kemiğidir. Üst ucundaki olekranon dirsek çıkıntısını oluşturur.',
    'Dirsek ekleminin menteşe hareketini sağlar ve önkola sabit bir eksen verir.',
    'Önkolda, serçe parmak tarafında.',
    [
      'Üst ucundaki olekranon, dirsek tam uzatıldığında hareketi sınırlayan kemik bir duraktır.',
      'Radiusun aksine üst ucu kalın, bilekteki ucu incedir.',
      'Dirsekte hissedilen sert çıkıntı ulnanın olekranonudur.',
    ],
    ['radius', 'humerus', 'triceps-brachii', 'hand-bones'], [0.27, 1.0, -0.005], 0.55, 2.4, 0.05,
  ),
  bone(
    'hand-bones', 'El Kemikleri', 'Ossa manus',
    'Eli sekiz karpal (bilek), beş metakarpal (avuç içi) ve on dört falanks (parmak) kemiği oluşturur. Başparmak diğer parmaklarla karşıtlık yapabilir.',
    'İnce kavrama, tutma ve ayrıntılı el hareketlerini mümkün kılar.',
    'Bileğin altında, el bölgesinde.',
    [
      'Her elde 27 kemik bulunur: 8 karpal, 5 metakarpal, 14 falanks.',
      'İki elin 54 kemiği, vücuttaki toplam 206 kemiğin dörtte birinden fazladır.',
      'Başparmağın karşıtlık hareketi, trapezium ile 1. metakarpal arasındaki eyer eklemine dayanır.',
    ],
    ['radius', 'ulna', 'forearm-flexors', 'brachial-plexus'], [0.31, 0.79, 0.03], 0.4, 0.4, 0.05,
  ),
  bone(
    'pelvis', 'Pelvis (Leğen Kemiği)', 'Pelvis',
    'Pelvis, iki kalça kemiği (ilium, ischium ve pubis kaynaşmasıyla) ile sakrumdan oluşan kemik bir halkadır.',
    'Üst gövdenin ağırlığını bacaklara aktarır, alt karın organlarını taşır ve bacak kaslarına tutunma yeri verir.',
    'Gövdenin altında, bel omurları ile uyluk kemikleri arasında.',
    [
      'Kalça kemiğindeki asetabulum, femur başını saran derin bir top-yuva eklemi oluşturur.',
      'Kadın pelvisi genellikle daha geniş ve sığdır; bu, doğuma uyum sağlar.',
      'Pelvis kemikleri vücudun en güçlü kemik yapılarındandır.',
    ],
    ['sacrum', 'femur', 'lumbar-spine', 'gluteus-maximus', 'bladder'], [0, 0.96, 0.0], 0.9, 0.4, 0.12,
  ),
  bone(
    'femur', 'Uyluk Kemiği', 'Femur',
    'Femur, uyluktaki tek kemiktir. Üstte pelvisle kalça ekleminde, altta tibia ve patella ile diz ekleminde birleşir.',
    'Vücut ağırlığını taşır, yürüme ve koşmada kaldıraç görevi görür.',
    'Kalçadan dize uzanan uylukta.',
    [
      'İnsan vücudunun en uzun, en ağır ve en güçlü kemiğidir.',
      'Boyun yaklaşık dörtte biri kadar uzunluğundadır.',
      'Femur boynu kırıkları yaşlılarda, özellikle kemik erimesi (osteoporoz) olanlarda sık görülür.',
    ],
    ['pelvis', 'patella', 'tibia', 'quadriceps', 'hamstrings', 'femoral-vessels'], [0.1, 0.7, 0.0], 0.95, 0.6, 0.08,
  ),
  bone(
    'patella', 'Diz Kapağı', 'Patella',
    'Patella, dizin önünde yer alan küçük, yassı ve üçgene benzer bir kemiktir. Kuadriseps tendonunun içinde gelişir.',
    'Dizi uzatırken kuadriseps kuvvetini artırır ve diz ekleminin önünü korur.',
    'Dizin ön yüzünde, femur ile tibia arasında.',
    [
      'Vücudun en büyük sesamoid (tendon içi) kemiğidir.',
      'Doğumda kıkırdaktır, yaklaşık 3-5 yaşları arasında kemikleşmeye başlar.',
      'Kuadriseps tendonu patellaya, oradan patellar bağla tibiaya bağlanır.',
    ],
    ['femur', 'tibia', 'quadriceps'], [0.093, 0.505, 0.045], 0.4, 0.0, 0.1,
  ),
  bone(
    'tibia', 'Kaval Kemiği', 'Tibia',
    'Tibia, alt bacağın ön-iç tarafındaki kalın kemiktir ve vücut ağırlığının büyük kısmını diz ile ayak bileği arasında taşır.',
    'Gövde ağırlığını ayağa iletir; diz ve ayak bileği eklemlerinin ana kemik parçasıdır.',
    'Alt bacakta, dizden ayak bileğine kadar.',
    [
      'Femurdan sonra vücudun en uzun ikinci kemiğidir.',
      'Ön yüzü deri altında doğrudan hissedildiği için darbeler çok acıtır.',
      'Alt ucundaki medial malleol, ayak bileğinin iç çıkıntısını oluşturur.',
    ],
    ['femur', 'fibula', 'patella', 'tibialis-anterior', 'foot-bones'], [0.088, 0.29, 0.01], 0.7, 0.5, 0.05,
  ),
  bone(
    'fibula', 'Kamış Kemiği', 'Fibula',
    'Fibula, tibianın dış yanında uzanan ince bir kemiktir. Dize doğrudan katılmaz, alt ucuyla ayak bileği eklemini oluşturur.',
    'Ayak bileğini dıştan sabitler ve alt bacak kaslarına tutunma alanı sağlar.',
    'Alt bacakta, tibianın dış tarafında.',
    [
      'Vücut ağırlığının yalnızca küçük bir bölümünü taşır.',
      'Alt ucu, ayak bileğinin dış çıkıntısı olan lateral malleolü oluşturur.',
      'Kemik grefti gerektiren ameliyatlarda sıkça donör bölge olarak kullanılır.',
    ],
    ['tibia', 'foot-bones', 'gastrocnemius', 'tibialis-anterior'], [0.115, 0.28, 0.0], 0.6, 1.0, 0.05,
  ),
  bone(
    'foot-bones', 'Ayak Kemikleri', 'Ossa pedis',
    'Her ayak yedi tarsal, beş metatarsal ve on dört falanks kemiğinden oluşur. Kemikler kemerler oluşturacak şekilde dizilir.',
    'Vücut ağırlığını taşır, yürürken şok emer ve ileri itme kuvveti sağlar.',
    'Ayak bileğinin altında, ayak bölgesinde.',
    [
      'Her ayakta 26 kemik bulunur.',
      'Ayak, iki uzunlamasına ve bir enine kemer oluşturur; bu kemerler yükü dağıtır ve şoku azaltır.',
      'Topuk kemiği (kalkaneus) en büyük tarsal kemiktir; koşuda ayak, vücut ağırlığının birkaç katı yük taşır.',
    ],
    ['tibia', 'fibula', 'gastrocnemius', 'tibialis-anterior'], [0.088, 0.04, 0.07], 0.5, 0.6, 0.15,
  ),
];

/* ═══════════════ KAS (17) ═══════════════ */
const MUSCLES: AnatomyItem[] = [
  musc(
    'pectoralis-major', 'Büyük Göğüs Kası', 'Musculus pectoralis major',
    'Göğsün ön yüzünü kaplayan geniş, yelpaze biçimli bir kastır. Köprücük kemiği, sternum ve üst kaburga kıkırdaklarından başlayıp humerusa tutunur.',
    'Kolu öne getirir, içe çevirir ve gövdeye doğru çeker.',
    'Göğüs kafesinin ön üst bölümünde.',
    [
      'Meme dokusu bu kasın üzerinde yer alır.',
      'Şınav ve itme hareketlerinin başlıca kuvvet kaynaklarından biridir.',
      'Bu kasın doğuştan tek taraflı yokluğu, Poland sendromu denen nadir bir durumun parçasıdır.',
    ],
    ['deltoid', 'sternum', 'humerus', 'clavicle'], [0.085, 1.29, 0.105], 0.6, 0.3, 0.08,
  ),
  musc(
    'deltoid', 'Deltoid Kası', 'Musculus deltoideus',
    'Omuza yuvarlak çizgisini veren üç başlı (ön, orta, arka) bir kastır. Köprücük kemiği, akromiyon ve skapula omurgasından başlar.',
    'Kolu yana kaldırır; ön lifleri öne, arka lifleri geriye hareket ettirir.',
    'Omuz eklemini saran üst kol kökünde.',
    [
      'Adı, Yunan harfi Δ (delta) ile benzerliğinden gelir.',
      'Kolun yana kaldırılmasının ilk birkaç derecesini supraspinatus başlatır, sonrasını deltoid sürdürür.',
      'Aksiller sinir yakınlığı nedeniyle enjeksiyonlar kasın üst-orta bölümüne yapılır.',
    ],
    ['clavicle', 'scapula', 'humerus', 'trapezius'], [0.215, 1.385, 0.005], 0.55, 0.6, 0.1,
  ),
  musc(
    'biceps-brachii', 'İki Başlı Kol Kası', 'Musculus biceps brachii',
    'Üst kolun ön yüzünde, uzun ve kısa olmak üzere iki başı bulunan kastır. Kürek kemiğinden başlayıp radiusa tutunur.',
    'Dirseği bükmek ve önkolu dışa çevirmek (supinasyon); omuzda kolu öne kaldırmaya yardım etmek.',
    'Üst kolun ön yüzünde.',
    [
      'Adı ‘iki baş’ anlamına gelir; uzun başının tendonu omuz eklemi içinden geçer.',
      'Dirsek bükükken önkolu çevirmede (kapak açma gibi) en güçlü kastır.',
      'Uzun baş tendonu koptuğunda kolda belirgin bir yumru (Popeye belirtisi) oluşur.',
    ],
    ['humerus', 'radius', 'triceps-brachii', 'brachial-vessels'], [0.235, 1.25, 0.035], 0.55, 0.4, 0.05,
  ),
  musc(
    'triceps-brachii', 'Üç Başlı Kol Kası', 'Musculus triceps brachii',
    'Üst kolun arka yüzünü kaplayan, uzun, lateral ve medial olmak üzere üç başlı kastır. Ortak tendonla ulnanın olekranonuna tutunur.',
    'Dirseği uzatır; uzun başı ayrıca kolu omuzda geriye çeker.',
    'Üst kolun arka yüzünde.',
    [
      'Üst kol kas kütlesinin yaklaşık üçte ikisini oluşturur.',
      'Şınav ve itme hareketlerinde dirsek uzatmanın başlıca kasıdır.',
      'Triseps refleksi, radyal sinir ve ilgili omurilik düzeyini muayenede değerlendirmeye yarar.',
    ],
    ['humerus', 'ulna', 'deltoid', 'brachial-plexus'], [0.235, 1.25, -0.034], 0.55, 2.6, 0.05,
  ),
  musc(
    'rectus-abdominis', 'Düz Karın Kası', 'Musculus rectus abdominis',
    'Karnın ön duvarında iki yanda dikey uzanan kayış biçimli kastır. Enine tendon bantlarıyla bölmelere ayrılır.',
    'Gövdeyi öne büker, karın içi basıncı artırır ve pelvisi dengeler.',
    'Göğüs kafesinin alt kenarından kasık kemiğine, karın ön duvarında.',
    [
      '‘Altı paket’ görünümü tendon bantlarının kası bölmelere ayırmasından gelir; bölüm sayısı kişiden kişiye değişir.',
      'İki kas arasındaki bağ dokusu çizgisi (linea alba), gebelikte genişleyebilir.',
      'Kasların görünürlüğü büyük ölçüde deri altı yağ miktarına bağlıdır.',
    ],
    ['external-oblique', 'sternum', 'pelvis'], [0.03, 1.09, 0.09], 0.7, 0.2, 0.05,
  ),
  musc(
    'external-oblique', 'Dış Çapraz Karın Kası', 'Musculus obliquus externus abdominis',
    'Karnın yan duvarında, lifleri ellerin ceplere girdiği yönde çapraz uzanan en yüzeysel yan karın kasıdır.',
    'Gövdeyi karşı tarafa döndürür, yana büker ve karın duvarını destekler.',
    'Alt kaburgalardan pelvise, karnın yan yüzünde.',
    [
      'Karın yan duvarında üç geniş kas tabakası üst üste yer alır: dış oblik, iç oblik ve transversus abdominis.',
      'Çapraz lif dizilimi gövde dönmesini ve karın duvarı dayanıklılığını sağlar.',
      'Alt kenarı, kasık bağını (inguinal ligament) oluşturur.',
    ],
    ['rectus-abdominis', 'latissimus-dorsi', 'pelvis'], [0.125, 1.1, 0.055], 0.65, 0.9, 0.05,
  ),
  musc(
    'trapezius', 'Trapez Kası', 'Musculus trapezius',
    'Boyundan sırtın ortasına uzanan geniş, üçgen biçimli yüzeyel kastır. İki taraf birlikte trapez şeklini çizer.',
    'Kürek kemiğini yükseltir, geriye çeker ve döndürür; boynu arkaya uzatır.',
    'Kafatası tabanından sırt ortasına, omuz çevresinde.',
    [
      'Adı, iki kasın birlikte oluşturduğu yamuk (trapezoid) şekilden gelir.',
      'Omuz silkme hareketinin başlıca kasıdır.',
      'XI. kranyal sinir (aksesuar sinir) tarafından sinirlendirilir.',
    ],
    ['scapula', 'clavicle', 'sternocleidomastoid', 'skull'], [0.06, 1.37, -0.1], 0.8, Math.PI, 0.1,
  ),
  musc(
    'latissimus-dorsi', 'Geniş Sırt Kası', 'Musculus latissimus dorsi',
    'Sırtın alt yarısını kaplayan, vücudun en geniş yüzeyli kaslarından biridir. Omurgadan ve pelvisten başlayıp humerusa tutunur.',
    'Kolu geriye çeker, içe döndürür ve gövdeye yaklaştırır; barfiks hareketinin ana kasıdır.',
    'Orta ve alt sırtta, yan taraflara doğru yayılır.',
    [
      'Yüzey alanı bakımından insan vücudunun en geniş kasıdır.',
      'Yüzücüler ve tırmanıcılarda güçlü gelişir.',
      'Plastik cerrahide meme rekonstrüksiyonu gibi ameliyatlarda kas flebi olarak kullanılabilir.',
    ],
    ['trapezius', 'humerus', 'external-oblique', 'thoracic-spine'], [0.1, 1.17, -0.09], 0.8, Math.PI, 0.05,
  ),
  musc(
    'gluteus-maximus', 'Büyük Kalça Kası', 'Musculus gluteus maximus',
    'Kalçanın şeklini belirleyen kalın ve güçlü kastır. Sakrum ve iliumdan başlayıp femurun arka üst kısmına tutunur.',
    'Kalçayı uzatır (merdiven çıkma, ayağa kalkma), uyluğu dışa çevirir ve dik duruşu destekler.',
    'Pelvisin arkasında, kalçada.',
    [
      'Vücudun en büyük kasıdır.',
      'İnsanda diğer primatlara göre çok daha gelişmiştir; iki ayak üstünde koşmak ve dik durmak için önemlidir.',
      'Altından geçen siyatik sinir nedeniyle kalça enjeksiyonları dış-üst bölgeye yapılır.',
    ],
    ['sacrum', 'pelvis', 'femur', 'hamstrings', 'sciatic-nerve'], [0.085, 0.93, -0.065], 0.8, Math.PI, 0.08,
  ),
  musc(
    'quadriceps', 'Dört Başlı Uyluk Kası', 'Musculus quadriceps femoris',
    'Uyluğun ön yüzünü kaplayan dört başlı kas grubudur: rektus femoris, vastus lateralis, vastus medialis ve vastus intermedius.',
    'Dizi uzatır; rektus femoris ayrıca kalçayı bükmeye yardım eder.',
    'Uyluğun ön yüzünde.',
    [
      'Vücudun en güçlü ve en büyük kas gruplarından biridir.',
      'Dört baş ortak tendonla patellaya, oradan patellar bağla tibiaya tutunur.',
      'Diz kapağının altına vurulduğunda görülen diz refleksi, bu kasın gerilme refleksidir.',
    ],
    ['femur', 'patella', 'sartorius', 'tibia'], [0.097, 0.7, 0.035], 0.9, 0.3, 0.05,
  ),
  musc(
    'hamstrings', 'Arka Uyluk Kasları', 'Musculi ischiocrurales',
    'Uyluğun arka yüzünde yer alan üç kastır: biseps femoris, semitendinosus ve semimembranosus. Oturma kemiği çıkıntısından (iskiyal tüberosite) başlarlar.',
    'Dizi bükerler ve kalçayı geriye uzatırlar.',
    'Uyluğun arka yüzünde.',
    [
      'Adı, eskiden domuz budunun bu kirişlerinden asılarak tütsülenmesinden gelir.',
      'Sprint ve ani hızlanmalarda en sık yaralanan kas gruplarındandır.',
      'Siyatik sinir tarafından sinirlendirilirler.',
    ],
    ['gluteus-maximus', 'femur', 'gastrocnemius', 'sciatic-nerve'], [0.09, 0.7, -0.03], 0.9, Math.PI, 0.05,
  ),
  musc(
    'gastrocnemius', 'Baldır Kası', 'Musculus gastrocnemius',
    'Baldırın şeklini veren iki başlı yüzeyel kastır. Altındaki soleus ile birlikte triceps surae oluşturur ve Aşil tendonuyla topuğa tutunur.',
    'Ayağı aşağı iter (parmak ucunda yükselme) ve dizi bükmeye yardım eder.',
    'Alt bacağın arka yüzünde.',
    [
      'Aşil tendonu vücudun en kalın ve en güçlü tendonudur.',
      'Baldır kasları, kasılırken damarları sıkıştırarak kanı kalbe doğru pompalar; bu yüzden ‘ikinci kalp’ olarak da anılır.',
      'Yürüme ve koşmada ileri itme kuvvetinin başlıca kaynaklarındandır.',
    ],
    ['tibia', 'fibula', 'foot-bones', 'hamstrings', 'femoral-vessels'], [0.09, 0.38, -0.035], 0.7, Math.PI, 0.05,
  ),
  musc(
    'sartorius', 'Terzi Kası', 'Musculus sartorius',
    'Uyluk boyunca çapraz uzanan ince, kayış biçimli kastır. Kalça kemiğinin ön üst çıkıntısından başlar, tibianın üst iç yüzüne tutunur.',
    'Kalçayı ve dizi bükerken uyluğu dışa çevirir; bağdaş kurma hareketine katılır.',
    'Uyluğun ön yüzünde, dıştan içe çapraz.',
    [
      'Vücudun en uzun kasıdır.',
      'Adı, Latince terzi anlamına gelen ‘sartor’ sözcüğünden gelir; terzilerin bağdaş oturuşuna atıf yapar.',
      'Femoral damarların içinden geçtiği adduktör kanalının üst örtüsünü oluşturmaya yardım eder.',
    ],
    ['quadriceps', 'adductors', 'pelvis', 'tibia'], [0.1, 0.72, 0.06], 0.8, 0.3, 0.05,
  ),
  musc(
    'sternocleidomastoid', 'Sternokleidomastoid Kası', 'Musculus sternocleidomastoideus',
    'Boynun yan yüzünde, sternum ve köprücük kemiğinden kulak arkasındaki mastoid çıkıntıya uzanan belirgin kastır.',
    'Başı karşı tarafa çevirir, yana ve öne eğer; derin soluk alırken yardımcı solunum kası olarak çalışır.',
    'Boynun yan ve ön yüzünde.',
    [
      'XI. kranyal sinir (aksesuar sinir) tarafından sinirlendirilir.',
      'Kasın doğuştan kısalması, boyun eğriliğine (tortikollis) yol açabilir.',
      'Derin inspirasyonda sternumu ve köprücükleri yukarı çekerek solunuma yardım eder.',
    ],
    ['sternum', 'clavicle', 'skull', 'trapezius', 'jugular-veins'], [0.04, 1.52, 0.03], 0.45, 0.7, 0.05,
  ),
  musc(
    'forearm-flexors', 'Önkol Fleksörleri', 'Musculi flexores antebrachii',
    'Önkolun ön yüzünde, dirsekteki iç çıkıntıdan (medial epikondil) başlayıp bilek ve parmaklara uzanan kas grubudur.',
    'Bileği ve parmakları bükerek kavrama gücü sağlar.',
    'Önkolun ön yüzünde.',
    [
      'El sıkma gücü büyük ölçüde bu kasların kuvvetine bağlıdır.',
      'Median ve ulnar sinirlerle sinirlenirler.',
      'Golfçü dirseği (medial epikondilit), bu kasların ortak tendon başlangıcının aşırı kullanımıyla oluşur.',
    ],
    ['radius', 'ulna', 'hand-bones', 'brachial-plexus'], [0.285, 1.0, 0.026], 0.5, 0.3, 0.05,
  ),
  musc(
    'tibialis-anterior', 'Ön Kaval Kası', 'Musculus tibialis anterior',
    'Kaval kemiğinin dış-ön yüzünde, kemiğe paralel uzanan kastır. Tendonu ayağın iç kenarına tutunur.',
    'Ayak ucunu yukarı kaldırır (dorsifleksiyon) ve ayağı içe çevirir.',
    'Alt bacağın ön yüzünde.',
    [
      'Yürürken ayak ucunun yere takılmasını engeller; zayıflığında ‘düşük ayak’ ortaya çıkar.',
      'Derin peroneal sinirle sinirlenir.',
      'Kemiğin hemen yanında olduğu için bacağın ön yüzünde kolayca hissedilir.',
    ],
    ['tibia', 'fibula', 'foot-bones', 'gastrocnemius'], [0.098, 0.32, 0.034], 0.6, 0.5, 0.05,
  ),
  musc(
    'adductors', 'Addüktör Kas Grubu', 'Musculi adductores',
    'Uyluğun iç yüzünde yer alan kas grubudur: addüktör longus, brevis, magnus, pektineus ve grasilis.',
    'Bacağı gövdeye doğru yaklaştırır ve yürürken pelvisi dengeler.',
    'Uyluğun iç yüzünde.',
    [
      'Addüktör magnus, bu grubun en büyük kasıdır.',
      'Ani yön değiştiren sporcularda sık zorlanır; ‘kasık çekmesi’ bu kasların yaralanmasıdır.',
      'Altlarındaki adduktör kanalı, femoral arter ve veni taşır.',
    ],
    ['femur', 'pelvis', 'sartorius', 'femoral-vessels', 'quadriceps'], [0.065, 0.72, 0.012], 0.8, 0.3, 0.05,
  ),
];

/* ═══════════════ İÇ ORGANLAR (15) ═══════════════ */
const ORGANS: AnatomyItem[] = [
  organ(
    'brain', 'Beyin', 'Cerebrum',
    'Beyin, sinir sisteminin merkezidir; büyük beyin, beyincik ve beyin sapından oluşur. Yetişkinde ortalama 1,3-1,4 kg gelir.',
    'Duyuları işler, hareketi planlar, düşünme, bellek ve dili yönetir ve vücut işlevlerini düzenler.',
    'Kafatasının içinde.',
    [
      'Vücut ağırlığının yaklaşık %2’sini oluşturur ama dinlenik enerjinin yaklaşık %20’sini tüketir.',
      'Yaklaşık 86 milyar nöron içerir.',
      'Beyin dokusunda ağrı reseptörü yoktur; baş ağrısı zarlardan ve damarlardan kaynaklanır.',
    ],
    ['skull', 'frontal-lobe', 'cerebellum', 'brainstem', 'carotid-arteries'], [0, 1.668, 0.0], 0.55, 0.6, 0.1,
  ),
  organ(
    'heart', 'Kalp', 'Cor',
    'Kalp, göğüs boşluğunda iki akciğer arasında, orta hattın hafifçe solunda yer alan dört odacıklı kas organdır.',
    'Kanı akciğerlere ve tüm vücuda pompalar; iki ayrı dolaşım devresini besler.',
    'Göğüs boşluğunun ortasında, sternumun arkasında.',
    [
      'Yaklaşık yumruk büyüklüğündedir ve yetişkinde 250-350 g gelir.',
      'Günde yaklaşık 100.000 kez atar ve dinlenirken dakikada yaklaşık 5 litre kan pompalar.',
      'Kendi elektrik sistemi vardır; doğal kalp pili görevini sinoatriyal düğüm üstlenir.',
    ],
    ['lungs', 'aorta', 'vena-cava', 'coronary-arteries', 'pulmonary-arteries', 'pulmonary-veins'], [0.03, 1.24, 0.04], 0.4, 0.25, 0.05,
  ),
  organ(
    'lungs', 'Akciğerler', 'Pulmones',
    'Sağ akciğer üç, sol akciğer iki loblu olup sol tarafta kalbe yer açan bir çentik (incisura cardiaca) bulunur.',
    'Kana oksijen verir, karbondioksiti dışarı atar (gaz alışverişi).',
    'Göğüs boşluğunun iki yanında, kalbin iki tarafında.',
    [
      'Yaklaşık 480 milyon alveol içerir; açılıp yayıldığında toplam yüzey alanı yaklaşık 70 m² kadardır.',
      'Dinlenirken dakikada 12-20 kez nefes alıp veririz.',
      'Akciğerler kendi kaslarına sahip değildir; hareketi diyafram ve kaburga arası kaslar sağlar.',
    ],
    ['trachea', 'diaphragm', 'heart', 'ribs', 'pulmonary-arteries'], [0, 1.27, 0.02], 0.65, 0.3, 0.05,
  ),
  organ(
    'liver', 'Karaciğer', 'Hepar',
    'Karaciğer vücudun en büyük iç organı ve en büyük bezidir. Sağ üst karında, diyaframın altında yer alır.',
    'Safra üretir, besinleri işler, ilaç ve toksinleri temizler, glikojen depolar ve pıhtılaşma proteinlerini sentezler.',
    'Karnın sağ üst bölümünde, diyaframın altında.',
    [
      'Yaklaşık 1,4-1,5 kg ağırlığındadır ve 500’den fazla işlev yürüttüğü söylenir.',
      'Kısmen çıkarıldıktan sonra yeniden büyüyebilen nadir organlardan biridir.',
      'Her dakika içinden yaklaşık 1,5 litre kan geçer.',
    ],
    ['stomach', 'pancreas', 'portal-vein', 'diaphragm', 'vena-cava'], [-0.055, 1.12, 0.04], 0.55, -0.3, 0.1,
  ),
  organ(
    'stomach', 'Mide', 'Gaster',
    'Mide, yemek borusunun devamında sol üst karında yer alan J biçimli kaslı bir kesedir.',
    'Besinleri depolar, mide asidi ve enzimlerle sindirimi başlatır ve kasılarak karıştırır.',
    'Karnın sol üst bölümünde, diyaframın altında.',
    [
      'Boşken yaklaşık 75 mL, doluyken 1-1,5 litre veya daha fazlasına kadar genişleyebilir.',
      'Mide asidinin pH değeri yaklaşık 1,5-3,5 aralığındadır; mukus tabakası mideyi kendi asidinden korur.',
      'Mide iç yüzeyi her birkaç günde bir yenilenir.',
    ],
    ['esophagus', 'liver', 'pancreas', 'spleen', 'small-intestine'], [0.055, 1.07, 0.03], 0.5, 0.3, 0.08,
  ),
  organ(
    'pancreas', 'Pankreas', 'Pancreas',
    'Pankreas, midenin arkasında yer alan, hem sindirim enzimleri hem hormon üreten 12-15 cm uzunluğunda bir bezdir.',
    'Sindirim enzimleri (tripsin, lipaz, amilaz) salgılar; insülin ve glukagonla kan şekerini düzenler.',
    'Karnın üst arka bölümünde, midenin arkasında.',
    [
      'İnsülin, Langerhans adacıklarındaki beta hücrelerinde üretilir.',
      'Günde yaklaşık 1-1,5 litre pankreas suyu üretir.',
      'Adı, Yunanca ‘pan’ (hepsi) ve ‘kreas’ (et) sözcüklerinden gelir.',
    ],
    ['stomach', 'liver', 'spleen', 'small-intestine', 'portal-vein'], [0.01, 1.055, -0.01], 0.4, 0.3, 0.2,
  ),
  organ(
    'spleen', 'Dalak', 'Splen',
    'Dalak, sol üst karında, midenin ve diyaframın arkasında yer alan yumruk büyüklüğünde bir lenfatik organdır.',
    'Yaşlı ve hasarlı alyuvarları süzer, kan depolar ve bağışıklık yanıtına katkıda bulunur.',
    'Karnın sol üst arka bölümünde.',
    [
      'Yaklaşık 150-200 g ağırlığındadır.',
      'Alındığında (splenektomi) yaşam sürdürülebilir, ancak bazı bakteri enfeksiyonlarına duyarlılık artar.',
      'Künt karın travmalarında en sık yaralanan organlardan biridir.',
    ],
    ['stomach', 'kidneys', 'diaphragm', 'pancreas'], [0.115, 1.11, -0.045], 0.45, 0.8, 0.1,
  ),
  organ(
    'kidneys', 'Böbrekler', 'Renes',
    'Böbrekler, omurganın iki yanında, karın arka duvarında yer alan fasulye biçimli iki organdır. Sağ böbrek, karaciğer nedeniyle biraz daha aşağıdadır.',
    'Kanı süzer, atıkları idrarla uzaklaştırır; sıvı-elektrolit dengesini, tansiyonu ve alyuvar üretimini düzenler.',
    'Karnın arka duvarında, omurganın iki yanında.',
    [
      'Her böbrekte yaklaşık 1 milyon nefron bulunur.',
      'Günde yaklaşık 180 litre süzüntü oluşur; bunun büyük bölümü geri emilir ve yaklaşık 1-2 litre idrar atılır.',
      'Kalp debisinin yaklaşık beşte biri böbreklerden geçer.',
    ],
    ['renal-vessels', 'bladder', 'aorta', 'vena-cava', 'spleen'], [0, 1.065, -0.06], 0.6, 0.2, 0.1,
  ),
  organ(
    'small-intestine', 'İnce Bağırsak', 'Intestinum tenue',
    'İnce bağırsak, midenin devamı olan duodenum, jejunum ve ileumdan oluşan uzun bir tüptür ve besin emiliminin büyük bölümü burada gerçekleşir.',
    'Sindirimi tamamlar ve besinleri villus denen çıkıntılarla kana ve lenfe emer.',
    'Karnın orta bölümünde, kalın bağırsağın çerçevelediği alanda.',
    [
      'Yaşayan kişide yaklaşık 3-5 metre uzunluğundadır.',
      'Kıvrımlar, villus ve mikrovilluslar sayesinde emilim yüzeyi büyük ölçüde artar; güncel ölçümler yaklaşık 30 m² düzeyini işaret eder.',
      'Duodenum yaklaşık 25 cm ile en kısa bölümüdür.',
    ],
    ['stomach', 'large-intestine', 'pancreas', 'liver', 'portal-vein'], [0, 0.98, 0.045], 0.5, 0.2, 0.1,
  ),
  organ(
    'large-intestine', 'Kalın Bağırsak', 'Intestinum crassum',
    'Kalın bağırsak çekum, kolon (çıkan, enine, inen ve sigmoid), rektum ve anüsten oluşur ve ince bağırsağı çerçeve gibi sarar.',
    'Su ve elektrolitleri emer, dışkıyı oluşturur ve depolar.',
    'Karnın çevresinde, sağ alt kadrandan başlayıp sol alt kadranda rektuma uzanır.',
    [
      'Yaklaşık 1,5 m uzunluğundadır ama ince bağırsaktan daha geniş çaplıdır.',
      'Bağırsak mikrobiyotası trilyonlarca bakteri içerir; sayıları insan hücre sayısıyla aynı mertebededir.',
      'Apendiks, çekumun ucundan çıkan küçük bir kesedir ve lenfoid doku içerir.',
    ],
    ['small-intestine', 'bladder', 'portal-vein'], [0, 0.99, 0.04], 0.6, 0.15, 0.1,
  ),
  organ(
    'bladder', 'Mesane', 'Vesica urinaria',
    'Mesane, pelvis boşluğunda pubisin arkasında yer alan, idrarı depolayan kaslı bir kesedir.',
    'Böbreklerden gelen idrarı biriktirir ve işeme sırasında kasılarak boşaltır.',
    'Pelvis boşluğunda, kasık kemiğinin arkasında.',
    [
      'Yetişkin mesane kapasitesi yaklaşık 400-600 mL’dir; işeme isteği yaklaşık 200-300 mL’de başlar.',
      'Duvarı, gerilebilen özel bir epitel (ürotelyum) ile kaplıdır.',
      'İşeme refleksi sakral omurilik ve beyin sapı merkezlerince koordine edilir.',
    ],
    ['kidneys', 'pelvis', 'large-intestine'], [0, 0.878, 0.045], 0.4, 0.3, 0.2,
  ),
  organ(
    'diaphragm', 'Diyafram', 'Diaphragma',
    'Diyafram, göğüs ve karın boşluğunu ayıran kubbe biçimli kas-tendon tabakasıdır ve ana solunum kasıdır.',
    'Kasıldığında düzleşip aşağı iner, göğüs boşluğunu genişleterek nefes aldırır.',
    'Göğüs ile karın boşluğu arasında, alt kaburgalara tutunarak.',
    [
      'Sakin solunumun büyük bölümünden sorumludur.',
      'Hıçkırık, diyaframın istem dışı kasılması ve glottisin ani kapanmasıyla oluşur.',
      'Yemek borusu, aort ve alt ana toplardamar diyaframdaki açıklıklardan geçer.',
    ],
    ['lungs', 'liver', 'stomach', 'ribs', 'esophagus'], [0, 1.14, 0.0], 0.7, 0.3, 0.25,
  ),
  organ(
    'thyroid', 'Tiroid Bezi', 'Glandula thyroidea',
    'Tiroid, boyunda soluk borusunun önünde yer alan kelebek biçimli bir endokrin bezdir.',
    'T3 ve T4 hormonlarıyla metabolizma hızını, vücut ısısını ve büyümeyi düzenler.',
    'Boynun ön yüzünde, gırtlağın altında.',
    [
      'Yetişkinde yaklaşık 15-25 g ağırlığındadır.',
      'Hormon yapımı için iyota ihtiyaç duyar; iyot eksikliği guatra yol açabilir.',
      'Adı, Yunanca ‘thyreos’ (kalkan) sözcüğünden gelir.',
    ],
    ['trachea', 'carotid-arteries', 'jugular-veins', 'esophagus'], [0, 1.47, 0.035], 0.35, 0.0, 0.05,
  ),
  organ(
    'esophagus', 'Yemek Borusu', 'Oesophagus',
    'Yemek borusu, yutaktan mideye uzanan yaklaşık 25 cm uzunluğunda kaslı bir tüptür. Soluk borusunun ve kalbin arkasından geçer.',
    'Peristaltik dalgalarla lokmayı mideye ilettir.',
    'Boyundan karına, omurganın önünde.',
    [
      'Yaklaşık 25 cm uzunluğundadır.',
      'Yutma, peristaltik hareketlerle gerçekleştiği için baş aşağı yatarken bile mümkündür.',
      'Alt ucundaki sfinkter mide asidinin geri kaçışını engeller; yetersizliği reflüye yol açar.',
    ],
    ['stomach', 'trachea', 'diaphragm', 'aorta'], [0, 1.3, -0.01], 0.6, 0.3, 0.05,
  ),
  organ(
    'trachea', 'Soluk Borusu', 'Trachea',
    'Trakea, gırtlaktan başlayıp iki ana bronşa ayrılan yaklaşık 10-12 cm uzunluğunda bir borudur. Duvarı C biçimli kıkırdak halkalarla desteklenir.',
    'Havayı akciğerlere iletir; mukus ve silialar yabancı parçacıkları yukarı süpürür.',
    'Boynun ön orta hattında, gırtlaktan göğüs boşluğuna.',
    [
      'Yaklaşık 16-20 adet C biçimli kıkırdak halkası vardır.',
      'Arka duvarı kıkırdaksızdır ve yemek borusuna komşudur; lokma geçerken esneyebilir.',
      'Silialar, mukusu saniyede birkaç kez çırparak gırtlağa doğru taşır (mukosiliyer klirens).',
    ],
    ['lungs', 'esophagus', 'thyroid', 'vagus-nerve'], [0, 1.43, 0.025], 0.5, 0.3, 0.05,
  ),
];

/* ═══════════════ DAMAR SİSTEMİ (11) ═══════════════ */
const VASCULAR: AnatomyItem[] = [
  vasc(
    'aorta', 'Aort', 'Aorta',
    'Aort, sol ventrikülden çıkan vücudun en büyük arteridir. Çıkan aort, aort kavsi ve inen aort olarak ilerler.',
    'Oksijenli kanı tüm vücut arterlerine dağıtır.',
    'Kalpten çıkıp omurganın önünden karna iner.',
    [
      'Çapı yaklaşık 2,5-3 cm kadardır, bahçe hortumu kalınlığına yakındır.',
      'Elastik lifler bakımından zengin duvarı, her atımın basıncını yumuşatır.',
      'Aort kapağı her atımda açılıp kapanarak kanın kalbe geri kaçmasını engeller.',
    ],
    ['heart', 'vena-cava', 'carotid-arteries', 'renal-vessels', 'brachial-vessels', 'femoral-vessels'], [0.02, 1.25, 0.0], 0.8, 0.5, 0.1,
  ),
  vasc(
    'vena-cava', 'Ana Toplardamar', 'Vena cava',
    'Üst ve alt olmak üzere iki ana toplardamardır. Oksijeni azalmış kanı sağ atriyuma getirir.',
    'Vücuttan dönen kanı kalbe taşır.',
    'Omurganın sağ önünde, kalbin sağ atriyumuna açılır.',
    [
      'Alt vena kava, vücudun en büyük toplardamarıdır.',
      'Üst vena kava baş, boyun ve kollardan; alt vena kava vücudun alt yarısından kan toplar.',
      'Büyük toplardamarlarda kapakçık bulunmaz; kapakçıklar özellikle bacak venlerinde yer alır.',
    ],
    ['heart', 'aorta', 'jugular-veins', 'renal-vessels', 'portal-vein'], [-0.015, 1.2, 0.0], 0.8, 0.5, 0.1,
  ),
  vasc(
    'pulmonary-arteries', 'Akciğer Arterleri', 'Arteriae pulmonales',
    'Sağ ventrikülden çıkan pulmoner gövde, sağ ve sol dallara ayrılarak oksijeni azalmış kanı akciğerlere taşır.',
    'Kanı akciğerlerde gaz alışverişi için götürür.',
    'Kalbin üstünden iki akciğere uzanır.',
    [
      'Oksijeni azalmış kan taşıyan nadir arterlerdendir (diğeri göbek kordonundaki umbilikal arterdir).',
      'Pulmoner dolaşım, sistemik dolaşıma göre çok daha düşük basınçlıdır.',
      'Akciğerlerin içinde bronşlarla birlikte dallanır.',
    ],
    ['heart', 'lungs', 'pulmonary-veins'], [0.015, 1.3, 0.03], 0.5, 0.2, 0.1,
  ),
  vasc(
    'pulmonary-veins', 'Akciğer Venleri', 'Venae pulmonales',
    'Her akciğerden ikişer tane olmak üzere dört ven, oksijenli kanı sol atriyuma getirir.',
    'Gaz alışverişi yapmış oksijenli kanı kalbe taşır.',
    'Akciğer kökünden kalbin sol atriyumuna.',
    [
      'Vücutta oksijenli kan taşıyan tek venlerdir.',
      'Normalde dört adettir ancak anatomik varyasyonlar sık görülür.',
      'Atriyal fibrilasyon tedavisinde bazı kateter ablasyon işlemleri bu venlerin ağızlarını hedefler.',
    ],
    ['heart', 'lungs', 'pulmonary-arteries'], [0.03, 1.27, 0.0], 0.55, 0.3, 0.1,
  ),
  vasc(
    'carotid-arteries', 'Şah Damarı', 'Arteriae carotides',
    'Boynun iki yanında yükselen ortak karotis arterleri, beyne, yüze ve boyna kan taşır; dış ve iç karotise ayrılır.',
    'Beyne ve yüze oksijenli kan sağlar.',
    'Boynun yan yüzünde, aort kavsinden kafatasına.',
    [
      'Boyundaki nabzı bu arterde hissedebilirsiniz.',
      'Karotis sinüsündeki baroreseptörler kan basıncını algılar ve refleks olarak ayarlar.',
      'Beynin kan akımının büyük kısmı iç karotis ve vertebral arterlerden gelir.',
    ],
    ['aorta', 'jugular-veins', 'brain', 'thyroid', 'sternocleidomastoid'], [0.028, 1.52, 0.01], 0.45, 0.6, 0.05,
  ),
  vasc(
    'jugular-veins', 'Boyun Toplardamarları', 'Venae jugulares',
    'Baş ve boyundan kanı toplayıp subklavian vene ve üst vena kavaya ileten boyun toplardamarlarıdır.',
    'Beyinden ve yüzden kanı kalbe döndürür.',
    'Boynun iki yanında, şah damarının yanında.',
    [
      'İç juguler ven, boyundaki en büyük toplardamardır.',
      'Santral venöz kateterler sıklıkla iç juguler vene yerleştirilir.',
      'Boyun venlerinin dolgunluğu, muayenede kalp yetmezliğini değerlendirmeye yardımcıdır.',
    ],
    ['carotid-arteries', 'vena-cava', 'brain', 'sternocleidomastoid'], [0.03, 1.52, 0.0], 0.45, 0.6, 0.05,
  ),
  vasc(
    'coronary-arteries', 'Koroner Arterler', 'Arteriae coronariae',
    'Aort kökünden çıkan sağ ve sol koroner arterler, kalbin kendi kasını besler.',
    'Kalp kasına (miyokard) oksijenli kan taşır.',
    'Kalbin yüzeyinde, kalp kasını sararak.',
    [
      'Kalp kasının kan akımı çoğunlukla kalbin gevşediği diyastol sırasında gerçekleşir.',
      'Tıkanmaları miyokard enfarktüsüne (kalp krizi) yol açar.',
      'Çapları yalnızca yaklaşık 3-4 mm kadardır.',
    ],
    ['heart', 'aorta'], [0.04, 1.24, 0.07], 0.28, 0.2, 0.05,
  ),
  vasc(
    'renal-vessels', 'Böbrek Damarları', 'Vasa renalia',
    'Aorttan ayrılan renal arterler böbreğe kan götürür; renal venler süzülmüş kanı alt vena kavaya taşır.',
    'Böbreğe kan sağlar ve süzülmüş kanı dolaşıma geri verir.',
    'Karnın arka duvarında, aort ve vena kava ile böbrekler arasında.',
    [
      'Böbreklerden kalp debisinin yaklaşık beşte biri geçer.',
      'Sol renal ven, sağdan daha uzundur ve aortun önünden geçer.',
      'Böbrek naklinde bu damarlar alıcının iliyak damarlarına bağlanır.',
    ],
    ['kidneys', 'aorta', 'vena-cava'], [0, 1.065, -0.045], 0.5, 0.3, 0.1,
  ),
  vasc(
    'femoral-vessels', 'Femoral Damarlar', 'Vasa femoralia',
    'Kasık bölgesinden uyluk boyunca inen femoral arter ve ven, bacağın ana kan yoludur.',
    'Bacağa oksijenli kan taşır ve venöz kanı kalbe geri getirir.',
    'Kasıktan dize kadar uylukta, iç yüzde.',
    [
      'Femoral nabız kasık kıvrımında alınır; kateter girişi için sık kullanılan bir yoldur.',
      'Femoral arter yaralanmaları kısa sürede hayatı tehdit eden kanamaya yol açabilir.',
      'Uyluğun alt kısmında adduktör kanalından geçerek popliteal artere devam eder.',
    ],
    ['femur', 'adductors', 'sartorius', 'aorta'], [0.08, 0.72, 0.02], 0.9, 0.4, 0.05,
  ),
  vasc(
    'portal-vein', 'Kapı Toplardamarı', 'Vena portae hepatis',
    'Portal ven, bağırsaklardan, mideden, pankreastan ve dalaktan gelen kanı karaciğere taşır. Üst mezenterik ve splenik venlerin birleşmesiyle oluşur.',
    'Sindirim sisteminden emilen besinleri işlenmek üzere karaciğere ulaştırır.',
    'Karnın üst bölümünde, pankreasın arkasından karaciğer kapısına.',
    [
      'Karaciğer kan akımının büyük bölümünü (yaklaşık dörtte üçünü) sağlar.',
      'İki kılcal ağ arasında yer alan gerçek bir ‘kapı’ sistemi oluşturur.',
      'Siroz gibi hastalıklarda portal hipertansiyon gelişebilir.',
    ],
    ['liver', 'stomach', 'pancreas', 'spleen', 'small-intestine'], [-0.02, 1.07, 0.02], 0.45, 0.3, 0.1,
  ),
  vasc(
    'brachial-vessels', 'Kol Damarları', 'Vasa brachialia',
    'Koltuk altından dirseğe uzanan brakiyal arter ve eşlik eden venler, önkolda radyal ve ulnar dallara ayrılır.',
    'Kola ve ele kan taşır.',
    'Üst kolun iç yüzünde, koltuk altından dirseğe.',
    [
      'Tansiyon ölçülürken stetoskop dirsek çukurundaki brakiyal arter üzerine konur.',
      'Bilekteki nabız, radyal arterden alınır.',
      'Dirsek önündeki yüzeyel venler kan alma için sık kullanılır.',
    ],
    ['humerus', 'biceps-brachii', 'radius', 'ulna', 'aorta', 'brachial-plexus'], [0.24, 1.2, 0.01], 0.6, 0.4, 0.05,
  ),
];

/* ═══════════════ SİNİR SİSTEMİ VE BEYİN (10) ═══════════════ */
const NERVOUS: AnatomyItem[] = [
  nerv(
    'frontal-lobe', 'Frontal Lob', 'Lobus frontalis',
    'Frontal lob beynin en büyük lobudur ve alnın arkasında yer alır. Motor korteks ve prefrontal korteksi içerir.',
    'Planlama, karar verme, istemli hareket, konuşma üretimi ve kişiliğin düzenlenmesinden sorumludur.',
    'Beynin ön bölümünde, santral sulkusun önünde.',
    [
      'Prefrontal korteks, 20’li yaşların ortasına kadar olgunlaşmaya devam eder.',
      'Phineas Gage vakası, frontal lob hasarının kişilik değişimine yol açabileceğini gösteren klasik örnektir.',
      'Konuşma üretimiyle ilgili Broca alanı çoğu kişide sol frontal lobdadır.',
    ],
    ['parietal-lobe', 'temporal-lobe', 'brain'], [0, 1.675, 0.05], 0.38, 0.8, 0.1,
  ),
  nerv(
    'parietal-lobe', 'Parietal Lob', 'Lobus parietalis',
    'Parietal lob, frontal lobun arkasında, beynin tepesinde yer alır ve duyu bilgisini işler.',
    'Dokunma, ağrı, sıcaklık ve vücut konumu algısını işler; uzamsal yönelimi sağlar.',
    'Beynin üst ve arka bölümünde, santral sulkusun arkasında.',
    [
      'Birincil somatosensoriyel korteks bu lobda yer alır.',
      'Hasarı, vücudun bir yarısını yok sayma (hemispatial neglect) gibi tablolara yol açabilir.',
      'Sayısal ve uzamsal düşünme görevlerinde rol oynar.',
    ],
    ['frontal-lobe', 'occipital-lobe', 'temporal-lobe', 'brain'], [0, 1.7, -0.03], 0.38, 0.6, 0.15,
  ),
  nerv(
    'temporal-lobe', 'Temporal Lob', 'Lobus temporalis',
    'Temporal lob, şakakların altında, beynin yan alt bölümlerinde yer alır.',
    'İşitme, dil anlama, uzun süreli bellek ve yüz tanımada görev alır.',
    'Beynin yan alt kısmında, kulakların hizasında.',
    [
      'Bellek oluşumu için kritik olan hipokampus, temporal lobun içinde yer alır.',
      'Duygusal tepkilerde rol oynayan amigdala da temporal lobdadır.',
      'Birincil işitsel korteks, üst temporal girusta bulunur.',
    ],
    ['frontal-lobe', 'parietal-lobe', 'occipital-lobe', 'brain'], [0.06, 1.64, 0.0], 0.35, 1.2, 0.05,
  ),
  nerv(
    'occipital-lobe', 'Oksipital Lob', 'Lobus occipitalis',
    'Oksipital lob beynin en küçük lobudur ve kafanın arka ucunda yer alır. Görme merkezi burasıdır.',
    'Gözlerden gelen görsel bilgiyi işler.',
    'Beynin arka ucunda, beyinciğin üstünde.',
    [
      'Birincil görme korteksi (V1) kalkarin sulkus çevresinde yer alır.',
      'Hasarı, gözler sağlam olsa bile görme kaybına (kortikal körlük) yol açabilir.',
      'Her göz görme alanının karşı yarısı, karşı taraftaki oksipital lobda işlenir.',
    ],
    ['parietal-lobe', 'temporal-lobe', 'cerebellum', 'brain'], [0, 1.67, -0.07], 0.35, Math.PI, 0.1,
  ),
  nerv(
    'cerebellum', 'Beyincik', 'Cerebellum',
    'Beyincik, beyin sapının arkasında, oksipital lobun altında yer alan ve ‘küçük beyin’ anlamına gelen yapıdır.',
    'Hareketleri koordine eder, denge ve duruşu ayarlar, motor öğrenmeye katkıda bulunur.',
    'Kafatasının arka alt bölümünde.',
    [
      'Beyin hacminin yaklaşık %10’unu oluşturur ama nöronların çoğunluğunu içerir.',
      'Hasarı dengesiz ve koordinasyonsuz yürüyüşe (ataksi) yol açar.',
      'Adı Latince ‘küçük beyin’ demektir.',
    ],
    ['brainstem', 'occipital-lobe', 'spinal-cord', 'brain'], [0, 1.612, -0.066], 0.35, Math.PI, 0.1,
  ),
  nerv(
    'brainstem', 'Beyin Sapı', 'Truncus encephali',
    'Beyin sapı, mezensefalon, pons ve medulla oblongatadan oluşur ve beyni omuriliğe bağlar.',
    'Solunumu, kalp ritmini, kan basıncını ve uyanıklığı düzenler; çoğu kranyal sinirin çıkış merkezidir.',
    'Beynin altında, omuriliğe geçiş noktasında.',
    [
      '12 çift kranyal sinirin 10 çifti beyin sapından çıkar.',
      'Birçok ülkede beyin sapı ölümü, ölümün klinik ölçütü olarak kabul edilir.',
      'Motor ve duyu liflerinin çaprazlaştığı yer burasıdır; bu yüzden beynin bir yarısı vücudun karşı yarısını yönetir.',
    ],
    ['cerebellum', 'spinal-cord', 'vagus-nerve', 'skull'], [0, 1.6, -0.03], 0.35, 1.5, 0.05,
  ),
  nerv(
    'spinal-cord', 'Omurilik', 'Medulla spinalis',
    'Omurilik, omurga kanalı içinde beyin sapından L1-L2 düzeyine kadar uzanan sinir demetidir. 31 çift spinal sinir buradan çıkar.',
    'Beyin ile vücut arasında sinyal taşır ve basit refleksleri beyne gitmeden yönetir.',
    'Omurga kanalının içinde.',
    [
      'Yaklaşık 42-45 cm uzunluğunda ve parmak kalınlığındadır.',
      '31 çift spinal sinir vardır: 8 servikal, 12 torasik, 5 lomber, 5 sakral, 1 koksigeal.',
      'Diz kapağının altına vurulduğunda ortaya çıkan refleks, omurilik düzeyinde işlenir.',
    ],
    ['brainstem', 'cervical-spine', 'thoracic-spine', 'lumbar-spine', 'sciatic-nerve', 'brachial-plexus'], [0, 1.35, -0.075], 0.8, 2.4, 0.05,
  ),
  nerv(
    'brachial-plexus', 'Brakiyal Pleksus', 'Plexus brachialis',
    'Brakiyal pleksus, C5-T1 spinal sinirlerinden oluşan, boyundan koltuk altına uzanan bir sinir ağıdır.',
    'Omuz, kol, önkol ve elin kas hareketini ve duyusunu sağlar.',
    'Boyun kökünden koltuk altına.',
    [
      'Beş kökten (C5-T1) oluşur ve gövde, bölüm, kord ve dallar şeklinde sıralanır.',
      'Median, ulnar, radyal, muskülokutanöz ve aksiller sinirleri verir.',
      'Doğum travmaları veya kazalarda zedelenebilir (örneğin Erb felci).',
    ],
    ['spinal-cord', 'humerus', 'brachial-vessels', 'forearm-flexors'], [0.12, 1.43, -0.01], 0.55, 0.4, 0.1,
  ),
  nerv(
    'sciatic-nerve', 'Siyatik Sinir', 'Nervus ischiadicus',
    'Siyatik sinir, L4-S3 köklerinden oluşan vücudun en kalın siniridir. Kalçadan geçip uyluğun arkasından iner ve dizin üstünde tibial ve ortak peroneal sinirlere ayrılır.',
    'Uyluğun arka kaslarını, alt bacağın ve ayağın hareketini ve duyusunu sağlar.',
    'Kalçadan başlayıp uyluğun arka yüzünden dize iner.',
    [
      'Parmak kalınlığında olup vücudun en kalın ve en uzun siniridir.',
      'Disk fıtığı veya piriformis kasının sıkıştırması, belden bacağa yayılan ağrıya (siyatalji) yol açabilir.',
      'Gluteus maximus kasının altından geçer; bu yüzden kalça enjeksiyonları dış-üst bölgeye yapılır.',
    ],
    ['spinal-cord', 'lumbar-spine', 'sacrum', 'gluteus-maximus', 'hamstrings'], [0.075, 0.75, -0.03], 0.9, 2.7, 0.05,
  ),
  nerv(
    'vagus-nerve', 'Vagus Siniri (X. Kranyal Sinir)', 'Nervus vagus',
    'Vagus siniri, beyin sapından çıkıp boyun, göğüs ve karına uzanan ‘gezgin sinir’dir ve parasempatik sistemin ana yoludur.',
    'Kalp hızını yavaşlatır, sindirimi ve solunumu düzenler, gırtlak kaslarını sinirlendirir.',
    'Beyin sapından boyun boyunca göğüs ve karına inen uzun yol.',
    [
      'Adı, Latince ‘vagus’ (gezgin) sözcüğünden gelir.',
      'Kalp hızını yavaşlatan ‘dinlen ve sindir’ etkisinin başlıca yoludur.',
      'Vagus siniri uyarımı, bazı dirençli epilepsi ve depresyon tedavilerinde kullanılır.',
    ],
    ['brainstem', 'heart', 'esophagus', 'stomach', 'trachea', 'carotid-arteries'], [0.02, 1.4, 0.0], 0.7, 0.5, 0.05,
  ),
];

/* ═══════════════ DIŞA AKTARIMLAR ═══════════════ */
export const ANATOMY_ITEMS: readonly AnatomyItem[] = [
  ...SKIN,
  ...SKELETON,
  ...MUSCLES,
  ...ORGANS,
  ...VASCULAR,
  ...NERVOUS,
];

export const ANATOMY_BY_ID: Readonly<Record<string, AnatomyItem>> = ANATOMY_ITEMS.reduce<
  Record<string, AnatomyItem>
>((acc, it) => {
  acc[it.id] = it;
  return acc;
}, {});

export function getAnatomyItem(id: string): AnatomyItem | undefined {
  return ANATOMY_BY_ID[id];
}

export function getItemsBySystem(system: LayerKey): AnatomyItem[] {
  return ANATOMY_ITEMS.filter((i) => i.system === system);
}

/** Türkçe karakterlere duyarsız karşılaştırma için normalize eder (ı→i, ş→s, ğ→g...). */
export function normalizeTR(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');
}

/** Komut paleti için basit, sıralı arama (ad, Latince ad ve id üzerinde). */
export function searchAnatomy(query: string, limit = 8): AnatomyItem[] {
  const q = normalizeTR(query.trim());
  if (!q) return ANATOMY_ITEMS.slice(0, limit);
  const scored: { item: AnatomyItem; score: number }[] = [];
  for (const item of ANATOMY_ITEMS) {
    const tr = normalizeTR(item.nameTR);
    const lat = normalizeTR(item.nameLatin);
    const id = item.id.replace(/-/g, ' ');
    let score = -1;
    if (tr.startsWith(q)) score = 100;
    else if (lat.startsWith(q)) score = 90;
    else if (tr.includes(q)) score = 70;
    else if (lat.includes(q) || id.includes(q)) score = 60;
    if (score >= 0) scored.push({ item, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.item.nameTR.localeCompare(b.item.nameTR, 'tr'))
    .slice(0, limit)
    .map((s) => s.item);
}

/* Geliştirme sırasında: bozuk ilişki id'lerini yakala */
if (import.meta.env.DEV) {
  for (const it of ANATOMY_ITEMS) {
    for (const rid of it.related) {
      if (!ANATOMY_BY_ID[rid]) console.warn(`[anatomyData] "${it.id}" için bilinmeyen ilişkili id: "${rid}"`);
    }
    if (it.facts.length !== 3) console.warn(`[anatomyData] "${it.id}" tam 3 bilgi içermeli.`);
  }
}
