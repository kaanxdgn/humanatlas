/**
 * Scroll'dan sahneye akan, React dışı (mutable) paylaşılan durum.
 * Her karede okunduğu için store'a konmaz (re-render oluşturmasın).
 */
export const scrollState = {
  /** 0..1 — sayfanın toplam scroll ilerlemesi */
  progress: 0,
  /** Lenis hızı (px/kare civarı, işaretli) */
  velocity: 0,
  /**
   * Kamera dolly ofseti: 1 = sayfa en üstte (uzak), 0 = hero bitti (normal mesafe).
   * CameraRig, yarıçapı (1 + dolly * DOLLY_RANGE) ile çarpar.
   */
  dolly: 1,
};

export const DOLLY_RANGE = 0.6;
