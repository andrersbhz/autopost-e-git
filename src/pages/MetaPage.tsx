import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Facebook, Users, RefreshCw, CheckCircle2, Eye, TrendingUp, UserPlus,
  Heart, MessageCircle, Share2, BarChart3, Activity, Image as ImageIcon,
  ThumbsUp, MapPin,
} from 'lucide-react';
import Preloader from '@/components/Preloader';

const MetaPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pages, setPages] = useState<any[] | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadCached = async () => {
    if (!user) return false;
    const { data } = await supabase
      .from('facebook_accounts')
      .select('page_id, page_name, picture_url, last_metrics, metrics_updated_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .not('last_metrics', 'is', null);

    const fbPages = (data || [])
      .map((row: any) => ({
        ...(row.last_metrics || {}),
        page_id: row.last_metrics?.page_id || row.page_id,
        page_name: row.last_metrics?.page_name || row.page_name,
        page_picture: row.picture_url || row.last_metrics?.facebook?.picture?.data?.url,
      }))
      .filter((m: any) => m && m.facebook);

    if (fbPages.length > 0) {
      setPages(fbPages);
      const latest = (data || [])
        .map((r: any) => r.metrics_updated_at)
        .filter(Boolean)
        .sort()
        .pop();
      setLastUpdated(latest || null);
      return true;
    }
    return false;
  };

  const fetchFresh = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const { data } = await supabase.functions.invoke('fetch-meta-metrics', {
        body: { userId: user.id },
      });
      const fbPages = (data?.pages || []).filter((p: any) => p.facebook && !p.facebook.error);
      if (fbPages.length > 0) {
        setPages(fbPages);
        setLastUpdated(new Date().toISOString());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const hasCache = await loadCached();
      setLoading(false);
      if (!hasCache) fetchFresh();
    })();
    const interval = window.setInterval(() => fetchFresh(), 60_000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) return <Preloader message="carregando dados aguarde" />;

  const fmt = (n: number) => new Intl.NumberFormat('pt-BR').format(n || 0);
  const eng = (p: any) => (p.likes || 0) + (p.comments || 0) + (p.shares || 0) + (p.reactions || 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-accent/20 flex items-center justify-center rounded-sm border border-accent/30 shadow-neon-pink">
            <Facebook className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Facebook</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              Métricas completas das páginas conectadas
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={refreshing}
          onClick={fetchFresh}
          className="text-[10px] font-bold uppercase tracking-widest"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Atualizando...' : 'Atualizar'}
          {lastUpdated && !refreshing && (
            <span className="ml-2 text-muted-foreground normal-case font-normal tracking-normal">
              · {new Date(lastUpdated).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          )}
        </Button>
      </div>

      {!pages ? (
        <Card className="glass-card border-dashed border-accent/30 p-12 text-center">
          <Facebook className="h-10 w-10 text-accent/40 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Nenhuma página do Facebook conectada</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
            Conecte suas páginas do Facebook para automatizar postagens e acompanhar métricas de engajamento.
          </p>
          <Button
            onClick={() => (window.location.href = '/settings')}
            className="bg-accent hover:bg-accent/80 text-white uppercase tracking-widest text-[10px] font-bold"
          >
            Configurar Conexão
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          {pages.map((pg, idx) => {
            const fb = pg.facebook || {};
            const insights = fb.insights || {};
            const stats = fb.post_stats || {};
            const posts: any[] = fb.posts || [];
            const picture = pg.page_picture || fb.picture?.data?.url;

            const metricCards = [
              { key: 'page_impressions', label: 'Impressões', icon: Eye, color: 'text-primary' },
              { key: 'page_post_engagements', label: 'Engajamentos', icon: Activity, color: 'text-success' },
              { key: 'page_engaged_users', label: 'Usuários Engajados', icon: Users, color: 'text-foreground' },
              { key: 'page_fan_adds', label: 'Novos Fãs', icon: UserPlus, color: 'text-success' },
            ];

            return (
              <Card key={idx} className="glass-card overflow-hidden">
                {/* Header */}
                <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-white/10">
                      {picture ? (
                        <img src={picture} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Facebook className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{pg.page_name || fb.name}</h3>
                      <p className="text-[10px] text-muted-foreground">ID: {pg.page_id}</p>
                      {fb.category && (
                        <p className="text-[10px] text-muted-foreground/80 mt-0.5">{fb.category}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-success/10 border border-success/30">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-success">Conectado</span>
                  </div>
                </div>

                <CardContent className="p-6 space-y-6">
                  {/* Perfil */}
                  <div>
                    <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <Users className="h-3 w-3" /> Perfil
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-4 rounded bg-white/5 border border-white/10 flex flex-col justify-between hover:border-primary/40 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Seguidores</p>
                          <Users className="h-4 w-4 text-primary/60" />
                        </div>
                        <p className="text-2xl font-black text-accent">{fmt(fb.followers_count || fb.fan_count)}</p>
                      </div>
                      <div className="p-4 rounded bg-white/5 border border-white/10 flex flex-col justify-between hover:border-primary/40 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Curtidas</p>
                          <ThumbsUp className="h-4 w-4 text-accent/60" />
                        </div>
                        <p className="text-2xl font-black">{fmt(fb.fan_count)}</p>
                      </div>
                      <div className="p-4 rounded bg-white/5 border border-white/10 flex flex-col justify-between hover:border-primary/40 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Falando Sobre</p>
                          <MessageCircle className="h-4 w-4 text-success/60" />
                        </div>
                        <p className="text-2xl font-black">{fmt(fb.talking_about_count)}</p>
                      </div>
                      <div className="p-4 rounded bg-white/5 border border-white/10 flex flex-col justify-between hover:border-primary/40 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Check-ins
                          </p>
                          <MapPin className="h-4 w-4 text-primary/60" />
                        </div>
                        <p className="text-2xl font-black">{fmt(fb.were_here_count)}</p>
                      </div>
                      {fb.link && (
                        <div className="p-4 rounded bg-white/5 border border-white/10 flex flex-col justify-between hover:border-primary/40 transition-colors sm:col-span-2 lg:col-span-2">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Página</p>
                            <Facebook className="h-4 w-4 text-primary/60" />
                          </div>
                          <a href={fb.link} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline truncate">
                            {fb.link}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Insights 28d */}
                  {Object.keys(insights).length > 0 && (
                    <div>
                      <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                        <Activity className="h-3 w-3" /> Insights (últimos 28 dias)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {metricCards.map(({ key, label, icon: Icon, color }) => {
                          const m = insights[key];
                          if (!m) return null;
                          return (
                            <div key={key} className="p-4 rounded bg-white/5 border border-white/10 flex flex-col justify-between hover:border-primary/40 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">{label}</p>
                                <Icon className={`h-4 w-4 ${color}`} />
                              </div>
                              <div>
                                <p className={`text-2xl font-black ${color}`}>{fmt(m.total)}</p>
                                {typeof m.growth === 'number' && m.growth !== 0 && (
                                  <p className={`text-[10px] font-bold mt-1 ${m.growth >= 0 ? 'text-success' : 'text-destructive'}`}>
                                    {m.growth >= 0 ? '+' : ''}{m.growth}% 7d
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Stats de Posts */}
                  {stats.total_posts > 0 && (
                    <div>
                      <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                        <BarChart3 className="h-3 w-3" /> Engajamento Agregado
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="p-4 rounded bg-white/5 border border-white/10 flex items-center justify-between hover:border-primary/40 transition-colors">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Posts</p>
                            <p className="text-2xl font-black">{fmt(stats.total_posts)}</p>
                          </div>
                          <ImageIcon className="h-8 w-8 text-foreground/30" />
                        </div>
                        <div className="p-4 rounded bg-white/5 border border-white/10 flex items-center justify-between hover:border-primary/40 transition-colors">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Curtidas</p>
                            <p className="text-2xl font-black text-accent">{fmt(stats.total_likes)}</p>
                          </div>
                          <ThumbsUp className="h-8 w-8 text-accent/30" />
                        </div>
                        <div className="p-4 rounded bg-white/5 border border-white/10 flex items-center justify-between hover:border-primary/40 transition-colors">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Reações</p>
                            <p className="text-2xl font-black text-[#ee2a7b]">{fmt(stats.total_reactions)}</p>
                          </div>
                          <Heart className="h-8 w-8 text-[#ee2a7b]/30" />
                        </div>
                        <div className="p-4 rounded bg-white/5 border border-white/10 flex items-center justify-between hover:border-primary/40 transition-colors">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Comentários</p>
                            <p className="text-2xl font-black text-primary">{fmt(stats.total_comments)}</p>
                          </div>
                          <MessageCircle className="h-8 w-8 text-primary/30" />
                        </div>
                        <div className="p-4 rounded bg-white/5 border border-white/10 flex items-center justify-between hover:border-primary/40 transition-colors">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Compartilhamentos</p>
                            <p className="text-2xl font-black text-success">{fmt(stats.total_shares)}</p>
                          </div>
                          <Share2 className="h-8 w-8 text-success/30" />
                        </div>
                        <div className="p-4 rounded bg-success/5 border border-success/20 flex items-center justify-between hover:border-success/40 transition-colors">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Engajamento Médio</p>
                            <p className="text-2xl font-black text-success">{fmt(stats.avg_engagement)}</p>
                          </div>
                          <Activity className="h-8 w-8 text-success/30" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mais engajados */}
                  {posts.length > 0 && (
                    <div>
                      <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                        <TrendingUp className="h-3 w-3 text-success" /> Mais Engajados (top 12)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {[...posts]
                          .sort((a, b) => eng(b) - eng(a))
                          .slice(0, 12)
                          .map((p) => (
                            <a
                              key={`eng-${p.id}`}
                              href={p.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative aspect-square overflow-hidden rounded bg-secondary border border-success/30 hover:border-success transition-colors"
                            >
                              {p.image ? (
                                <img src={p.image} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center p-2 text-[10px] text-muted-foreground line-clamp-4">
                                  {p.message || <Facebook className="h-6 w-6" />}
                                </div>
                              )}
                              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-success text-black text-[9px] font-black uppercase">
                                {fmt(eng(p))}
                              </div>
                              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-[10px] font-bold">
                                <div className="flex items-center gap-1"><Heart className="h-3 w-3" /> {fmt(p.likes)}</div>
                                <div className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {fmt(p.comments)}</div>
                                <div className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {fmt(p.shares)}</div>
                              </div>
                            </a>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Mais recentes */}
                  {posts.length > 0 && (
                    <div>
                      <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                        <ImageIcon className="h-3 w-3" /> Posts Recentes (12 mais novos)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {[...posts]
                          .sort((a, b) => new Date(b.created_time || 0).getTime() - new Date(a.created_time || 0).getTime())
                          .slice(0, 12)
                          .map((p) => (
                            <a
                              key={`new-${p.id}`}
                              href={p.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative aspect-square overflow-hidden rounded bg-secondary border border-white/10 hover:border-accent/50 transition-colors"
                            >
                              {p.image ? (
                                <img src={p.image} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center p-2 text-[10px] text-muted-foreground line-clamp-4">
                                  {p.message || <Facebook className="h-6 w-6" />}
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-[10px] font-bold">
                                <div className="flex items-center gap-1"><Heart className="h-3 w-3" /> {fmt(p.likes)}</div>
                                <div className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {fmt(p.comments)}</div>
                                <div className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {fmt(p.shares)}</div>
                              </div>
                            </a>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MetaPage;
