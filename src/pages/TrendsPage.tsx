import { useEffect, useState, useMemo } from 'react';
import Preloader from '@/components/Preloader';
import ViralNewsSearch from '@/components/admin/ViralNewsSearch';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, 
  TrendingUp, 
  Loader2, 
  Sparkles, 
  Filter, 
  ArrowUpDown,
  Calendar,
  Trash2,
  XCircle
} from 'lucide-react';
import { getErrorMessage, runBackendQuery } from '@/lib/backend';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TrendsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(30); // minutos
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<"all" | "BR" | "World">("BR");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "audience_desc" | "audience_asc">("audience_desc");
  const [timeFilter, setTimeFilter] = useState<string>("24h");

  const sources = useMemo(() => {
    const uniqueSources = new Set<string>();
    topics.forEach(t => {
      if (t.source_name) uniqueSources.add(t.source_name);
    });
    return Array.from(uniqueSources).sort();
  }, [topics]);

  const filteredAndSortedTopics = useMemo(() => {
    let result = [...topics];

    if (sourceFilter !== "all") {
      result = result.filter(t => t.source_name === sourceFilter);
    }

    if (regionFilter !== "all") {
      result = result.filter(t => {
        const isWorld = t.source_name?.includes('US') || t.source_name?.includes('Global') || t.source_name?.includes('Mundo');
        return regionFilter === "World" ? isWorld : !isWorld;
      });
    }

    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const isFresh = (t: any) => now - new Date(t.fetched_at || 0).getTime() <= DAY;

    result.sort((a, b) => {
      // Prioridade absoluta: tendências das últimas 24h vêm primeiro
      const freshA = isFresh(a);
      const freshB = isFresh(b);
      if (freshA !== freshB) return freshA ? -1 : 1;

      if (sortBy === "audience_desc" || sortBy === "audience_asc") {
        const volumeA = parseInt(a.search_volume?.replace(/[^0-9]/g, '') || '0');
        const volumeB = parseInt(b.search_volume?.replace(/[^0-9]/g, '') || '0');
        return sortBy === "audience_desc" ? volumeB - volumeA : volumeA - volumeB;
      }

      const dateA = new Date(a.fetched_at || 0).getTime();
      const dateB = new Date(b.fetched_at || 0).getTime();
      return sortBy === "recent" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [topics, sourceFilter, regionFilter, sortBy]);

  const fetchTopics = async () => {
    if (!user) return;

    try {
      // Buscar configurações para saber o intervalo e última atualização
      const { data: settings } = await supabase
        .from('user_settings')
        .select('last_trends_fetch, trends_refresh_interval')
        .eq('user_id', user.id)
        .single();

      if (settings) {
        if (settings.last_trends_fetch) setLastUpdate(new Date(settings.last_trends_fetch));
        if (settings.trends_refresh_interval) setRefreshInterval(settings.trends_refresh_interval);

        // Lógica de atualização automática se o tempo expirou
        const now = new Date();
        const last = settings.last_trends_fetch ? new Date(settings.last_trends_fetch) : new Date(0);
        const diffMinutes = (now.getTime() - last.getTime()) / (1000 * 60);

        // Se passaram mais de X minutos, atualiza automaticamente
        const interval = settings.trends_refresh_interval || 30;
        if (diffMinutes >= interval) {
          console.log(`Intervalo de ${interval}min atingido, atualizando tendências...`);
          handleFetchTrends();
          return;
        }
      }

      let query = supabase
        .from('trending_topics')
        .select('*')
        .eq('user_id', user.id)
        .eq('used', false);

      if (timeFilter !== "all") {
        const now = new Date();
        const past = new Date();
        if (timeFilter === "24h") past.setHours(now.getHours() - 24);
        else if (timeFilter === "48h") past.setHours(now.getHours() - 48);
        else if (timeFilter === "7d") past.setDate(now.getDate() - 7);
        
        query = query.gte('fetched_at', past.toISOString());
      }

      const data = await runBackendQuery(() =>
        query
          .order('fetched_at', { ascending: false })
          .limit(100)
      );

      setTopics(data || []);
    } catch (error) {
      setTopics([]);
      toast({ title: 'Erro ao carregar tendências', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();

    // Setup de um timer para verificar periodicamente enquanto a página está aberta
    const timer = setInterval(() => {
      fetchTopics();
    }, 60000); // verifica a cada minuto

    return () => clearInterval(timer);
  }, [user, timeFilter]);

  const handleFetchTrends = async () => {
    setFetching(true);
    try {
      const data = await runBackendQuery(() =>
        supabase.functions.invoke('fetch-trends', {
          body: { userId: user?.id },
        }),
      );

      toast({ title: 'Tendências atualizadas!', description: data?.message });
      fetchTopics();
    } catch (error) {
      toast({ title: 'Erro', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setFetching(false);
    }
  };
  
  const handleGenerate = async (topicsToUse?: any[]) => {
    if (!user) return;
    setGenerating(true);
    
    try {
      // Step 1: Atualizar tendências antes de gerar (conforme solicitado)
      setFetching(true);
      await supabase.functions.invoke('fetch-trends', {
        body: { userId: user.id },
      });
      setFetching(false);

      // Step 2: Gerar artigos
      const body: any = { userId: user.id };
      
      // Se não houver tópicos passados (botão "Gerar Tudo"), pegamos os 50 primeiros da lista filtrada
      const finalTopics = topicsToUse && topicsToUse.length > 0 
        ? topicsToUse 
        : filteredAndSortedTopics.filter(t => !t.used).slice(0, 50);

      if (finalTopics.length > 0) {
        body.topics = finalTopics.map(t => ({
          topic: t.topic,
          category: t.category,
          search_volume: t.search_volume,
          context: t.context
        }));
        
        // Garante que usamos os tópicos selecionados/filtrados
        console.log(`[TrendsPage] Enviando ${finalTopics.length} tópicos para geração`);
      }

      const { data, error } = await supabase.functions.invoke('generate-articles', {
        body
      });

      if (error) throw error;

      toast({ 
        title: data?.success ? 'Artigos em geração!' : 'Atenção', 
        description: data?.success 
          ? 'Os artigos estão sendo criados. Vá para a página de Artigos para revisar e publicar.' 
          : (data?.message || 'Erro ao iniciar geração.'),
        variant: data?.success ? 'default' : 'destructive'
      });
      
      setSelectedTopics([]);
      fetchTopics();
    } catch (error) {
      toast({ title: 'Erro ao gerar', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setGenerating(false);
      setFetching(false);
    }
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev => 
      prev.includes(topicId) 
        ? prev.filter(id => id !== topicId) 
        : [...prev, topicId]
    );
  };

  const selectAllFiltered = () => {
    const availableTopicIds = filteredAndSortedTopics.filter(t => !t.used).map(t => t.id);
    if (selectedTopics.length === availableTopicIds.length && availableTopicIds.length > 0) {
      setSelectedTopics([]);
    } else {
      setSelectedTopics(availableTopicIds);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    try {
      const { error } = await supabase
        .from('trending_topics')
        .update({ used: true })
        .eq('id', topicId);

      if (error) throw error;
      setTopics(prev => prev.filter(t => t.id !== topicId));
      toast({ title: 'Tendência removida', description: 'Assunto ignorado com sucesso.' });
    } catch (error) {
      toast({ title: 'Erro ao remover', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  const handleBatchDeleteTopics = async () => {
    if (selectedTopics.length === 0) return;
    try {
      const { error } = await supabase
        .from('trending_topics')
        .update({ used: true })
        .in('id', selectedTopics);

      if (error) throw error;
      setTopics(prev => prev.filter(t => !selectedTopics.includes(t.id)));
      setSelectedTopics([]);
      toast({ title: `${selectedTopics.length} tendências removidas` });
    } catch (error) {
      toast({ title: 'Erro ao remover lote', description: getErrorMessage(error), variant: 'destructive' });
    }
  };


  if (loading) return <Preloader message="Carregando tendências..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tendências</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-muted-foreground text-sm">Assuntos em alta no Brasil e no Mundo</p>
            {lastUpdate && (
              <span className="text-[10px] bg-secondary/50 px-2 py-0.5 rounded-full text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                <RefreshCw className={`h-2.5 w-2.5 ${fetching ? 'animate-spin' : ''}`} />
                Última atualização: {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {selectedTopics.length > 0 && (
            <Button 
              onClick={() => handleGenerate(topics.filter(t => selectedTopics.includes(t.id)))} 
              disabled={generating || fetching}
              variant="default"
              className="bg-[#a3ff12] text-black hover:bg-[#a3ff12]/90 hover:text-black shadow-neon-lilac order-1 sm:order-none w-full sm:w-auto"
            >
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Gerar Artigos com Selecionados ({selectedTopics.length})
            </Button>
          )}
          <Button onClick={handleFetchTrends} disabled={fetching || generating} variant="outline" size="sm" className="shadow-sm order-3 sm:order-none flex-1 sm:flex-none bg-[#a3ff12] text-black border-[#a3ff12] hover:bg-[#a3ff12]/90 hover:text-black">
            {fetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {fetching ? "Atualizando..." : "Atualizar"}
          </Button>
          <Button onClick={() => handleGenerate()} disabled={generating || fetching} className="bg-[#b57bff] text-black hover:bg-[#b57bff]/90 hover:text-black shadow-neon-lilac hover:scale-[1.02] transition-transform order-2 sm:order-none flex-1 sm:flex-none">
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Atualizar e Gerar Tudo
          </Button>
        </div>
      </div>

      <ViralNewsSearch />

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={regionFilter} onValueChange={(v: any) => setRegionFilter(v)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Região" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">BR & Mundo</SelectItem>
                <SelectItem value="BR">Apenas Brasil 🇧🇷</SelectItem>
                <SelectItem value="World">Apenas Mundo 🌎</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Fonte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as fontes</SelectItem>
                {sources.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="audience_desc">Maior audiência</SelectItem>
                <SelectItem value="audience_asc">Menor audiência</SelectItem>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="oldest">Mais antigos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedTopics.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchDeleteTopics}
                className="text-xs h-8 bg-[#a3ff12] text-black border-[#a3ff12] hover:bg-[#a3ff12]/90 hover:text-black"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Apagar Selecionados ({selectedTopics.length})
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Últimas 24 horas</SelectItem>
                <SelectItem value="48h">Últimas 48 horas</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="all">Todo o histórico</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 px-1">
          <Checkbox 
            id="select-all"
            checked={selectedTopics.length > 0 && selectedTopics.length === filteredAndSortedTopics.filter(t => !t.used).length}
            onCheckedChange={selectAllFiltered}
          />
          <label htmlFor="select-all" className="text-sm font-medium cursor-pointer select-none">
            Selecionar {sourceFilter !== "all" ? "desta fonte" : "todos disponíveis"}
          </label>
        </div>
      </div>

      {filteredAndSortedTopics.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-16 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma tendência encontrada com estes filtros.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredAndSortedTopics.slice(0, 50).map((topic, index) => (
            <Card key={topic.id} className="shadow-card group relative">
              <CardContent className="p-4 flex items-center gap-4">
                <Checkbox 
                  checked={selectedTopics.includes(topic.id)}
                  onCheckedChange={() => toggleTopic(topic.id)}
                  disabled={topic.used}
                />
                <div className={`flex items-center justify-center min-w-[2.75rem] h-10 rounded-lg font-bold text-sm ${
                  index === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 shadow-neon-lilac' :
                  index === 1 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/40' :
                  index === 2 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' :
                  'bg-secondary/50 text-muted-foreground border border-border'
                }`}>
                  #{index + 1}
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">{topic.topic}</p>
                      {topic.search_volume && (
                        <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] h-5 font-bold">
                          🔥 {topic.search_volume}
                        </Badge>
                      )}
                      {topic.source_url && (
                        <a 
                          href={topic.source_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="Ver fonte original"
                        >
                          <TrendingUp className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {topic.context && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic line-clamp-1">{topic.context}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] h-5 bg-blue-500/10 text-blue-500 border-blue-500/20">
                        {topic.source_name?.includes('US') || topic.source_name?.includes('Global') || topic.source_name?.includes('Mundo') ? 'Google Trends Mundo 🌎' : 'Google Trends BR 🇧🇷'}
                      </Badge>
                      <Badge variant="secondary">{topic.category}</Badge>
                      {topic.search_volume && (
                        <span className="text-xs text-muted-foreground">{topic.search_volume} buscas</span>
                      )}
                      {topic.update_count > 1 && (
                        <Badge variant="outline" className="text-[10px] h-5 bg-blue-50 text-blue-600 border-blue-200">
                          {topic.update_count}x hoje
                        </Badge>
                      )}
                      {topic.fetched_at && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(topic.fetched_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {topic.source_name && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          • Fonte: {topic.source_url ? (
                            <a 
                              href={topic.source_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline font-medium"
                            >
                              {topic.source_name}
                            </a>
                          ) : (
                            topic.source_name
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTopic(topic.id);
                      }}
                      className="h-8 w-8 bg-[#a3ff12] text-black hover:bg-[#a3ff12]/90 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remover assunto"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                    
                    {topic.used ? (
                      <Badge variant="outline" className="text-muted-foreground">Usado</Badge>
                    ) : (
                      <Badge className="bg-success/20 text-success">Disponível</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrendsPage;
