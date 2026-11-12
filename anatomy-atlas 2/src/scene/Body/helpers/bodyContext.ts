import { createContext, useContext } from 'react';
import type { LayerKey } from '@/data/systemsConfig';

/**
 * KOORDİNAT SÖZLEŞMESİ (tüm katmanlar buna uymalı):
 *  - 1 birim = 1 metre. Ayak tabanı y = 0, tepe ≈ BODY_HEIGHT.
 *  - Beden +Z yönüne bakar (kamera +Z'den bakar).
 *  - Anatomik SAĞ = −X, anatomik SOL = +X.
 */
export const BODY_HEIGHT = 1.75;

/** Her katmanın anlık "varlık" seviyesi (0 = yok, 1 = tam). GSAP tweenler. */
export type LayerLevels = Record<LayerKey, number>;

/** Hover / seçim / odak vurgusu. Katmanlar her karede okur. */
export interface Emphasis {
  hoveredId: string | null;
  selectedId: string | null;
  relatedIds: ReadonlySet<string>;
  /** Odak modunda öne çıkarılacak id'ler */
  highlightIds: ReadonlySet<string>;
  /** 0..1 — diğer yapıların ne kadar soluklaşacağı */
  focusAmount: number;
  /** 0..1 — seçim izolasyonu: seçili yapı dışındakiler tamamen gizlenir. */
  isolate: number;
}

export interface BodyShared {
  levels: LayerLevels;
  emphasis: Emphasis;
}

export const createLayerLevels = (): LayerLevels => ({
  skin: 0,
  skeleton: 0,
  muscular: 0,
  organs: 0,
  vascular: 0,
  nervous: 0,
});

export const createEmphasis = (): Emphasis => ({
  hoveredId: null,
  selectedId: null,
  relatedIds: new Set<string>(),
  highlightIds: new Set<string>(),
  focusAmount: 0,
  isolate: 0,
});

export const BodyContext = createContext<BodyShared | null>(null);

export function useBodyShared(): BodyShared {
  const ctx = useContext(BodyContext);
  if (!ctx) throw new Error('useBodyShared yalnızca <HumanBody> içinde kullanılabilir.');
  return ctx;
}
