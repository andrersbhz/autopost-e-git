import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Preloader from '@/components/Preloader';
import {
  AtSign, RefreshCw, CheckCircle2, Eye, Heart, MessageCircle, Repeat2,
  Quote, Users, Activity, BarChart3, TrendingUp, Bot, Loader2, Send,
} from 'lucide-react';

const ThreadsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState<any[] | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const fmt = (n: number) => new Intl.NumberFormat('pt-BR').format(n || 0);

  const fetchInteractions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('social_interactions')
      .select('id, author_name, content, ai_response, status, created_at, original_link')
      .eq('user_id', user.id)
      .eq('platform', 'threads')
      .order('created_at', { ascending: false })
      .limit(20);
    setInteractions(data || []);
  };

  const fetchMetrics = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-threads-metrics', {
        body: { userId: user.id },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data?.error || 'Falha na API do Threads');
      setAccounts(data?.accounts || []);
      setLoadError(false);
      setLastUpdated(new Date().toISOString());
    } catch (error) {
      console.error(error);
      setLoadError(true);
      toast({
        title: 'Erro ao carregar métricas do Threads',
        description: 'Não foi possível consultar a API do Threads agora.',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      await Promise.all([fetchMetrics(), fetchInteractions()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const runRobot = async () => {
    if (!user) return;
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-social-replies', {
        body: { userId: user.id },
      });
      if (error) throw error;
      toast({
        title: 'Robô social executado',
        description: `${data?.newInteractions || 0} novos comentários lidos · ${data?.replied || 0} respostas amigáveis enviadas.`,
      });
      await Promise.all([fetchInteractions(), fetchMetrics()]);
    } catch (error) {
      toast({
        title: 'Falha ao executar o robô',
        description: 'Verifique a conexão do Threads e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <Preloader message="carregando dados aguarde" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-white/5 pb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/20 flex items-center justify-center rounded-sm border border-primary/30">
            <AtSign className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Threads</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              Estatísticas completas e robô de respostas amigáveis
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={refreshing}
            onClick={fetchMetrics}
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
          <Button size="sm" disabled={running} onClick={runRobot} className="text-[10px] font-bold uppercase tracking-widest">
            {running ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Bot className="h-3.5 w-3.5 mr-2" />}
            Responder comentários
          </Button>
        </div>
      </div>

      {loadError ? (
        <Card className="glass-card border-dashed border-destructive/40 p-12 text-center">
          <AtSign className="h-10 w-10 text-destructive/60 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Não foi possível carregar as estatísticas do Threads</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
            Sua conta continua conectada. A consulta à API do Threads falhou ou demorou demais. Tente atualizar novamente
            em alguns instantes.
          </p>
          <Button onClick={fetchMetrics} disabled={refreshing} className="uppercase tracking-widest text-[10px] font-bold">
            {refreshing ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
            Tentar novamente
          </Button>
        </Card>
      ) : !accounts || accounts.length === 0 ? (
        <Card className="glass-card border-dashed border-primary/30 p-12 text-center">
          <AtSign className="h-10 w-10 text-primary/40 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Nenhuma conta do Threads conectada</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
            Conecte sua conta do Threads no Publicador Social para acompanhar as estatísticas e permitir que o robô responda
            os comentários de forma amigável.
          </p>
          <Button onClick={() => (window.location.href = '/social')} className="uppercase tracking-widest text-[10px] font-bold">
            Conectar Threads
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          {accounts.map((acc) => {
            const t = acc.totals || {};
            const ins = acc.insights || {};
            const posts: any[] = acc.posts || [];
            const eng = (p: any) => (p.likes || 0) + (p.replies || 0) + (p.reposts || 0) + (p.quotes || 0);

            return (
              <Card key={acc.account_id} className="glass-card overflow-hidden">
                <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-white/10">
                      {acc.picture ? (
                        <img src={acc.picture} alt={`Foto de perfil de @${acc.username}`} className="h-full w-full object-cover" />
                      ) : (
                        <AtSign className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{acc.name || `@${acc.username}`}</h3>
                      <p className="text-[10px] text-muted-foreground">@{acc.username} · ID: {acc.threads_user_id}</p>
                      {acc.biography && <p className="text-[10px] text-muted-foreground/80 mt-0.5 max-w-md">{acc.biography}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-success/10 border border-success/30">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-success">Conectado</span>
                  </div>
                </div>

                <CardContent className="p-6 space-y-6">
                  {/* Perfil / insights da conta */}
                  <div>
                    <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <Users className="h-3 w-3" /> Perfil
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 rounded bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Seguidores</p>
                        <p className="text-2xl font-black text-primary">{fmt(ins.followers_count)}</p>
                      </div>
                      <div className="p-3 rounded bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Visualizações</p>
                        <p className="text-2xl font-black">{fmt(ins.views)}</p>
                      </div>
                      <div className="p-3 rounded bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Curtidas</p>
                        <p className="text-2xl font-black">{fmt(ins.likes)}</p>
                      </div>
                      <div className="p-3 rounded bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Cliques</p>
                        <p className="text-2xl font-black">{fmt(ins.clicks)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Engajamento agregado dos posts */}
                  <div>
                    <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <BarChart3 className="h-3 w-3" /> Engajamento Agregado ({posts.length} publicações)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="p-3 rounded bg-white/5 border border-white/10 text-center">
                        <Eye className="h-4 w-4 mx-auto mb-1 text-foreground" />
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Views</p>
                        <p className="text-xl font-black">{fmt(t.views)}</p>
                      </div>
                      <div className="p-3 rounded bg-white/5 border border-white/10 text-center">
                        <Heart className="h-4 w-4 mx-auto mb-1 text-accent" />
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Curtidas</p>
                        <p className="text-xl font-black text-accent">{fmt(t.likes)}</p>
                      </div>
                      <div className="p-3 rounded bg-white/5 border border-white/10 text-center">
                        <MessageCircle className="h-4 w-4 mx-auto mb-1 text-primary" />
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Respostas</p>
                        <p className="text-xl font-black text-primary">{fmt(t.replies)}</p>
                      </div>
                      <div className="p-3 rounded bg-white/5 border border-white/10 text-center">
                        <Repeat2 className="h-4 w-4 mx-auto mb-1 text-success" />
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Reposts</p>
                        <p className="text-xl font-black text-success">{fmt(t.reposts)}</p>
                      </div>
                      <div className="p-3 rounded bg-white/5 border border-white/10 text-center">
                        <Quote className="h-4 w-4 mx-auto mb-1 text-foreground" />
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Citações</p>
                        <p className="text-xl font-black">{fmt(t.quotes)}</p>
                      </div>
                    </div>
                    <div className="mt-3 p-3 rounded bg-success/5 border border-success/20 text-center">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Engajamento Médio por Publicação</p>
                      <p className="text-2xl font-black text-success">{fmt(acc.avg_engagement)}</p>
                    </div>
                  </div>

                  {/* Robô social */}
                  <div>
                    <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <Bot className="h-3 w-3" /> Robô Social
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded bg-white/5 border border-white/10 text-center">
                        <Send className="h-4 w-4 mx-auto mb-1 text-primary" />
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Publicados</p>
                        <p className="text-xl font-black">{fmt(acc.robot?.published)}</p>
                      </div>
                      <div className="p-3 rounded bg-white/5 border border-white/10 text-center">
                        <Activity className="h-4 w-4 mx-auto mb-1 text-accent" />
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Pendentes</p>
                        <p className="text-xl font-black text-accent">{fmt(acc.robot?.pending_replies)}</p>
                      </div>
                      <div className="p-3 rounded bg-white/5 border border-white/10 text-center">
                        <MessageCircle className="h-4 w-4 mx-auto mb-1 text-success" />
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Respondidos</p>
                        <p className="text-xl font-black text-success">{fmt(acc.robot?.replied)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Publicações mais engajadas */}
                  {posts.length > 0 && (
                    <div>
                      <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                        <TrendingUp className="h-3 w-3 text-success" /> Publicações mais engajadas
                      </h4>
                      <div className="space-y-2">
                        {[...posts].sort((a, b) => eng(b) - eng(a)).slice(0, 8).map((p) => (
                          <a
                            key={p.id}
                            href={p.permalink || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 rounded bg-white/5 border border-white/10 hover:border-primary/50 transition-colors"
                          >
                            <p className="text-xs line-clamp-2 mb-2">{p.text || '(publicação sem texto)'}</p>
                            <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground">
                              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {fmt(p.views)}</span>
                              <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {fmt(p.likes)}</span>
                              <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {fmt(p.replies)}</span>
                              <span className="flex items-center gap-1"><Repeat2 className="h-3 w-3" /> {fmt(p.reposts)}</span>
                              <span className="flex items-center gap-1"><Quote className="h-3 w-3" /> {fmt(p.quotes)}</span>
                              {p.timestamp && (
                                <span className="ml-auto">{new Date(p.timestamp).toLocaleDateString('pt-BR')}</span>
                              )}
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

      {/* Comentários e respostas do robô */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <MessageCircle className="h-3 w-3" /> Comentários no Threads
          </h4>
          {interactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum comentário capturado ainda.</p>
          ) : (
            <div className="space-y-3">
              {interactions.map((item) => (
                <div key={item.id} className="p-3 rounded bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-black">{item.author_name}</p>
                    <Badge variant="outline" className="text-[9px] uppercase">
                      {item.status === 'replied' ? 'Respondido' : item.status === 'pending' ? 'Pendente' : item.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.content}</p>
                  {item.ai_response && (
                    <p className="text-xs mt-2 pl-3 border-l-2 border-success/50 text-success">{item.ai_response}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ThreadsPage;
