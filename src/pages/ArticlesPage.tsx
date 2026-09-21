import { useEffect, useState } from 'react';
import Preloader from '@/components/Preloader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Send, Eye, Trash2, Loader2, FileText, RotateCcw, ImagePlus, Sparkles, Database, Layers, Activity, Clock, ChevronDown, ChevronUp, Image as ImageIcon, CheckCircle, Globe } from 'lucide-react';
import { getErrorMessage, runBackendMutation, runBackendQuery } from '@/lib/backend';
import { diagnostics } from '@/lib/diagnostics';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ImageUpload } from '@/components/articles/ImageUpload';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ManualArticleDialog } from '@/components/articles/ManualArticleDialog';
import { GenerateFromKnowledgeDialog } from '@/components/articles/GenerateFromKnowledgeDialog';
import { Plus, BookOpen } from 'lucide-react';

const ArticlesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [regeneratingImages, setRegeneratingImages] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [diagMetrics, setDiagMetrics] = useState<any[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [knowledgeDialogOpen, setKnowledgeDialogOpen] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [generatingByTitle, setGeneratingByTitle] = useState(false);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState<string>('all');

  const PAGE_SIZE = 20;

  const fetchArticles = async (options?: { append?: boolean; silent?: boolean }) => {
    if (!user) return;
    const startTime = diagnostics.startTimer();
    const silent = options?.silent ?? false;
    const append = options?.append ?? false;

    if (!silent && !append) setLoading(true);
    if (append) setLoadingMore(true);

    const from = append ? articles.length : 0;
    const to = from + PAGE_SIZE - 1;

    try {
      setErrorState(null);
      setInitialFetchDone(true); // Mark as done to prevent infinite retry loops on error
      
      // Sequential fetch to avoid lock contention
      const { data: blogsData } = await supabase.from('user_blogs').select('id, name');
      if (blogsData) setBlogs(blogsData);

      let query = supabase
        .from('articles')
        .select('id, title, status, category, seo_keyword, meta_description, featured_image_url, scheduled_at, blog_id')
        .eq('user_id', user.id);

      if (selectedBlogId !== 'all') {
        query = query.eq('blog_id', selectedBlogId);
      }

      const { data: fetchedArticles, error: articlesError } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (articlesError) throw articlesError;

      // Single count query
      const { count, error: countError } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .match(selectedBlogId !== 'all' ? { blog_id: selectedBlogId } : {});
      
      if (countError) console.warn('[ArticlesPage] Count error:', countError);
      if (count !== null) setTotalCount(count);
      
      setHasMore(fetchedArticles.length === PAGE_SIZE);
      setArticles((current) => (append ? [...current, ...fetchedArticles] : fetchedArticles));
      
      diagnostics.endTimer(startTime, 'Carregar Artigos', 'success', `${fetchedArticles.length} itens`);
    } catch (error: any) {
      const msg = getErrorMessage(error);
      diagnostics.endTimer(startTime, 'Carregar Artigos', 'error', msg);
      console.error('[ArticlesPage] fetchArticles error:', error);
      
      // Se for o erro de lock, não mostramos a tela de erro fatal, apenas um toast silencioso
      if (msg.includes('lock') || msg.includes('stole')) {
        console.warn('[ArticlesPage] Supabase lock conflict detected, retrying silently...');
        setTimeout(() => fetchArticles({ silent: true }), 1500);
        return;
      }

      setErrorState(msg);
      toast({ title: 'Erro ao carregar artigos', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (user) {
      setDiagMetrics(diagnostics.getMetrics());
      Promise.all([fetchArticles(), fetchCategories()]);
    }
  }, [user, selectedBlogId]);

  // Auto-close preview logic
  useEffect(() => {
    const checkAndClosePreview = (articleId: string) => {
      // Small delay to let states update
      setTimeout(async () => {
        const { data: article } = await supabase
          .from('articles')
          .select('title, content, featured_image_url, category, seo_keyword, meta_description')
          .eq('id', articleId)
          .single();

        if (article) {
          const isMissingInfo = 
            !article.title || 
            !article.content || 
            !article.featured_image_url || 
            !article.category || 
            !article.seo_keyword || 
            !article.meta_description;

          if (!isMissingInfo) {
            console.log('[ArticlesPage] Tudo preenchido, fechando prévia automaticamente...');
            setPreviewOpen(false);
            setPreview(null);
            toast({ title: 'Processo finalizado', description: 'Artigo completo e salvo com sucesso.' });
          } else {
            console.log('[ArticlesPage] Ainda faltam informações:', {
              title: !!article.title,
              content: !!article.content,
              image: !!article.featured_image_url,
              category: !!article.category,
              keyword: !!article.seo_keyword,
              meta: !!article.meta_description
            });
          }
        }
      }, 1000);
    };

    const handleImageEvent = (e: any) => {
      const { articleId } = e.detail;
      checkAndClosePreview(articleId);
    };

    window.addEventListener('article-image-uploaded', handleImageEvent);
    window.addEventListener('article-image-generated', handleImageEvent);

    return () => {
      window.removeEventListener('article-image-uploaded', handleImageEvent);
      window.removeEventListener('article-image-generated', handleImageEvent);
    };
  }, []);

  useEffect(() => {
    const handleUpdate = (e: any) => setDiagMetrics(e.detail);
    const handleRefresh = () => fetchArticles();
    
    window.addEventListener('diagnostics-updated', handleUpdate);
    window.addEventListener('refresh-articles', handleRefresh);
    
    return () => {
      window.removeEventListener('diagnostics-updated', handleUpdate);
      window.removeEventListener('refresh-articles', handleRefresh);
    };
  }, []);

  const fetchCategories = async () => {
    if (!user) return;
    setLoadingCategories(true);
    const fallback = ['policia', 'celebridades', 'politica', 'esportes', 'saude', 'financas'];
    try {
      // 1) Prioridade: categorias vindas do WordPress conectado (dinâmico)
      const { data: wpData } = await supabase.functions.invoke('list-wp-categories', {
        body: { userId: user.id },
      });
      const wpCats: string[] = Array.isArray(wpData?.categories) ? wpData.categories : [];
      if (wpCats.length > 0) {
        setUserCategories(wpCats);
        return;
      }

      // 2) Fallback: categorias salvas nas configurações do usuário
      const { data } = await supabase
        .from('user_settings')
        .select('categories')
        .eq('user_id', user.id)
        .maybeSingle();
      setUserCategories(data?.categories?.length ? data.categories : fallback);
    } catch (e) {
      console.error('Error fetching categories', e);
      setUserCategories(fallback);
    } finally {
      setLoadingCategories(false);
    }
  };


  const handleGenerateByCategory = async (category: string) => {
    if (!user) return;
    setGenerating(true);
    try {
      // First update trends before generating, as requested
      await supabase.functions.invoke('fetch-trends', {
        body: { userId: user.id },
      });

      const { data, error } = await supabase.functions.invoke('generate-articles', {
        body: { userId: user.id, forceCategory: category },
      });
      if (error) throw error;
      toast({
        title: data?.success ? 'Artigo sendo gerado!' : 'Atenção',
        description: `Iniciada geração para a categoria: ${category}. ${data?.message || ''}`,
        variant: data?.success ? 'default' : 'destructive',
      });
      fetchArticles();
    } catch (error) {
      toast({ title: 'Erro ao gerar', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const data = await runBackendQuery(() =>
        supabase.functions.invoke('generate-articles', {
          body: { userId: user.id },
        }),
      );
      toast({
        title: data?.success ? 'Artigos gerados!' : 'Atenção',
        description: data?.message || data?.error || 'Verifique o resultado.',
        variant: data?.success ? 'default' : 'destructive',
      });
      fetchArticles();
    } catch (error) {
      toast({ title: 'Erro ao gerar artigos', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateByTitle = async () => {
    if (!user) return;
    const title = titleInput.trim();
    if (title.length < 5) {
      toast({ title: 'Título muito curto', description: 'Digite um título com pelo menos 5 caracteres.', variant: 'destructive' });
      return;
    }
    setGeneratingByTitle(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-articles', {
        body: { userId: user.id, topics: [title] },
      });
      if (error) throw error;
      toast({
        title: data?.success ? 'Artigo sendo gerado!' : 'Atenção',
        description: data?.message || `Geração iniciada para: "${title}"`,
        variant: data?.success ? 'default' : 'destructive',
      });
      setTitleInput('');
      fetchArticles();
    } catch (error) {
      toast({ title: 'Erro ao gerar artigo', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setGeneratingByTitle(false);
    }
  };

  const handleUpdateBlogFilter = (blogId: string) => {
    setSelectedBlogId(blogId);
    setInitialFetchDone(false); // Reset to ensure fetch logic works cleanly if needed, though the useEffect dependency is enough
  };

  const handlePublish = async (articleId: string) => {
    const startTime = diagnostics.startTimer();
    setPublishing(articleId);
    try {
      const data = await runBackendQuery(() =>
        supabase.functions.invoke('publish-article', {
          body: { articleId, userId: user?.id },
        }),
      );

      toast({ title: data?.success ? 'Publicado!' : 'Atenção', description: data?.message || 'Verifique o status.', variant: data?.success ? 'default' : 'destructive' });
      diagnostics.endTimer(startTime, 'Postar no WordPress/Social', data?.success ? 'success' : 'error', data?.message);
      fetchArticles();
    } catch (error) {
      diagnostics.endTimer(startTime, 'Postar no WordPress/Social', 'error', getErrorMessage(error));
      toast({ title: 'Erro', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setPublishing(null);
    }
  };

  const handleRetry = async (articleId: string) => {
    setRetrying(articleId);
    try {
      await runBackendMutation(() => supabase.from('articles').update({ status: 'ready' }).eq('id', articleId));

      const data = await runBackendQuery(() =>
        supabase.functions.invoke('publish-article', {
          body: { articleId, userId: user?.id },
        }),
      );

      toast({ title: data?.success ? 'Publicado!' : 'Atenção', description: data?.message || 'Verifique o status.', variant: data?.success ? 'default' : 'destructive' });
      fetchArticles();
    } catch (error) {
      toast({ title: 'Erro', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setRetrying(null);
    }
  };

  const handleDelete = async (articleId: string) => {
    if (!confirm('Tem certeza que deseja excluir este artigo?')) return;
    const startTime = diagnostics.startTimer();
    
    // Optimistic update for immediate speed
    const previousArticles = [...articles];
    setArticles(prev => prev.filter(a => a.id !== articleId));
    setTotalCount(prev => Math.max(0, prev - 1));

    try {
      const { error } = await supabase.from('articles').delete().eq('id', articleId);
      if (error) throw error;
      diagnostics.endTimer(startTime, 'Excluir Artigo', 'success');
      toast({ title: 'Excluído', description: 'Artigo removido.' });
    } catch (error) {
      diagnostics.endTimer(startTime, 'Excluir Artigo', 'error', getErrorMessage(error));
      // Rollback on error
      setArticles(previousArticles);
      setTotalCount(previousArticles.length);
      console.error('[ArticlesPage] Error deleting article:', error);
      toast({ title: 'Erro ao excluir', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  const handlePreview = async (articleId: string) => {
    setPreviewOpen(true);
    setPreviewLoading(true);

    try {
      const data = await runBackendQuery(() =>
        supabase
          .from('articles')
          .select('id, title, category, seo_keyword, meta_description, content, featured_image_url, slug, seo_title, status, visual_elements')
          .eq('id', articleId)
          .maybeSingle(),
      );

      setPreview(data);
    } catch (error) {
      setPreviewOpen(false);
      toast({ title: 'Erro ao carregar prévia', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUpdateArticle = async (articleId: string, updates: any) => {
    try {
      setPreviewLoading(true);
      const { error } = await supabase.from('articles').update(updates).eq('id', articleId);
      if (error) throw error;
      
      setArticles(prev => prev.map(a => a.id === articleId ? { ...a, ...updates } : a));
      setPreview(prev => ({ ...prev, ...updates }));
      toast({ title: 'Artigo atualizado!' });
      setPreviewOpen(false);
    } catch (error) {
      toast({ title: 'Erro ao atualizar', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setPreviewLoading(false);
    }
  };


  const handleRegenerateImages = async () => {
    const withoutImage = articles.filter(a => !a.featured_image_url && a.status !== 'generating');
    if (!user || withoutImage.length === 0) return;
    const startTime = diagnostics.startTimer();
    setRegeneratingImages(true);
    try {
      const data = await runBackendQuery(() =>
        supabase.functions.invoke('regenerate-image', {
          body: { userId: user.id, articleIds: withoutImage.map(a => a.id) },
        }),
      );
      const updatedCount = Number(data?.updated ?? 0);
      toast({
        title: updatedCount > 0 ? 'Imagens geradas!' : 'Nenhuma imagem gerada',
        description: data?.message || `${updatedCount} imagens criadas.`,
        variant: updatedCount > 0 ? 'default' : 'destructive',
      });
      diagnostics.endTimer(startTime, 'Gerar Imagens', 'success', `${updatedCount} imagens`);
      fetchArticles();
    } catch (error) {
      diagnostics.endTimer(startTime, 'Gerar Imagens', 'error', getErrorMessage(error));
      toast({ title: 'Erro', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setRegeneratingImages(false);
    }
  };

  const handleCleanupOld = async () => {
    // ... keep existing code
  };

  const handleUpdateCategory = async (articleId: string, newCategory: string) => {
    try {
      const { error } = await supabase
        .from('articles')
        .update({ category: newCategory })
        .eq('id', articleId);

      if (error) throw error;

      setArticles(prev => prev.map(a => a.id === articleId ? { ...a, category: newCategory } : a));
      toast({ title: 'Categoria atualizada', description: `Artigo movido para ${newCategory}` });
    } catch (error) {
      toast({ title: 'Erro ao atualizar categoria', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  const handleGenerateImageForArticle = async (articleId: string) => {
    if (!user) return;
    const startTime = diagnostics.startTimer();
    setRegeneratingImages(true); // Using existing state to show loading if needed, or I can use a more specific one
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-image', {
        body: { userId: user.id, articleIds: [articleId], force: true },
      });
      
      if (error) throw error;
      
      if (data?.success) {
        const generatedUrl = data.imageUrl;
        
        if (generatedUrl) {
          setPreview(prev => prev && prev.id === articleId ? { ...prev, featured_image_url: generatedUrl } : prev);
          setArticles(prev => prev.map(a => a.id === articleId ? { ...a, featured_image_url: generatedUrl } : a));
          toast({ title: 'Sucesso', description: 'Imagem gerada com sucesso!' });
        } else {
          toast({ title: 'Sucesso', description: 'Imagem sendo gerada com o prompt configurado!' });
          
          // Wait a bit and fetch the updated article (longer poll)
          setTimeout(async () => {
            const { data: updatedArticle } = await supabase
              .from('articles')
              .select('featured_image_url')
              .eq('id', articleId)
              .single();
              
            if (updatedArticle?.featured_image_url) {
              setPreview(prev => prev && prev.id === articleId ? { ...prev, featured_image_url: updatedArticle.featured_image_url } : prev);
              setArticles(prev => prev.map(a => a.id === articleId ? { ...a, featured_image_url: updatedArticle.featured_image_url } : a));
            }
          }, 8000);
        }
      } else {
        toast({ title: 'Atenção', description: data?.message || 'Falha ao iniciar geração', variant: 'destructive' });
      }
      diagnostics.endTimer(startTime, 'Gerar Imagem Individual', 'success');
    } catch (error) {
      diagnostics.endTimer(startTime, 'Gerar Imagem Individual', 'error', getErrorMessage(error));
      toast({ title: 'Erro ao gerar imagem', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setRegeneratingImages(false);
    }
  };

  const handleManualRegenerateImage = () => {
    if (preview?.id) {
      handleGenerateImageForArticle(preview.id);
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    generating: 'bg-warning/20 text-warning',
    ready: 'bg-primary/20 text-primary',
    publishing: 'bg-accent/20 text-accent',
    published: 'bg-primary/20 text-primary',
    failed: 'bg-destructive/20 text-destructive',
  };

  const statusLabels: Record<string, string> = {
    draft: 'Rascunho',
    generating: 'Gerando...',
    ready: 'Pronto',
    publishing: 'Publicando...',
    published: 'Publicado',
    failed: 'Falhou',
  };

  // Paleta de cores por categoria (tokens semânticos + gradientes distintos)
  const categoryColors: Record<string, { bg: string; text: string; border: string; dot: string; ring: string }> = {
    policia:      { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/40',     dot: 'bg-red-500',     ring: 'ring-red-500/30' },
    celebridades: { bg: 'bg-pink-500/10',    text: 'text-pink-400',    border: 'border-pink-500/40',    dot: 'bg-pink-500',    ring: 'ring-pink-500/30' },
    politica:     { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/40',    dot: 'bg-blue-500',    ring: 'ring-blue-500/30' },
    esportes:     { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/40', dot: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
    saude:        { bg: 'bg-teal-500/10',    text: 'text-teal-400',    border: 'border-teal-500/40',    dot: 'bg-teal-500',    ring: 'ring-teal-500/30' },
    financas:     { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/40',   dot: 'bg-amber-500',   ring: 'ring-amber-500/30' },
    tecnologia:   { bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    border: 'border-cyan-500/40',    dot: 'bg-cyan-500',    ring: 'ring-cyan-500/30' },
    variedades:   { bg: 'bg-violet-500/10',  text: 'text-violet-400',  border: 'border-violet-500/40',  dot: 'bg-violet-500',  ring: 'ring-violet-500/30' },
    geral:        { bg: 'bg-slate-500/10',   text: 'text-slate-300',   border: 'border-slate-500/40',   dot: 'bg-slate-400',   ring: 'ring-slate-500/30' },
  };
  const getCategoryColor = (cat?: string) =>
    categoryColors[(cat || 'geral').toLowerCase()] || categoryColors.geral;


  const blogFilter = blogs.length > 0 && (
    <div className="flex items-center gap-2 mb-4 bg-accent/5 p-2 rounded-lg border border-accent/10 w-fit">
      <Globe className="h-4 w-4 text-primary" />
      <span className="text-xs font-medium text-foreground">Blog:</span>
      <select 
        value={selectedBlogId} 
        onChange={(e) => handleUpdateBlogFilter(e.target.value)}
        className="bg-background border border-border rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
      >
        <option value="all">Todos</option>
        {blogs.map(blog => (
          <option key={blog.id} value={blog.id}>{blog.name}</option>
        ))}
      </select>
    </div>
  );
  if (errorState) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-destructive font-medium">Erro ao carregar dados</div>
        <p className="text-sm text-muted-foreground">{errorState}</p>
        <Button onClick={() => fetchArticles()} variant="outline">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  const ArticleCard = ({ article, idx }: { article: any, idx: number }) => (
    <Card
      key={article.id}
      className={`glass-card hover-lift overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 ${article.status === 'failed' ? 'border-destructive/30' : ''}`}
      style={{ animationDelay: `${Math.min(idx, 5) * 50}ms` }}
    >
      <CardContent className="p-0">
        <div className="flex items-stretch min-h-[80px]">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 bg-secondary/40 overflow-hidden group cursor-pointer" onClick={() => handlePreview(article.id)}>
            {article.featured_image_url ? (
              <img
                key={article.featured_image_url}
                src={article.featured_image_url}
                alt={article.title}
                className="absolute inset-0 w-full h-full object-contain transition-all duration-300 opacity-0 group-hover:scale-110"
                onLoad={(e) => (e.currentTarget.style.opacity = "1")}
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                <FileText className="h-6 w-6 text-muted-foreground/60" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ImagePlus className="h-5 w-5 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Badge className={`${statusColors[article.status] || ''} text-[10px] sm:text-xs font-bold`} variant="secondary">
                  {statusLabels[article.status] || article.status}
                </Badge>
                {article.status === 'published' && (
                  <Badge variant="outline" className="text-[10px] sm:text-xs bg-success/10 text-success border-success/30 font-bold">
                    WP: ✅ | FB: ✅ | IG: ✅
                  </Badge>
                )}
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] sm:text-xs font-bold transition-colors capitalize outline-none hover:brightness-125 ${getCategoryColor(article.category).bg} ${getCategoryColor(article.category).text} ${getCategoryColor(article.category).border}`}
                    >
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${getCategoryColor(article.category).dot}`} />
                      {article.category || 'Geral'}
                      <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto bg-[#0A0A0B] border-primary/20 z-[100] min-w-[150px] shadow-2xl shadow-primary/10">
                    {userCategories.map((cat) => (
                      <DropdownMenuItem 
                        key={cat} 
                        onSelect={() => handleUpdateCategory(article.id, cat)}
                        className={`capitalize text-xs text-foreground hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary cursor-pointer transition-colors ${article.category === cat ? 'bg-primary/20 text-primary font-bold' : ''}`}
                      >
                        {cat}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <h3 className="font-semibold text-foreground text-sm sm:text-base line-clamp-2 sm:truncate leading-snug">{article.title}</h3>
              {article.seo_keyword && (
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 truncate">
                  🔑 <span className="text-primary">{article.seo_keyword}</span>
                </p>
              )}
            </div>

            <div className="flex gap-1.5 shrink-0 self-end sm:self-auto items-center">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handlePreview(article.id)} 
                className="h-8 gap-2 text-xs font-semibold border-[#a3ff12]/30 text-[#a3ff12] hover:bg-[#a3ff12] hover:text-black shadow-sm transition-colors"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Upload</span>
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handlePreview(article.id)} 
                className="h-8 gap-2 text-xs font-semibold border-[#a3ff12]/30 text-[#a3ff12] hover:bg-[#a3ff12] hover:text-black shadow-sm transition-colors"
              >
                <Eye className="h-3.5 w-3.5" />
                Revisar
              </Button>
              {article.status === 'failed' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-warning hover:text-warning hover:bg-warning/10 transition-colors"
                  onClick={() => handleRetry(article.id)}
                  disabled={retrying === article.id}
                  title="Tentar novamente"
                >
                  {retrying === article.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                </Button>
              )}
              {(article.status === 'ready' || article.status === 'draft') && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-[#a3ff12] hover:text-black hover:bg-[#a3ff12] transition-colors"
                  onClick={() => handlePublish(article.id)}
                  disabled={publishing === article.id}
                  title="Publicar agora"
                >
                  {publishing === article.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              )}
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors" 
                onClick={() => handleDelete(article.id)} 
                title="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading && articles.length === 0) {
    return <Preloader message="Carregando biblioteca de artigos..." />;
  }

  return (
    <div className="space-y-6 page-cta-scheme">
      {/* Diagnostics Panel */}
      <Collapsible open={showDiagnostics} onOpenChange={setShowDiagnostics} className="w-full">
        <div className="flex items-center justify-between mb-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground hover:text-primary">
              <Activity className="h-3 w-3" />
              Relatório de Performance
              {showDiagnostics ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
          {showDiagnostics && (
            <Button variant="ghost" size="sm" onClick={() => diagnostics.clear()} className="h-6 text-[10px]">
              Limpar Logs
            </Button>
          )}
        </div>
        <CollapsibleContent>
          <Card className="glass-card mb-6 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <ScrollArea className="h-[200px] w-full pr-4">
                <div className="space-y-2">
                  {diagMetrics.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-10">
                      Nenhuma atividade registrada. Execute uma ação para ver os tempos de resposta.
                    </p>
                  ) : (
                    diagMetrics.map((metric, i) => (
                      <div key={i} className="flex items-center justify-between text-xs border-b border-border/50 pb-2 last:border-0">
                        <div className="flex items-center gap-3">
                          <Clock className={`h-3 w-3 ${metric.status === 'error' ? 'text-destructive' : 'text-primary'}`} />
                          <div>
                            <p className="font-medium text-foreground">{metric.operation}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(metric.timestamp).toLocaleTimeString()} {metric.details ? `• ${metric.details}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${metric.duration > 3000 ? 'text-warning' : 'text-success'}`}>
                            {(metric.duration / 1000).toFixed(2)}s
                          </p>
                          <Badge variant="outline" className={`h-4 text-[9px] uppercase font-bold py-0 ${metric.status === 'error' ? 'border-destructive text-destructive' : 'border-success text-success'}`}>
                            {metric.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>



      {blogFilter}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold neon-text-lilac">Artigos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            <span className="tabular-nums">{articles.length}</span> carregados de{' '}
            <span className="tabular-nums text-foreground font-medium">{totalCount}</span> no banco
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setManualDialogOpen(true)}
            variant="outline"
            size="sm"
            className="gap-2 border-[#a3ff12]/40 text-[#a3ff12] hover:bg-[#a3ff12] hover:text-black transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Adicionar Manual</span>
            <span className="sm:hidden">Manual</span>
          </Button>
          <Button
            onClick={() => setKnowledgeDialogOpen(true)}
            variant="outline"
            size="sm"
            className="gap-2 border-[#a3ff12]/40 text-[#a3ff12] hover:bg-[#a3ff12] hover:text-black transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Criar do Conhecimento</span>
            <span className="sm:hidden">Conhec.</span>
          </Button>
          <Button
            onClick={handleCleanupOld}
            disabled={cleaningUp}
            variant="outline"
            size="sm"
            className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            title="Apagar artigos com mais de 3 dias"
          >
            {cleaningUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            <span className="hidden sm:inline">Apagar antigos</span>
            <span className="sm:hidden">Limpar</span>
          </Button>
          {articles.filter(a => !a.featured_image_url && a.status !== 'generating').length > 0 && (
            <Button
              onClick={handleRegenerateImages}
              disabled={regeneratingImages}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {regeneratingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              <span className="hidden sm:inline">{regeneratingImages ? 'Gerando...' : `Gerar imagens (${articles.filter(a => !a.featured_image_url && a.status !== 'generating').length})`}</span>
              <span className="sm:hidden">Imgs</span>
            </Button>
          )}
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-[#a3ff12] text-black font-bold hover:bg-[#a3ff12]/90 gap-2 shadow-neon-lilac hover:scale-[1.02] transition-transform"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? 'Gerando...' : 'Gerar Artigos'}
          </Button>
        </div>
      </div>

      <Card className="glass-card border-primary/30">
        <CardContent className="p-4">
          <Label htmlFor="title-input" className="text-xs uppercase tracking-widest font-bold text-primary mb-2 block">
            Gerar Artigo por Título
          </Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="title-input"
              placeholder="Digite o título do artigo (ex: Nova lei do trânsito 2026 muda regras)"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !generatingByTitle) handleGenerateByTitle(); }}
              disabled={generatingByTitle}
              className="flex-1"
            />
            <Button
              onClick={handleGenerateByTitle}
              disabled={generatingByTitle || titleInput.trim().length < 5}
              className="bg-[#a3ff12] text-black hover:bg-[#a3ff12]/90 gap-2 shadow-neon-lilac whitespace-nowrap"
            >
              {generatingByTitle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generatingByTitle ? 'Gerando...' : 'Gerar Artigo por Título'}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            A IA criará o conteúdo completo, imagem e SEO com base no título informado.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="todos" className="w-full">
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-4 bg-secondary/50 p-1">
          <TabsTrigger value="todos" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Todos</TabsTrigger>
          <TabsTrigger value="agendados" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Agendados</TabsTrigger>
          <TabsTrigger value="prontos" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Prontos</TabsTrigger>
          <TabsTrigger value="categorias" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="todos">
          {articles.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-16 text-center">
                <div className="mx-auto w-16 h-16 rounded-full gradient-primary/20 flex items-center justify-center mb-4 bg-primary/10">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <p className="text-foreground font-medium">Nenhum artigo encontrado</p>
                <p className="text-sm text-muted-foreground mt-1">Clique em "Gerar Artigos" acima para começar</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {articles.map((article, idx) => (
                <ArticleCard key={article.id} article={article} idx={idx} />
              ))}
              {articles.length > 0 && hasMore && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setLoadingMore(true);
                      fetchArticles({ append: true });
                    }}
                    disabled={loadingMore}
                    className="gap-2"
                  >
                    {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {loadingMore ? 'Carregando...' : 'Carregar mais'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prontos">
          {articles.filter(a => a.status === 'ready').length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-16 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium">Nenhum artigo pronto para publicar</p>
                <p className="text-sm text-muted-foreground mt-1">Gere novos artigos ou aprove os rascunhos</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {articles.filter(a => a.status === 'ready').map((article, idx) => (
                <ArticleCard key={article.id} article={article} idx={idx} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="agendados">
          {articles.filter(a => a.scheduled_at && a.status !== 'published').length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-16 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-foreground font-medium">Nenhum artigo agendado</p>
                <p className="text-sm text-muted-foreground mt-1">Veja a aba de Tendências para agendar novos posts</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {articles.filter(a => a.scheduled_at && a.status !== 'published').map((article, idx) => (
                <ArticleCard key={article.id} article={article} idx={idx} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="categorias">
          {(() => {
            // Agrupa artigos por categoria (inclui categorias sem posts, e categorias "extras" fora da lista do usuário)
            const knownCats = new Set(userCategories);
            const extraCats = Array.from(new Set(articles.map(a => a.category).filter(c => c && !knownCats.has(c))));
            const allCats = [...userCategories, ...extraCats];

            return (
              <div className="space-y-6">
                {allCats.map((category) => {
                  const catArticles = articles.filter(a => (a.category || 'geral') === category);
                  const c = getCategoryColor(category);
                  return (
                    <section
                      key={category}
                      className={`rounded-2xl border ${c.border} ${c.bg} p-4 sm:p-5 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                      <header className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <span className={`inline-block w-3 h-3 rounded-full ${c.dot} ring-4 ${c.ring}`} />
                          <h3 className={`text-lg sm:text-xl font-bold capitalize ${c.text}`}>{category}</h3>
                          <Badge variant="outline" className={`${c.border} ${c.text} font-bold`}>
                            {catArticles.length} {catArticles.length === 1 ? 'artigo' : 'artigos'}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          className="gap-2 bg-[#a3ff12] text-black font-bold hover:bg-[#a3ff12]/90"
                          onClick={() => handleGenerateByCategory(category)}
                          disabled={generating}
                        >
                          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          Gerar para {category}
                        </Button>
                      </header>

                      {catArticles.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic px-1 py-6 text-center">
                          Nenhum artigo nesta categoria ainda.
                        </p>
                      ) : (
                        <div className="grid gap-3">
                          {catArticles.map((article, idx) => (
                            <ArticleCard key={article.id} article={article} idx={idx} />
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>


      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setPreview(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto glass-card border-border p-0">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-4 flex items-center justify-between">
            <DialogHeader className="p-0">
              <DialogTitle className="text-lg font-bold">Revisão do Artigo</DialogTitle>
            </DialogHeader>
            {(preview?.status === 'ready' || preview?.status === 'draft') && (
              <div className="flex flex-col items-end gap-1">
                <Button 
                  onClick={() => {
                    handlePublish(preview.id);
                    setPreviewOpen(false);
                  }}
                  disabled={publishing === preview.id}
                  className="bg-[#a3ff12] text-black font-bold hover:bg-[#a3ff12]/90 shadow-neon-lilac"
                >
                  {publishing === preview.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Confirmar e Publicar Agora
                </Button>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30 font-bold px-1.5 py-0 h-4">
                    WP: ✅ | FB: ✅ | IG: ✅
                  </Badge>
                  <p className="text-[10px] text-muted-foreground italic">Envia para todas as redes conectadas</p>
                </div>
              </div>
            )}
          </div>
          
          {previewLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Preview Header - Main Image and SEO Highlights */}
              <div className="space-y-4">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Imagem de Destaque</Label>
                <ImageUpload 
                  articleId={preview?.id} 
                  currentImageUrl={preview?.featured_image_url} 
                  onUploadSuccess={(url) => {
                    setPreview(prev => ({ ...prev, featured_image_url: url }));
                    setArticles(prev => prev.map(a => a.id === preview.id ? { ...a, featured_image_url: url } : a));
                  }}
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full mt-2 gap-2 text-[10px] font-bold uppercase tracking-wider"
                  onClick={handleManualRegenerateImage}
                  disabled={regeneratingImages}
                >
                  {regeneratingImages ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Criar com IA (ChatGPT)
                </Button>
              </div>

              {/* SEO Summary Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/20">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-primary/80">Palavra-Chave</span>
                  </div>
                  <p className="text-sm font-bold truncate">🔑 {preview?.seo_keyword || 'N/A'}</p>
                </div>
                
                <div className="md:col-span-2 p-4 rounded-xl bg-secondary/5 border border-border/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-muted-foreground/20">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Meta Descrição</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {preview?.meta_description || 'Nenhuma descrição gerada para o Google.'}
                  </p>
                </div>
              </div>

              <Tabs defaultValue="conteudo" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4">
                  <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
                  <TabsTrigger value="seo-detalhes">Detalhes Técnicos</TabsTrigger>
                </TabsList>
                
                <TabsContent value="conteudo" className="mt-0">
                  <div className="prose prose-sm prose-invert max-w-none text-foreground bg-secondary/10 p-6 rounded-xl border border-border/50 shadow-inner min-h-[300px]">
                    <div
                      className="article-content"
                      dangerouslySetInnerHTML={{ __html: preview?.content || '' }}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="seo-detalhes" className="space-y-4 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">SEO Title (WordPress)</label>
                        <p className="text-sm p-3 rounded-lg bg-secondary/20 border border-border/40 font-medium">
                          {preview?.seo_title || preview?.title}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Slug / URL</label>
                        <p className="text-sm p-3 rounded-lg bg-secondary/20 border border-border/40 font-mono">
                          /{preview?.slug || preview?.seo_keyword?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Categoria</label>
                        <Select
                          value={preview?.category || ''}
                          onValueChange={(value) => handleUpdateCategory(preview.id, value)}
                        >
                          <SelectTrigger className="w-full capitalize bg-secondary/20 border border-border/40">
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {userCategories.map((cat) => (
                              <SelectItem key={cat} value={cat} className="capitalize">
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Visual Elements (IA Prompt)</label>
                        <p className="text-xs p-3 rounded-lg bg-secondary/20 border border-border/40 text-muted-foreground italic">
                          {preview?.visual_elements || 'Extraído automaticamente do conteúdo'}
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <ManualArticleDialog 
        open={manualDialogOpen} 
        onOpenChange={setManualDialogOpen} 
        categories={userCategories}
        onSuccess={fetchArticles}
      />
      <GenerateFromKnowledgeDialog
        open={knowledgeDialogOpen}
        onOpenChange={setKnowledgeDialogOpen}
        categories={userCategories}
        onSuccess={fetchArticles}
      />
    </div>
  );
};

export default ArticlesPage;
