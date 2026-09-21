import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Youtube, Loader2, CheckCircle2, XCircle, Wifi } from 'lucide-react';
import { forwardRef, useState } from 'react';
import ConnectionCard from '@/components/ConnectionCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { UserSettings } from '@/pages/SettingsPage';

interface Props {
  settings: UserSettings;
  onChange: (partial: Partial<UserSettings>) => void;
  hasYoutubeKey?: boolean;
  onDisconnect?: () => void | Promise<void>;
}

const YouTubeSettings = forwardRef<HTMLDivElement, Props>(({ settings, onChange, hasYoutubeKey, onDisconnect }, ref) => {
  const connected = !!(settings.youtube_api_key || hasYoutubeKey);
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string; data?: Record<string, string> } | null>(null);

  const handleSave = async () => {
    if (!settings.youtube_api_key) {
      toast({ title: 'Informe a chave', description: 'Cole sua chave do YouTube antes de salvar.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const { error } = existing
        ? await supabase.from('user_settings').update({ youtube_api_key: settings.youtube_api_key } as any).eq('user_id', user.id)
        : await supabase.from('user_settings').insert({ user_id: user.id, youtube_api_key: settings.youtube_api_key } as any);

      if (error) throw error;

      toast({ title: 'Chave salva!', description: 'YouTube API conectada e criptografada no banco.' });
      onChange({ youtube_api_key: '' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar';
      toast({ title: 'Erro ao salvar', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-youtube-connection', {
        body: { youtube_api_key: settings.youtube_api_key || undefined },
      });
      if (error) {
        setTestResult({ success: false, error: error.message || 'Erro ao testar conexão' });
      } else {
        setTestResult(data);
      }
      toast({
        title: data?.success ? 'Conexão bem-sucedida!' : 'Falha na conexão',
        description: data?.message || data?.error || error?.message,
        variant: data?.success ? 'default' : 'destructive',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setTestResult({ success: false, error: msg });
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <ConnectionCard
      ref={ref}
      icon={<Youtube className="h-5 w-5 text-red-500" />}
      title="YouTube (Data API v3)"
      description="Busca de trailers e vídeos relacionados para enriquecer artigos sobre filmes e séries"
      connected={connected}
      connectedInfo={connected ? 'Chave YouTube configurada ✓' : undefined}
      onConnect={!connected ? () => {
        const el = document.getElementById('youtube-api-key-input');
        el?.focus();
      } : undefined}
      onTest={handleTest}
      testing={testing}
      onDisconnect={async () => { await onDisconnect?.(); onChange({ youtube_api_key: '' }); setTestResult(null); }}
    >
      <div className="space-y-3">
        <div className="p-2.5 rounded-lg bg-accent/30 border border-accent/50 text-xs text-muted-foreground">
          <strong className="text-foreground">Como obter sua chave:</strong>
          <ol className="list-decimal ml-4 mt-1 space-y-0.5">
            <li>Acesse <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Cloud Console</a> e ative a <strong>YouTube Data API v3</strong>.</li>
            <li>Vá em <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary underline">Credenciais</a> → <strong>Criar credencial → Chave de API</strong>.</li>
            <li>Cole a chave abaixo. Cota gratuita: <strong>10.000 unidades/dia</strong> (~100 buscas).</li>
          </ol>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Chave de API do YouTube</Label>
          <PasswordInput
            id="youtube-api-key-input"
            placeholder={hasYoutubeKey && !settings.youtube_api_key ? '••••••••  (salva no servidor)' : 'Cole sua chave AIza...'}
            value={settings.youtube_api_key}
            onChange={(e) => { onChange({ youtube_api_key: e.target.value }); setTestResult(null); }}
            className="h-9 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            Deixe em branco para manter a chave atual. Sua chave é criptografada e armazenada de forma segura.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || !settings.youtube_api_key}
            className="gap-2 gradient-primary"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {saving ? 'Salvando...' : 'Salvar chave'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleTest}
            disabled={testing || (!settings.youtube_api_key && !hasYoutubeKey)}
            className="gap-2"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
            {testing ? 'Testando...' : 'Testar Conexão'}
          </Button>
          {testResult && (
            <div className={`flex items-center gap-1.5 text-xs ${testResult.success ? 'text-success' : 'text-destructive'}`}>
              {testResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              <span>{testResult.message || testResult.error}</span>
            </div>
          )}
        </div>

        {testResult?.success && testResult.data && (
          <div className="p-2.5 rounded-lg bg-success/10 border border-success/30 text-xs space-y-1">
            {Object.entries(testResult.data).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                <span className="text-foreground font-medium">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ConnectionCard>
  );
});

YouTubeSettings.displayName = 'YouTubeSettings';

export default YouTubeSettings;
