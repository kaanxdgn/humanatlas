"""
Z-Anatomy FBX nesne adlarını atlasın yapı id'lerine eşleyen kural tablosu (saf Python, Blender gerekmez).

Z-Anatomy ad eklerinin anlamı (gözlemlenen):
  .l / .r        gerçek mesh, sol / sağ
  (ek yok)       gerçek mesh, tek parça
  .g .j .t       grup boş nesneleri, işaret çizgileri, etiketler
  .i .s          ana kemiğin üstüne binen yüzey yama etiketleri (aynı geometri, atılır)
  .ol .or .el .er  kas başlangıç/bitiş (origin/insertion) etiketleri
  .o1l .e2r ...  kas başlangıç/bitiş işaretleri
"""
import re
from typing import Optional

BONE = '#e8e2d0'
TOOTH = '#f4f1e6'
CARTILAGE = '#cfd9e6'

# ───────── Ad normalizasyonu ─────────

def parse_name(raw: str):
    """(taban_ad, taraf, tür) döndürür. tür: 'main' | 'drop'. taraf: 'l' | 'r' | ''."""
    name = re.sub(r'\.\d{3}$', '', raw.strip())  # Blender'ın kopya soneki
    if re.search(r'^(cross section|take a picture)', name, re.I) or '?' in name:
        return name, '', 'drop'
    m = re.search(r'\.([^.]*)$', name)
    if not m:
        return name, '', 'main'
    ext = m.group(1)
    base = name[: m.start()]
    if ext in ('l', 'r'):
        return base, ext, 'main'
    if re.fullmatch(r'[a-z]{1,2}', ext) or re.fullmatch(r'[oe]\d+[lr]?', ext):
        return base, '', 'drop'
    return name, '', 'main'  # adın parçası olan nokta (örn. "Grey matter of medulla oblongata.")


# ───────── Kural tipi ─────────
# (regex, hedef_glb, id, renk)   hedef: skeleton | muscles | organs | vascular | nervous
Rule = tuple

ORD = r'(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)'

SKELETON_RULES: list = [
    (r'^(sinus of|anterior cells|middle cells|posterior cells|malleus|incus|stapes|arytenoid|corniculate|cricoid|thyroid cartilage|nasal|major alar|lateral process of nasal|sesamoid bones of foot)(?!.*bone$)', None, None, None),
    (r'(tooth|incisor|canine|premolar|molar)', 'skeleton', 'skull', TOOTH),
    (r'^(frontal|parietal|occipital|temporal|sphenoid|ethmoid|zygomatic|lacrimal|palatine) bone$|^(mandible|maxilla|vomer|hyoid bone|inferior nasal concha bone|nasal bone)$', 'skeleton', 'skull', BONE),
    (r'^(atlas|axis) \(c[12]\)$|^vertebra c\d$', 'skeleton', 'cervical-spine', BONE),
    (r'^vertebra t\d+$', 'skeleton', 'thoracic-spine', BONE),
    (r'^vertebra l\d$', 'skeleton', 'lumbar-spine', BONE),
    (r'^(sacrum|coccyx)$', 'skeleton', 'sacrum', BONE),
    (r'^' + ORD + r' rib$', 'skeleton', 'ribs', BONE),
    (r'^costal cartilage of', 'skeleton', 'ribs', CARTILAGE),
    (r'^(body of sternum|manubrium of sternum|xiphoid process)$', 'skeleton', 'sternum', BONE),
    (r'^clavicle$', 'skeleton', 'clavicle', BONE),
    (r'^scapula$', 'skeleton', 'scapula', BONE),
    (r'^humerus$', 'skeleton', 'humerus', BONE),
    (r'^radius$', 'skeleton', 'radius', BONE),
    (r'^ulna$', 'skeleton', 'ulna', BONE),
    (r'^(capitate|hamate|lunate|pisiform|scaphoid|trapezium|trapezoid|triquetrum) bone$|metacarpal bone$|phalanx of fi?n?g?e?r? ?o?f? ?hand$|phalanx of .* of hand$', 'skeleton', 'hand-bones', BONE),
    (r'^hip bone$', 'skeleton', 'pelvis', BONE),
    (r'^femur$', 'skeleton', 'femur', BONE),
    (r'^patella$', 'skeleton', 'patella', BONE),
    (r'^tibia$', 'skeleton', 'tibia', BONE),
    (r'^fibula$', 'skeleton', 'fibula', BONE),
    (r'^(calcaneus|talus|cuboid bone|navicular bone|(medial|intermediate|lateral) cuneiform bone)$|metatarsal bone$|phalanx of .* of foot$', 'skeleton', 'foot-bones', BONE),
]

