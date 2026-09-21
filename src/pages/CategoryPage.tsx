import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/hooks/useI18n';
import { Helmet } from 'react-helmet-async';
import BlogHeader from '@/components/blog/BlogHeader';
import BlogFooter from '@/components/blog/BlogFooter';
import NewsCard from '@/components/blog/NewsCard';
import NewsTicker, { useNewsTicker } from '@/components/blog/NewsTicker';
import { Link } from 'react-router-dom';
import Preloader from '@/components/Preloader';
import { ArrowLeft, Home } from 'lucide-react';

const CATEGORY_ACCENTS: Record<string, string> = {
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
    'hsl(var(--news-accent))'
  );
};

const CategoryPage = ({ categoryId }: { categoryId: string }) => {
  const { currentLang } = useI18n();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const tickerItems = useNewsTicker(15);

  const displayTitle = useMemo(() => categoryId.replace(/-/g, ' '), [categoryId]);
  const accent = getAccent(displayTitle);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('public_articles')
        .select('*')
        .eq('status', 'published')
        .ilike('category', displayTitle)
        .order('created_at', { ascending: false });
      if (!mounted) return;
      if (error) console.error(error);
      setArticles(data || []);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [displayTitle]);

  if (loading) return <Preloader message={`Carregando ${displayTitle}...`} />;

  

  return (
    <div className="min-h-dvh bg-[hsl(var(--news-paper))] text-[hsl(var(--news-ink))] font-news antialiased">
      <Helmet>
        <title>{displayTitle.toUpperCase()} | A3 Portal</title>
        <meta
          name="description"
          content={`Últimas notícias sobre ${displayTitle} no A3 Portal — atualizado em tempo real.`}
        />
        <link rel="canonical" href={window.location.origin + window.location.pathname} />
      </Helmet>

      <BlogHeader />
      <NewsTicker items={tickerItems} currentLang={currentLang} />

      <main id="main-content" className="news-container py-6 lg:py-10">
        {/* Breadcrumb / Back nav */}
        <nav aria-label="Navegação" className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <Link
            to={`/${currentLang}`}
            className="news-kicker inline-flex items-center gap-2 text-[hsl(var(--news-navy))] hover:text-[hsl(var(--news-accent))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--news-navy))] focus-visible:ring-offset-2 min-h-11 px-1"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Voltar para a Home
          </Link>
          <ol className="flex items-center gap-2 text-[11px] news-kicker text-[hsl(var(--news-muted))]">
            <li>
              <Link
                to={`/${currentLang}`}
                className="hover:text-[hsl(var(--news-navy))] inline-flex items-center gap-1"
              >
                <Home className="w-3 h-3" aria-hidden="true" /> Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-[hsl(var(--news-ink))]">
              {displayTitle}
            </li>
          </ol>
        </nav>

        <header className="mb-10 pb-6 border-b-2 border-[hsl(var(--news-navy))] flex items-end gap-4 flex-wrap">
          <span className="inline-block w-1.5 h-12" style={{ background: accent }} aria-hidden="true" />
          <div>
            <p className="news-kicker" style={{ color: accent }}>
              Categoria
            </p>
            <h1 className="news-display text-5xl md:text-6xl uppercase text-[hsl(var(--news-ink))] leading-none mt-1">
              {displayTitle}
            </h1>
            <p className="news-kicker text-[hsl(var(--news-muted))] mt-3">
              {articles.length} {articles.length === 1 ? 'matéria' : 'matérias'} • mais recentes primeiro
            </p>
          </div>
        </header>

        {articles.length === 0 ? (
          <div className="py-24 text-center">
            <p className="news-display text-4xl uppercase text-[hsl(var(--news-navy))]">
              Sem matérias por aqui
            </p>
            <p className="text-[hsl(var(--news-muted))] mt-2">
              Ainda não publicamos nada em {displayTitle}.
            </p>
            <Link
              to={`/${currentLang}`}
              className="news-kicker inline-flex items-center gap-2 mt-6 bg-[hsl(var(--news-navy))] text-white px-5 h-11 hover:bg-[hsl(var(--news-accent))] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar para a Home
            </Link>
          </div>
        ) : (
          <section
            aria-label={`Matérias de ${displayTitle}`}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8"
          >
            {articles.map((article) => (
              <NewsCard
                key={article.id}
                article={article}
                currentLang={currentLang}
                variant="grid"
                accentColor={accent}
              />
            ))}
          </section>
        )}
      </main>

      <BlogFooter />
    </div>
  );
};

export default CategoryPage;
