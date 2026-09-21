import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/hooks/useI18n';
import BlogHeader from '@/components/blog/BlogHeader';
import BlogFooter from '@/components/blog/BlogFooter';
import NewsImage from '@/components/blog/NewsImage';
import { Helmet } from 'react-helmet-async';
import { Clock, Calendar, Share2, ArrowLeft, MessageSquare, User } from 'lucide-react';
import Preloader from '@/components/Preloader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ReadingThemeToggle from '@/components/blog/ReadingThemeToggle';
import AdSlot from '@/components/blog/AdSlot';


const BlogArticle = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const { currentLang } = useI18n();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(articleId || '');
        let query = supabase
          .from('public_articles')
          .select('*, authors(id, name, role, bio, avatar_url, category, created_at, updated_at)')
          .eq('status', 'published');
        query = isUuid ? query.eq('id', articleId!) : query.eq('slug', articleId!);
        const { data, error } = await query.maybeSingle();
        if (error) console.error('Error fetching article:', error);
        if (data) setArticle(data);
      } catch (error) {
        console.error('Error fetching article:', error);
      } finally {
        setLoading(false);
      }
    };

    if (articleId) fetchArticle();
  }, [articleId]);

  if (loading) return <Preloader message="Abrindo artigo..." />;
  if (!article) return <div className="min-h-screen flex items-center justify-center">Artigo não encontrado.</div>;

  return (
    <div className="min-h-screen reading-surface selection:bg-primary/30 font-sans">
      <Helmet>
        <title>{article.seo_title || article.title} | A3 BLOG</title>
        <meta name="description" content={article.meta_description} />
        {article.seo_keyword && <meta name="keywords" content={article.seo_keyword} />}
        <link rel="canonical" href={window.location.origin + window.location.pathname} />
        <meta property="og:title" content={article.seo_title || article.title} />
        <meta property="og:description" content={article.meta_description} />
        <meta property="og:image" content={article.featured_image_url} />
        <meta property="og:type" content="article" />
      </Helmet>
      
      <BlogHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <Link to={`/${currentLang}`} className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[hsl(var(--reading-accent))] hover:translate-x-[-4px] transition-transform">
            <ArrowLeft className="h-4 w-4" /> Início
          </Link>
          <ReadingThemeToggle />
        </div>

        {/* Top Ad */}
        <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_ARTICLE_TOP} minHeight={120} className="mb-10" />


        <header className="mb-10 text-center">
          <Badge className="mb-6 bg-primary text-white border-none rounded-none text-[10px] uppercase font-bold tracking-[0.2em] px-4 py-1 mx-auto">
            {article.category}
          </Badge>
          <h1 className="news-headline news-headline-xl mb-6 text-[hsl(var(--reading-fg))]" style={{ textWrap: 'balance' as any }}>
            {article.title}
          </h1>
          
          <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-y border-border py-6">
            <span className="flex items-center gap-2 bg-muted px-2 py-1"><Calendar className="h-4 w-4 text-primary" /> {new Date(article.created_at).toLocaleDateString()}</span>
            <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> 6 MIN DE LEITURA</span>
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" /> 
              POR {article.authors?.name ? article.authors.name.toUpperCase() : 'REDAÇÃO A3'}
            </span>
            <Button variant="outline" size="sm" className="ml-auto text-[10px] font-black uppercase tracking-widest gap-2 rounded-none border-border">
              <Share2 className="h-4 w-4" /> Compartilhar
            </Button>
          </div>
        </header>

        {article.featured_image_url && (
          <div className="relative mb-12 border border-border shadow-md">
            <NewsImage 
              src={article.featured_image_url} 
              alt={article.title}
              aspectRatio="hero"
            />
          </div>
        )}

        <div
          className="reading-content animate-float-up"
          style={{ fontSize: 'calc(clamp(1.02rem, 0.95rem + 0.45vw, 1.18rem) * var(--reading-scale, 1))' }}
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Mid-article Ad (in-feed) */}
        <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_ARTICLE_MID} minHeight={250} className="my-10" />


        {/* Author Bio Box */}
        {article.authors && (
          <div className="mt-16 p-8 border border-border bg-[#fafafa] flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
            <Avatar className="h-20 w-20 rounded-none border border-primary/20 shadow-sm">
              <AvatarImage src={article.authors.avatar_url} className="object-cover" />
              <AvatarFallback className="bg-primary/5 text-primary font-black"><User /></AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Escrito por</p>
              <h3 className="text-xl font-black uppercase mb-2">{article.authors.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">
                {article.authors.bio || `Especialista em ${article.category}, trazendo as últimas atualizações e análises do setor.`}
              </p>
            </div>
          </div>
        )}

        <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_ARTICLE_BOTTOM} minHeight={250} className="my-12" />

        
        <footer className="mt-20 pt-12 border-t border-border">
          <div className="bg-[#f8f8f8] border border-border p-8 sm:p-12 text-center">
            <h3 className="text-2xl font-black uppercase mb-4">Fique por dentro das novidades</h3>
            <p className="text-muted-foreground mb-8 text-sm max-w-lg mx-auto uppercase tracking-wider font-bold">
              Inscreva-se na nossa newsletter e não perca nada.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="SEU E-MAIL" 
                className="w-full bg-white border border-border px-6 py-3 text-[11px] font-bold tracking-widest uppercase focus:border-primary outline-none"
              />
              <Button className="w-full sm:w-auto bg-primary text-white px-8 h-auto py-3 text-[11px] font-black uppercase tracking-widest rounded-none">
                ASSINAR
              </Button>
            </div>
          </div>
        </footer>
      </main>
      <BlogFooter />
    </div>
  );
};

export default BlogArticle;
