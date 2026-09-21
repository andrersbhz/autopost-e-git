import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Eye, Globe, Calendar, Check, Edit2 } from 'lucide-react';
import { ImageUpload } from './ImageUpload';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ManualArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: string[];
  onSuccess: () => void;
}

export const ManualArticleDialog = ({ open, onOpenChange, categories, onSuccess }: ManualArticleDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [isPublishingNow, setIsPublishingNow] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [manualSlug, setManualSlug] = useState(false);
  const [authorId, setAuthorId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    seo_keyword: '',
    meta_description: '',
    featured_image_url: '',
    slug: '',
    seo_title: '',
  });

  // Auto-generate slug from title if not manually edited
  useEffect(() => {
    if (!manualSlug && formData.title) {
      const generatedSlug = formData.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData(prev => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.title, manualSlug]);

  useEffect(() => {
    const fetchAuthorForCategory = async () => {
      if (!formData.category || !user) return;
      try {
        const { data, error } = await supabase
          .from('authors')
          .select('id')
          .eq('user_id', user.id)
          .eq('category', formData.category)
          .maybeSingle();
        if (error) {
          console.warn('[ManualArticleDialog] author lookup error:', error);
          setAuthorId(null);
          return;
        }
        setAuthorId(data?.id ?? null);
      } catch (e) {
        console.warn('[ManualArticleDialog] author lookup exception:', e);
        setAuthorId(null);
      }
    };
    fetchAuthorForCategory();
  }, [formData.category, user]);

  const handleSave = async (publishImmediately = false) => {
    if (!user) return;
    
    if (!formData.title || !formData.content || !formData.category) {
      toast({
        title: "Campos obrigatórios",
        description: "Título, conteúdo e categoria são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const articleData = {
        user_id: user.id,
        title: formData.title,
        content: formData.content,
        category: formData.category,
        seo_keyword: formData.seo_keyword,
        meta_description: formData.meta_description,
        featured_image_url: formData.featured_image_url,
        status: 'ready' as const,
        slug: formData.slug || formData.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
        seo_title: formData.seo_title || formData.title,
        scheduled_at: scheduledDate ? new Date(scheduledDate).toISOString() : null,
        author_id: authorId,
      };

      const { data: article, error } = await supabase
        .from('articles')
        .insert(articleData)
        .select()
        .single();

      if (error) throw error;

      if (publishImmediately && article) {
        setIsPublishingNow(true);
        const { data: pubData, error: pubError } = await supabase.functions.invoke('publish-article', {
          body: { articleId: article.id, userId: user.id },
        });
        
        if (pubError) throw pubError;
        
        toast({
          title: pubData?.success ? "Sucesso" : "Aviso",
          description: pubData?.message || "Artigo criado e enviado para publicação.",
          variant: pubData?.success ? "default" : "destructive",
        });
      } else {
        toast({
          title: "Sucesso",
          description: scheduledDate 
            ? "Artigo agendado com sucesso!" 
            : "Artigo criado manualmente com sucesso!",
        });
      }
      
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro ao processar artigo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsPublishingNow(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: '',
      seo_keyword: '',
      meta_description: '',
      featured_image_url: '',
      slug: '',
      seo_title: '',
    });
    setScheduledDate('');
    setManualSlug(false);
    setTab('edit');
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) resetForm();
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-[850px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Adicionar Artigo Manualmente
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v: any) => setTab(v)} className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 border-b">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
              <TabsTrigger value="edit" className="gap-2">
                <Edit2 className="h-4 w-4" /> Editar
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" /> Prévia
              </TabsTrigger>
            </TabsList>
          </div>
          
          <ScrollArea className="flex-1 p-6 overflow-y-auto">
            <TabsContent value="edit" className="m-0 space-y-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Título do Artigo</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: As tendências do mercado de tecnologia em 2024"
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="slug">Slug (URL do Artigo)</Label>
                    {!manualSlug && (
                      <span className="text-[10px] text-muted-foreground italic">Gerado automaticamente</span>
                    )}
                  </div>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => {
                      setManualSlug(true);
                      setFormData({ ...formData, slug: e.target.value });
                    }}
                    placeholder="slug-do-artigo"
                    className="font-mono text-sm bg-muted/30"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="content">Conteúdo (HTML ou Texto)</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Escreva ou cole o conteúdo do artigo aqui..."
                    className="min-h-[250px] font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="seo_keyword">Palavra-chave em Foco</Label>
                    <Input
                      id="seo_keyword"
                      value={formData.seo_keyword}
                      onChange={(e) => setFormData({ ...formData, seo_keyword: e.target.value })}
                      placeholder="Ex: tecnologia, 2024, tendências"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="seo_title">SEO Title (Opcional)</Label>
                  <Input
                    id="seo_title"
                    value={formData.seo_title}
                    onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                    placeholder="Título para motores de busca (se diferente do título real)"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="meta_description">Meta Descrição</Label>
                  <Textarea
                    id="meta_description"
                    value={formData.meta_description}
                    onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                    placeholder="Resumo para motores de busca..."
                    rows={3}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Imagem Destacada</Label>
                  <ImageUpload
                    articleId="manual-new"
                    currentImageUrl={formData.featured_image_url}
                    onUploadSuccess={(url) => setFormData({ ...formData, featured_image_url: url })}
                  />
                </div>

                <div className="grid gap-2 p-4 bg-muted/20 rounded-lg border border-dashed">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Agendamento (Opcional)
                  </Label>
                  <Input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Deixe em branco para publicar imediatamente ao salvar.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="m-0 space-y-6">
              <div className="space-y-8">
                {/* Visual Article Preview */}
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="space-y-4">
                    <h1 className="text-3xl font-bold mb-2">{formData.title || 'Título do Artigo'}</h1>
                    <div className="flex gap-2 mb-6">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs uppercase font-semibold">
                        {formData.category || 'Categoria'}
                      </span>
                    </div>
                    
                    {formData.featured_image_url && (
                      <div className="w-full h-64 rounded-xl overflow-hidden mb-6 bg-muted flex items-center justify-center">
                        <img 
                          src={formData.featured_image_url} 
                          alt="Preview" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    )}
                    
                    <div 
                      className="text-muted-foreground leading-relaxed whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: formData.content || 'Nenhum conteúdo adicionado ainda.' }}
                    />
                  </div>
                </div>

                {/* SEO Preview Section */}
                <div className="border-t pt-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500" /> Prévia de SEO (Google)
                  </h3>
                  <div className="bg-white dark:bg-zinc-900 p-4 rounded border shadow-sm max-w-[600px]">
                    <div className="text-[#1a0dab] dark:text-blue-400 text-xl font-normal hover:underline cursor-pointer truncate">
                      {formData.seo_title || formData.title || 'Título do Artigo - Site'}
                    </div>
                    <div className="text-[#006621] dark:text-green-500 text-sm py-1 truncate">
                      seusite.com.br › {formData.category || 'categoria'} › {formData.slug || 'url-do-post'}
                    </div>
                    <div className="text-[#4d5156] dark:text-zinc-400 text-sm line-clamp-2">
                      {formData.meta_description || 'Adicione uma meta descrição para ver como seu post aparecerá nos resultados de busca do Google.'}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                    <div className="p-2 bg-muted/50 rounded">
                      <span className="font-semibold block mb-1">Palavra-chave:</span>
                      {formData.seo_keyword || 'Não definida'}
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <span className="font-semibold block mb-1">Slug:</span>
                      {formData.slug || 'vazio'}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="p-6 border-t bg-muted/10 gap-2 flex-col sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <div className="flex gap-2">
            <Button 
              onClick={() => handleSave(false)} 
              disabled={loading}
              className="flex-1 sm:flex-none gap-2 bg-[#a3ff12] text-black hover:bg-[#a3ff12]/90"
            >
              {loading && !isPublishingNow ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {scheduledDate ? 'Agendar Artigo' : 'Salvar como Pronto'}
            </Button>
            <Button 
              onClick={() => handleSave(true)} 
              disabled={loading}
              className="flex-1 sm:flex-none gap-2 bg-[#a3ff12] text-black hover:bg-[#a3ff12]/90"
            >
              {loading && isPublishingNow ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              Publicar Agora no WP
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ScrollArea = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`overflow-y-auto ${className}`}>
    {children}
  </div>
);

