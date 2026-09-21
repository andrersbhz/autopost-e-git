import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, CheckCircle2, XCircle, Wifi } from 'lucide-react';
import { forwardRef, useState, useEffect } from 'react';
import ConnectionCard from '@/components/ConnectionCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { UserSettings } from '@/pages/SettingsPage';
import { AIModelSelector } from './AIModelSelector';

interface Props {
  settings: UserSettings;
  onChange: (partial: Partial<UserSettings>) => void;
  hasOpenaiKey?: boolean;
  onDisconnect?: () => void | Promise<void>;
}

const OpenAISettings = forwardRef<HTMLDivElement, Props>(({ settings, onChange, hasOpenaiKey, onDisconnect }, ref) => {
  const connected = !!(settings.openai_api_key || hasOpenaiKey);
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [availableModels, setAvailableModels] = useState<any[]>([]);

  useEffect(() => {
    if (testResult?.success && testResult.data?.models) {
      setAvailableModels(testResult.data.models);
      if (!settings.openai_model && testResult.data.recommended) {
        onChange({ openai_model: testResult.data.recommended });
      }
    }
  }, [testResult, settings.openai_model, onChange]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-openai-connection', {
        body: {
          openai_api_key: settings.openai_api_key || undefined,
        },
      });

      if (error) {
        setTestResult({ success: false, message: error.message || 'Erro ao testar conexão' });
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
      setTestResult({ success: false, message: msg });
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <ConnectionCard
      ref={ref}
      icon={<Brain className="h-5 w-5 text-primary" />}
      title="OpenAI (ChatGPT)"
      description="Use sua própria chave da OpenAI como provedor alternativo de IA para gerar artigos"
      connected={connected}
      connectedInfo={connected ? 'Chave OpenAI configurada ✓' : undefined}
      onTest={handleTest}
      testing={testing}
      onDisconnect={async () => {
        await onDisconnect?.();
        onChange({ openai_api_key: '' });
        setTestResult(null);
      }}
    >
      <div className="space-y-3">
        <div className="p-2.5 rounded-lg bg-accent/30 border border-accent/50 text-xs text-muted-foreground">
          <strong className="text-foreground">Como obter sua chave:</strong> Acesse{' '}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            OpenAI Platform
          </a>
          , crie uma API Key e cole aqui. Requer saldo na conta OpenAI.
        </div>

        <div className="p-2 rounded-lg bg-warning/10 border border-warning/30 text-xs text-muted-foreground">
          ⚠️ <strong className="text-foreground">Segurança:</strong> Nunca compartilhe sua chave de API. Ela é criptografada e armazenada de forma segura no servidor.
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Chave de API da OpenAI</Label>
          <PasswordInput
            placeholder={hasOpenaiKey && !settings.openai_api_key ? '••••••••  (salva no servidor)' : 'Cole sua chave sk-...'}
            value={settings.openai_api_key}
            onChange={(e) => {
              onChange({ openai_api_key: e.target.value });
              setTestResult(null);
            }}
            className="h-9 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            Deixe em branco para manter a chave atual. Sua chave é criptografada e armazenada de forma segura.
          </p>
        </div>

        {/* Test connection button */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleTest}
            disabled={testing || (!settings.openai_api_key && !hasOpenaiKey)}
            className="gap-2"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
            {testing ? 'Testando...' : 'Testar Conexão'}
          </Button>

          {testResult && (
            <div className={`flex items-center gap-1.5 text-xs ${testResult.success ? 'text-success' : 'text-destructive'}`}>
              {testResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              <span>{testResult.success ? testResult.message : testResult.message}</span>
            </div>
          )}
        </div>

        {/* Test result details */}
        {testResult?.success && availableModels.length > 0 && (
          <AIModelSelector
            label="OpenAI"
            models={availableModels}
            value={settings.openai_model || ''}
            recommendedModel={testResult.data?.recommended}
            onChange={(val) => onChange({ openai_model: val })}
            disabled={testing}
          />
        )}

        {testResult?.success && testResult.data && !testResult.data.models && (
          <div className="p-2.5 rounded-lg bg-success/10 border border-success/30 text-xs space-y-1">
            {Object.entries(testResult.data).map(([key, value]) => (
              typeof value === 'string' && (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                  <span className="text-foreground font-medium">{value}</span>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </ConnectionCard>
  );
});

OpenAISettings.displayName = 'OpenAISettings';

export default OpenAISettings;
