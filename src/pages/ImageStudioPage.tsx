import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles, ImageIcon, Send, Check } from 'lucide-react';
import { getErrorMessage } from '@/lib/backend';
import { MagnificMediaSettings } from '@/components/media/MagnificMediaSettings';

type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; imageUrl: string; prompt: string; assignedTo?: string };

type ArticleRow = { id: string; title: string; featured_image_url: string | null; category: string | null };

const uid = () => Math.random().toString(36).slice(2, 10);

export default function ImageStudioPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadArticles = async () => {
    if (!user) return;
    setLoadingArticles(true);
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, featured_image_url, category')
        .eq('user_id', user.id)
        .or('featured_image_url.is.null,featured_image_url.eq.')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setArticles((data || []) as ArticleRow[]);
    } catch (e) {
      toast({ title: 'Erro ao carregar artigos', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setLoadingArticles(false);
    }
  };

  useEffect(() => {
    loadArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const FIXED_PREFIX = 'você é um design senior crie uma imagem com o texto abaixo:';

  const handleGenerate = async () => {
    const p = prompt.trim();
    if (!p || generating) return;
    setGenerating(true);
    const fullPrompt = `${FIXED_PREFIX}\n${p}`;
    const userMsg: ChatMessage = { id: uid(), role: 'user', text: p };
    setMessages((m) => [...m, userMsg]);
    setPrompt('');
    try {
      const { data, error } = await supabase.functions.invoke('image-studio', { body: { prompt: fullPrompt, userId: user?.id } });
      if (error) throw error;
      if (!data?.imageUrl) throw new Error(data?.error || 'Sem imagem no retorno');
      setMessages((m) => [...m, { id: uid(), role: 'assistant', imageUrl: data.imageUrl, prompt: p }]);
    } catch (e) {
      toast({ title: 'Erro ao gerar imagem', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const assignImage = async (messageId: string, imageUrl: string, articleId: string) => {
    setAssigningId(articleId);
    try {
      const { error } = await supabase
        .from('articles')
        .update({ featured_image_url: imageUrl })
        .eq('id', articleId)
        .eq('user_id', user!.id);
      if (error) throw error;
      toast({ title: 'Imagem vinculada!', description: 'O artigo agora usa esta imagem.' });
      setArticles((list) => list.filter((a) => a.id !== articleId));
      setMessages((msgs) =>
        msgs.map((m) => (m.id === messageId && m.role === 'assistant' ? { ...m, assignedTo: articleId } : m))
      );
    } catch (e) {
      toast({ title: 'Erro ao vincular', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="media-studio-page space-y-6">
      <MagnificMediaSettings />

      <div className="rounded-lg border border-border/60 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground flex items-start gap-2">
        <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
        <p>
          <strong className="text-foreground">Estúdio manual legado:</strong> a área abaixo continua usando a integração de imagem já existente (OpenAI/DALL·E). A Magnific acima funciona de forma independente para mídia automática dos artigos.
        </p>
      </div>

      <div className="media-studio-workspace grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5 min-h-[620px] xl:h-[calc(100vh-12rem)] xl:min-h-[680px]">
        <Card className="glass-card flex min-h-[560px] flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-widest">Estúdio manual de imagens IA</h3>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-16">
                <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Descreva a imagem que você quer criar.</p>
                <p className="text-xs mt-1 opacity-70">Ex.: “Um astronauta caminhando em Marte, estilo cinematográfico”</p>
              </div>
            )}

            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[90%] sm:max-w-[80%] bg-primary/15 border border-primary/30 rounded-lg px-4 py-2 text-sm">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex justify-start">
                  <div className="max-w-full sm:max-w-[85%] space-y-2">
                    <div className="rounded-lg overflow-hidden border border-border/50 bg-black/20">
                      <img src={m.imageUrl} alt={m.prompt} className="max-w-full h-auto block" loading="lazy" />
                    </div>
                    <p className="text-[11px] text-muted-foreground italic">“{m.prompt}”</p>
                    {m.assignedTo && (
                      <p className="text-[11px] text-success flex items-center gap-1">
                        <Check className="h-3 w-3" /> Vinculada a um artigo
                      </p>
                    )}
                  </div>
                </div>
              )
            )}

            {generating && (
              <div className="flex justify-start">
                <div className="rounded-lg border border-border/50 bg-secondary/40 px-4 py-3 text-xs flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando imagem...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/40 p-3 space-y-2 bg-background/30">
            <div className="text-[11px] px-3 py-2 rounded-md bg-primary/10 border border-primary/30 text-primary/90 italic select-none">
              {FIXED_PREFIX}
            </div>
            <div className="flex items-end gap-2">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                placeholder="Escreva aqui o texto/descrição da imagem..."
                rows={2}
                className="min-w-0 flex-1 resize-none text-sm"
                disabled={generating}
              />
              <Button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="shrink-0 bg-success text-success-foreground hover:bg-success/90 transition-shadow hover:shadow-[0_0_12px_hsl(var(--success)/0.9),0_0_28px_hsl(var(--success)/0.6)]"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="glass-card flex min-h-[420px] flex-col overflow-hidden xl:min-h-0">
          <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between gap-2">
            <h3 className="font-bold text-xs uppercase tracking-widest">Artigos sem imagem</h3>
            <Button size="sm" variant="ghost" onClick={loadArticles} disabled={loadingArticles} className="h-7 text-xs">
              {loadingArticles ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Atualizar'}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {articles.length === 0 && !loadingArticles && (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhum artigo sem imagem.</p>
            )}
            {articles.map((a) => {
              const lastImage = [...messages].reverse().find((m) => m.role === 'assistant') as
                | Extract<ChatMessage, { role: 'assistant' }>
                | undefined;
              return (
                <div key={a.id} className="border border-border/40 rounded-lg p-3 space-y-2 bg-secondary/30">
                  <p className="text-xs font-semibold line-clamp-2">{a.title}</p>
                  {a.category && <p className="text-[10px] text-muted-foreground uppercase">{a.category}</p>}
                  <Button
                    size="sm"
                    className="w-full h-7 text-[11px]"
                    disabled={!lastImage || assigningId === a.id}
                    onClick={() => lastImage && assignImage(lastImage.id, lastImage.imageUrl, a.id)}
                    title={!lastImage ? 'Gere uma imagem primeiro' : 'Vincular última imagem gerada'}
                  >
                    {assigningId === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <>Usar esta imagem</>}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
