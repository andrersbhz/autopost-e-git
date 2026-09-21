import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/hooks/useI18n';
import BlogHeader from '@/components/blog/BlogHeader';
import BlogFooter from '@/components/blog/BlogFooter';
import CategorySection from '@/components/blog/CategorySection';
import AdSlot from '@/components/blog/AdSlot';

import NewsCard from '@/components/blog/NewsCard';
import NewsTicker, { useNewsTicker } from '@/components/blog/NewsTicker';
import { Helmet } from 'react-helmet-async';
import { ChevronRight, ChevronLeft, Clock, Pause, Play } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Preloader from '@/components/Preloader';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { formatRelative } from '@/lib/date';
import { isVideoUrl } from '@/lib/utils';

const CATEGORY_ACCENTS: Record<string, string> = {
  default: 'hsl(var(--news-accent))',
  notícias: '#C4170C',
  noticias: '#C4170C',
  esportes: '#06AA48',
  entretenimento: '#FF8000',
  tecnologia: '#0669B2',
  saúde: '#00A1AB',
  saude: '#00A1AB',
};

const getAccent = (cat: string) => {
  const k = cat.toLowerCase();
  return (
    Object.entries(CATEGORY_ACCENTS).find(([key]) => k.includes(key))?.[1] ??
    CATEGORY_ACCENTS.default
  );
};

