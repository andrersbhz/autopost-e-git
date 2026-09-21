import { useEffect, useState, useMemo } from 'react';
import Preloader from '@/components/Preloader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, RefreshCw, MessageSquare, Bot, UserCheck, ExternalLink, History, ThumbsUp, AtSign, Power, PowerOff, Activity, AlertCircle, Info, Instagram, ChevronRight, ChevronDown as ChevronDownIcon, TrendingUp, FileText, UserPlus, UserMinus, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/backend';
import { format, parseISO, startOfDay, eachDayOfInterval, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';

const SocialRobotPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [interactions, setInteractions] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [followerGrowthMode, setFollowerGrowthMode] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [growthSettings, setGrowthSettings] = useState({
    followsMin: 2,
    followsMax: 8,
    durationMin: 6,
    durationMax: 10,
    humanLike: true
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState<'interactions' | 'metrics' | 'telemetry' | 'growth' | 'settings'>('telemetry');
  const [invitedFollowers, setInvitedFollowers] = useState<any[]>([]);
  const [activeFollows, setActiveFollows] = useState<any[]>([]);
  const [loadingInvited, setLoadingInvited] = useState(false);
  const [compactMode, setCompactMode] = useState(true);
  const [dateFilter, setDateFilter] = useState<{start: string, end: string}>({
    start: format(new Date().setDate(new Date().getDate() - 7), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const fetchLogs = async () => {
    if (!user) return;
    setLoadingLogs(true);
    try {
      const { data } = await supabase
        .from('automation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      setLogs(data || []);
    } catch (error) {
      console.error('Logs error:', error);
    } finally {
      setLoadingLogs(false);
    }
  };
  
  const fetchInvitedFollowers = async () => {
    if (!user) return;
    setLoadingInvited(true);
    try {
      const { data } = await supabase
        .from('automation_logs')
        .select('*')
        .ilike('message', '%IA convidou%')
        .gte('created_at', `${dateFilter.start}T00:00:00`)
        .lte('created_at', `${dateFilter.end}T23:59:59`)
        .order('created_at', { ascending: false });
      setInvitedFollowers(data || []);
    } catch (error) {
      console.error('Invited followers error:', error);
    } finally {
      setLoadingInvited(false);
    }
  };

  const fetchActiveFollows = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('social_follows')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'following')
        .order('followed_at', { ascending: false });
      setActiveFollows(data || []);
    } catch (error) {
      console.error('Error fetching active follows:', error);
    }
  };

  const fetchSettings = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('user_settings')
        .select(`
          automation_enabled, 
          follower_growth_mode,
          instagram_follows_per_day_min,
          instagram_follows_per_day_max,
          instagram_follow_duration_min,
          instagram_follow_duration_max,
          instagram_automation_human_like
        `)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setAutomationEnabled(!!data.automation_enabled);
        if (data.follower_growth_mode !== null) {
          setFollowerGrowthMode(!!data.follower_growth_mode);
        }
        setGrowthSettings({
          followsMin: data.instagram_follows_per_day_min || 2,
          followsMax: data.instagram_follows_per_day_max || 8,
          durationMin: data.instagram_follow_duration_min || 6,
          durationMax: data.instagram_follow_duration_max || 10,
          humanLike: data.instagram_automation_human_like !== false
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const saveGrowthSettings = async () => {
    if (!user) return;
    setLoadingSettings(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          instagram_follows_per_day_min: growthSettings.followsMin,
          instagram_follows_per_day_max: growthSettings.followsMax,
          instagram_follow_duration_min: growthSettings.durationMin,
          instagram_follow_duration_max: growthSettings.durationMax,
          instagram_automation_human_like: growthSettings.humanLike
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      toast({ title: 'Configurações Salvas', description: 'O robô foi atualizado com as novas diretrizes.' });
    } catch (error) {
      toast({ title: 'Erro', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setLoadingSettings(false);
    }
  };

  const toggleAutomation = async (enabled: boolean) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ automation_enabled: enabled })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setAutomationEnabled(enabled);
      toast({ 
        title: enabled ? 'Automação Ativada' : 'Automação Desativada', 
        description: enabled ? 'O robô agora trabalhará 24/7 para você.' : 'O robô parou de responder automaticamente.' 
      });
    } catch (error) {
      toast({ title: 'Erro', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  const toggleFollowerGrowth = async (enabled: boolean) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ follower_growth_mode: enabled })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setFollowerGrowthMode(enabled);
      toast({ 
        title: enabled ? 'Modo Crescimento Ativado' : 'Modo Crescimento Desativado', 
        description: enabled ? 'O robô agora focará em convidar novas pessoas para seguir.' : 'O robô voltou ao modo de interação padrão.' 
      });
    } catch (error) {
      toast({ title: 'Erro', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  const fetchInteractions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('social_interactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setInteractions(data || []);
    } catch (error) {
      console.error('Interactions error:', error);
      toast({ title: 'Erro ao carregar interações', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessInteractions = async () => {
    if (!user) return;
    setProcessing(true);
    try {
      await supabase.functions.invoke('handle-social-interactions', { body: { userId: user.id } });
      const { data } = await supabase.functions.invoke('process-social-replies', { body: { userId: user.id } });
      
      toast({ 
        title: 'Sucesso', 
        description: `${data?.newInteractions || 0} novas interações encontradas em ${data?.postsScanned || 0} postagens.` 
      });
      fetchInteractions();
      fetchMetrics();
    } catch (error) {
      toast({ title: 'Erro no processamento', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const fetchMetrics = async () => {
    if (!user) return;
    setLoadingMetrics(true);
    try {
      const { data } = await supabase.functions.invoke('fetch-meta-metrics', {
        body: { userId: user.id }
      });
      if (data?.success) setMetrics(data.pages || []);
    } catch (error) {
      console.error('Metrics error:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    fetchInteractions();
    fetchSettings();
    fetchLogs();
    fetchMetrics();
    fetchInvitedFollowers();
    fetchActiveFollows();

    const logsChannel = supabase
      .channel('realtime-robot-data')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'automation_logs' }, (payload) => {
        setLogs(prev => [payload.new, ...prev].slice(0, 30));
        fetchInvitedFollowers(); 
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'social_interactions' }, () => {
        fetchInteractions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(logsChannel);
    };
  }, [user]);

  if (loading) return <Preloader message="Iniciando Robô Social..." />;

  return (
    <div className="space-y-6 lg:space-y-8 animate-float-up">
      {/* Header Panel */}
      <div className="flex flex-row items-center justify-between gap-4 p-4 glass-card border-[#a3ff12]/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#a3ff12]/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-[#a3ff12]/10 transition-colors duration-700" />
        
        <div className="relative z-10 flex items-center gap-6 flex-1 min-w-0">
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2 bg-[#a3ff12]/10 rounded-none border border-[#a3ff12]/30 shrink-0">
              <Bot className="h-5 w-5 text-[#a3ff12]" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black text-[#a3ff12] uppercase tracking-tighter font-montserrat">Robô Social A3</h1>
              <p className="text-muted-foreground text-[8px] uppercase tracking-[0.2em] flex items-center gap-1.5 font-bold">
                <span className="flex h-1.5 w-1.5 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span></span>
                Interface Neural
              </p>
            </div>
          </div>
          
          <div className="hidden md:block h-8 w-px bg-white/10" />
          
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar flex-1 text-[10px] font-black uppercase tracking-tighter">
            <div className="flex flex-col shrink-0">
              <span className="text-[7px] text-muted-foreground uppercase font-black tracking-widest mb-0.5">Status</span>
              <div className={cn(automationEnabled ? "text-success" : "text-destructive")}>
                {automationEnabled ? "ONLINE" : "OFFLINE"}
              </div>
            </div>
            <div className="flex flex-col shrink-0">
              <span className="text-[7px] text-muted-foreground uppercase font-black tracking-widest mb-0.5">Modo</span>
              <div className="text-[#a3ff12]">{followerGrowthMode ? "CRESCIMENTO" : "PADRÃO"}</div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 relative z-10 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setCompactMode(!compactMode)} className="text-[9px] font-black uppercase rounded-none border-2 border-white/10 h-8 px-2">
            {compactMode ? "COMPACTO" : "NORMAL"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => toggleAutomation(!automationEnabled)} className={cn("text-[9px] font-black uppercase rounded-none border-2 h-8 px-3 transition-colors", automationEnabled ? "border-success text-success hover:text-success" : "border-destructive text-destructive hover:text-destructive")}>
            {automationEnabled ? <Power className="h-3 w-3 mr-1" /> : <PowerOff className="h-3 w-3 mr-1" />}
            {automationEnabled ? "DESATIVAR" : "ATIVAR"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => toggleFollowerGrowth(!followerGrowthMode)} className="text-[9px] font-black uppercase rounded-none border-2 border-[#b57bff] h-8 px-3 text-[#b57bff]">
            <UserCheck className="h-3 w-3 mr-1" /> MOD {followerGrowthMode ? "CRESC." : "PADRÃO"}
          </Button>
          <Button size="sm" onClick={handleProcessInteractions} disabled={processing} className="bg-[#a3ff12] text-white font-black uppercase h-8 px-3 rounded-none hover:text-black">
            {processing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />} SYNC
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 glass border-white/5 w-fit rounded-none">
        {[
          { id: 'telemetry', label: 'Comando', icon: Bot },
          { id: 'interactions', label: 'Interações', icon: History },
          { id: 'metrics', label: 'Análise', icon: Activity },
          { id: 'growth', label: 'Expansão', icon: TrendingUp },
          { id: 'settings', label: 'Diretrizes', icon: ShieldCheck },
        ].map((tab) => (
          <Button key={tab.id} variant={activeTab === tab.id ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab(tab.id as any)} className={cn("text-[9px] uppercase font-black tracking-widest h-7 px-3 rounded-none relative", activeTab === tab.id ? "text-[#a3ff12]" : "text-muted-foreground")}>
            <tab.icon className="h-3 w-3 mr-1.5" /> {tab.label}
            {activeTab === tab.id && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#a3ff12]" />}
          </Button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'interactions' && (
          <Card className="glass-card border-primary/20 overflow-hidden shadow-elevated hover-lift">
            <CardHeader className="p-4 border-b border-white/5 flex items-center justify-between">
              <CardTitle className="text-xl font-black uppercase">Fluxo de Interações</CardTitle>
              <Badge variant="outline" className="border-primary/30 text-primary uppercase text-[8px] font-black">{interactions.length} NODES</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                {interactions.map(item => (
                  <div key={item.id} className="p-4 flex items-start gap-4 hover:bg-white/[0.03] transition-all">
                    <div className="h-10 w-10 border border-primary/30 bg-primary/5 flex items-center justify-center overflow-hidden">
                      {item.author_avatar ? <img src={item.author_avatar} className="h-full w-full object-cover" /> : <Bot className="h-5 w-5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black uppercase tracking-tighter">{item.author_name} <Badge variant="outline" className="text-[7px] ml-2">{item.platform}</Badge></p>
                      <p className="text-xs text-foreground italic truncate">"{item.content}"</p>
                    </div>
                    <Badge variant="secondary" className={cn("text-[8px] font-black", item.status === 'replied' ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                      {item.status === 'replied' ? 'RESOLVIDO' : 'PENDENTE'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'metrics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {metrics.map((page) => (
              <Card key={page.page_id} className="glass-card border-white/5 hover-lift">
                <CardHeader className="p-4 border-b border-white/5"><CardTitle className="text-lg font-black uppercase truncate">{page.page_name}</CardTitle></CardHeader>
                <CardContent className="p-6 grid grid-cols-2 gap-4">
                   <div className="bg-white/5 p-4 text-center"><p className="text-[10px] text-muted-foreground uppercase font-black">Seguidores</p><p className="text-2xl font-black">{page.facebook?.fan_count || 0}</p></div>
                   <div className="bg-white/5 p-4 text-center"><p className="text-[10px] text-muted-foreground uppercase font-black">Likes</p><p className="text-2xl font-black">{page.facebook?.post_stats?.total_likes || 0}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'growth' && (
          <div className="space-y-6">
            {/* Painel de Controle de Expansão */}
            <Card className="glass-card border-primary/20 overflow-hidden shadow-elevated hover-lift">
              <CardHeader className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 border border-primary/20"><TrendingUp className="h-6 w-6 text-primary" /></div>
                    <div>
                      <CardTitle className="text-xl font-black uppercase">Motor de Expansão</CardTitle>
                      <CardDescription className="text-xs uppercase font-bold text-muted-foreground">Atrair novos seguidores de forma orgânica e automática</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("font-black px-3 h-8 border", followerGrowthMode ? "bg-success/10 text-success border-success/40" : "bg-muted text-muted-foreground border-white/10")}>
                      {followerGrowthMode ? "AUTO: ON" : "AUTO: OFF"}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!user) return;
                        setProcessing(true);
                        try {
                          const { data, error } = await supabase.functions.invoke('handle-social-growth', { body: { userId: user.id } });
                          if (error) throw error;
                          toast({ title: 'Ciclo executado', description: `${data?.followed || 0} novos seguidos, ${data?.unfollowed || 0} unfollows. Meta hoje: ${data?.targetToday || 0}.` });
                          fetchActiveFollows();
                          fetchLogs();
                        } catch (err) {
                          toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' });
                        } finally {
                          setProcessing(false);
                        }
                      }}
                      disabled={processing}
                      className="bg-primary text-white font-black uppercase h-8 px-3 rounded-none text-[10px] hover:text-black"
                    >
                      {processing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <UserPlus className="h-3 w-3 mr-1" />}
                      Executar Ciclo
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black/40 border border-primary/10 p-4">
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Seguindo</p>
                  <p className="text-3xl font-black text-primary">{activeFollows.length}</p>
                </div>
                <div className="bg-black/40 border border-primary/10 p-4">
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Convites IA</p>
                  <p className="text-3xl font-black text-primary">{invitedFollowers.length}</p>
                </div>
                <div className="bg-black/40 border border-primary/10 p-4">
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Meta/Dia</p>
                  <p className="text-3xl font-black text-primary">{growthSettings.followsMin}-{growthSettings.followsMax}</p>
                </div>
                <div className="bg-black/40 border border-primary/10 p-4">
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Duração</p>
                  <p className="text-3xl font-black text-primary">{growthSettings.durationMin}-{growthSettings.durationMax}d</p>
                </div>
              </CardContent>
            </Card>

            {/* Guia: Como o robô traz novos seguidores */}
            <Card className="glass-card border-white/5 overflow-hidden hover-lift">
              <CardHeader className="p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#a3ff12]/10 border border-[#a3ff12]/20"><Info className="h-5 w-5 text-[#a3ff12]" /></div>
                  <div>
                    <CardTitle className="text-lg font-black uppercase">Como Trazer Novos Seguidores</CardTitle>
                    <CardDescription className="text-xs uppercase font-bold text-muted-foreground">Estratégia em 4 passos — totalmente automatizada</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { n: '01', t: 'Mapear Audiência', d: 'O robô varre comentários e reações das suas páginas para identificar pessoas que já demonstraram interesse no seu nicho.' },
                  { n: '02', t: 'Engajamento Humanizado', d: 'A IA responde comentários e reage a interações pendentes, criando reciprocidade — o gatilho psicológico mais poderoso do social media.' },
                  { n: '03', t: 'Follow Estratégico', d: `Segue automaticamente entre ${growthSettings.followsMin} e ${growthSettings.followsMax} contas/dia entre os perfis mapeados, respeitando limites para evitar bloqueios.` },
                  { n: '04', t: 'Unfollow Inteligente', d: `Após ${growthSettings.durationMin}-${growthSettings.durationMax} dias, deixa de seguir quem não retribuiu, mantendo sua proporção saudável e seu alcance alto.` },
                ].map(step => (
                  <div key={step.n} className="bg-black/30 border border-primary/10 p-4 hover:border-primary/30 transition-all">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl font-black text-primary/40 leading-none">{step.n}</div>
                      <div className="flex-1">
                        <p className="text-sm font-black uppercase tracking-tighter text-primary">{step.t}</p>
                        <p className="text-xs text-muted-foreground font-medium mt-1 leading-relaxed">{step.d}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="md:col-span-2 bg-primary/5 border border-primary/20 p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">Modo Automático 24/7</p>
                      <p className="text-[10px] text-muted-foreground font-bold">Ative para o motor de crescimento rodar em segundo plano, sem precisar clicar em nada.</p>
                    </div>
                  </div>
                  <Switch checked={followerGrowthMode} onCheckedChange={toggleFollowerGrowth} />
                </div>
              </CardContent>
            </Card>

            {/* Conexões Ativas */}
            <Card className="glass-card border-primary/20 overflow-hidden shadow-elevated hover-lift">
              <CardHeader className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 border border-primary/20"><UserPlus className="h-6 w-6 text-primary" /></div>
                  <div><CardTitle className="text-xl font-black uppercase">Conexões Ativas</CardTitle><CardDescription className="text-xs uppercase font-bold text-muted-foreground">Monitoramento de crescimento estratégico</CardDescription></div>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/40 font-black px-4 h-8">{activeFollows.length} NODOS</Badge>
              </CardHeader>
              <CardContent className="p-0 max-h-[500px] overflow-y-auto no-scrollbar">
                {activeFollows.length === 0 ? (
                  <div className="p-12 text-center">
                    <UserPlus className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nenhuma conexão ativa ainda</p>
                    <p className="text-[10px] text-muted-foreground/60 font-bold mt-1">Ative o modo automático ou execute um ciclo agora.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {activeFollows.map(follow => (
                      <div key={follow.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 border border-primary/20 bg-primary/5 flex items-center justify-center overflow-hidden">{follow.target_avatar ? <img src={follow.target_avatar} className="h-full w-full object-cover" /> : <Bot className="h-6 w-6 text-primary" />}</div>
                          <div><p className="text-sm font-black uppercase tracking-tighter">{follow.target_username || 'Seguidor'}</p><p className="text-[10px] text-muted-foreground font-bold">Seguido em {format(new Date(follow.followed_at), 'dd/MM/yyyy')}</p></div>
                        </div>
                        <Badge variant="outline" className="text-[9px] font-black border-primary/30 text-primary uppercase">Unfollow em {format(addDays(new Date(follow.followed_at), growthSettings.durationMax), 'dd/MM')}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'telemetry' && (
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-[#a3ff12]/20 to-[#b57bff]/20 blur-3xl rounded-full pointer-events-none" />
            <div className="relative p-6 rounded-3xl border border-white/10 bg-[#0a0518]/80 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-[#a3ff12]" />
                <span className="text-xs text-white/40 ml-2 flex-1">a3.plataforma/live</span>
                <Button variant="ghost" size="sm" onClick={fetchLogs} className="h-7 px-2 text-white/60 hover:text-white">
                  <RefreshCw className={cn("h-3.5 w-3.5", loadingLogs && "animate-spin")} />
                </Button>
              </div>
              <div className="space-y-3 font-mono text-sm max-h-[600px] overflow-y-auto no-scrollbar pr-2">
                {logs.length === 0 && !loadingLogs && (
                  <div className="text-xs text-white/40 py-8 text-center">Sem eventos recentes.</div>
                )}
                {logs.map((log, i) => {
                  const isError = log.level === 'error';
                  const isRunning = i === 0 && log.level === 'info' && /processando|iniciando|executando|running/i.test(log.message || '');
                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]"
                      style={{ animationDelay: `${Math.min(i, 8) * 0.08}s` }}
                    >
                      {isError ? (
                        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                      ) : isRunning ? (
                        <div className="h-4 w-4 rounded-full border-2 border-[#a3ff12] border-t-transparent animate-spin flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-[#a3ff12] flex-shrink-0" />
                      )}
                      <span className={cn("flex-1 truncate", isError ? "text-destructive/90" : "text-white/80")}>{log.message}</span>
                      <span className="text-[10px] text-white/30 flex-shrink-0">{format(new Date(log.created_at), "HH:mm")}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-white/40">Eventos exibidos</span>
                <span className="text-[#a3ff12] font-black text-lg">{logs.length}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <Card className="glass-card border-primary/20 overflow-hidden shadow-elevated hover-lift">
            <CardHeader className="p-6 border-b border-white/5 bg-black/40">
              <div className="flex items-center gap-4"><div className="p-2 bg-primary/10 border border-primary/20"><ShieldCheck className="h-6 w-6 text-primary" /></div><div><CardTitle className="text-xl font-black uppercase">Diretrizes de Operação</CardTitle><CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Configuração Neural</CardDescription></div></div>
            </CardHeader>
            <CardContent className="p-8 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center"><Label className="text-sm font-black uppercase tracking-widest">Seguir por Dia</Label><Badge variant="secondary" className="font-black">{growthSettings.followsMin} - {growthSettings.followsMax}</Badge></div>
                    <div className="flex gap-4"><Input type="number" value={growthSettings.followsMin} onChange={e => setGrowthSettings({...growthSettings, followsMin: parseInt(e.target.value)})} className="bg-black/40 text-center font-black" /><Input type="number" value={growthSettings.followsMax} onChange={e => setGrowthSettings({...growthSettings, followsMax: parseInt(e.target.value)})} className="bg-black/40 text-center font-black" /></div>
                    <Slider value={[growthSettings.followsMin, growthSettings.followsMax]} min={0} max={50} step={1} onValueChange={([min, max]) => setGrowthSettings({...growthSettings, followsMin: min, followsMax: max})} className="mt-4" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center"><Label className="text-sm font-black uppercase tracking-widest">Duração (Dias)</Label><Badge variant="secondary" className="font-black">{growthSettings.durationMin} - {growthSettings.durationMax}</Badge></div>
                    <div className="flex gap-4"><Input type="number" value={growthSettings.durationMin} onChange={e => setGrowthSettings({...growthSettings, durationMin: parseInt(e.target.value)})} className="bg-black/40 text-center font-black" /><Input type="number" value={growthSettings.durationMax} onChange={e => setGrowthSettings({...growthSettings, durationMax: parseInt(e.target.value)})} className="bg-black/40 text-center font-black" /></div>
                    <Slider value={[growthSettings.durationMin, growthSettings.durationMax]} min={1} max={30} step={1} onValueChange={([min, max]) => setGrowthSettings({...growthSettings, durationMin: min, durationMax: max})} className="mt-4" />
                  </div>
                </div>
                <div className="space-y-8 bg-primary/5 p-8 border border-primary/10">
                  <div className="flex items-center justify-between p-4 border border-primary/20 bg-black/40"><Label className="text-xs font-black uppercase tracking-widest text-primary">Interação Humana</Label><Switch checked={growthSettings.humanLike} onCheckedChange={checked => setGrowthSettings({...growthSettings, humanLike: checked})} /></div>
                  <Button className="w-full bg-primary text-white font-black uppercase h-12 hover:scale-[1.02] hover:text-black transition-all shadow-neon-lilac" onClick={saveGrowthSettings} disabled={loadingSettings}>{loadingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />} Atualizar Diretrizes</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SocialRobotPage;