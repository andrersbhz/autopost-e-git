import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { runBackendQuery } from '@/lib/backend';
import { Cpu, Zap, Sparkles, BrainCircuit, Loader2 } from 'lucide-react';

interface ProviderInfo {
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  lastUsed: string | null;
  articleCount: number;
  activeModel?: string;
}

const AIProvidersPanel = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [credStatus, articles, settings] = await Promise.all([
          runBackendQuery(() => supabase.rpc('get_credentials_status')),
          runBackendQuery(() =>
            supabase
              .from('articles')
              .select('ai_provider, created_at')
              .eq('user_id', user.id)
              .not('ai_provider', 'is', null)
              .order('created_at', { ascending: false })
              .limit(500),
          ),
          runBackendQuery(() =>
            supabase
              .from('user_settings')
              .select('gemini_model, openai_model, groq_model')
              .eq('user_id', user.id)
              .maybeSingle()
          ),
        ]);

        const cred = (credStatus as any) || {};
        const arts = (articles || []) as Array<{ ai_provider: string; created_at: string }>;
        const userSets = (settings as any) || {};

        const countByProvider: Record<string, number> = {};
        const lastByProvider: Record<string, string> = {};

        for (const a of arts) {
          const p = a.ai_provider;
          countByProvider[p] = (countByProvider[p] || 0) + 1;
          if (!lastByProvider[p]) lastByProvider[p] = a.created_at;
        }

        const providerList: ProviderInfo[] = [
          {
            name: 'Google Gemini',
            icon: <Sparkles className="h-4 w-4" />,
            connected: !!cred.has_gemini_key,
            lastUsed: lastByProvider['Gemini'] || null,
            articleCount: countByProvider['Gemini'] || 0,
            activeModel: userSets.gemini_model === 'gemini-1.5-flash' ? 'gemini-2.0-flash-exp' : userSets.gemini_model,
          },
          {
            name: 'OpenAI',
            icon: <BrainCircuit className="h-4 w-4" />,
            connected: !!cred.has_openai_key,
            lastUsed: lastByProvider['OpenAI'] || null,
            articleCount: countByProvider['OpenAI'] || 0,
            activeModel: userSets.openai_model,
          },
          {
            name: 'Groq',
            icon: <Zap className="h-4 w-4" />,
            connected: !!cred.has_groq_key,
            lastUsed: lastByProvider['Groq'] || null,
            articleCount: countByProvider['Groq'] || 0,
            activeModel: userSets.groq_model === 'llama-3.3-70b-versatile' ? 'llama-3.1-8b-instant' : userSets.groq_model,
          },
          {
            name: 'Lovable AI',
            icon: <Cpu className="h-4 w-4" />,
            connected: true,
            lastUsed: lastByProvider['Lovable AI'] || null,
            articleCount: countByProvider['Lovable AI'] || 0,
          },
        ];

        setProviders(providerList);
      } catch (err) {
        console.error('[AIProvidersPanel] error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin}min atrás`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h atrás`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD}d atrás`;
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Find the most recently used provider
  const lastUsedProvider = providers
    .filter((p) => p.lastUsed)
    .sort((a, b) => new Date(b.lastUsed!).getTime() - new Date(a.lastUsed!).getTime())[0]?.name;

  return (
    <Card className="glass-card neon-border-lilac rounded-none">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          <CardTitle className="text-sm text-foreground uppercase tracking-widest font-black">Provedores de IA</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Ordem de fallback: Gemini → OpenAI → Groq → Lovable AI
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {providers.map((p) => (
          <div
            key={p.name}
            className="flex items-center gap-3 p-2.5 rounded-none bg-secondary/20 border border-primary/5 hover:bg-secondary/40 transition-colors"
          >
            <div className={`p-1.5 rounded-none ${p.connected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {p.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{p.name}</span>
                {p.name === lastUsedProvider && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-0 rounded-none uppercase font-bold">
                    último usado
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {p.activeModel && <span className="text-primary/70">{p.activeModel}</span>}
                {p.articleCount > 0 && <span>• {p.articleCount} artigos</span>}
                {p.lastUsed && <span>• {formatDate(p.lastUsed)}</span>}
                {p.articleCount === 0 && !p.lastUsed && !p.activeModel && <span>Sem uso</span>}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${p.connected ? 'bg-green-500' : 'bg-destructive'}`} />
              <span className={`text-[11px] ${p.connected ? 'text-green-500' : 'text-destructive'}`}>
                {p.connected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AIProvidersPanel;
