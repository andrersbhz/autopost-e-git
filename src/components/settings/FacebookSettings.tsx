import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Facebook, Plus, Trash2, Loader2, Search, Instagram, Users, CheckCircle2, LogIn, RefreshCw, ShieldCheck, AlertTriangle, Save, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import ConnectionCard from '@/components/ConnectionCard';
import { cn } from '@/lib/utils';
import type { UserSettings } from '@/pages/SettingsPage';

interface FacebookAccount {
  id: string;
  page_name: string | null;
  page_id: string;
  access_token: string;
  instagram_account_id: string | null;
  picture_url: string | null;
  is_active: boolean;
}

interface MetaPage {
  page_id: string;
  page_name: string;
  category: string | null;
  picture_url: string | null;
  fan_count: number;
  page_access_token: string;
  instagram: {
    id: string;
    name: string;
    username: string;
    profile_picture_url: string | null;
    followers_count: number;
  } | null;
}

interface MetaCredentialStatus {
  configured: boolean;
  appId: string;
  hasSecret: boolean;
  usingGlobalFallback: boolean;
}

interface Props {
  settings: UserSettings;
  onChange: (partial: Partial<UserSettings>) => void;
}

const FacebookSettings = ({ settings, onChange }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const returnUrl = typeof window !== 'undefined' ? `${window.location.origin}/settings` : '/settings';
  const [accounts, setAccounts] = useState<FacebookAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const [userAccessToken, setUserAccessToken] = useState('');
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [metaPages, setMetaPages] = useState<MetaPage[]>([]);
  const [connectingPageId, setConnectingPageId] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{ isValid: boolean; scopes: string[]; expiresAt?: number } | null>(null);
  const [newAccount, setNewAccount] = useState({ page_name: '', page_id: '', access_token: '', instagram_account_id: '' });
  const [saving, setSaving] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [metaAppId, setMetaAppId] = useState('');
  const [metaAppSecret, setMetaAppSecret] = useState('');
  const [metaCredentialStatus, setMetaCredentialStatus] = useState<MetaCredentialStatus>({
    configured: false,
    appId: '',
    hasSecret: false,
    usingGlobalFallback: false,
  });
  const [metaCredentialLoading, setMetaCredentialLoading] = useState(true);
  const [metaCredentialSaving, setMetaCredentialSaving] = useState(false);

  void settings;
  void onChange;

  const fetchAccounts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('facebook_accounts')
      .select('id, user_id, page_id, page_name, picture_url, instagram_account_id, is_active, last_metrics, metrics_updated_at, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    setAccounts((data as any[]) || []);
    setLoading(false);
  };

  const loadMetaCredentials = async () => {
    if (!user) return;
    setMetaCredentialLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-app-credentials', { method: 'GET' });
      if (error) throw error;
      const status: MetaCredentialStatus = {
        configured: Boolean(data?.configured),
        appId: data?.appId || '',
        hasSecret: Boolean(data?.hasSecret),
        usingGlobalFallback: Boolean(data?.usingGlobalFallback),
      };
      setMetaCredentialStatus(status);
      setMetaAppId(status.appId);
      setMetaAppSecret('');
    } catch (error) {
      console.error('Erro ao carregar credenciais Meta:', error);
    } finally {
      setMetaCredentialLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    loadMetaCredentials();
  }, [user]);

  const saveMetaCredentials = async () => {
    const cleanAppId = metaAppId.trim();
    const cleanSecret = metaAppSecret.trim();
    if (!/^\d{6,32}$/.test(cleanAppId)) {
      toast({ title: 'App ID inválido', description: 'Informe o App ID numérico do Meta for Developers.', variant: 'destructive' });
      return;
    }
    if (!metaCredentialStatus.hasSecret && cleanSecret.length < 20) {
      toast({ title: 'App Secret obrigatório', description: 'Informe o App Secret da aplicação Meta.', variant: 'destructive' });
      return;
    }

    setMetaCredentialSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-app-credentials', {
        body: { appId: cleanAppId, appSecret: cleanSecret },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'API da Meta salva', description: 'App ID e App Secret configurados com segurança no backend.' });
      await loadMetaCredentials();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar as credenciais.';
      toast({ title: 'Erro ao salvar API da Meta', description: message, variant: 'destructive' });
    } finally {
      setMetaCredentialSaving(false);
    }
  };

  const removeMetaCredentials = async () => {
    setMetaCredentialSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-app-credentials', { method: 'DELETE' });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMetaAppId('');
      setMetaAppSecret('');
      await loadMetaCredentials();
      toast({ title: 'Credenciais removidas', description: 'O sistema voltará a usar os secrets globais, se estiverem configurados.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível remover as credenciais.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setMetaCredentialSaving(false);
    }
  };

  const popupRef = useRef<Window | null>(null);
  const popupTimerRef = useRef<number | null>(null);

  const clearPopupWatcher = () => {
    if (popupTimerRef.current) {
      window.clearInterval(popupTimerRef.current);
      popupTimerRef.current = null;
    }
  };

  useEffect(() => {
    const onMessage = async (e: MessageEvent) => {
      if (e.data?.type === 'fb-oauth-done') {
        clearPopupWatcher();
        if (e.data.success) {
          toast({ title: 'Facebook conectado!', description: 'Páginas e tokens importados com sucesso.' });
          await fetchAccounts();
        } else {
          toast({ title: 'Conexão cancelada ou falhou', variant: 'destructive' });
        }
        setOauthLoading(false);
        try { popupRef.current?.close(); } catch {}
      }
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      clearPopupWatcher();
    };
  }, [user]);

  const validateToken = async (token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-meta-pages', {
        body: { accessToken: token },
      });
      if (error) throw error;
      if (data?.debug) {
        setTokenInfo({
          isValid: data.debug.is_valid,
          scopes: data.debug.scopes || [],
          expiresAt: data.debug.data_access_expires_at || data.debug.expires_at,
        });
      }
    } catch (e) {
      console.error('Token validation error:', e);
    }
  };

  const getPopupFeatures = () => {
    const width = 600;
    const height = 780;
    const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

    return [
      'popup=yes',
      `width=${width}`,
      `height=${height}`,
      `left=${Math.round(left)}`,
      `top=${Math.round(top)}`,
      'resizable=yes',
      'scrollbars=yes',
    ].join(',');
  };

  const watchPopupClosed = (popup: Window) => {
    clearPopupWatcher();
    popupTimerRef.current = window.setInterval(() => {
      if (popup.closed) {
        clearPopupWatcher();
        setOauthLoading(false);
        fetchAccounts();
      }
    }, 800);
  };

  const requestFacebookAuthUrl = async (returnUrl: string) => {
    const { data, error } = await supabase.functions.invoke('facebook-oauth-start', {
      body: { returnUrl },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    if (!data?.authUrl) throw new Error('URL de autorização não retornada');
    return data.authUrl as string;
  };

  const startOauthPopup = async () => {
    setOauthLoading(true);
    try {
      const authUrl = await requestFacebookAuthUrl(returnUrl);
      const popup = window.open(authUrl, 'facebook-oauth', getPopupFeatures());
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = authUrl;
        return;
      }
      popupRef.current = popup;
      popup.focus();
      watchPopupClosed(popup);
    } catch (e: any) {
      setOauthLoading(false);
      toast({ title: 'Erro ao conectar', description: e.message, variant: 'destructive' });
    }
  };

  const handleOAuthConnect = async () => {
    if (oauthLoading) return;
    await startOauthPopup();
  };

  const handleDiscoverPages = async () => {
    const token = userAccessToken.trim();
    if (!token) {
      toast({ title: 'Erro', description: 'Insira seu User Access Token da Meta', variant: 'destructive' });
      return;
    }
    if (!token.startsWith('EAA') || token.length < 100) {
      toast({
        title: 'Token inválido',
        description: 'Esse não parece ser um User Access Token. Tokens válidos começam com "EAA" e têm 100+ caracteres.',
        variant: 'destructive',
      });
      return;
    }
    setDiscoverLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-meta-pages', {
        body: { accessToken: token },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMetaPages(data?.pages || []);
      if ((data?.pages || []).length === 0) {
        toast({ title: 'Nenhuma página encontrada', description: 'Esse token não tem páginas associadas.' });
      }
    } catch (e: any) {
      toast({ title: 'Erro ao buscar páginas', description: e.message, variant: 'destructive' });
      setMetaPages([]);
    } finally {
      setDiscoverLoading(false);
    }
  };

  const handleConnectPage = async (page: MetaPage) => {
    if (!user) return;
    setConnectingPageId(page.page_id);
    try {
      const { error } = await supabase.from('facebook_accounts').insert({
        user_id: user.id,
        page_name: page.page_name,
        page_id: page.page_id,
        access_token: page.page_access_token,
        instagram_account_id: page.instagram?.id || null,
      } as any);
      if (error) throw error;
      toast({ title: 'Página conectada!', description: `${page.page_name} foi adicionada com sucesso.` });
      fetchAccounts();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setConnectingPageId(null);
    }
  };

  const handleAdd = async () => {
    if (!user || !newAccount.page_id || !newAccount.access_token) {
      toast({ title: 'Erro', description: 'Page ID e Access Token são obrigatórios', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('facebook_accounts').insert({
        user_id: user.id,
        page_name: newAccount.page_name || null,
        page_id: newAccount.page_id,
        access_token: newAccount.access_token,
        instagram_account_id: newAccount.instagram_account_id || null,
      } as any);
      if (error) throw error;
      toast({ title: 'Conta adicionada!' });
      setNewAccount({ page_name: '', page_id: '', access_token: '', instagram_account_id: '' });
      setShowAdd(false);
      fetchAccounts();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('facebook_accounts').delete().eq('id', id);
    toast({ title: 'Conta removida' });
    fetchAccounts();
  };

  const [testingConnection, setTestingConnection] = useState(false);
  const handleTestConnection = async () => {
    if (!user) return;
    setTestingConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-meta-metrics', {
        body: { userId: user.id, dateRange: 'last_7d' },
      });
      if (error) throw error;
      const ok = data && !data.error;
      toast({
        title: ok ? '✅ Conexão Facebook OK!' : '❌ Falha na conexão',
        description: ok
          ? `${(data?.pages || []).length} página(s) respondendo via Graph API.`
          : (data?.error || 'Tokens podem estar expirados — reconecte.'),
        variant: ok ? 'default' : 'destructive',
      });
    } catch (e: any) {
      toast({ title: '❌ Falha na conexão', description: e.message, variant: 'destructive' });
    } finally {
      setTestingConnection(false);
    }
  };

  const connected = accounts.length > 0;
  const connectedPageIds = new Set(accounts.map((a) => a.page_id));
  const apiReady = metaCredentialStatus.configured || metaCredentialStatus.usingGlobalFallback;

  return (
    <ConnectionCard
      icon={<Facebook className="h-5 w-5 text-primary" />}
      title="Facebook & Instagram"
      description="Postagem automática nas redes sociais"
      connected={connected}
      connectedInfo={connected ? `${accounts.length} conta(s) conectada(s)` : undefined}
      onTest={connected ? handleTestConnection : undefined}
      testing={testingConnection}
      onDisconnect={async () => {
        for (const acc of accounts) {
          await supabase.from('facebook_accounts').delete().eq('id', acc.id);
        }
        fetchAccounts();
      }}
    >
      <div className="space-y-3">
        <div className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-xs text-muted-foreground">
          Configure sua aplicação da Meta abaixo. O App Secret é enviado diretamente ao backend e não é exibido novamente no navegador.
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <KeyRound className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">API Meta / Facebook</p>
                <p className="text-xs text-muted-foreground">Credenciais da aplicação criada no Meta for Developers.</p>
              </div>
            </div>
            {metaCredentialLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Badge variant="outline" className={apiReady ? 'text-success border-success/30' : 'text-warning border-warning/30'}>
                {metaCredentialStatus.configured ? 'Configurada' : metaCredentialStatus.usingGlobalFallback ? 'Secret global ativo' : 'Não configurada'}
              </Badge>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Meta App ID</Label>
              <Input
                inputMode="numeric"
                placeholder="123456789012345"
                value={metaAppId}
                onChange={(e) => setMetaAppId(e.target.value.replace(/\D/g, ''))}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Meta App Secret</Label>
              <PasswordInput
                placeholder={metaCredentialStatus.hasSecret ? '••••••••••••••••••••' : 'Cole o App Secret'}
                value={metaAppSecret}
                onChange={(e) => setMetaAppSecret(e.target.value)}
                className="h-9 text-sm"
              />
              {metaCredentialStatus.hasSecret && !metaAppSecret && (
                <p className="text-[11px] text-muted-foreground">Deixe em branco para manter o segredo já salvo.</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={saveMetaCredentials} disabled={metaCredentialSaving || metaCredentialLoading}>
              {metaCredentialSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
              Salvar API Meta
            </Button>
            {metaCredentialStatus.configured && (
              <Button size="sm" variant="outline" onClick={removeMetaCredentials} disabled={metaCredentialSaving}>
                <Trash2 className="h-4 w-4 mr-1.5" />Remover credenciais
              </Button>
            )}
          </div>
        </div>

        {!apiReady && !metaCredentialLoading && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            Informe App ID e App Secret antes de usar o login OAuth do Facebook.
          </div>
        )}

        <div className="p-3 rounded-lg border border-primary/40 bg-gradient-to-br from-primary/10 to-accent/10">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Login com Facebook (recomendado)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Conecta automaticamente todas as páginas do seu Business Manager. Tokens válidos por 60 dias.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleOAuthConnect}
              disabled={oauthLoading || !apiReady}
              className="gradient-primary shrink-0"
            >
              {oauthLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : accounts.length > 0 ? (
                <><RefreshCw className="h-4 w-4 mr-1.5" />Reconectar</>
              ) : (
                <><LogIn className="h-4 w-4 mr-1.5" />Conectar</>
              )}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {accounts.length > 0 && (
              <div className="p-3 rounded-lg border border-border bg-muted/30 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium">Status da Conexão</span>
                  </div>
                  <Badge variant="outline" className="text-success border-success/30">Ativa</Badge>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">As permissões foram verificadas e o sistema está pronto para postar.</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['pages_manage_posts', 'instagram_content_publish', 'pages_show_list'].map(scope => (
                      <Badge key={scope} variant="secondary" className="text-[10px] h-4 bg-primary/5 text-primary/70 border-primary/10">{scope}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    {acc.picture_url ? (
                      <img src={acc.picture_url} alt={acc.page_name || ''} className="h-10 w-10 rounded-full object-cover border border-primary/20 shadow-sm" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center border border-primary/20"><Facebook className="h-5 w-5 text-primary" /></div>
                    )}
                    <div className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background', acc.is_active ? 'bg-success' : 'bg-destructive')} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{acc.page_name || `Page ${acc.page_id}`}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">ID: {acc.page_id}</p>
                    {acc.instagram_account_id && (
                      <div className="flex items-center gap-1 mt-0.5"><Instagram className="h-3 w-3 text-muted-foreground" /><p className="text-xs text-muted-foreground">{acc.instagram_account_id}</p></div>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="text-destructive shrink-0" onClick={() => handleDelete(acc.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}

            {showDiscover ? (
              <div className="space-y-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 mb-1"><Search className="h-4 w-4 text-primary" /><span className="text-sm font-medium text-foreground">Descobrir Páginas da Meta</span></div>
                <p className="text-xs text-muted-foreground">Cole seu <strong>User Access Token</strong> do Meta para listar todas as páginas que você administra.</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">User Access Token</Label>
                  <PasswordInput placeholder="EAAxxxxxxx..." value={userAccessToken} onChange={(e) => setUserAccessToken(e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleDiscoverPages} disabled={discoverLoading} className="gradient-primary">
                    {discoverLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-1" />}Buscar Páginas
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowDiscover(false); setMetaPages([]); setUserAccessToken(''); }}>Cancelar</Button>
                </div>

                {metaPages.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <p className="text-xs font-medium text-foreground">{metaPages.length} página(s) encontrada(s):</p>
                    {metaPages.map((page) => {
                      const alreadyConnected = connectedPageIds.has(page.page_id);
                      return (
                        <div key={page.page_id} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                          {page.picture_url ? <img src={page.picture_url} alt={page.page_name} className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Facebook className="h-5 w-5 text-muted-foreground" /></div>}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{page.page_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {page.category && <Badge variant="secondary" className="text-[10px] h-4">{page.category}</Badge>}
                              <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {page.fan_count.toLocaleString()}</span>
                            </div>
                            {page.instagram && <div className="flex items-center gap-1.5 mt-1"><Instagram className="h-3 w-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">@{page.instagram.username}</span><span className="text-xs text-muted-foreground">• {page.instagram.followers_count.toLocaleString()} seguidores</span></div>}
                          </div>
                          {alreadyConnected ? (
                            <Badge variant="outline" className="shrink-0 text-success border-success/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Conectada</Badge>
                          ) : (
                            <Button size="sm" onClick={() => handleConnectPage(page)} disabled={connectingPageId === page.page_id} className="shrink-0 gradient-primary">
                              {connectingPageId === page.page_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}Conectar
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : showAdd ? (
              <div className="space-y-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
                <div className="space-y-1.5"><Label className="text-xs">Nome da Página (opcional)</Label><Input placeholder="Minha Página" value={newAccount.page_name} onChange={(e) => setNewAccount((p) => ({ ...p, page_name: e.target.value }))} className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Page ID *</Label><Input placeholder="123456789" value={newAccount.page_id} onChange={(e) => setNewAccount((p) => ({ ...p, page_id: e.target.value }))} className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Access Token *</Label><PasswordInput placeholder="EAAxxxxxxx..." value={newAccount.access_token} onChange={(e) => setNewAccount((p) => ({ ...p, access_token: e.target.value }))} className="h-9 text-sm" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Instagram Business Account ID</Label><Input placeholder="17841400000000" value={newAccount.instagram_account_id} onChange={(e) => setNewAccount((p) => ({ ...p, instagram_account_id: e.target.value }))} className="h-9 text-sm" /></div>
                <div className="flex gap-2"><Button size="sm" onClick={handleAdd} disabled={saving} className="gradient-primary">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}</Button><Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button></div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowDiscover(true)}><Search className="h-4 w-4 mr-2" />Descobrir Páginas</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Adicionar Manual</Button>
              </div>
            )}
          </>
        )}
      </div>
    </ConnectionCard>
  );
};

export default FacebookSettings;
