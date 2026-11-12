import { Component, type ReactNode } from 'react';
import { GlbLayer, useGlbAvailability, type GlbLayerProps } from './glb';
import type { LayerDrive } from './useAnatomyVisual';

export type GlbStyle = Omit<GlbLayerProps, 'file' | 'drive'>;

/** GLB yüklenirken/ayrıştırılırken hata olursa prosedürel modele döner. */
export class GlbBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(err: Error): void {
    console.warn('[atlas] GLB yüklenemedi, prosedürel modele dönülüyor:', err.message);
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface LayerSourceProps {
  /** public/models/<file>.glb (uzantısız) */
  file: string;
  drive: LayerDrive;
  /** GLB materyal ayarları (renk, emissive, opaklık…) */
  glb?: GlbStyle;
  /** Prosedürel (varsayılan) model */
  children: ReactNode;
}

/**
 * Katman kaynağı seçici:
 *  - dosya yoksa            → prosedürel model (children)
 *  - dosya varsa            → GLB, hata olursa prosedürel
 *  - kontrol sürerken        → hiçbir şey (yanıp sönmeyi önler)
 */
export default function LayerSource({ file, drive, glb, children }: LayerSourceProps) {
  const state = useGlbAvailability(file);
  if (state === 'checking') return null;
  if (state === 'no') return <>{children}</>;
  return (
    <GlbBoundary fallback={children}>
      <GlbLayer file={file} drive={drive} {...glb} />
    </GlbBoundary>
  );
}
