import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Flame, Search, Loader2, Sparkles, ExternalLink, Newspaper } from 'lucide-react';
import { getErrorMessage } from '@/lib/backend';

interface ViralItem {
  title: string;
  link: string;
  pubDate?: string;
  source?: string;
  description?: string;
}

const ViralNewsSearch = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ViralItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);
  const [searched, setSearched] = useState(false);

  const runSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) {
      toast({ title: 'Digite um termo', description: 'Ex: eleições, tecnologia, futebol...', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      // Google News RSS com filtro de 24h (when:1d) — ordenado por relevância/popularidade
      const q = `${query.trim()} when:1d`;
      const rss = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=pt-BR&gl=BR&ceid=BR:pt`;
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rss)}`);
      const data = await res.json();
      const parsed: ViralItem[] = (data.items || []).slice(0, 20).map((it: any) => {
        const parts = (it.title || '').split(' - ');
        const source = parts.length > 1 ? parts[parts.length - 1] : (it.author || '');
        const title = parts.length > 1 ? parts.slice(0, -1).join(' - ') : it.title;
        return {
          title,
          link: it.link,
          pubDate: it.pubDate,
          source,
          description: (it.description || '').replace(/<[^>]+>/g, '').slice(0, 240),
        };
      });
      setItems(parsed);
      if (parsed.length === 0) {
        toast({ title: 'Nada encontrado', description: 'Tente outro termo ou verifique a grafia.' });
      }
    } catch (err) {
      toast({ title: 'Erro na busca', description: getErrorMessage(err), variant: 'destructive' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArticle = async (item: ViralItem, idx: number) => {
    if (!user) return;
    setGeneratingIdx(idx);
    try {
      const { data, error } = await supabase.functions.invoke('generate-articles', {
        body: {
          userId: user.id,
          topics: [{
            topic: item.title,
            category: 'Notícias',
            search_volume: null,
            context: `${item.description || ''}\nFonte: ${item.source || ''}\nLink: ${item.link}`,
          }],
        },
      });
      if (error) throw error;
      toast({
        title: data?.success ? 'Artigo em geração!' : 'Atenção',
        description: data?.success
          ? 'Vá para a página de Artigos para revisar e publicar.'
          : (data?.message || 'Erro ao iniciar geração.'),
        variant: data?.success ? 'default' : 'destructive',
      });
    } catch (err) {
      toast({ title: 'Erro ao gerar', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setGeneratingIdx(null);
    }
  };

  return (
    <Card className="shadow-card border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flame className="h-5 w-5 text-[#ff2ec8]" />
          Matérias mais viralizadas (últimas 24h)
        </CardTitle>
        <CardDescription>
          Pesquise um assunto e gere um artigo instantaneamente a partir das notícias em alta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={runSearch} className="flex gap-2">
          <Input
            placeholder="Ex: eleições, IA, Palmeiras, criptomoedas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" disabled={loading} className="gradient-primary shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Buscar</span>
          </Button>
        </form>

        {searched && !loading && items.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Nenhuma notícia encontrada para "{query}" nas últimas 24 horas.
          </div>
        )}

        {items.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border bg-card/40">
            {items.map((item, idx) => (
              <li key={idx} className="p-3 flex items-start gap-3 hover:bg-accent/5 transition-colors">
                <div className="flex-1 min-w-0">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-sm text-foreground hover:text-primary line-clamp-2"
                  >
                    {item.title}
                  </a>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {item.source && (
                      <Badge variant="secondary" className="text-[10px] h-5">{item.source}</Badge>
                    )}
                    {item.pubDate && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.pubDate).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    )}
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" /> abrir
                    </a>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleCreateArticle(item, idx)}
                  disabled={generatingIdx !== null}
                  className="gradient-primary shrink-0 h-8"
                >
                  {generatingIdx === idx ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1.5 text-xs">Criar Artigo</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default ViralNewsSearch;
