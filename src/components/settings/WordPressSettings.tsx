import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Globe, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { forwardRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ConnectionCard from '@/components/ConnectionCard';
import type { UserSettings } from '@/pages/SettingsPage';

interface Props {
  settings: UserSettings;
  onChange: (partial: Partial<UserSettings>) => void;
  hasWpPassword?: boolean;
  onDisconnect?: () => void | Promise<void>;
}

const WordPressSettings = forwardRef<HTMLDivElement, Props>(({ settings, onChange, hasWpPassword, onDisconnect }, ref) => {
  const connected = !!(settings.wordpress_url && settings.wordpress_username && (settings.wordpress_app_password || hasWpPassword));
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const { toast } = useToast();

  const testConnection = async () => {
    if (!settings.wordpress_url) {
      toast({ title: 'Preencha a URL do WordPress', variant: 'destructive' });
      return;
    }
    if (!settings.wordpress_username.trim()) {
      toast({ title: 'Preencha o usuário do WordPress', variant: 'destructive' });
      return;
    }
    if (!settings.wordpress_app_password && !hasWpPassword) {
      toast({ title: 'Preencha a Senha de Aplicativo', variant: 'destructive' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-wp-connection', {
        body: {
          wordpress_url: settings.wordpress_url,
          wordpress_username: settings.wordpress_username,
          wordpress_app_password: settings.wordpress_app_password || undefined,
        },
      });
      if (error) throw error;

      if (data?.success) {
        setTestResult('success');
        toast({ title: '✅ Conexão WordPress OK!' });
      } else {
        setTestResult('error');
        toast({ title: `❌ ${data?.error || 'Erro na conexão'}`, variant: 'destructive' });
      }
    } catch (e: any) {
      setTestResult('error');
      toast({ title: '❌ Falha na conexão', description: e.message, variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <ConnectionCard
      ref={ref}
      icon={<Globe className="h-5 w-5 text-primary" />}
      title="WordPress"
      description="Publicação automática via REST API nativa do WordPress"
      connected={connected}
      connectedInfo={connected ? `Conectado a ${settings.wordpress_url}` : undefined}
      onTest={testConnection}
      testing={testing}
      onDisconnect={async () => { await onDisconnect?.(); onChange({ wordpress_url: '', wordpress_username: '', wordpress_app_password: '' }); }}
    >
      <div className="space-y-3">
        <div className="p-2.5 rounded-lg bg-accent/30 border border-accent/50 text-xs text-muted-foreground">
          <strong className="text-foreground">✅ Forma correta de conectar:</strong> no WordPress, vá em <code className="text-primary">Usuários → Perfil</code>, gere uma <strong>Senha de Aplicativo</strong> e use aqui o <strong>usuário real do WordPress</strong>. Esse usuário precisa ser <strong>Editor</strong> ou <strong>Administrador</strong>.
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">URL do WordPress</Label>
          <Input
            placeholder="https://meublog.com.br"
            value={settings.wordpress_url}
            onChange={(e) => onChange({ wordpress_url: e.target.value })}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Usuário do WordPress</Label>
          <Input
            placeholder="seu-usuario-no-wordpress"
            value={settings.wordpress_username}
            onChange={(e) => onChange({ wordpress_username: e.target.value })}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Senha de Aplicativo</Label>
          <PasswordInput
            placeholder={hasWpPassword && !settings.wordpress_app_password ? '••••••••  (salva no servidor)' : 'Cole a Senha de Aplicativo gerada no WordPress'}
            value={settings.wordpress_app_password}
            onChange={(e) => onChange({ wordpress_app_password: e.target.value })}
            className="h-9 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            Deixe em branco para manter a senha atual. Não use a senha de login normal do WordPress.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={testConnection}
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : testResult === 'success' ? (
            <CheckCircle2 className="h-4 w-4 mr-2 text-success" />
          ) : testResult === 'error' ? (
            <XCircle className="h-4 w-4 mr-2 text-destructive" />
          ) : null}
          {testing ? 'Testando...' : 'Testar Conexão'}
        </Button>
      </div>
    </ConnectionCard>
  );
});

WordPressSettings.displayName = 'WordPressSettings';

export default WordPressSettings;