MUSCLE_DROP = r'bursa|sheath|fascia|synovial|retinaculum|trochlea of|tarsus|common tendinous ring'
MUSCLE_TONES = ['#b5322c', '#c4433a', '#a62b30', '#cf5645']
MUSCLE_RULES: list = [
    (r'^diaphragm$', 'organs', 'diaphragm', '#b05048'),
    (r'pectoralis major', 'muscles', 'pectoralis-major', None),
    (r'deltoid', 'muscles', 'deltoid', None),
    (r'biceps brachii', 'muscles', 'biceps-brachii', None),
    (r'triceps brachii', 'muscles', 'triceps-brachii', None),
    (r'rectus abdominis', 'muscles', 'rectus-abdominis', None),
    (r'external abdominal oblique', 'muscles', 'external-oblique', None),
    (r'trapezius', 'muscles', 'trapezius', None),
    (r'latissimus dorsi', 'muscles', 'latissimus-dorsi', None),
    (r'gluteus maximus', 'muscles', 'gluteus-maximus', None),
    (r'rectus femoris|vastus|quadriceps', 'muscles', 'quadriceps', None),
    (r'biceps femoris|semitendinosus|semimembranosus', 'muscles', 'hamstrings', None),
    (r'gastrocnemius', 'muscles', 'gastrocnemius', None),
    (r'sartorius', 'muscles', 'sartorius', None),
    (r'sternocleidomastoid', 'muscles', 'sternocleidomastoid', None),
    (r'flexor carpi|flexor digitorum superficialis|flexor digitorum profundus|palmaris longus|pronator teres|flexor pollicis longus', 'muscles', 'forearm-flexors', None),
    (r'tibialis anterior', 'muscles', 'tibialis-anterior', None),
    (r'adductor (longus|brevis|magnus|minimus)|pectineus|gracilis', 'muscles', 'adductors', None),
]
MUSCLE_OTHER = ('muscles', 'other-muscles', '#8f2a2a')

VISCERA_RULES: list = [
    (r'lobe of (left|right) lung', 'organs', 'lungs', '#e8a1a8'),
    (r'^trachea$|main bronchus|lobar bronchus|intermediate bronchus', 'organs', 'trachea', '#cfe0f0'),
    (r'^liver$|^gallbladder$|^bile duct$', 'organs', 'liver', '#8a3a2a'),
    (r'^stomach$', 'organs', 'stomach', '#d9857a'),
    (r'^pancreas$|^pancreatic duct$', 'organs', 'pancreas', '#e0b25a'),
    (r'^kidney$|^renal pelvis$|^ureter$|suprarenal gland', 'organs', 'kidneys', '#9a3a3a'),
    (r'^(duodenum|jejunum|ileum)$', 'organs', 'small-intestine', '#e8a58a'),
    (r'(ascending|transverse|descending|sigmoid) colon|vermiform appendix|^caecum$|^rectum$|^anal canal$', 'organs', 'large-intestine', '#c9785a'),
    (r'^urinary bladder$|^urethra$', 'organs', 'bladder', '#e6c26a'),
    (r'^(thyroid gland|(superior|inferior) parathyroid gland)$', 'organs', 'thyroid', '#d96a6a'),
    (r'^oesophagus$', 'organs', 'esophagus', '#d98a7a'),
]
LYMPH_RULES: list = [(r'^spleen$', 'organs', 'spleen', '#7a2a4a')]

HEART_RULES: list = [
    (r'^(left|right) (ventricle|atrium)$|^heart$|interventricular septum|myocardium', 'organs', 'heart', '#c0262d'),
]

ARTERY = '#FF2D55'
VEIN = '#3D7BFF'
VASC_DROP = r'leaflet|valve|papillary|septomarginal|trabecul|chorda|cusp|lymph'
VASC_RULES: list = [
    (r'aorta|aortic arch', 'vascular', 'aorta', ARTERY),
    (r'vena cava', 'vascular', 'vena-cava', VEIN),
    (r'pulmonary (trunk|artery|arteries)', 'vascular', 'pulmonary-arteries', ARTERY),
    (r'pulmonary vein|^(anterior|posterior|apical|inferior|superior|middle|lingular).* vein of (left|right) lung|vein of (left|right) lung', 'vascular', 'pulmonary-veins', VEIN),
    (r'carotid artery', 'vascular', 'carotid-arteries', ARTERY),
    (r'jugular vein', 'vascular', 'jugular-veins', VEIN),
    (r'coronary|circumflex artery of heart|interventricular artery|cardiac vein', 'vascular', 'coronary-arteries', ARTERY),
    (r'renal (artery|vein)|intrarenal', 'vascular', 'renal-vessels', ARTERY),
    (r'(femoral|iliac) (artery|vein)', 'vascular', 'femoral-vessels', ARTERY),
    (r'portal vein|splenic vein|mesenteric vein', 'vascular', 'portal-vein', VEIN),
    (r'brachial (artery|vein)|axillary (artery|vein)|subclavian|(radial|ulnar) artery|cephalic vein|basilic vein', 'vascular', 'brachial-vessels', ARTERY),
]