const BlogHome = () => {
  const { lang } = useParams();
  const { currentLang } = useI18n();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const tickerItems = useNewsTicker(15);

  // Respect prefers-reduced-motion: skip autoplay for those users.
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const autoplay = useRef(
    Autoplay({ delay: 6000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, duration: 30 },
    reducedMotion ? [] : [autoplay.current],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(!reducedMotion);
  const sliderRef = useRef<HTMLDivElement>(null);

  const onSelect = useCallback(() => {
    if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  const togglePlay = useCallback(() => {
    if (!emblaApi) return;
    const ap = emblaApi.plugins().autoplay;
    if (!ap) return;
    if (ap.isPlaying()) {
      ap.stop();
      setIsPlaying(false);
    } else {
      ap.play();
      setIsPlaying(true);
    }
  }, [emblaApi]);

  // Keyboard nav: left/right/home/end + space to toggle autoplay.
  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollNext();
      } else if (e.key === 'Home') {
        e.preventDefault();
        scrollTo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        scrollTo(Math.max(0, (emblaApi?.scrollSnapList().length ?? 1) - 1));
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    },
    [emblaApi, scrollPrev, scrollNext, scrollTo, togglePlay],
  );

  // Pause autoplay when the slider area receives focus, resume on blur.
  useEffect(() => {
    const node = sliderRef.current;
    if (!node || !emblaApi) return;
    const ap = emblaApi.plugins().autoplay;
    if (!ap) return;
    const onFocusIn = () => ap.stop();
    const onFocusOut = (e: FocusEvent) => {
      if (!node.contains(e.relatedTarget as Node) && isPlaying) ap.play();
    };
    node.addEventListener('focusin', onFocusIn);
    node.addEventListener('focusout', onFocusOut);
    return () => {
      node.removeEventListener('focusin', onFocusIn);
      node.removeEventListener('focusout', onFocusOut);
    };
  }, [emblaApi, isPlaying]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Only show the full preloader on the very first load. When switching
      // language via the flag selector, keep current articles visible so the
      // UI doesn't flash like a full page reload.
      setLoading((prev) => (prev ? true : false));
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, slug, excerpt, category, featured_image_url, created_at, published_at, author_id')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (!mounted) return;
      if (error) console.error(error);
      setArticles(data || []);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [lang, currentLang]);


  const featured = useMemo(() => articles.slice(0, 5), [articles]);
  const sidebar = useMemo(() => {
    const featuredIds = new Set(articles.slice(0, 5).map((a) => a.id));
    const rest = articles.filter((a) => !featuredIds.has(a.id));
    const pool = rest.length > 0 ? rest : articles;
    // pick latest across all categories, ensuring variety when possible
    const seenCats = new Set<string>();
    const varied: any[] = [];
    const leftover: any[] = [];
    for (const a of pool) {
      const cat = (a.category || 'Geral').toLowerCase();
      if (!seenCats.has(cat)) {
        seenCats.add(cat);
        varied.push(a);
      } else {
        leftover.push(a);
      }
    }
    return [...varied, ...leftover].slice(0, 6);
  }, [articles]);
  const grouped = useMemo(() => {
    return articles.reduce<Record<string, any[]>>((acc, a) => {
      const cat = a.category || 'Geral';
      (acc[cat] ||= []).push(a);
      return acc;
    }, {});
  }, [articles]);

  if (loading) return <Preloader message="Sincronizando as últimas notícias..." />;

  const siteTitle = 'A3 Portal — Notícias, Esportes e Entretenimento';
  const siteDesc =
    'Portal de notícias A3: últimas notícias, esportes, tecnologia, entretenimento e mais — atualizado em tempo real.';
  const totalSlides = featured.length;

  return (
    <div className="min-h-dvh bg-[hsl(var(--news-paper))] text-[hsl(var(--news-ink))] font-news antialiased">
      <Helmet>
        <title>{siteTitle}</title>
        <meta name="description" content={siteDesc} />
        <link rel="canonical" href={window.location.origin + window.location.pathname} />
      </Helmet>

      <BlogHeader />
      <NewsTicker items={tickerItems} currentLang={currentLang} />

      <main id="main-content" className="news-container py-6 lg:py-10">
        {articles.length === 0 ? (
          <div className="py-24 text-center">
            <h2 className="news-display text-5xl uppercase text-[hsl(var(--news-navy))]">
              Sem manchetes no momento
            </h2>
            <p className="text-[hsl(var(--news-muted))] mt-3">
              Novas notícias aparecerão aqui assim que publicadas.
            </p>
          </div>
        ) : (
          <>
            {/* HERO: slider + sidebar */}
            <section className="mb-10 sm:mb-12" aria-label="Manchetes em destaque">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                {/* Accessible Slider */}
                <div
                  ref={sliderRef}
                  className="lg:col-span-8 relative group"
                  role="region"
                  aria-roledescription="carrossel"
                  aria-label="Notícias em destaque"
                  tabIndex={0}
                  onKeyDown={handleKey}
                >
                  <div className="overflow-hidden bg-[hsl(var(--news-navy-deep))]" ref={emblaRef}>
                    <div className="flex" aria-live="polite" aria-atomic="false">
                      {featured.map((article, i) => {
                        const active = i === selectedIndex;
                        return (
                          <div
                            key={article.id}
                            role="group"
                            aria-roledescription="slide"
                            aria-label={`${i + 1} de ${totalSlides}: ${article.title}`}
                            aria-hidden={!active}
                            className="flex-[0_0_100%] min-w-0 relative"
                          >
                            <Link
                              to={`/${currentLang}/article/${article.slug || article.id}`}
                              tabIndex={active ? 0 : -1}
                              className="block relative focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[hsl(var(--news-accent))] focus-visible:ring-inset"
                            >
                              <div className="relative w-full bg-[hsl(var(--news-navy-deep))] flex items-center justify-center overflow-hidden max-h-[80vh]">
                                {isVideoUrl(article.featured_image_url) ? (
                                  <video
                                    src={article.featured_image_url}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    preload={i === 0 ? 'auto' : 'metadata'}
                                    className="w-full h-auto max-h-[80vh] object-contain news-card-img"
                                  />
                                ) : (
                                  <img
                                    src={
                                      article.featured_image_url ||
                                      'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d'
                                    }
                                    alt={article.title}
                                    loading={i === 0 ? 'eager' : 'lazy'}
                                    className="w-full h-auto max-h-[80vh] object-contain news-card-img"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d';
                                    }}
                                  />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                                <span
                                  className="absolute top-[5px] left-[5px] news-kicker inline-block px-3 py-1.5 text-white z-10"
                                  style={{ background: getAccent(article.category || '') }}
                                >
                                  {article.category || 'Destaque'}
                                </span>
                                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 lg:p-10 text-white pr-14 sm:pr-20">
                                  <h2 className="news-headline text-xl sm:text-3xl lg:text-5xl max-w-4xl line-clamp-3">
                                    {article.title}
                                  </h2>
                                </div>
                              </div>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SR-only live status */}
                  <p className="sr-only" aria-live="polite">
                    Slide {selectedIndex + 1} de {totalSlides}
                  </p>

                  {totalSlides > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={scrollPrev}
                        aria-label="Notícia anterior"
                        aria-controls="hero-slider"
                        className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-[hsl(var(--news-accent))] backdrop-blur flex items-center justify-center text-white transition-all z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                      >
                        <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={scrollNext}
                        aria-label="Próxima notícia"
                        aria-controls="hero-slider"
                        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-[hsl(var(--news-accent))] backdrop-blur flex items-center justify-center text-white transition-all z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                      >
                        <ChevronRight className="w-5 h-5" aria-hidden="true" />
                      </button>

                      {/* Play / Pause */}
                      {!reducedMotion && (
                        <button
                          type="button"
                          onClick={togglePlay}
                          aria-pressed={!isPlaying}
                          aria-label={isPlaying ? 'Pausar carrossel' : 'Reproduzir carrossel'}
                          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 hover:bg-[hsl(var(--news-accent))] backdrop-blur flex items-center justify-center text-white transition-all z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                          {isPlaying ? (
                            <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            <Play className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                        </button>
                      )}

                      {/* Tab-style dots */}
                      <div
                        role="tablist"
                        aria-label="Selecionar manchete"
                        className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 flex gap-1.5 z-10 bg-black/30 backdrop-blur px-2 py-1.5 rounded-full"
                      >
                        {featured.map((_, i) => {
                          const active = i === selectedIndex;
                          return (
                            <button
                              key={i}
                              type="button"
                              role="tab"
                              aria-selected={active}
                              aria-label={`Ir para slide ${i + 1} de ${totalSlides}`}
                              tabIndex={active ? 0 : -1}
                              onClick={() => scrollTo(i)}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowRight') {
                                  e.preventDefault();
                                  scrollTo((i + 1) % totalSlides);
                                } else if (e.key === 'ArrowLeft') {
                                  e.preventDefault();
                                  scrollTo((i - 1 + totalSlides) % totalSlides);
                                }
                              }}
                              className={`h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                                active ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/80 w-3'
                              }`}
                            />
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Sidebar — Últimas Notícias */}
                <aside
                  className="lg:col-span-4"
                  aria-label="Últimas notícias"
                >
                  <div className="bg-white border border-[hsl(var(--news-line))] h-full flex flex-col">
                    <div className="bg-[hsl(var(--news-navy))] text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
                      <h3 className="news-kicker text-sm">Últimas Notícias</h3>
                      <span
                        className="w-2 h-2 rounded-full bg-[hsl(var(--news-accent))] animate-pulse"
                        aria-hidden="true"
                      />
                    </div>
                    <ul className="divide-y divide-[hsl(var(--news-line))] flex-1">
                      {sidebar.map((article, idx) => (
                        <li key={article.id}>
                          <NewsCard
                            article={article}
                            currentLang={currentLang}
                            variant="sidebar"
                            index={idx}
                            accentColor={getAccent(article.category || '')}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                </aside>
              </div>
            </section>

            {/* Ad after hero */}
            <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_HOME_TOP} minHeight={120} />

            {/* Category sections with ads interleaved every 2 categories */}
            <div>
              {Object.entries(grouped).map(([cat, arts], idx, arr) => (
                <div key={cat}>
                  <CategorySection
                    category={cat}
                    articles={arts}
                    currentLang={currentLang}
                    accentColor={getAccent(cat)}
                  />
                  {idx < arr.length - 1 && (idx + 1) % 2 === 0 && (
                    <AdSlot
                      slot={import.meta.env.VITE_ADSENSE_SLOT_HOME_INLINE}
                      minHeight={100}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Ad before footer */}
            <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_HOME_BOTTOM} minHeight={120} />

          </>
        )}
      </main>

      <BlogFooter />
    </div>
  );
};

export default BlogHome;
