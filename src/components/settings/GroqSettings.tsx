import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Zap, Loader2, CheckCircle2, XCircle, Wifi } from 'lucide-react';
import { forwardRef, useState, useEffect } from 'react';
import ConnectionCard from '@/components/ConnectionCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { UserSettings } from '@/pages/SettingsPage';
import { AIModelSelector } from './AIModelSelector';

interface Props {
  settings: UserSettings;
  onChange: (partial: Partial<UserSettings>) => void;
  hasGroqKey?: boolean;
  onDisconnect?: () => void | Promise<void>;
}

const GroqSettings = forwardRef<HTMLDivElement, Props>(({ settings, onChange, hasGroqKey, onDisconnect }, ref) => {
  const connected = !!(settings.groq_api_key || hasGroqKey);
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [availableModels, setAvailableModels] = useState<any[]>([]);

  useEffect(() => {
    if (testResult?.success && testResult.data?.models) {
      setAvailableModels(testResult.data.models);
      if (!settings.groq_model && testResult.data.recommended) {
        onChange({ groq_model: testResult.data.recommended });
      }
    }
  }, [testResult, settings.groq_model, onChange]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-groq-connection', {
        body: { groq_api_key: settings.groq_api_key || undefined },
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
      icon={<Zap className="h-5 w-5 text-primary" />}
      title="Groq (LLaMA / Mixtral)"
      description="Use sua chave gratuita do Groq como provedor de IA adicional — modelos open-source ultrarrápidos"
      connected={connected}
      connectedInfo={connected ? 'Chave Groq configurada ✓' : undefined}
      onTest={handleTest}
      testing={testing}
      onDisconnect={async () => { await onDisconnect?.(); onChange({ groq_api_key: '' }); setTestResult(null); }}
    >
      <div className="space-y-3">
        <div className="p-2.5 rounded-lg bg-accent/30 border border-accent/50 text-xs text-muted-foreground">
          <strong className="text-foreground">Como obter sua chave:</strong> Acesse{' '}
          <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Groq Console
          </a>
          , crie uma API Key e cole aqui. O plano gratuito oferece <strong>14.400 req/dia</strong> com modelos como LLaMA 3.1 70B.
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Chave de API do Groq</Label>
          <PasswordInput
            placeholder={hasGroqKey && !settings.groq_api_key ? '••••••••  (salva no servidor)' : 'Cole sua chave gsk_...'}
            value={settings.groq_api_key}
            onChange={(e) => { onChange({ groq_api_key: e.target.value }); setTestResult(null); }}
            className="h-9 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            Deixe em branco para manter a chave atual. Sua chave é criptografada e armazenada de forma segura.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleTest}
            disabled={testing || (!settings.groq_api_key && !hasGroqKey)}
            className="gap-2"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
            {testing ? 'Testando...' : 'Testar Conexão'}
          </Button>
          {testResult && (
            <div className={`flex items-center gap-1.5 text-xs ${testResult.success ? 'text-success' : 'text-destructive'}`}>
              {testResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {testResult?.success && availableModels.length > 0 && (
          <AIModelSelector
            label="Groq"
            models={availableModels}
            value={settings.groq_model || ''}
            recommendedModel={testResult.data?.recommended}
            onChange={(val) => onChange({ groq_model: val })}
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

GroqSettings.displayName = 'GroqSettings';

export default GroqSettings;
