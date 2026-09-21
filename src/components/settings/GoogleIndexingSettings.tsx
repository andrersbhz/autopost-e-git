import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { Search, LogIn, Loader2, RefreshCw, CheckCircle2, History, ExternalLink, AlertCircle, KeyRound, ShieldCheck, Unplug } from 'lucide-react';
import ConnectionCard from '@/components/ConnectionCard';
import type { UserSettings } from '@/pages/SettingsPage';
import { forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Props {
  settings: UserSettings;
  onChange: (partial: Partial<UserSettings>) => void;
}

const GoogleIndexingSettings = forwardRef<HTMLDivElement, Props>(({ settings, onChange }, ref) => {
  const { toast } = useToast();
  const [oauthLoading, setOauthLoading] = useState(false);
  const [hasGoogleToken, setHasGoogleToken] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [hasGoogleClientSecret, setHasGoogleClientSecret] = useState(false);
  const [savingGoogleOAuth, setSavingGoogleOAuth] = useState(false);
  const connected = !!settings.google_indexing_key || hasGoogleToken;

  useEffect(() => {
    const checkConnector = async () => {
      const { data } = await supabase.functions.invoke('google-search-console-status');
      if (data?.connected) setHasGoogleToken(true);
    };

    const loadOAuthCredentialsStatus = async () => {
      try {
        const { data, error } = await supabase.rpc('get_google_oauth_credentials_status' as any);
        if (error) throw error;
        const status = data as any;
        setGoogleClientId(status?.client_id || '');
        setHasGoogleClientSecret(!!status?.has_secret);
      } catch (error) {
        console.error('[GoogleOAuth] Failed to load credentials status:', error);
      }
    };

    checkConnector();
    loadOAuthCredentialsStatus();
    fetchHistory();
  }, []);

  const saveGoogleOAuthCredentials = async () => {
    const clientId = googleClientId.trim();
    const clientSecret = googleClientSecret.trim();

    if (!clientId) {
      toast({ title: 'Client ID obrigatório', description: 'Informe o Google OAuth Client ID.', variant: 'destructive' });
      return;
    }

    if (!hasGoogleClientSecret && !clientSecret) {
      toast({ title: 'Client Secret obrigatório', description: 'Informe o Google OAuth Client Secret.', variant: 'destructive' });
      return;
    }

    setSavingGoogleOAuth(true);
    try {
      const { data, error } = await supabase.rpc('save_google_oauth_credentials' as any, {
        p_client_id: clientId,
        p_client_secret: clientSecret || null,
      });
      if (error) throw error;

      setGoogleClientSecret('');
      setHasGoogleClientSecret(!!(data as any)?.has_secret || hasGoogleClientSecret);
      toast({
        title: 'Credenciais Google protegidas',
        description: 'Client ID salvo e Client Secret armazenado de forma criptografada no Supabase Vault.',
      });
    } catch (error: any) {
      toast({ title: 'Erro ao salvar OAuth Google', description: error?.message || 'Não foi possível salvar as credenciais.', variant: 'destructive' });
    } finally {
      setSavingGoogleOAuth(false);
    }
  };

  const disconnectGoogleOAuthCredentials = async () => {
    try {
      const { error } = await supabase.rpc('disconnect_google_oauth_credentials' as any);
      if (error) throw error;
      setGoogleClientId('');
      setGoogleClientSecret('');
      setHasGoogleClientSecret(false);
      toast({ title: 'Credenciais removidas', description: 'As credenciais OAuth Google foram removidas do cofre seguro.' });
    } catch (error: any) {
      toast({ title: 'Erro ao remover', description: error?.message || 'Não foi possível remover as credenciais.', variant: 'destructive' });
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('google_indexing_history' as any)
        .select('*, articles(title)')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setHistory(data || []);
    } catch (e) {
      console.error('Error fetching indexing history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleGoogleConnect = async () => {
    setOauthLoading(true);
    try {
      console.log('[GoogleIndexingSettings] Invocando google-search-console-auth...');
      const { data, error } = await supabase.functions.invoke('google-search-console-auth', {
        body: { returnUrl: window.location.href }
      });
      
      if (error) throw error;
      if (data?.authUrl) {
        console.log('[GoogleIndexingSettings] Redirecionando para Google OAuth:', data.authUrl);
        window.location.assign(data.authUrl);
      } else {
        throw new Error('URL de autenticação não retornada');
      }
    } catch (e: any) {
      console.error('[GoogleIndexingSettings] Erro ao iniciar OAuth:', e);
      toast({ 
        title: 'Erro ao conectar', 
        description: e.message || 'Não foi possível iniciar a autenticação com o Google.', 
        variant: 'destructive' 
      });
    } finally {
      setOauthLoading(false);
    }
  };

  return (
    <ConnectionCard
      ref={ref}
      icon={<Search className="h-5 w-5 text-primary" />}
      title="Google Search Console / Indexing API"
      description="Indexação imediata, OAuth Google e monitoramento de novos posts"
      connected={connected}
      connectedInfo={connected ? (hasGoogleToken ? "Conectado via Google OAuth" : "Configurado (Chave JSON)") : undefined}
      onTest={handleGoogleConnect}
      testing={oauthLoading}
      onDisconnect={async () => {
        if (hasGoogleToken) {
           await supabase.from('user_settings').update({ google_search_console_token: null } as any).eq('user_id', (await supabase.auth.getUser()).data.user?.id);
           setHasGoogleToken(false);
        }
        onChange({ google_indexing_key: '' });
      }}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg border border-primary/20 bg-primary/10 p-2">
                <KeyRound className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">Credenciais Google OAuth do Sistema</p>
                  {hasGoogleClientSecret && (
                    <Badge variant="outline" className="border-success/40 text-success text-[10px]">
                      <span className="relative mr-1.5 flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                      </span>
                      PROTEGIDO
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Use aqui o Client ID e o Client Secret do aplicativo OAuth 2.0 Web criado no Google Cloud.
                </p>
              </div>
            </div>
            <ShieldCheck className="h-5 w-5 text-success shrink-0" />
          </div>

          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Google OAuth Client ID</Label>
              <Input
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
                placeholder="000000000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                autoComplete="off"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Google OAuth Client Secret</Label>
              <PasswordInput
                value={googleClientSecret}
                onChange={(e) => setGoogleClientSecret(e.target.value)}
                placeholder={hasGoogleClientSecret ? '••••••••••••••••  (já salvo — preencha apenas para substituir)' : 'GOCSPX-...'}
                autoComplete="new-password"
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                O secret não é carregado de volta para esta tela. Ele é enviado diretamente ao banco e armazenado criptografado no Supabase Vault.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={saveGoogleOAuthCredentials} disabled={savingGoogleOAuth} className="bg-primary font-semibold text-primary-foreground">
              {savingGoogleOAuth ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Salvar credenciais com segurança
            </Button>
            {(googleClientId || hasGoogleClientSecret) && (
              <Button type="button" size="sm" variant="outline" onClick={disconnectGoogleOAuthCredentials} disabled={savingGoogleOAuth}>
                <Unplug className="h-4 w-4 mr-2" /> Remover credenciais
              </Button>
            )}
          </div>
        </div>

        <div className="p-3 rounded-lg border border-primary/40 bg-gradient-to-br from-primary/10 to-accent/10">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Conectar com Conta Google (Simples)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Maneira mais rápida de autorizar a indexação automática via Search Console.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleGoogleConnect}
              disabled={oauthLoading}
              className="gradient-primary shrink-0"
            >
              {oauthLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : hasGoogleToken ? (
                <><RefreshCw className="h-4 w-4 mr-1.5" />Reconectar</>
              ) : (
                <><LogIn className="h-4 w-4 mr-1.5" />Conectar</>
              )}
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Ou use chave JSON</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Chave JSON da Conta de Serviço (Avançado)</Label>
          <Textarea
            placeholder='{"type": "service_account", "project_id": "...", ...}'
            value={settings.google_indexing_key || ''}
            onChange={(e) => onChange({ google_indexing_key: e.target.value })}
            className="h-20 text-xs font-mono"
          />
        </div>

        <Collapsible open={showHistory} onOpenChange={setShowHistory} className="space-y-2 border-t border-border pt-4 mt-4">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent text-muted-foreground flex items-center gap-2">
                <History className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Histórico de Indexação</span>
              </Button>
            </CollapsibleTrigger>
            {loadingHistory && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>

          <CollapsibleContent className="space-y-3">
            {history.length === 0 && !loadingHistory ? (
              <p className="text-xs text-muted-foreground italic py-2">Nenhuma solicitação enviada ainda.</p>
            ) : (
              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-3 pt-2">
                  {history.map((item) => (
                    <div key={item.id} className="p-2.5 rounded-md bg-muted/50 border border-border flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={item.status === 'success' ? 'default' : 'destructive'} className="text-[10px] h-4 px-1">
                          {item.status === 'success' ? 'Sucesso' : 'Erro'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(item.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        {item.articles?.title && (
                          <span className="text-xs font-semibold line-clamp-1">{item.articles.title}</span>
                        )}
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-muted-foreground truncate flex-1">{item.url}</span>
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>

                      {item.status === 'error' && item.response_details?.error?.message && (
                        <div className="mt-1 p-1.5 rounded bg-destructive/10 border border-destructive/20 flex items-start gap-1.5">
                          <AlertCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                          <span className="text-[10px] text-destructive line-clamp-2">
                            {item.response_details.error.message}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-[10px] h-7" 
              onClick={fetchHistory}
              disabled={loadingHistory}
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              Atualizar Histórico
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </ConnectionCard>
  );
});

GoogleIndexingSettings.displayName = 'GoogleIndexingSettings';

export default GoogleIndexingSettings;
