import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Instagram, Users, Image as ImageIcon, RefreshCw, CheckCircle2,
  Eye, TrendingUp, UserPlus, Globe, MousePointerClick, Heart,
  MessageCircle, BarChart3, MapPin, Activity, Send, Loader2, KeyRound, Plus, ShieldAlert
} from 'lucide-react';
import Preloader from '@/components/Preloader';

const InstagramPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pages, setPages] = useState<any[] | null>(null);
  const [directAccounts, setDirectAccounts] = useState<Array<{ id: string; username: string; is_active: boolean; created_at: string }>>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [testingPageId, setTestingPageId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [newAcc, setNewAcc] = useState({ username: '', password: '' });

  const fetchDirectAccounts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('instagram_accounts_direct')
      .select('id, username, is_active, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    setDirectAccounts((data as any[]) || []);
  };

  const handleDeleteDirect = async (id: string) => {
    if (!confirm('Remover esta conexão direta?')) return;
    const { error } = await supabase.from('instagram_accounts_direct').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Conta removida' });
      fetchDirectAccounts();
    }
  };

  const handleAddDirect = async () => {
    if (!user) return;
    if (!newAcc.username.trim() || !newAcc.password) {
      toast({ title: 'Erro', description: 'Usuário e senha são obrigatórios', variant: 'destructive' });
      return;
    }
    setAddSaving(true);
    try {
      const { error } = await supabase.from('instagram_accounts_direct').insert({
        user_id: user.id,
        username: newAcc.username.trim(),
        password: newAcc.password,
        is_active: true,
      } as any);
      if (error) throw error;
      toast({ title: '✅ Conta adicionada', description: `@${newAcc.username} conectada via login direto.` });
      setNewAcc({ username: '', password: '' });
      setAddOpen(false);
      fetchDirectAccounts();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setAddSaving(false);
    }
  };

  const handleTestPost = async (pageId: string, igUsername: string) => {
    if (!user) return;
    setTestingPageId(pageId);
    try {
      const { data, error } = await supabase.functions.invoke('test-instagram-post', {
        body: { userId: user.id, pageId },
      });
      if (error) throw error;
      if (data?.success) {
        toast({
          title: '✅ Postado no Instagram!',
          description: `@${igUsername}: ${data.article_title}`,
        });
        if (data.permalink) window.open(data.permalink, '_blank');
      } else {
        toast({
          title: 'Falha ao publicar',
          description: data?.error || 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setTestingPageId(null);
    }
  };


  // Carrega métricas do cache (instantâneo)
  const loadCached = async () => {
    if (!user) return false;
    const { data } = await supabase
      .from('facebook_accounts')
      .select('last_metrics, metrics_updated_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .not('last_metrics', 'is', null);

    const igPages = (data || [])
      .map((row: any) => row.last_metrics)
      .filter((m: any) => m && m.instagram);

    if (igPages.length > 0) {
      setPages(igPages);
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

  // Busca métricas frescas da API Meta (lento)
  const fetchFresh = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const { data } = await supabase.functions.invoke('fetch-meta-metrics', {
        body: { userId: user.id },
      });
      const igPages = (data?.pages || []).filter((p: any) => p.instagram);
      if (igPages.length > 0) {
        setPages(igPages);
        setLastUpdated(new Date().toISOString());
      } else if (!pages) {
        setPages(null);
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
      await fetchDirectAccounts();
      const hasCache = await loadCached();
      setLoading(false);
      // Se não havia cache, busca da API automaticamente
      if (!hasCache) fetchFresh();
    })();
    // Auto-refresh silencioso a cada 60s para manter posts atualizados
    const interval = window.setInterval(() => {
      fetchFresh();
    }, 60_000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) return <Preloader message="carregando dados aguarde" />;

  const fmt = (n: number) => new Intl.NumberFormat('pt-BR').format(n || 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center rounded-sm shadow-neon-pink">
            <Instagram className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Instagram</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              Métricas completas das contas Business
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="bg-[#a3ff12] text-black text-[10px] font-bold uppercase tracking-widest hover:bg-[#a3ff12]/90"
          >
            <KeyRound className="h-3.5 w-3.5 mr-2" />
            Adicionar (Login/Senha)
          </Button>
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
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Instagram className="h-5 w-5 text-[#ee2a7b]" />
              Adicionar Instagram (Login direto)
            </DialogTitle>
            <DialogDescription>
              Insira o usuário e senha do Instagram. A senha é criptografada antes de ser armazenada.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
            <p>
              <strong className="text-yellow-500">Não suportamos 2FA.</strong> Se sua conta tem autenticação em
              dois fatores, use a conexão oficial via Facebook (Graph API) em Configurações.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Usuário / Email</Label>
              <Input
                placeholder="seu_usuario"
                value={newAcc.username}
                onChange={(e) => setNewAcc({ ...newAcc, username: e.target.value })}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Senha</Label>
              <PasswordInput
                placeholder="••••••••"
                value={newAcc.password}
                onChange={(e) => setNewAcc({ ...newAcc, password: e.target.value })}
                autoComplete="new-password"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={addSaving}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddDirect}
              disabled={addSaving}
              className="bg-[#a3ff12] text-black hover:bg-[#a3ff12]/90"
            >
              {addSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Salvar conta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Perfis conectados — visão consolidada */}
      <Card className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-tighter">Perfis Conectados</h3>
            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              {(pages?.length || 0) + directAccounts.length} conta(s) no total
            </p>
          </div>
        </div>
        <div className="divide-y divide-white/5">
          {(pages || []).map((pg: any, i: number) => {
            const ig = pg.instagram || {};
            return (
              <div key={`graph-${i}`} className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                    {ig.profile_picture_url ? (
                      <img src={ig.profile_picture_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Instagram className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">@{ig.username || ig.name || 'sem_nome'}</p>
                    <p className="text-[10px] uppercase tracking-widest text-success">
                      Graph API · {pg.page_name}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-success bg-success/10 px-2 py-1 rounded">
                  <CheckCircle2 className="h-3 w-3 inline mr-1" />Business
                </span>
              </div>
            );
          })}

          {directAccounts.map((acc) => (
            <div key={acc.id} className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center shrink-0">
                  <Instagram className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">@{acc.username}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Login direto · {acc.is_active ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                onClick={() => handleDeleteDirect(acc.id)}
              >
                <Loader2 className="hidden" />
                ×
              </Button>
            </div>
          ))}

          {(!pages || pages.length === 0) && directAccounts.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Nenhum perfil conectado ainda. Use o botão "Adicionar (Login/Senha)" acima ou conecte sua página do Facebook em Configurações.
            </div>
          )}
        </div>
      </Card>

      {!pages ? (
        directAccounts.length === 0 && (
          <Card className="glass-card border-dashed border-primary/30 p-12 text-center">
            <Instagram className="h-10 w-10 text-primary/40 mx-auto mb-4" />
            <h4 className="text-lg font-bold mb-2">Nenhum Instagram Business vinculado</h4>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
              Para métricas completas (alcance, impressões, demografia), conecte uma página do Facebook que tenha uma conta Instagram Business vinculada.
            </p>
            <Button
              onClick={() => (window.location.href = '/settings')}
              className="bg-[#a3ff12] text-black uppercase tracking-widest text-[10px] font-bold hover:bg-[#a3ff12]/90"
            >
              Conectar Facebook
            </Button>
          </Card>
        )
      ) : (
        <div className="space-y-8">
          {pages.map((pg, idx) => {
            const ig = pg.instagram || {};
            const insights = ig.insights || {};
            const stats = ig.post_stats || {};
            const demo = ig.demographics || {};
            const posts = ig.posts || [];

            const metricCards = [
              { key: 'impressions', label: 'Impressões', icon: Eye, color: 'text-primary' },
              { key: 'reach', label: 'Alcance', icon: TrendingUp, color: 'text-success' },
              { key: 'profile_views', label: 'Visitas ao Perfil', icon: Users, color: 'text-foreground' },
              { key: 'website_clicks', label: 'Cliques no Site', icon: MousePointerClick, color: 'text-primary' },
              { key: 'follower_count', label: 'Novos Seguidores', icon: UserPlus, color: 'text-success' },
            ];

            return (
              <Card key={idx} className="glass-card overflow-hidden">
                {/* Header */}
                <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-white/10">
                      {ig.profile_picture_url ? (
                        <img src={ig.profile_picture_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Instagram className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">@{ig.username || ig.name}</h4>
                      <p className="text-[10px] text-muted-foreground">Vinculado: {pg.page_name}</p>
                      {ig.biography && (
                        <p className="text-[10px] text-muted-foreground/80 mt-0.5 max-w-md line-clamp-1">{ig.biography}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleTestPost(pg.page_id, ig.username || ig.name || '')}
                      disabled={testingPageId === pg.page_id}
                      className="bg-[#a3ff12] text-black text-[10px] font-bold uppercase tracking-widest h-8 hover:bg-[#a3ff12]/90"
                    >
                      {testingPageId === pg.page_id ? (
                        <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Postando...</>
                      ) : (
                        <><Send className="h-3 w-3 mr-2" /> Postar Agora</>
                      )}
                    </Button>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-success/10 border border-success/30">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-success">Conectado</span>
                    </div>
                  </div>

                </div>

                <CardContent className="p-6 space-y-20">
                  {/* Perfil */}
                  <div>
                    <h4 className="text-2xl md:text-3xl uppercase font-black tracking-widest mb-6 flex items-center gap-3 text-[#00f0ff]" style={{ textShadow: '0 0 4px rgba(0,240,255,0.6), 0 0 10px rgba(0,240,255,0.3)' }}>
                      <Users className="h-7 w-7" style={{ filter: 'drop-shadow(0 0 3px rgba(0,240,255,0.7))' }} /> Perfil
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 rounded bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Seguidores</p>
                        <p className="text-2xl font-black text-primary">{fmt(ig.followers_count)}</p>
                      </div>
                      <div className="p-3 rounded bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Seguindo</p>
                        <p className="text-2xl font-black">{fmt(ig.follows_count)}</p>
                      </div>
                      <div className="p-3 rounded bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Posts</p>
                        <p className="text-2xl font-black">{fmt(ig.media_count)}</p>
                      </div>
                      <div className="p-3 rounded bg-white/5 border border-white/10">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Site</p>
                        <p className="text-xs font-bold truncate">{ig.website || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Insights 28d */}
                  {Object.keys(insights).length > 0 && (
                    <div>
                      <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                        <Activity className="h-3 w-3" /> Insights (últimos 28 dias)
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {metricCards.map(({ key, label, icon: Icon, color }) => {
                          const m = insights[key];
                          if (!m) return null;
                          return (
                            <div key={key} className="p-3 rounded bg-white/5 border border-white/10">
                              <Icon className={`h-3.5 w-3.5 mb-1.5 ${color}`} />
                              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{label}</p>
                              <p className={`text-xl font-black ${color}`}>{fmt(m.total)}</p>
                              {typeof m.growth === 'number' && m.growth !== 0 && (
                                <p className={`text-[10px] font-bold mt-1 ${m.growth >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {m.growth >= 0 ? '+' : ''}{m.growth}% 7d
                                </p>
                              )}
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
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 rounded bg-white/5 border border-white/10 text-center">
                          <ImageIcon className="h-4 w-4 mx-auto mb-1 text-foreground" />
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Posts</p>
                          <p className="text-xl font-black">{fmt(stats.total_posts)}</p>
                        </div>
                        <div className="p-3 rounded bg-white/5 border border-white/10 text-center">
                          <Heart className="h-4 w-4 mx-auto mb-1 text-[#ee2a7b]" />
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Curtidas</p>
                          <p className="text-xl font-black text-[#ee2a7b]">{fmt(stats.total_likes)}</p>
                        </div>
                        <div className="p-3 rounded bg-white/5 border border-white/10 text-center">
                          <MessageCircle className="h-4 w-4 mx-auto mb-1 text-primary" />
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Comentários</p>
                          <p className="text-xl font-black text-primary">{fmt(stats.total_comments)}</p>
                        </div>
                        <div className="p-3 rounded bg-white/5 border border-white/10 text-center">
                          <TrendingUp className="h-4 w-4 mx-auto mb-1 text-success" />
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Eng. Médio</p>
                          <p className="text-xl font-black text-success">{fmt(stats.avg_engagement)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Demografia */}
                  {Object.keys(demo).length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {demo.audience_country && (
                        <div>
                          <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                            <Globe className="h-3 w-3" /> Top Países
                          </h4>
                          <div className="space-y-1.5">
                            {Object.entries(demo.audience_country)
                              .sort((a: any, b: any) => b[1] - a[1])
                              .slice(0, 5)
                              .map(([k, v]: any) => (
                                <div key={k} className="flex justify-between text-xs px-2 py-1 bg-white/5 rounded">
                                  <span className="font-bold">{k}</span>
                                  <span className="text-muted-foreground">{fmt(v)}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                      {demo.audience_city && (
                        <div>
                          <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                            <MapPin className="h-3 w-3" /> Top Cidades
                          </h4>
                          <div className="space-y-1.5">
                            {Object.entries(demo.audience_city)
                              .sort((a: any, b: any) => b[1] - a[1])
                              .slice(0, 5)
                              .map(([k, v]: any) => (
                                <div key={k} className="flex justify-between text-xs px-2 py-1 bg-white/5 rounded">
                                  <span className="font-bold truncate">{k}</span>
                                  <span className="text-muted-foreground">{fmt(v)}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                      {demo.audience_gender_age && (
                        <div>
                          <h4 className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                            <Users className="h-3 w-3" /> Gênero / Idade
                          </h4>
                          <div className="space-y-1.5">
                            {Object.entries(demo.audience_gender_age)
                              .sort((a: any, b: any) => b[1] - a[1])
                              .slice(0, 6)
                              .map(([k, v]: any) => (
                                <div key={k} className="flex justify-between text-xs px-2 py-1 bg-white/5 rounded">
                                  <span className="font-bold">{k}</span>
                                  <span className="text-muted-foreground">{fmt(v)}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mais engajados */}
                  {posts.length > 0 && (
                    <div>
                      <h4 className="text-2xl md:text-3xl uppercase font-black tracking-widest mb-6 flex items-center gap-3 text-[#39ff14]" style={{ textShadow: '0 0 4px rgba(57,255,20,0.6), 0 0 10px rgba(57,255,20,0.3)' }}>
                        <TrendingUp className="h-7 w-7" style={{ filter: 'drop-shadow(0 0 3px rgba(57,255,20,0.7))' }} /> Mais Engajados (top 12)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {[...posts]
                          .sort((a: any, b: any) => ((b.likes || 0) + (b.comments || 0)) - ((a.likes || 0) + (a.comments || 0)))
                          .slice(0, 12)
                          .map((p: any) => (
                            <a
                              key={`eng-${p.id}`}
                              href={p.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative aspect-square overflow-hidden rounded bg-secondary border border-success/30 hover:border-success transition-colors"
                            >
                              {p.media_url ? (
                                <img src={p.media_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Instagram className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-success text-black text-[9px] font-black uppercase">
                                {fmt((p.likes || 0) + (p.comments || 0))}
                              </div>
                              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-[10px] font-bold">
                                <div className="flex items-center gap-1"><Heart className="h-3 w-3" /> {fmt(p.likes)}</div>
                                <div className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {fmt(p.comments)}</div>
                              </div>
                            </a>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Posts recentes */}
                  {posts.length > 0 && (
                    <div>
                      <h4 className="text-2xl md:text-3xl uppercase font-black tracking-widest mb-6 flex items-center gap-3 text-[#ff2bd6]" style={{ textShadow: '0 0 4px rgba(255,43,214,0.6), 0 0 10px rgba(255,43,214,0.3)' }}>
                        <ImageIcon className="h-7 w-7" style={{ filter: 'drop-shadow(0 0 3px rgba(255,43,214,0.7))' }} /> Posts Recentes (12 mais novos)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {[...posts]
                          .sort((a: any, b: any) => {
                            const ta = new Date(a.timestamp || a.created_time || 0).getTime();
                            const tb = new Date(b.timestamp || b.created_time || 0).getTime();
                            return tb - ta;
                          })
                          .slice(0, 12)
                          .map((p: any) => (
                            <a
                              key={p.id}
                              href={p.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative aspect-square overflow-hidden rounded bg-secondary border border-white/10 hover:border-primary/50 transition-colors"
                            >
                              {p.media_url ? (
                                <img src={p.media_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Instagram className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-[10px] font-bold">
                                <div className="flex items-center gap-1"><Heart className="h-3 w-3" /> {fmt(p.likes)}</div>
                                <div className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {fmt(p.comments)}</div>
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

export default InstagramPage;
