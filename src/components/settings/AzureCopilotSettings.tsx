import { PasswordInput } from '@/components/ui/password-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Database, Loader2, CheckCircle2, XCircle, Wifi } from 'lucide-react';
import { forwardRef, useState, useEffect } from 'react';
import ConnectionCard from '@/components/ConnectionCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { UserSettings } from '@/pages/SettingsPage';
import { AIModelSelector } from './AIModelSelector';

interface Props {
  settings: any;
  onChange: (partial: any) => void;
  hasAzureKey?: boolean;
  onDisconnect?: () => void | Promise<void>;
}

const AzureCopilotSettings = forwardRef<HTMLDivElement, Props>(({ settings, onChange, hasAzureKey, onDisconnect }, ref) => {
  const connected = !!(settings.azure_openai_api_key || hasAzureKey);
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [availableModels, setAvailableModels] = useState<any[]>([]);

  useEffect(() => {
    if (testResult?.success && testResult.data?.models) {
      setAvailableModels(testResult.data.models);
      if (!settings.azure_openai_model && testResult.data.recommended) {
        onChange({ azure_openai_model: testResult.data.recommended });
      }
    }
  }, [testResult, settings.azure_openai_model, onChange]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-azure-connection', {
        body: {
          azure_openai_api_key: settings.azure_openai_api_key || undefined,
          azure_openai_endpoint: settings.azure_openai_endpoint || undefined,
          azure_openai_deployment_name: settings.azure_openai_deployment_name || undefined,
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
      icon={<Database className="h-5 w-5 text-blue-600" />}
      title="Microsoft Copilot (Azure OpenAI)"
      description="Redundância enterprise via Azure para garantir 100% de disponibilidade"
      connected={connected}
      connectedInfo={connected ? 'Azure Copilot configurado ✓' : undefined}
      onTest={handleTest}
      testing={testing}
      onDisconnect={async () => {
        await onDisconnect?.();
        onChange({ azure_openai_api_key: '', azure_openai_endpoint: '', azure_openai_deployment_name: '' });
        setTestResult(null);
      }}
    >
      <div className="space-y-3">
        <div className="p-2.5 rounded-lg bg-accent/30 border border-accent/50 text-xs text-muted-foreground">
          <strong className="text-foreground">Configuração Azure:</strong> Informe o Endpoint, Nome do Deployment e sua Chave de API da Azure OpenAI Service.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Endpoint URL</Label>
            <Input
              placeholder="https://seu-recurso.openai.azure.com/"
              value={settings.azure_openai_endpoint || ''}
              onChange={(e) => onChange({ azure_openai_endpoint: e.target.value })}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nome do Deployment (Modelo)</Label>
            <Input
              placeholder="ex: gpt-4o"
              value={settings.azure_openai_deployment_name || ''}
              onChange={(e) => onChange({ azure_openai_deployment_name: e.target.value })}
              className="h-9 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Chave de API (Azure)</Label>
          <PasswordInput
            placeholder={hasAzureKey && !settings.azure_openai_api_key ? '••••••••  (salva no servidor)' : 'Cole sua chave de API'}
            value={settings.azure_openai_api_key || ''}
            onChange={(e) => {
              onChange({ azure_openai_api_key: e.target.value });
              setTestResult(null);
            }}
            className="h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleTest}
            disabled={testing || (!settings.azure_openai_api_key && !hasAzureKey)}
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
            label="Azure OpenAI"
            models={availableModels}
            value={settings.azure_openai_model || ''}
            recommendedModel={testResult.data?.recommended}
            onChange={(val) => onChange({ azure_openai_model: val })}
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

AzureCopilotSettings.displayName = 'AzureCopilotSettings';

export default AzureCopilotSettings;