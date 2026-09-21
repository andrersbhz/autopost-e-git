import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { forwardRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ConnectionCard from '@/components/ConnectionCard';
import type { UserSettings } from '@/pages/SettingsPage';

interface Props {
  settings: UserSettings;
  hasWpPassword?: boolean;
}

const JETPACK_STORAGE_KEY = 'jetpack_connection_status';

const JetpackSettings = forwardRef<HTMLDivElement, Props>(({ settings, hasWpPassword }, ref) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(() => {
    const saved = localStorage.getItem(JETPACK_STORAGE_KEY);
    return saved === 'success' ? 'success' : null;
  });
  const [jetpackInfo, setJetpackInfo] = useState<Record<string, string> | null>(() => {
    try {
      const saved = localStorage.getItem(JETPACK_STORAGE_KEY + '_info');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const { toast } = useToast();

  const connected = testResult === 'success';

  const testJetpack = async () => {
    if (!settings.wordpress_url) {
      toast({ title: 'Configure a URL do WordPress primeiro', variant: 'destructive' });
      return;
    }
    if (!settings.wordpress_username) {
      toast({ title: 'Configure o usuário do WordPress primeiro', variant: 'destructive' });
      return;
    }
    if (!settings.wordpress_app_password && !hasWpPassword) {
      toast({ title: 'Configure a Senha de Aplicativo do WordPress primeiro', variant: 'destructive' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    setJetpackInfo(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-jetpack-connection', {
        body: {
          wordpress_url: settings.wordpress_url,
          wordpress_username: settings.wordpress_username,
          wordpress_app_password: settings.wordpress_app_password || undefined,
        },
      });
      if (error) throw error;

      if (data?.success) {
        setTestResult('success');
        setJetpackInfo(data.info || null);
        localStorage.setItem(JETPACK_STORAGE_KEY, 'success');
        localStorage.setItem(JETPACK_STORAGE_KEY + '_info', JSON.stringify(data.info || {}));
        toast({ title: '✅ Jetpack conectado!' });
      } else {
        setTestResult('error');
        localStorage.removeItem(JETPACK_STORAGE_KEY);
        localStorage.removeItem(JETPACK_STORAGE_KEY + '_info');
        toast({ title: `❌ ${data?.error || 'Jetpack não encontrado'}`, variant: 'destructive' });
      }
    } catch (e: any) {
      setTestResult('error');
      toast({ title: '❌ Falha ao verificar Jetpack', description: e.message, variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <ConnectionCard
      ref={ref}
      icon={<Zap className="h-5 w-5 text-primary" />}
      title="Jetpack (WordPress)"
      description="Conecte ao Jetpack para puxar métricas de compartilhamento e estatísticas do WordPress"
      connected={connected}
      connectedInfo={connected && jetpackInfo ? `Jetpack ativo — ${jetpackInfo.version || 'conectado'}` : undefined}
      onTest={testJetpack}
      testing={testing}
      onDisconnect={() => {
        setTestResult(null);
        setJetpackInfo(null);
        localStorage.removeItem(JETPACK_STORAGE_KEY);
        localStorage.removeItem(JETPACK_STORAGE_KEY + '_info');
      }}
    >
      <div className="space-y-3">
        <div className="p-2.5 rounded-lg bg-accent/30 border border-accent/50 text-xs text-muted-foreground">
          <strong className="text-foreground">ℹ️ Requisitos:</strong> O plugin <strong>Jetpack</strong> precisa estar instalado e ativo no seu WordPress.
          As credenciais do WordPress (URL, usuário e senha de aplicativo) já configuradas acima serão usadas para acessar os dados do Jetpack.
        </div>

        {jetpackInfo && (
          <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/30 text-xs space-y-1">
            {jetpackInfo.version && <p><strong>Versão:</strong> {jetpackInfo.version}</p>}
            {jetpackInfo.site_id && <p><strong>Site ID:</strong> {jetpackInfo.site_id}</p>}
            {jetpackInfo.modules && <p><strong>Módulos ativos:</strong> {jetpackInfo.modules}</p>}
            {jetpackInfo.publicize && <p><strong>Publicize:</strong> {jetpackInfo.publicize}</p>}
            {jetpackInfo.stats && <p><strong>Stats:</strong> {jetpackInfo.stats}</p>}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={testJetpack}
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : testResult === 'success' ? (
            <CheckCircle2 className="h-4 w-4 mr-2 text-success" />
          ) : testResult === 'error' ? (
            <XCircle className="h-4 w-4 mr-2 text-destructive" />
          ) : (
            <Zap className="h-4 w-4 mr-2" />
          )}
          {testing ? 'Verificando Jetpack...' : testResult === 'success' ? 'Jetpack Conectado' : 'Conectar ao Jetpack'}
        </Button>
      </div>
    </ConnectionCard>
  );
});

JetpackSettings.displayName = 'JetpackSettings';

export default JetpackSettings;
