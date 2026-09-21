import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, RefreshCw, Loader2, ExternalLink, BarChart3, TrendingUp, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { runBackendQuery } from '@/lib/backend';
import Preloader from '@/components/Preloader';

const GooglePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gaConnected, setGaConnected] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    
    const checkConnection = async () => {
      try {
        const { data } = await supabase
          .from('user_settings')
          .select('google_analytics_property_id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        const connected = !!data?.google_analytics_property_id;
        setGaConnected(connected);
        
        if (connected) {
          const res = await supabase.functions.invoke('fetch-analytics', {
            body: { userId: user.id }
          });
          if (res.data?.analytics) setAnalytics(res.data.analytics);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setTimeout(() => setLoading(false), 800);
      }
    };

    checkConnection();
  }, [user]);

  if (loading) return <Preloader message="carregando dados aguarde" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/20 flex items-center justify-center rounded-sm border border-primary/30">
            <Search className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Google Ecosystem</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Analytics & Search Console</p>
          </div>
        </div>
      </div>

      {!gaConnected ? (
        <Card className="glass-card border-dashed border-primary/30 p-12 text-center">
          <Search className="h-12 w-12 text-primary/40 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Google Analytics não conectado</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
            Conecte sua propriedade do Google Analytics 4 para visualizar métricas detalhadas de tráfego, usuários e comportamento.
          </p>
          <Button onClick={() => window.location.href='/settings'} className="gradient-primary uppercase tracking-widest text-[10px] font-bold">
            Ir para Configurações
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card p-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Visualizações de Página</p>
            <p className="text-2xl font-black text-primary">{analytics?.pageviews?.toLocaleString() || '0'}</p>
          </Card>
          <Card className="glass-card p-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Sessões</p>
            <p className="text-2xl font-black text-foreground">{analytics?.sessions?.toLocaleString() || '0'}</p>
          </Card>
          <Card className="glass-card p-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Usuários Ativos</p>
            <p className="text-2xl font-black text-success">{analytics?.users?.toLocaleString() || '0'}</p>
          </Card>
          <Card className="glass-card p-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Taxa de Rejeição</p>
            <p className="text-2xl font-black text-warning">{analytics?.bounceRate?.toFixed(2) || '0'}%</p>
          </Card>
        </div>
      )}

      {/* More components could be added here similar to AnalyticsPage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Top Páginas (Google)
          </h3>
          <div className="space-y-3">
             {analytics?.topPages?.slice(0, 5).map((page: any, i: number) => (
               <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-sm">
                 <span className="text-xs truncate max-w-[200px]">{page.page}</span>
                 <span className="text-xs font-bold text-primary">{page.views} views</span>
               </div>
             )) || <p className="text-xs text-muted-foreground italic text-center py-4">Nenhum dado disponível</p>}
          </div>
        </Card>

        <Card className="glass-card p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4 text-accent" /> Origens de Tráfego
          </h3>
          <div className="space-y-3">
             {analytics?.trafficSources?.slice(0, 5).map((source: any, i: number) => (
               <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-sm">
                 <span className="text-xs">{source.source}</span>
                 <span className="text-xs font-bold text-success">{source.value}%</span>
               </div>
             )) || <p className="text-xs text-muted-foreground italic text-center py-4">Nenhum dado disponível</p>}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default GooglePage;
