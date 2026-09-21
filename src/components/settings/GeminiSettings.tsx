import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, CheckCircle2, XCircle, Wifi } from 'lucide-react';
import { forwardRef, useState, useEffect } from 'react';
import ConnectionCard from '@/components/ConnectionCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { UserSettings } from '@/pages/SettingsPage';
import { AIModelSelector } from './AIModelSelector';

interface Props {
  settings: UserSettings;
  onChange: (partial: Partial<UserSettings>) => void;
  hasGeminiKey?: boolean;
  onDisconnect?: () => void | Promise<void>;
}

const GeminiSettings = forwardRef<HTMLDivElement, Props>(({ settings, onChange, hasGeminiKey, onDisconnect }, ref) => {
  const connected = !!(settings.gemini_api_key || hasGeminiKey);
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [availableModels, setAvailableModels] = useState<any[]>([]);

  const OBSOLETE_GEMINI = /^gemini-(1\.0|1\.5|pro|ultra)/i;
  const activeModel = settings.gemini_model && !OBSOLETE_GEMINI.test(settings.gemini_model) ? settings.gemini_model : '';

  useEffect(() => {
    if (testResult?.success && testResult.data?.models) {
      const list = testResult.data.models as { id: string }[];
      setAvailableModels(list);
      const current = settings.gemini_model;
      const isValid = !!current && !OBSOLETE_GEMINI.test(current) && list.some((m) => m.id === current);
      if (!isValid && testResult.data.recommended) {
        onChange({ gemini_model: testResult.data.recommended });
      }
    }
  }, [testResult, settings.gemini_model, onChange]);


  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-gemini-connection', {
        body: { gemini_api_key: settings.gemini_api_key || undefined },
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
      icon={<Sparkles className="h-5 w-5 text-primary" />}
      title="Google Gemini (IA)"
      description="Use sua própria chave do Google Gemini para gerar artigos sem gastar créditos extras"
      connected={connected}
      connectedInfo={connected ? 'Chave Gemini configurada ✓' : undefined}
      onDisconnect={async () => { await onDisconnect?.(); onChange({ gemini_api_key: '' }); setTestResult(null); }}
      onTest={handleTest}
      testing={testing}
    >
      <div className="space-y-3">
        <div className="p-2.5 rounded-lg bg-accent/30 border border-accent/50 text-xs text-muted-foreground">
          <strong className="text-foreground">Como obter sua chave:</strong> Acesse{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Google AI Studio
          </a>
          , clique em <strong>"Create API Key"</strong> e cole aqui. A chave é gratuita com limites generosos.
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Chave de API do Gemini</Label>
          <PasswordInput
            placeholder={hasGeminiKey && !settings.gemini_api_key ? '••••••••  (salva no servidor)' : 'Cole sua chave AIza...'}
            value={settings.gemini_api_key}
            onChange={(e) => { onChange({ gemini_api_key: e.target.value }); setTestResult(null); }}
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
            disabled={testing || (!settings.gemini_api_key && !hasGeminiKey)}
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
            label="Gemini"
            models={availableModels}
            value={activeModel}
            recommendedModel={testResult.data?.recommended}
            onChange={(val) => onChange({ gemini_model: val })}
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

GeminiSettings.displayName = 'GeminiSettings';

export default GeminiSettings;
