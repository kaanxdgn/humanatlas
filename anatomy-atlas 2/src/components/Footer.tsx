import { ArrowUp } from 'lucide-react';
import { scrollToTarget } from '@/hooks/useLenis';
import MagneticButton from './MagneticButton';

const CONTROLS: readonly { keys: string; action: string }[] = [
  { keys: 'Sürükle', action: 'Bedeni döndür' },
  { keys: 'Tıkla', action: 'Yapıyı seç, bilgi panelini aç' },
  { keys: 'Esc', action: 'Paneli kapat' },
  { keys: 'Ctrl / ⌘ + K', action: 'Yapı ara' },
];

export default function Footer() {
  return (
    <footer
      id="site-footer"
      className="relative z-10 px-6 pb-10 pt-40 sm:px-10"
      style={{ background: 'linear-gradient(to top, #05070D 55%, rgba(5,7,13,0.92) 75%, transparent)' }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="glass-strong rounded-3xl p-8 sm:p-10">
          <p className="eyebrow">Önemli not</p>
          <p className="mt-3 max-w-3xl font-display text-2xl font-light leading-snug text-white sm:text-3xl">
            Bu site eğitim amaçlıdır, tıbbi tavsiye değildir.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
            Anatomik modeller şematiktir; ölçüler ve konumlar yaklaşıktır. Sağlığınızla ilgili sorularınız için lütfen bir
            hekime başvurun.
          </p>

          <dl className="mt-10 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {CONTROLS.map((c) => (
              <div key={c.keys} className="border-t border-white/10 pt-3">
                <dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{c.keys}</dt>
                <dd className="mt-1 text-sm text-white/65">{c.action}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="mt-6 max-w-4xl text-[10px] leading-relaxed text-white/35">
          3B modeller:{' '}
          <a href="https://www.z-anatomy.com/" target="_blank" rel="noreferrer" className="underline decoration-white/20 underline-offset-2 hover:text-white/70">Z-Anatomy</a>{' '}
          ve{' '}
          <a href="https://lifesciencedb.jp/bp3d/" target="_blank" rel="noreferrer" className="underline decoration-white/20 underline-offset-2 hover:text-white/70">BodyParts3D</a>{' '}
          (© DBCLS) kaynaklarından türetilmiştir ·{' '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className="underline decoration-white/20 underline-offset-2 hover:text-white/70">CC BY-SA 4.0</a>{' '}
          /{' '}
          <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/" target="_blank" rel="noreferrer" className="underline decoration-white/20 underline-offset-2 hover:text-white/70">CC BY-SA 2.1 JP</a>
          {' '}· Değişiklik yapıldı: sadeleştirildi, yeniden adlandırıldı, ölçeklendi. Türev modeller aynı lisansla paylaşılır.
        </p>

        <div className="mt-8 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <p className="mono-label">© {new Date().getFullYear()} İnsan Anatomisi Atlası · Katman katman</p>
          <MagneticButton
            variant="ghost"
            ariaLabel="Sayfanın başına dön"
            onClick={() => scrollToTarget(0, { duration: 2.4 })}
          >
            <ArrowUp size={14} aria-hidden="true" />
            Başa dön
          </MagneticButton>
        </div>
      </div>
    </footer>
  );
}
