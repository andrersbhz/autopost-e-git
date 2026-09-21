import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, RefreshCw, TrendingUp, Search, Newspaper } from 'lucide-react';

interface Trend {
  id: string;
  topic: string;
  category: string | null;
  search_volume: number | null;
  related_queries: any;
  source_name: string | null;
  source_url: string | null;
  fetched_at: string;
  context: string | null;
}

interface NewsItem {
  title: string;
  link: string;
  pubDate?: string;
  source?: string;
  description?: string;
}

export default function TrendDetailPage() {
  const { trendId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trend, setTrend] = useState<Trend | null>(null);
  const [siblings, setSiblings] = useState<Trend[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingNews, setLoadingNews] = useState(false);

  useEffect(() => {
    if (!user || !trendId) return;
    (async () => {
      setLoading(true);
      const [{ data: t }, { data: sib }] = await Promise.all([
        supabase.from('trending_topics').select('*').eq('id', trendId).eq('user_id', user.id).maybeSingle(),
        supabase.from('trending_topics').select('id, search_volume, source_name').eq('user_id', user.id).eq('used', false),
      ]);
      setTrend(t as any);
      setSiblings((sib as any) || []);
      setLoading(false);
    })();
  }, [user, trendId]);

  useEffect(() => {
    if (!trend?.topic) return;
    setLoadingNews(true);
    const rss = `https://news.google.com/rss/search?q=${encodeURIComponent(trend.topic)}&hl=pt-BR&gl=BR&ceid=BR:pt`;
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rss)}`)
      .then((r) => r.json())
      .then((d) => {
        const items = (d.items || []).slice(0, 10).map((it: any) => ({
          title: it.title,
          link: it.link,
          pubDate: it.pubDate,
          description: (it.description || '').replace(/<[^>]+>/g, '').slice(0, 220),
          source: it.author || (it.title?.split(' - ').slice(-1)[0] ?? ''),
        }));
        setNews(items);
      })
      .catch(() => setNews([]))
      .finally(() => setLoadingNews(false));
  }, [trend?.topic]);

  const rank = useMemo(() => {
    if (!trend) return null;
    const isWorld = (t: any) => t.source_name?.includes('US') || t.source_name?.includes('Global') || t.source_name?.includes('Mundo');
    const region = isWorld(trend) ? 'World' : 'BR';
    const scoped = siblings.filter((s) => (isWorld(s) ? 'World' : 'BR') === region);
    const sorted = [...scoped].sort((a, b) => (b.search_volume || 0) - (a.search_volume || 0));
    const pos = sorted.findIndex((s) => s.id === trend.id) + 1;
    return { pos, total: sorted.length, region };
  }, [trend, siblings]);

  const related: string[] = useMemo(() => {
    const rq = trend?.related_queries;
    if (Array.isArray(rq)) return rq.map(String).slice(0, 20);
    if (typeof rq === 'string') return rq.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20);
    return [];
  }, [trend]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><RefreshCw className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!trend) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
        <p className="text-muted-foreground">Trend não encontrada.</p>
      </div>
    );
  }

  const trendsUrl = `https://trends.google.com/trends/explore?q=${encodeURIComponent(trend.topic)}&geo=${rank?.region === 'World' ? '' : 'BR'}`;
  const newsSearchUrl = `https://news.google.com/search?q=${encodeURIComponent(trend.topic)}&hl=pt-BR&gl=BR&ceid=BR:pt`;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="uppercase tracking-widest text-xs border-primary/40 text-primary hover:bg-primary hover:text-black transition-all">
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
      </Button>

      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary mb-2">
          <TrendingUp className="h-4 w-4" /> Google Trends {rank?.region === 'World' ? '🌎' : '🇧🇷'}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase">{trend.topic}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {trend.category && <Badge variant="outline" className="border-primary/30 text-primary">{trend.category}</Badge>}
          {trend.source_name && <Badge variant="secondary">{trend.source_name}</Badge>}
          <Badge variant="outline">Coletado em {new Date(trend.fetched_at).toLocaleString('pt-BR')}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card neon-border-lilac">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Volume de buscas</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold tabular-nums">{trend.search_volume ? Number(trend.search_volume).toLocaleString('pt-BR') : '—'}</p><p className="text-[10px] uppercase text-muted-foreground mt-1">estimativa google trends</p></CardContent>
        </Card>
        <Card className="glass-card neon-border-lilac">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Posição no ranking</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold tabular-nums">#{rank?.pos || '—'} <span className="text-base text-muted-foreground font-normal">/ {rank?.total}</span></p><p className="text-[10px] uppercase text-muted-foreground mt-1">entre trends {rank?.region === 'World' ? 'mundiais' : 'do Brasil'}</p></CardContent>
        </Card>
        <Card className="glass-card neon-border-lilac">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Explorar</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <a href={trendsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline"><ExternalLink className="h-3 w-3" /> Abrir no Google Trends</a>
            <a href={newsSearchUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline"><Newspaper className="h-3 w-3" /> Ver no Google Notícias</a>
            {trend.source_url && <a href={trend.source_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline"><ExternalLink className="h-3 w-3" /> Fonte original</a>}
          </CardContent>
        </Card>
      </div>

      {related.length > 0 && (
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-sm uppercase tracking-widest flex items-center gap-2"><Search className="h-4 w-4 text-primary" /> Buscas relacionadas</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {related.map((q, i) => (
                <a key={i} href={`https://news.google.com/search?q=${encodeURIComponent(q)}&hl=pt-BR&gl=BR`} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded-none border border-primary/20 hover:border-primary/60 hover:bg-primary/10 transition-colors">
                  {q}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm uppercase tracking-widest flex items-center gap-2"><Newspaper className="h-4 w-4 text-primary" /> Notícias sobre "{trend.topic}"</CardTitle>
          <a href={newsSearchUrl} target="_blank" rel="noreferrer" className="text-[10px] uppercase tracking-widest text-primary hover:underline">Ver todas</a>
        </CardHeader>
        <CardContent>
          {loadingNews ? (
            <div className="flex justify-center py-6"><RefreshCw className="h-5 w-5 animate-spin text-primary" /></div>
          ) : news.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma notícia encontrada agora. Tente pelo Google Notícias.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {news.map((n, i) => (
                <li key={i} className="py-3">
                  <a href={n.link} target="_blank" rel="noreferrer" className="block hover:bg-white/5 -mx-3 px-3 py-1 transition-colors">
                    <p className="text-sm font-semibold group-hover:text-primary">{n.title}</p>
                    {n.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.description}</p>}
                    <p className="text-[10px] uppercase text-muted-foreground mt-1">{n.pubDate ? new Date(n.pubDate).toLocaleString('pt-BR') : ''}</p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {trend.context && (
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-sm uppercase tracking-widest">Contexto salvo</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground whitespace-pre-line">{trend.context}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