BRAIN_LOBES = [
    ('frontal-lobe', r'frontal|precentral|orbital gyri|straight gyrus|gyrus rectus|cingulate|paracentral|olfactory'),
    ('parietal-lobe', r'parietal|postcentral|supramarginal|angular gyrus|precuneus'),
    ('temporal-lobe', r'temporal|insula|hippocamp|fusiform'),
    ('occipital-lobe', r'occipital|lingual gyrus|cuneus|calcarine'),
    ('cerebellum', r'cerebell|lobule|vermis|lingula|tonsil of|folium|culmen|declive|tuber of|nodule|uvula of'),
    ('brainstem', r'^(medulla oblongata|pons|midbrain|pyramid of medulla oblongata)$'),
]
LOBE_COLOR = {
    'frontal-lobe': '#8E6BFF', 'parietal-lobe': '#3DC9F5', 'temporal-lobe': '#FF7AA8',
    'occipital-lobe': '#FFCF5A', 'cerebellum': '#5CF0B0', 'brainstem': '#E8E2FF',
}
NERVE_PURPLE = '#B388FF'
NERVOUS_RULES: list = [
    (r'^vagus nerve', 'nervous', 'vagus-nerve', NERVE_PURPLE),
    (r'^sciatic nerve$|^tibial nerve$|^common fibular nerve$', 'nervous', 'sciatic-nerve', NERVE_PURPLE),
    (r'brachial plexus|^(median|ulnar|radial|axillary|musculocutaneous) nerve$', 'nervous', 'brachial-plexus', NERVE_PURPLE),
    (r'^white matter of spinal cord$|^grey matter of spinal cord$|cauda equina|filum terminale|conus medullaris', 'nervous', 'spinal-cord', NERVE_PURPLE),
]
NERVE_OTHER_KEEP = r'nerve|plexus|ganglion|ramus|root of'
NERVE_OTHER_DROP = r'nucle|tract|fasciculus|funiculus|sulcus|commissure|thalam|horn|canal|eyeball|cochlea|auditory|chamber'

SOURCES = {
    'SkeletalSystem100.fbx': 'skeleton',
    'MuscularSystem100.fbx': 'muscles',
    'VisceralSystem100.fbx': 'viscera',
    'LymphoidOrgans100.fbx': 'lymph',
    'CardioVascular41.fbx': 'vascular',
    'NervousSystem100.fbx': 'nervous',
}


def _first(rules, text):
    for rx, target, id_, tint in rules:
        if re.search(rx, text, re.I):
            return target, id_, tint
    return None


def classify(source: str, raw: str):
    """(hedef_glb, id, renk) veya None (at). source: SOURCES değerlerinden biri."""
    base, side, kind = parse_name(raw)
    if kind == 'drop':
        return None
    t = base.strip()
    tl = t.lower()

    if source == 'skeleton':
        hit = _first(SKELETON_RULES, tl)
        return hit if hit and hit[0] else None

    if source == 'muscles':
        if re.search(MUSCLE_DROP, tl):
            return None
        hit = _first(MUSCLE_RULES, tl)
        if hit:
            tint = hit[2]
            if tint is None:
                tint = MUSCLE_TONES[sum(map(ord, hit[1])) % len(MUSCLE_TONES)]
            return hit[0], hit[1], tint
        return MUSCLE_OTHER

    if source == 'viscera':
        return _first(VISCERA_RULES, tl)

    if source == 'lymph':
        return _first(LYMPH_RULES, tl)

    if source == 'vascular':
        if re.search(VASC_DROP, tl):
            heart = _first(HEART_RULES, tl)
            return heart
        heart = _first(HEART_RULES, tl)
        if heart:
            return heart
        hit = _first(VASC_RULES, tl)
        if hit:
            tint = VEIN if re.search(r'vein|sinus|vena', tl) else hit[2]
            return hit[0], hit[1], tint
        if re.search(r'vein|sinus|vena|venous', tl):
            return 'vascular', 'other-veins', VEIN
        return 'vascular', 'other-arteries', ARTERY

    if source == 'nervous':
        if re.search(r'sulcus', tl) and not re.search(r'gyr', tl):
            return None
        hit = _first(NERVOUS_RULES, tl)
        if hit:
            return hit
        if re.search(r'gyr|lobule|pole|plane|insula|cerebell|medulla oblongata|^pons$|^midbrain$|vermis|tonsil|lingula', tl) and not re.search(r'nucle|tract|horn', tl):
            lobe = 'parietal-lobe'
            for lid, rx in BRAIN_LOBES:
                if re.search(rx, tl):
                    lobe = lid
                    break
            return 'nervous', lobe, LOBE_COLOR[lobe]
        if re.search(NERVE_OTHER_DROP, tl):
            return None
        if re.search(NERVE_OTHER_KEEP, tl):
            return 'nervous', 'other-nerves', NERVE_PURPLE
        return None

    raise ValueError(source)
