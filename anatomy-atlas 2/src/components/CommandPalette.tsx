import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, Search } from 'lucide-react';
import {
  getAnatomyItem,
  normalizeTR,
  searchAnatomy,
  type AnatomyItem,
} from '@/data/anatomyData';
import { SYSTEMS, SYSTEM_BY_KEY, type SystemConfig } from '@/data/systemsConfig';
import { getLenis } from '@/hooks/useLenis';
import { goToSection } from '@/hooks/useScrollSystemSync';
import { useAtlasStore } from '@/store/useAtlasStore';

/** Arama kutusu boşken gösterilen öneriler */
const FEATURED: readonly string[] = [
  'skull',
  'heart',
  'brain',
  'femur',
  'lungs',
  'aorta',
  'biceps-brachii',
  'spinal-cord',
];

type Result =
  | { kind: 'item'; key: string; item: AnatomyItem }
  | { kind: 'section'; key: string; sys: SystemConfig };

const toItem = (item: AnatomyItem): Result => ({ kind: 'item', key: item.id, item });

/** Ctrl/⌘ + K ile açılan komut paleti: yapı veya sistem bölümü ara, Enter ile git. */
export default function CommandPalette() {
  const open = useAtlasStore((s) => s.paletteOpen);
  const loaderDone = useAtlasStore((s) => s.loaderDone);
  const reduced = useAtlasStore((s) => s.reducedMotion);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Genel kısayol */
  useEffect(() => {
    if (!loaderDone) return;
    const onKey = (e: KeyboardEvent | globalThis.KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        useAtlasStore.getState().togglePalette();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loaderDone]);

  /* Açılış: sayfa kaydırmayı durdur, girişe odaklan; kapanış: geri yükle */
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery('');
    setIndex(0);
    getLenis()?.stop();
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      window.clearTimeout(t);
      getLenis()?.start();
      if (prev && prev.isConnected) prev.focus({ preventScroll: true });
    };
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const q = normalizeTR(query.trim());
    if (!q) {
      return FEATURED.flatMap((id) => {
        const item = getAnatomyItem(id);
        return item ? [toItem(item)] : [];
      });
    }
    const sections: Result[] = SYSTEMS.filter(
      (s) => normalizeTR(s.labelTR).includes(q) || normalizeTR(s.labelLatin).includes(q),
    )
      .slice(0, 2)
      .map((sys) => ({ kind: 'section', key: `section-${sys.key}`, sys }));
    return [...sections, ...searchAnatomy(query, 9).map(toItem)].slice(0, 10);
  }, [query]);

  /* Aktif seçeneği görünür tut */
  useEffect(() => {
    if (open) document.getElementById(`palette-opt-${index}`)?.scrollIntoView({ block: 'nearest' });
  }, [index, open, results]);

  const close = (): void => useAtlasStore.getState().setPaletteOpen(false);

  const choose = (r: Result | undefined): void => {
    if (!r) return;
    if (r.kind === 'item') {
      useAtlasStore.getState().selectStructure(r.item.id); // paleti de kapatır
    } else {
      close();
      goToSection(r.sys.section);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    const n = results.length;
    if (e.key === 'Escape') {
      e.preventDefault(); // bilgi panelinin ESC'si yalnızca paleti kapatsın
      e.stopPropagation();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (n) setIndex((i) => (i + 1) % n);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (n) setIndex((i) => (i - 1 + n) % n);
    } else if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      choose(results[index]);
    } else if (e.key === 'Tab') {
      e.preventDefault(); // odak tuzağı: tek odaklanabilir öğe giriş kutusu
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="palette"
          className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
        >
          <div className="absolute inset-0 bg-bg0/70 backdrop-blur-md" onClick={close} aria-hidden="true" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Yapı ara"
            initial={{ y: reduced ? 0 : -16, scale: reduced ? 1 : 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: reduced ? 0 : -8, scale: 1, opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="glass-strong relative w-full max-w-xl overflow-hidden rounded-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4">
              <Search size={18} aria-hidden="true" className="shrink-0 text-accent" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIndex(0);
                }}
                onKeyDown={onKeyDown}
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-activedescendant={results.length ? `palette-opt-${index}` : undefined}
                aria-autocomplete="list"
                aria-label="Yapı adı yazın"
                placeholder="Yapı ara: kalp, femur, beyin…"
                autoComplete="off"
                spellCheck={false}
                className="h-14 flex-1 bg-transparent text-base font-light text-white outline-none placeholder:text-white/35"
              />
              <kbd className="rounded-md border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-white/50">Esc</kbd>
            </div>

            <span className="sr-only" role="status" aria-live="polite">
              {results.length} sonuç
            </span>

            {results.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-white/50">“{query}” için sonuç bulunamadı.</p>
            ) : (
              <ul
                id="palette-list"
                role="listbox"
                aria-label="Sonuçlar"
                data-lenis-prevent
                className="max-h-[52vh] overflow-y-auto overscroll-contain p-2"
              >
                {results.map((r, i) => {
                  const selected = i === index;
                  const sys = r.kind === 'item' ? SYSTEM_BY_KEY[r.item.system] : r.sys;
                  const title = r.kind === 'item' ? r.item.nameTR : `${r.sys.labelTR} bölümü`;
                  const sub = r.kind === 'item' ? r.item.nameLatin : r.sys.labelLatin;
                  return (
                    <li
                      key={r.key}
                      id={`palette-opt-${i}`}
                      role="option"
                      aria-selected={selected}
                      onMouseMove={() => setIndex(i)}
                      onMouseDown={(e) => e.preventDefault()} // girişten odak kaymasın
                      onClick={() => choose(r)}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                        selected ? 'bg-white/10' : ''
                      }`}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: sys.accent, boxShadow: `0 0 8px ${sys.accent}` }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-white">{title}</span>
                        <span className="block truncate text-[11px] italic text-white/50">{sub}</span>
                      </span>
                      <span className="mono-label hidden shrink-0 sm:block">
                        {r.kind === 'item' ? sys.labelTR : 'Bölüme git'}
                      </span>
                      {selected && <CornerDownLeft size={14} aria-hidden="true" className="shrink-0 text-white/60" />}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5">
              <span className="mono-label">↑ ↓ gezin · Enter seç</span>
              <span className="mono-label">{results.length} sonuç</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
