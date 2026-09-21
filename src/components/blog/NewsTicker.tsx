import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TickerItem {
  id: string;
  title: string;
  slug?: string;
  category?: string;
}

const NewsTicker = ({ items, currentLang }: { items: TickerItem[]; currentLang: string }) => {
  const [now, setNow] = useState(new Date());
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Respect user motion preference: auto-pause when reduced motion is set.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) setPaused(true);
    const handler = (e: MediaQueryListEvent) => setPaused(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (items.length === 0) return null;
  const loop = [...items, ...items];

  return (
    <section
      aria-label="Últimas manchetes em tempo real"
      className="bg-[hsl(var(--news-navy-deep))] text-white border-b border-white/10"
    >
      <div className="news-container flex items-center gap-3 sm:gap-4 h-10 overflow-hidden">
        <span
          className="news-kicker bg-[hsl(var(--news-accent))] text-white px-3 py-1 flex-shrink-0"
          aria-label="Ao vivo"
        >
          AO VIVO
        </span>
        <span className="news-kicker text-white/60 hidden md:inline flex-shrink-0">
          {now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </span>

        <div
          className="flex-1 overflow-hidden relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          aria-live="off"
        >
          <div
            ref={trackRef}
            className="news-ticker-track flex gap-10 whitespace-nowrap"
            style={{ animationPlayState: paused ? 'paused' : 'running' }}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            {loop.map((it, i) => (
              <a
                key={`${it.id}-${i}`}
                href={`/${currentLang}/article/${it.slug || it.id}`}
                aria-hidden={i >= items.length ? true : undefined}
                tabIndex={i >= items.length ? -1 : 0}
                className="news-kicker text-white/85 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--news-navy-deep))] rounded"
              >
                <span className="text-[hsl(var(--news-accent))] mr-2" aria-hidden="true">
                  ●
                </span>
                {it.title}
              </a>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          aria-label={paused ? 'Retomar manchetes' : 'Pausar manchetes'}
          className="flex-shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>
      </div>
    </section>
  );
};

export const useNewsTicker = (limit = 12) => {
  const [items, setItems] = useState<TickerItem[]>([]);
  useEffect(() => {
    let mounted = true;
    supabase
      .from('articles')
      .select('id, title, slug, category')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        if (mounted && data) setItems(data as TickerItem[]);
      });
    return () => {
      mounted = false;
    };
  }, [limit]);
  return items;
};

export default NewsTicker;
