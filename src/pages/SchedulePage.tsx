import { useEffect, useState } from 'react';
import Preloader from '@/components/Preloader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Clock, Calendar, Save, Bot, Trash2, CheckCircle, XCircle, Trash, Eye, FileEdit, Send, Image as ImageIcon, ImagePlus, ChevronDown, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage, runBackendMutation, runBackendQuery } from '@/lib/backend';
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
import { ImageUpload } from '@/components/articles/ImageUpload';

const SchedulePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [articlesPerDay, setArticlesPerDay] = useState(10);
  const [autoPublish, setAutoPublish] = useState(false);
  const [savingAuto, setSavingAuto] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [rescheduleType, setRescheduleType] = useState<'pending' | 'all'>('pending');
  const [rescheduleStart, setRescheduleStart] = useState('08:00');
  const [rescheduleEnd, setRescheduleEnd] = useState('');
  const [rescheduleStartDate, setRescheduleStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [rescheduleEndDate, setRescheduleEndDate] = useState<string>('');
  const [sortAsc, setSortAsc] = useState(true);

  const sortedArticles = [...articles].sort((a: any, b: any) => {
    const aT = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
    const bT = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
    const diff = aT - bT;
    return sortAsc ? diff : -diff;
  });

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [data, settings] = await Promise.all([
          runBackendQuery(() =>
            supabase
              .from('articles')
              .select('id, title, category, scheduled_at, status, is_approved, featured_image_url')
              .eq('user_id', user.id)
              .not('scheduled_at', 'is', null)
              .order('scheduled_at', { ascending: true }),
          ),
          runBackendQuery(() =>
            supabase
              .from('user_settings')
              .select('articles_per_day, auto_publish')
              .eq('user_id', user.id)
              .maybeSingle(),
          ),
        ]);

        const sorted = (data || []).sort((a: any, b: any) => {
          const aPub = a.status === 'published';
          const bPub = b.status === 'published';
          if (aPub !== bPub) return aPub ? 1 : -1;
          return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
        });
        setArticles(sorted);
        if (settings?.articles_per_day) setArticlesPerDay(settings.articles_per_day);
        if (settings?.auto_publish !== null && settings?.auto_publish !== undefined) {
          setAutoPublish(settings.auto_publish);
        }
        setSettingsLoaded(true);
      } catch (error) {
        setArticles([]);
        toast({ title: 'Erro ao carregar agendamentos', description: getErrorMessage(error), variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    fetchCategories();
  }, [toast, user]);

  const fetchCategories = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('user_settings').select('categories').eq('user_id', user.id).maybeSingle();
      setUserCategories(data?.categories || ['esportes', 'politica', 'policia', 'saude', 'celebridades', 'financas']);
    } catch (e) {
      console.error('Error fetching categories', e);
    }
  };

  const handleUpdateCategory = async (articleId: string, newCategory: string) => {
    try {
      const { error } = await supabase
        .from('articles')
        .update({ category: newCategory })
        .eq('id', articleId);

      if (error) throw error;

      setArticles(prev => prev.map(a => a.id === articleId ? { ...a, category: newCategory } : a));
      if (preview?.id === articleId) {
        setPreview(prev => ({ ...prev, category: newCategory }));
      }
      toast({ title: 'Categoria atualizada', description: `Artigo movido para ${newCategory}` });
    } catch (error) {
      toast({ title: 'Erro ao atualizar categoria', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  const handleSaveAutomation = async () => {
    if (!user) return;
    setSavingAuto(true);
    try {
      await runBackendMutation(() =>
        supabase
          .from('user_settings')
          .upsert({ 
            user_id: user.id, 
            articles_per_day: articlesPerDay, 
            auto_publish: autoPublish 
          } as any, { onConflict: 'user_id' }),
      );
      toast({ title: 'Automação salva!', description: `${articlesPerDay} artigos/dia. Publicação automática: ${autoPublish ? 'Ativada' : 'Desativada'}.` });
    } catch (error) {
      toast({ title: 'Erro', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSavingAuto(false);
    }
  };

  const handleEdit = (article: any) => {
    setEditingId(article.id);
    const d = new Date(article.scheduled_at);
    setEditValue(format(d, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleSave = async (articleId: string) => {
    if (!editValue) return;
    setSaving(true);
    try {
      const newDate = new Date(editValue).toISOString();
      await runBackendMutation(() =>
        supabase.from('articles').update({ scheduled_at: newDate }).eq('id', articleId),
      );
      setArticles(prev => prev.map(a => a.id === articleId ? { ...a, scheduled_at: newDate } : a));
      setEditingId(null);
      toast({ title: 'Agendamento atualizado!' });
    } catch (error) {
      toast({ title: 'Erro', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (articleId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este agendamento?')) return;
    try {
      await runBackendMutation(() =>
        supabase.from('articles').delete().eq('id', articleId),
      );
      setArticles(prev => prev.filter(a => a.id !== articleId));
      
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'delete_article',
        details: { article_id: articleId }
      });

      toast({ title: 'Agendamento excluído!' });
    } catch (error) {
      toast({ title: 'Erro ao excluir', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  const handleToggleApproval = async (articleId: string, currentApproved: boolean) => {
    try {
      const newApproved = !currentApproved;
      await runBackendMutation(() =>
        supabase.from('articles').update({ is_approved: newApproved }).eq('id', articleId),
      );
      setArticles(prev => prev.map(a => a.id === articleId ? { ...a, is_approved: newApproved } : a));
      
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: newApproved ? 'approve_article' : 'unapprove_article',
        details: { article_id: articleId }
      });

      toast({ 
        title: newApproved ? 'Artigo aprovado!' : 'Artigo pausado', 
        description: newApproved ? 'Ele será postado no horário agendado.' : 'Ele não será postado automaticamente.' 
      });
    } catch (error) {
      toast({ title: 'Erro', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(articles.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (articleId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, articleId]);
    } else {
      setSelectedIds(prev => prev.filter(id => id !== articleId));
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Tem certeza que deseja excluir ${selectedIds.length} agendamentos?`)) return;
    
    setBatchActionLoading(true);
    try {
      await runBackendMutation(() =>
        supabase.from('articles').delete().in('id', selectedIds),
      );
      setArticles(prev => prev.filter(a => !selectedIds.includes(a.id)));
      
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'delete_multiple_articles',
        details: { article_ids: selectedIds }
      });

      toast({ title: `${selectedIds.length} agendamentos excluídos!` });
      setSelectedIds([]);
    } catch (error) {
      toast({ title: 'Erro ao excluir em lote', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchApproval = async (newApproved: boolean) => {
    if (!selectedIds.length) return;
    
    setBatchActionLoading(true);
    try {
      await runBackendMutation(() =>
        supabase.from('articles').update({ is_approved: newApproved }).in('id', selectedIds),
      );
      setArticles(prev => prev.map(a => selectedIds.includes(a.id) ? { ...a, is_approved: newApproved } : a));
      
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: newApproved ? 'approve_multiple_articles' : 'unapprove_multiple_articles',
        details: { article_ids: selectedIds }
      });

      toast({ title: `${selectedIds.length} artigos ${newApproved ? 'aprovados' : 'pausados'}!` });
      setSelectedIds([]);
    } catch (error) {
      toast({ title: 'Erro ao atualizar em lote', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleClearPublished = async () => {
    if (!window.confirm('Tem certeza que deseja excluir todos os artigos que já foram publicados?')) return;
    
    setBatchActionLoading(true);
    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('user_id', user?.id)
        .eq('status', 'published');

      if (error) throw error;
      
      setArticles(prev => prev.filter(a => a.status !== 'published'));
      toast({ title: 'Artigos publicados removidos!' });
    } catch (error) {
      toast({ title: 'Erro ao remover publicados', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setBatchActionLoading(false);
    }
  };


  const handlePreview = async (articleId: string) => {
    setPreviewOpen(true);
    setPreviewLoading(true);

    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .maybeSingle();

      if (error) throw error;
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
      setPreviewOpen(false); // Fecha o modal automaticamente
    } catch (error) {
      toast({ title: 'Erro ao atualizar', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleReschedule = async () => {
    const targetArticles = rescheduleType === 'pending' 
      ? articles.filter(a => a.status === 'ready' || a.status === 'draft')
      : articles.filter(a => a.status !== 'published');

    if (targetArticles.length === 0) {
      toast({ title: 'Nenhum artigo para reagendar' });
      setRescheduleDialogOpen(false);
      return;
    }

    setIsRescheduling(true);
    try {
      const now = new Date();
      const parseHM = (s: string): { h: number; m: number } | null => {
        const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
        if (!m) return null;
        const h = parseInt(m[1], 10);
        const min = parseInt(m[2], 10);
        if (h < 0 || h > 23 || min < 0 || min > 59) return null;
        return { h, m: min };
      };
      const startHM = parseHM(rescheduleStart) || { h: 8, m: 0 };
      const endHM = rescheduleEnd ? parseHM(rescheduleEnd) : null;
      const startHour = startHM.h + startHM.m / 60;
      const endHour = endHM ? endHM.h + endHM.m / 60 : 23;
      const effectiveEnd = endHour > startHour ? endHour : startHour + 0.0001;

      // Base date: campo escolhido pelo usuário (ou hoje se vazio)
      const [sy, sm, sd] = (rescheduleStartDate || '').split('-').map((n) => parseInt(n, 10));
      const baseDate = sy && sm && sd
        ? new Date(sy, sm - 1, sd, startHM.h, startHM.m, 0)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHM.h, startHM.m, 0);
      const startDate = baseDate;
      if (startDate < now) startDate.setDate(startDate.getDate() + 1);

      // Data-limite opcional (não pode agendar depois dela)
      let endLimit: Date | null = null;
      if (rescheduleEndDate) {
        const [ey, em, ed] = rescheduleEndDate.split('-').map((n) => parseInt(n, 10));
        if (ey && em && ed) {
          endLimit = new Date(ey, em - 1, ed, 23, 59, 59);
        }
      }

      const updatedArticles = [];

      for (let i = 0; i < targetArticles.length; i++) {
        const dayOffset = Math.floor(i / articlesPerDay);
        const articleInDayIndex = i % articlesPerDay;

        const hourStep = articlesPerDay > 1 ? (effectiveEnd - startHour) / (articlesPerDay - 1) : 0;

        const scheduledDate = new Date(startDate);
        scheduledDate.setDate(startDate.getDate() + dayOffset);

        const hour = startHour + (articleInDayIndex * hourStep);
        scheduledDate.setHours(Math.floor(hour));
        scheduledDate.setMinutes(Math.floor((hour % 1) * 60));

        if (endLimit && scheduledDate > endLimit) {
          toast({
            title: 'Data-limite atingida',
            description: `Só foi possível reagendar ${updatedArticles.length} de ${targetArticles.length} artigos até ${endLimit.toLocaleDateString('pt-BR')}.`,
          });
          break;
        }
        
        const isoDate = scheduledDate.toISOString();
        
        const { error } = await supabase
          .from('articles')
          .update({ scheduled_at: isoDate })
          .eq('id', targetArticles[i].id);

        if (error) throw error;
        
        updatedArticles.push({ ...targetArticles[i], scheduled_at: isoDate });
      }

      setArticles(prev => {
        const newArticles = [...prev];
        updatedArticles.forEach(updated => {
          const idx = newArticles.findIndex(a => a.id === updated.id);
          if (idx !== -1) newArticles[idx] = updated;
        });
        return newArticles.sort((a, b) => {
          const aPub = a.status === 'published';
          const bPub = b.status === 'published';
          if (aPub !== bPub) return aPub ? 1 : -1;
          return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
        });
      });

      toast({ 
        title: 'Reagendamento concluído!', 
        description: `${updatedArticles.length} notícias foram reorganizadas.` 
      });
      setRescheduleDialogOpen(false);
    } catch (error) {
      toast({ 
        title: 'Erro ao reagendar', 
        description: getErrorMessage(error), 
        variant: 'destructive' 
      });
    } finally {
      setIsRescheduling(false);
    }
  };

  if (loading) return <Preloader message="Sincronizando agendamentos..." />;

  return (
    <div className="space-y-6 page-cta-scheme">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Agendamentos</h1>
        <p className="text-sm mt-1">Artigos agendados para publicação automática — clique na data para editar</p>
      </div>

      <Card className="glass-card neon-border-pink">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-accent" />
            <CardTitle className="text-lg text-foreground">Robô de Publicação Automática</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure quantas postagens o robô deve fazer por dia e se deve publicar automaticamente no WordPress.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="articles-per-day">Postagens por dia</Label>
              <Input
                id="articles-per-day"
                type="number"
                min={1}
                max={50}
                value={articlesPerDay}
                onChange={(e) => setArticlesPerDay(parseInt(e.target.value) || 10)}
                disabled={!settingsLoaded}
              />
              <p className="text-xs text-muted-foreground">Quantidade de artigos gerados a cada ciclo (máx. 50)</p>
            </div>
            <div className="flex items-center justify-between p-[25px] rounded-none bg-muted/50 h-fit mt-auto">
              <div>
                <p className="text-sm font-medium text-foreground">Publicação automática</p>
                <p className="text-xs text-muted-foreground">Publicar no WordPress automaticamente</p>
              </div>
              <Switch
                checked={autoPublish}
                onCheckedChange={setAutoPublish}
                disabled={!settingsLoaded}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSaveAutomation}
              disabled={savingAuto || !settingsLoaded}
              className="gradient-primary flex-1 sm:flex-none"
            >
              {savingAuto ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Automação
            </Button>
            
            <Button
              onClick={() => {
                setRescheduleType('pending');
                setRescheduleDialogOpen(true);
              }}
              disabled={isRescheduling || articles.length === 0}
              variant="outline"
              className="flex-1 sm:flex-none border-primary/20 hover:bg-primary/5"
            >
              {isRescheduling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Reagendar Pendentes
            </Button>
            <Button
              onClick={() => {
                setRescheduleType('all');
                setRescheduleDialogOpen(true);
              }}
              disabled={isRescheduling || articles.length === 0}
              variant="outline"
              className="flex-1 sm:flex-none border-accent/20 hover:bg-accent/5"
            >
              {isRescheduling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Reagendar Todas
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="glass-card neon-border-pink">
          <DialogHeader>
            <DialogTitle>Confirmar Reagendamento</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-foreground">
              Você deseja reagendar {rescheduleType === 'pending' ? 'somente as notícias pendentes' : 'todas as notícias agendadas (exceto publicadas)'}?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="resched-start-date" className="text-xs">Data de início</Label>
                <Input
                  id="resched-start-date"
                  type="date"
                  value={rescheduleStartDate}
                  onChange={(e) => setRescheduleStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="resched-end-date" className="text-xs">
                  Data-limite <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="resched-end-date"
                  type="date"
                  value={rescheduleEndDate}
                  min={rescheduleStartDate || undefined}
                  onChange={(e) => setRescheduleEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="resched-start" className="text-xs">Horário de início</Label>
                <Input
                  id="resched-start"
                  type="time"
                  value={rescheduleStart}
                  onChange={(e) => setRescheduleStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="resched-end" className="text-xs">
                  Horário de término <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="resched-end"
                  type="time"
                  value={rescheduleEnd}
                  onChange={(e) => setRescheduleEnd(e.target.value)}
                  placeholder="--:--"
                />
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {articlesPerDay} postagens por dia, começando em{' '}
              <strong>
                {rescheduleStartDate
                  ? new Date(rescheduleStartDate + 'T00:00:00').toLocaleDateString('pt-BR')
                  : 'hoje'}
              </strong>{' '}
              às <strong>{rescheduleStart || '08:00'}</strong>
              {rescheduleEnd ? <> e terminando às <strong>{rescheduleEnd}</strong></> : null}
              {rescheduleEndDate
                ? <>, até <strong>{new Date(rescheduleEndDate + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>.</>
                : <>, seguindo sequencialmente até o último artigo.</>}
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleReschedule}
              disabled={isRescheduling}
              className="bg-[#a3ff12] text-black font-semibold border border-transparent hover:bg-[#a3ff12]/90 hover:shadow-[0_0_18px_rgba(163,255,18,0.7)] transition-all"
            >
              {isRescheduling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 'Confirmar Reagendamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {articles.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-16 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum agendamento.</p>
            <p className="text-sm text-muted-foreground mt-1">Artigos gerados serão agendados automaticamente</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-muted/30 p-4 rounded-none border border-border">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="select-all" 
                  checked={selectedIds.length === articles.length && articles.length > 0}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                />
                <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  Selecionar todos ({articles.length})
                </Label>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearPublished}
                className="text-xs text-muted-foreground hover:text-black hover:bg-destructive flex items-center gap-1.5 h-7 px-2 rounded-none"
                title="Apagar todos os artigos que já foram publicados"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Apagar Publicados
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortAsc(v => !v)}
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1.5 h-7 px-2 rounded-none"
                title={sortAsc ? 'Ordem crescente (mais antigos primeiro)' : 'Ordem decrescente (mais recentes primeiro)'}
              >
                {sortAsc ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                {sortAsc ? 'Crescente' : 'Decrescente'}
              </Button>
            </div>
            
            
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                <span className="text-xs text-muted-foreground mr-2">
                  {selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-success hover:text-success/80"
                  onClick={() => handleBatchApproval(true)}
                  disabled={batchActionLoading}
                >
                  {batchActionLoading ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-2" />}
                  Postar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-muted-foreground hover:text-foreground"
                  onClick={() => handleBatchApproval(false)}
                  disabled={batchActionLoading}
                >
                  {batchActionLoading ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <XCircle className="h-3 w-3 mr-2" />}
                  Pausar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-destructive hover:text-destructive/80"
                  onClick={handleBatchDelete}
                  disabled={batchActionLoading}
                >
                  {batchActionLoading ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Trash className="h-3 w-3 mr-2" />}
                  Excluir
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-3">
            {sortedArticles.map((article) => (
              <Card key={article.id} className={`shadow-none rounded-none border-b border-border/50 transition-colors ${selectedIds.includes(article.id) ? 'bg-primary/5 ring-0' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={selectedIds.includes(article.id)}
                      onCheckedChange={(checked) => handleSelectOne(article.id, !!checked)}
                    />
                    <div className="min-w-0 flex-1 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div 
                          className="relative w-12 h-12 shrink-0 bg-secondary/40 rounded-none overflow-hidden hidden sm:flex items-center justify-center group cursor-pointer"
                          onClick={() => handlePreview(article.id)}
                        >
                          {article.featured_image_url ? (
                            <img
                              key={article.featured_image_url}
                              src={article.featured_image_url}
                              alt=""
                              className="absolute inset-0 w-full h-full object-contain transition-transform group-hover:scale-110"
                            />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ImagePlus className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{article.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <button 
                                  className="inline-flex items-center rounded-none border border-border px-2.5 py-1 text-[10px] sm:text-xs font-bold transition-colors hover:bg-muted capitalize outline-none"
                                >
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
                            {editingId === article.id ? (
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="datetime-local"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="h-7 text-xs w-auto"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-primary"
                                  onClick={() => handleSave(article.id)}
                                  disabled={saving}
                                >
                                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-muted-foreground"
                                  onClick={() => setEditingId(null)}
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEdit(article)}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                title="Clique para editar data/hora"
                              >
                                <Clock className="h-3 w-3" />
                                {article.scheduled_at &&
                                  format(new Date(article.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-[#a3ff12] hover:bg-[#a3ff12] hover:text-black transition-colors"
                          onClick={() => handlePreview(article.id)}
                          title="Upload de Imagem"
                        >
                          <ImageIcon className="h-4 w-4" />
                          <span className="ml-1 text-[10px] hidden sm:inline">Upload</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-[#a3ff12] hover:bg-[#a3ff12] hover:text-black transition-colors"
                          onClick={() => handlePreview(article.id)}
                          title="Visualizar e Editar Artigo"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="ml-1 text-[10px] hidden sm:inline">Visualizar</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-8 px-2 ${article.is_approved ? 'text-success hover:text-success/80' : 'text-muted-foreground hover:text-foreground'}`}
                          onClick={() => handleToggleApproval(article.id, !!article.is_approved)}
                          title={article.is_approved ? 'Clique para não postar' : 'Clique para postar'}
                        >
                          {article.is_approved ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                          <span className="ml-1 text-[10px] hidden sm:inline">{article.is_approved ? 'Postar' : 'Não Postar'}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-destructive hover:text-destructive/80"
                          onClick={() => handleDelete(article.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Badge
                          className={`rounded-none ${
                            article.status === 'published'
                              ? 'bg-success/20 text-success'
                              : article.is_approved === false
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-primary/20 text-primary'
                          }`}
                          variant="secondary"
                        >
                          {article.status === 'published' ? 'Publicado' : article.is_approved === false ? 'Pausado' : 'Agendado'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setPreview(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-card border-border p-0 rounded-none">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-4 flex items-center justify-between">
            <DialogHeader className="p-0">
              <DialogTitle className="text-lg font-bold">Editar Agendamento</DialogTitle>
            </DialogHeader>
            <Button 
              onClick={() => handleUpdateArticle(preview.id, { 
                title: preview.title, 
                content: preview.content,
                meta_description: preview.meta_description,
                seo_keyword: preview.seo_keyword,
                category: preview.category,
                scheduled_at: preview.scheduled_at ? new Date(preview.scheduled_at).toISOString() : null,
              })}
              disabled={previewLoading}
              className="bg-[#b57bff] text-black border border-transparent hover:bg-[#a3ff12] hover:text-black hover:border-[#a3ff12] hover:shadow-[0_0_16px_rgba(163,255,18,0.7),0_0_32px_rgba(163,255,18,0.35)]"
            >
              {previewLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Alterações
            </Button>
          </div>

          
          {previewLoading && !preview ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase text-muted-foreground block">Imagem de Destaque</Label>
                <ImageUpload 
                  articleId={preview?.id} 
                  currentImageUrl={preview?.featured_image_url} 
                  onUploadSuccess={(url) => {
                    setPreview(prev => ({ ...prev, featured_image_url: url }));
                    setArticles(prev => prev.map(a => a.id === preview.id ? { ...a, featured_image_url: url } : a));
                  }}
                />
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Título</Label>
                  <Input 
                    value={preview?.title || ''} 
                    onChange={(e) => setPreview({...preview, title: e.target.value})}
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Palavra-Chave Foco</Label>
                    <Input 
                      value={preview?.seo_keyword || ''} 
                      onChange={(e) => setPreview({...preview, seo_keyword: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Categoria</Label>
                    <Select
                      value={preview?.category || ''}
                      onValueChange={(value) => setPreview({...preview, category: value})}
                    >
                      <SelectTrigger className="w-full capitalize rounded-none">
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
                  <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Data e Hora do Agendamento</Label>
                  <Input
                    type="datetime-local"
                    value={preview?.scheduled_at ? format(new Date(preview.scheduled_at), "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPreview({ ...preview, scheduled_at: v ? new Date(v).toISOString() : null });
                    }}
                  />
                </div>
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Meta Descrição</Label>
                  <textarea 
                    className="w-full min-h-[80px] rounded-none border border-input bg-background px-3 py-2 text-sm shadow-none"
                    value={preview?.meta_description || ''} 
                    onChange={(e) => setPreview({...preview, meta_description: e.target.value})}
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Conteúdo (HTML)</Label>
                  <textarea 
                    className="w-full min-h-[300px] rounded-none border border-input bg-background px-3 py-2 text-sm font-mono shadow-none"
                    value={preview?.content || ''} 
                    onChange={(e) => setPreview({...preview, content: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchedulePage;
