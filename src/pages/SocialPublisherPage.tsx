import { useEffect, useMemo, useState } from 'react';
import { Facebook, Instagram, MessageSquareText, Plus, RefreshCw, Send, CheckCircle2, AlertCircle, Power } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type SocialAccount = {
  key: string;
  sourceId: string;
  platform: 'facebook' | 'instagram' | 'threads';
  name: string;
  subtitle?: string;
  avatar?: string | null;
  active: boolean;
};

const SocialPublisherPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const loadAccounts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: meta }, { data: threads, error: threadsError }] = await Promise.all([
        supabase
          .from('facebook_accounts')
          .select('id,page_id,page_name,picture_url,instagram_account_id,is_active,facebook_enabled,instagram_enabled')
          .eq('user_id', user.id),
        supabase
          .from('threads_accounts' as any)
          .select('id,threads_user_id,username,is_active')
          .eq('user_id', user.id),
      ]);
      if (threadsError) throw threadsError;

      const next: SocialAccount[] = [];
      for (const row of (meta || []) as any[]) {
        next.push({
          key: `facebook:${row.page_id}`,
          sourceId: row.id,
          platform: 'facebook',
          name: row.page_name || row.page_id,
          subtitle: 'Página do Facebook',
          avatar: row.picture_url,
          active: Boolean(row.is_active && row.facebook_enabled),
        });
        if (row.instagram_account_id) {
          next.push({
            key: `instagram:${row.instagram_account_id}`,
            sourceId: row.id,
            platform: 'instagram',
            name: `${row.page_name} · Instagram`,
            subtitle: `Instagram Business vinculado a ${row.page_name}`,
            avatar: row.picture_url,
            active: Boolean(row.is_active && row.instagram_enabled),
          });
        }
      }
      for (const row of (threads || []) as any[]) {
        next.push({
          key: `threads:${row.id}`,
          sourceId: row.id,
          platform: 'threads',
          name: row.username ? `@${row.username}` : row.threads_user_id,
          subtitle: 'Perfil do Threads',
          active: Boolean(row.is_active),
        });
      }

      setAccounts(next);
      setSelected((current) => current.filter((key) => next.some((account) => account.key === key && account.active)));
    } catch (e: any) {
      toast({ title: 'Erro ao carregar contas', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAccounts(); }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const threads = params.get('threads');
    if (threads === 'connected') {
      toast({ title: 'Threads conectado', description: 'A conexão foi salva no banco e permanecerá ativa até você desconectar.' });
      loadAccounts();
      window.history.replaceState({}, '', '/social');
    } else if (threads === 'error') {
      toast({ title: 'Falha ao conectar Threads', description: params.get('message') || 'Verifique o app da Meta.', variant: 'destructive' });
      window.history.replaceState({}, '', '/social');
    }
  }, []);

  const selectedAccounts = useMemo(() => accounts.filter((account) => selected.includes(account.key)), [accounts, selected]);
  const toggle = (account: SocialAccount) => {
    if (!account.active) return;
    setSelected((current) => current.includes(account.key) ? current.filter((key) => key !== account.key) : [...current, account.key]);
  };

  const connectMeta = async () => {
    const { data, error } = await supabase.functions.invoke('facebook-oauth-start', {
      body: { returnUrl: `${window.location.origin}/social` },
    });
    if (error || !data?.authUrl) {
      toast({ title: 'Falha ao iniciar Meta', description: error?.message || data?.error || 'OAuth indisponível', variant: 'destructive' });
      return;
    }
    window.location.href = data.authUrl;
  };

  const connectThreads = async () => {
    const { data, error } = await supabase.functions.invoke('threads-oauth-start', {
      body: { returnUrl: `${window.location.origin}/social` },
    });
    if (error || !data?.authUrl) {
      toast({ title: 'Falha ao iniciar Threads', description: error?.message || data?.error || 'OAuth indisponível', variant: 'destructive' });
      return;
    }
    window.location.href = data.authUrl;
  };

  const disconnectAccount = async (account: SocialAccount) => {
    if (!account.active) return;
    if (!window.confirm(`Desconectar ${account.name}? A conexão continuará salva no banco e poderá ser reativada ao conectar novamente.`)) return;

    try {
      if (account.platform === 'threads') {
        const { error } = await supabase
          .from('threads_accounts' as any)
          .update({ is_active: false, disconnected_at: new Date().toISOString() } as any)
          .eq('id', account.sourceId);
        if (error) throw error;
      } else {
        const patch = account.platform === 'facebook'
          ? { facebook_enabled: false, disconnected_at: new Date().toISOString() }
          : { instagram_enabled: false, disconnected_at: new Date().toISOString() };
        const { error } = await supabase
          .from('facebook_accounts')
          .update(patch as any)
          .eq('id', account.sourceId);
        if (error) throw error;
      }
      setSelected((current) => current.filter((key) => key !== account.key));
      toast({ title: 'Desconectado', description: 'A conexão foi preservada no banco e não será usada até ser reconectada.' });
      await loadAccounts();
    } catch (e: any) {
      toast({ title: 'Erro ao desconectar', description: e.message, variant: 'destructive' });
    }
  };

  const publish = async () => {
    if (!user) return;
    if (!caption.trim()) return toast({ title: 'Escreva uma legenda', variant: 'destructive' });
    if (selected.length === 0) return toast({ title: 'Selecione ao menos uma conta conectada', variant: 'destructive' });

    setPublishing(true);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke('publish-social', {
        body: {
          userId: user.id,
          content: { caption: caption.trim(), imageUrl: imageUrl.trim() || null, linkUrl: linkUrl.trim() || null },
          targetKeys: selected,
        },
      });
      if (error) throw error;
      setResults(data?.results || []);
      toast({
        title: data?.success ? 'Publicação concluída' : 'Nenhuma publicação concluída',
        description: data?.message,
        variant: data?.success ? 'default' : 'destructive',
      });
    } catch (e: any) {
      toast({ title: 'Erro ao publicar', description: e.message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  const iconFor = (platform: SocialAccount['platform']) => platform === 'facebook' ? Facebook : platform === 'instagram' ? Instagram : MessageSquareText;
  const activeCount = accounts.filter((account) => account.active).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-border/60 pb-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">Social Publisher</p>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">Publicação independente em redes sociais</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">As conexões ficam salvas no banco e permanecem ativas entre sessões até você clicar em Desconectar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadAccounts} disabled={loading}><RefreshCw className={loading ? 'animate-spin' : ''} />Atualizar</Button>
          <Button variant="outline" onClick={connectMeta}><Plus />Adicionar Meta</Button>
          <Button onClick={connectThreads}><Plus />Adicionar Threads</Button>
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-card/50 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {activeCount > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${activeCount > 0 ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
          </span>
          <span className="text-sm font-semibold">{activeCount > 0 ? 'Conexões ativas' : 'Nenhuma conexão ativa'}</span>
        </div>
        <span className="text-xs text-muted-foreground">{activeCount} conectada(s)</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-border/60 bg-card/70 shadow-sm">
          <CardHeader><CardTitle className="text-base font-semibold">Contas salvas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {accounts.length === 0 && !loading && <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground text-center">Nenhuma conta salva. Use “Adicionar Meta” ou “Adicionar Threads”.</div>}
            {accounts.map((account) => {
              const Icon = iconFor(account.platform);
              const checked = selected.includes(account.key);
              return (
                <div key={account.key} className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border/60 bg-background/35'} ${account.active ? 'hover:bg-muted/40' : 'opacity-65'}`}>
                  <button onClick={() => toggle(account)} className="flex min-w-0 flex-1 items-center gap-3 text-left" disabled={!account.active}>
                    <div className="h-10 w-10 rounded-lg border border-border/60 bg-background flex items-center justify-center overflow-hidden shrink-0">{account.avatar ? <img src={account.avatar} alt="" className="h-full w-full object-cover" /> : <Icon className="h-4 w-4" />}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{account.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{account.subtitle}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          {account.active && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                          <span className={`relative inline-flex h-2 w-2 rounded-full ${account.active ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-[0.14em] ${account.active ? 'text-emerald-500' : 'text-muted-foreground'}`}>{account.active ? 'Conectado' : 'Desconectado'}</span>
                      </div>
                    </div>
                    <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${checked ? 'bg-primary border-primary text-primary-foreground' : 'border-border'}`}>{checked && <CheckCircle2 className="h-3.5 w-3.5" />}</div>
                  </button>
                  {account.active && (
                    <Button variant="ghost" size="sm" onClick={() => disconnectAccount(account)} className="text-destructive hover:bg-destructive hover:text-destructive-foreground" title="Desconectar">
                      <Power className="h-4 w-4" />
                      <span className="hidden sm:inline">Desconectar</span>
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70 shadow-sm">
          <CardHeader><CardTitle className="text-base font-semibold">Nova publicação</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Legenda</Label><Textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Escreva a publicação..." className="min-h-44 resize-y" /></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>URL da imagem</Label><Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://.../imagem.jpg" /></div>
              <div className="space-y-2"><Label>Link opcional</Label><Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." /></div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">Selecionadas: <strong className="text-foreground">{selectedAccounts.length}</strong> conta(s). Apenas contas com status Conectado podem ser selecionadas.</div>
            <Button className="w-full md:w-auto" onClick={publish} disabled={publishing}>{publishing ? <RefreshCw className="animate-spin" /> : <Send />}{publishing ? 'Publicando...' : 'Publicar nas contas selecionadas'}</Button>
          </CardContent>
        </Card>
      </div>

      {results.length > 0 && (
        <Card className="border-border/60 bg-card/70 shadow-sm">
          <CardHeader><CardTitle className="text-base font-semibold">Resultado por conta</CardTitle></CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {results.map((r, i) => (
              <div key={`${r.accountKey || r.target}-${i}`} className="rounded-lg border border-border/60 p-3 bg-background/30">
                <div className="flex items-start gap-2">{r.ok ? <CheckCircle2 className="h-4 w-4 text-success mt-0.5" /> : <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />}<div className="min-w-0"><p className="text-sm font-semibold truncate">{r.target || r.accountKey}</p><p className="text-xs text-muted-foreground">{r.channel}</p>{r.error && <p className="text-xs text-destructive mt-1 break-words">{r.error}</p>}</div></div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SocialPublisherPage;
