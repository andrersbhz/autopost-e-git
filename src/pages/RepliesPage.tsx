import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Preloader from '@/components/Preloader';
import { MessagesSquare, RefreshCw, Facebook, AtSign, ExternalLink, Loader2, Bot, Instagram } from 'lucide-react';

type Interaction = {
  id: string;
  platform: string;
  author_name: string | null;
  content: string;
  ai_response: string | null;
  status: string;
  error_message: string | null;
  original_link: string | null;
  created_at: string;
  processed_at: string | null;
};

const PLATFORM_META: Record<string, { label: string; icon: typeof Facebook }> = {
  facebook: { label: 'Facebook', icon: Facebook },
  instagram: { label: 'Instagram', icon: Instagram },
  threads: { label: 'Threads', icon: AtSign },
};

const statusInfo = (status: string) => {
  switch (status) {
    case 'replied':
    case 'responded':
      return { label: 'Respondido', className: 'bg-success/10 text-success border-success/30' };
    case 'error':
    case 'failed':
      return { label: 'Erro', className: 'bg-destructive/10 text-destructive border-destructive/40' };
    case 'skipped':
      return { label: 'Ignorado', className: 'bg-muted/20 text-muted-foreground border-white/10' };
    default:
      return { label: 'Pendente', className: 'bg-primary/10 text-primary border-primary/30' };
  }
};

const RepliesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning] = useState(false);
  const [items, setItems] = useState<Interaction[]>([]);
  const [platform, setPlatform] = useState<'all' | 'facebook' | 'instagram' | 'threads'>('all');
  const [status, setStatus] = useState<'all' | 'pending' | 'replied' | 'error'>('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    if (!user) return;
    setRefreshing(true);
    const { data, error } = await supabase
      .from('social_interactions')
      .select('id, platform, author_name, content, ai_response, status, error_message, original_link, created_at, processed_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) {
      toast({ title: 'Erro ao carregar respostas', description: 'Não foi possível consultar as interações.', variant: 'destructive' });
    }
    setItems((data as Interaction[]) || []);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      await load();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const runRobot = async () => {
    if (!user) return;
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-social-replies', { body: { userId: user.id } });
      if (error) throw error;
      toast({
        title: 'Robô social executado',
        description: `${data?.newInteractions || 0} novos comentários · ${data?.replied || 0} respostas enviadas.`,
      });
      await load();
    } catch {
      toast({ title: 'Falha ao executar o robô', description: 'Verifique as conexões sociais e tente novamente.', variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((i) => {
      if (platform !== 'all' && i.platform !== platform) return false;
      if (status !== 'all') {
        const s = statusInfo(i.status).label;
        if (status === 'pending' && s !== 'Pendente') return false;
        if (status === 'replied' && s !== 'Respondido') return false;
        if (status === 'error' && s !== 'Erro') return false;
      }
      if (term && !`${i.author_name || ''} ${i.content} ${i.ai_response || ''}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [items, platform, status, search]);

  const counts = useMemo(() => {
    const c = { total: items.length, pending: 0, replied: 0, error: 0 };
    items.forEach((i) => {
      const s = statusInfo(i.status).label;
      if (s === 'Pendente') c.pending++;
      else if (s === 'Respondido') c.replied++;
      else if (s === 'Erro') c.error++;
    });
    return c;
  }, [items]);

  if (loading) return <Preloader message="carregando dados aguarde" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-white/5 pb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/20 flex items-center justify-center rounded-sm border border-primary/30">
            <MessagesSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Central de Respostas</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              Facebook e Threads · data, canal e status
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled={refreshing} onClick={load} className="text-[10px] font-bold uppercase tracking-widest">
            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button size="sm" disabled={running} onClick={runRobot} className="text-[10px] font-bold uppercase tracking-widest">
            {running ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Bot className="h-3.5 w-3.5 mr-2" />}
            Responder pendentes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: counts.total },
          { label: 'Pendentes', value: counts.pending },
          { label: 'Respondidos', value: counts.replied },
          { label: 'Com erro', value: counts.error },
        ].map((c) => (
          <Card key={c.label} className="glass-card">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">{c.label}</p>
              <p className="text-2xl font-black">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card">
        <CardContent className="p-4 flex flex-wrap items-center gap-2">
          {(['all', 'facebook', 'instagram', 'threads'] as const).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={platform === p ? 'default' : 'outline'}
              onClick={() => setPlatform(p)}
              className="text-[10px] font-bold uppercase tracking-widest"
            >
              {p === 'all' ? 'Todos os canais' : PLATFORM_META[p].label}
            </Button>
          ))}
          <span className="mx-2 h-5 w-px bg-white/10 hidden sm:block" />
          {(['all', 'pending', 'replied', 'error'] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? 'default' : 'outline'}
              onClick={() => setStatus(s)}
              className="text-[10px] font-bold uppercase tracking-widest"
            >
              {s === 'all' ? 'Todos os status' : s === 'pending' ? 'Pendentes' : s === 'replied' ? 'Respondidos' : 'Com erro'}
            </Button>
          ))}
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por autor ou texto..."
            className="h-9 w-full sm:w-64 sm:ml-auto text-xs"
          />
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="glass-card border-dashed border-primary/30 p-12 text-center">
          <MessagesSquare className="h-10 w-10 text-primary/40 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Nenhuma interação encontrada</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Conecte as contas do Facebook e do Threads e execute o robô social para começar a acompanhar as respostas.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((i) => {
            const meta = PLATFORM_META[i.platform] || { label: i.platform, icon: MessagesSquare };
            const Icon = meta.icon;
            const st = statusInfo(i.status);
            return (
              <Card key={i.id} className="glass-card hover-scale">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{meta.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        · {new Date(i.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-widest ${st.className}`}>
                        {st.label}
                      </Badge>
                      {i.original_link && (
                        <a
                          href={i.original_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold uppercase tracking-widest text-primary inline-flex items-center gap-1"
                        >
                          Abrir <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">
                      {i.author_name || 'Autor desconhecido'}
                    </p>
                    <p className="text-sm">{i.content}</p>
                  </div>

                  {i.ai_response && (
                    <div className="p-3 rounded bg-white/5 border border-white/10">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Resposta enviada</p>
                      <p className="text-sm">{i.ai_response}</p>
                    </div>
                  )}

                  {i.error_message && (
                    <p className="text-xs text-destructive">{i.error_message}</p>
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

export default RepliesPage;
