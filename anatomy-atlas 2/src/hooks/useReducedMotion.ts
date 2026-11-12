import { useEffect, useSyncExternalStore } from 'react';
import { useAtlasStore } from '@/store/useAtlasStore';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(callback: () => void): () => void {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}
const getSnapshot = (): boolean => window.matchMedia(QUERY).matches;
const getServerSnapshot = (): boolean => false;

/** Kullanıcının hareket azaltma tercihini okur ve store'a yansıtır. */
export function useReducedMotion(): boolean {
  const reduced = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    useAtlasStore.getState().setReducedMotion(reduced);
  }, [reduced]);
  return reduced;
}
