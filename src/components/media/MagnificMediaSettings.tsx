import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/backend';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Film, Image as ImageIcon, Loader2, RefreshCw, Save, ShieldCheck, Sparkles, WandSparkles } from 'lucide-react';

type MagnificSettings = {
  enabled: boolean;
  auto_generate_images: boolean;
  auto_generate_videos: boolean;
  image_aspect_ratio: string;
  image_resolution: string;
  image_model: string;
  video_aspect_ratio: string;
  video_resolution: string;
  video_duration: number;
  video_generate_audio: boolean;
  prompt_template: string;
  negative_prompt: string;
  editorial_safety: boolean;
};

type MediaJob = {
  id: string;
  media_type: 'image' | 'video';
  status: string;
  output_url: string | null;
  error_message: string | null;
  created_at: string;
  article_id: string | null;
};

const defaults: MagnificSettings = {
  enabled: false,
  auto_generate_images: true,
  auto_generate_videos: false,
  image_aspect_ratio: 'landscape_16_9',
  image_resolution: '2k',
  image_model: 'realism',
  video_aspect_ratio: '9:16',
  video_resolution: '720p',
  video_duration: 8,
  video_generate_audio: true,
  prompt_template: '',
  negative_prompt: 'blurry, low quality, distorted, watermark, logo, unreadable text, duplicate subjects',
  editorial_safety: true,
};

const statusTone = (status: string) => {
  const s = status.toUpperCase();
  if (s === 'COMPLETED') return 'default';
  if (s.includes('FAIL') || s.includes('ERROR')) return 'destructive';
  return 'secondary';
};

export function MagnificMediaSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<MagnificSettings>(defaults);
  const [jobs, setJobs] = useState<MediaJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const db = supabase as any;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: config, error: configError }, { data: jobRows, error: jobsError }] = await Promise.all([
        db.from('magnific_settings').select('*').eq('user_id', user.id).maybeSingle(),
        db.from('media_generation_jobs')
          .select('id, media_type, status, output_url, error_message, created_at, article_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(8),
      ]);
      if (configError) throw configError;
      if (jobsError) throw jobsError;
      if (config) {
        setSettings({
          ...defaults,
          ...config,
          prompt_template: config.prompt_template || '',
          negative_prompt: config.negative_prompt || defaults.negative_prompt,
        });
      }
      setJobs((jobRows || []) as MediaJob[]);
    } catch (error) {
      toast({ title: 'Não foi possível carregar a configuração da Magnific', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [db, toast, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await db.from('magnific_settings').upsert({
        user_id: user.id,
        ...settings,
        prompt_template: settings.prompt_template.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (error) throw error;
      toast({ title: 'Magnific configurada', description: 'As regras de imagem e vídeo foram salvas.' });
    } catch (error) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('magnific-media', { body: { action: 'test' } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'A API não confirmou a conexão.');
      setConnected(true);
      toast({ title: 'Magnific conectada', description: 'A chave configurada no Supabase respondeu corretamente.' });
    } catch (error) {
      setConnected(false);
      toast({ title: 'Magnific ainda não está conectada', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  const processNow = async () => {
    if (!user) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('magnific-media', {
        body: { action: 'process-pending', userId: user.id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao processar mídia.');
      await load();
      const queued = data.queued || {};
      const sync = data.sync || {};
      toast({
        title: 'Fila de mídia atualizada',
        description: `${queued.imagesQueued || 0} imagem(ns) e ${queued.videosQueued || 0} vídeo(s) enviados; ${sync.completed || 0} job(s) concluído(s).`,
      });
    } catch (error) {
      toast({ title: 'Erro ao processar mídia', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const set = <K extends keyof MagnificSettings>(key: K, value: MagnificSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex min-h-36 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando mídia IA...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="glass-card overflow-hidden border-primary/20">
        <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/10 via-transparent to-transparent">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <WandSparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Magnific — mídia automática</CardTitle>
                {connected === true && <Badge className="gap-1"><ShieldCheck className="h-3 w-3" /> API conectada</Badge>}
                {connected === false && <Badge variant="destructive">API não conectada</Badge>}
              </div>
              <CardDescription>
                Gera imagem editorial para o artigo e, opcionalmente, transforma a imagem em vídeo com Veo 3.1.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={testConnection} disabled={testing}>
                {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Testar API
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-4 sm:p-6">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="font-semibold">Ativar Magnific</Label>
                  <p className="mt-1 text-xs text-muted-foreground">Habilita o provedor no pipeline.</p>
                </div>
                <Switch checked={settings.enabled} onCheckedChange={(value) => set('enabled', value)} />
              </div>
            </div>
            <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="flex items-center gap-2 font-semibold"><ImageIcon className="h-4 w-4" /> Imagens automáticas</Label>
                  <p className="mt-1 text-xs text-muted-foreground">Preenche artigos ainda sem destaque.</p>
                </div>
                <Switch checked={settings.auto_generate_images} onCheckedChange={(value) => set('auto_generate_images', value)} />
              </div>
            </div>
            <div className="rounded-xl border border-border/50 bg-secondary/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="flex items-center gap-2 font-semibold"><Film className="h-4 w-4" /> Vídeos automáticos</Label>
                  <p className="mt-1 text-xs text-muted-foreground">Veo 3.1 após a imagem ficar pronta.</p>
                </div>
                <Switch checked={settings.auto_generate_videos} onCheckedChange={(value) => set('auto_generate_videos', value)} />
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2 font-semibold"><ImageIcon className="h-4 w-4 text-primary" /> Imagem / Mystic</div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Formato</Label>
                  <Select value={settings.image_aspect_ratio} onValueChange={(value) => set('image_aspect_ratio', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landscape_16_9">16:9 artigo</SelectItem>
                      <SelectItem value="square_1_1">1:1 social</SelectItem>
                      <SelectItem value="portrait_9_16">9:16 vertical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Resolução</Label>
                  <Select value={settings.image_resolution} onValueChange={(value) => set('image_resolution', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1k">1K</SelectItem>
                      <SelectItem value="2k">2K</SelectItem>
                      <SelectItem value="4k">4K</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Modelo</Label>
                  <Select value={settings.image_model} onValueChange={(value) => set('image_model', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realism">Realism</SelectItem>
                      <SelectItem value="fluid">Fluid</SelectItem>
                      <SelectItem value="zen">Zen</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                      <SelectItem value="super_real">Super Real</SelectItem>
                      <SelectItem value="editorial_portraits">Editorial Portraits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2 font-semibold"><Film className="h-4 w-4 text-primary" /> Vídeo / Veo 3.1</div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Formato</Label>
                  <Select value={settings.video_aspect_ratio} onValueChange={(value) => set('video_aspect_ratio', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9:16">9:16 Reels</SelectItem>
                      <SelectItem value="16:9">16:9 horizontal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Qualidade</Label>
                  <Select value={settings.video_resolution} onValueChange={(value) => set('video_resolution', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="720p">720p</SelectItem>
                      <SelectItem value="1080p">1080p</SelectItem>
                      <SelectItem value="4k">4K</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Duração</Label>
                  <Select value={String(settings.video_duration)} onValueChange={(value) => set('video_duration', Number(value))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 segundos</SelectItem>
                      <SelectItem value="6">6 segundos</SelectItem>
                      <SelectItem value="8">8 segundos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2">
                <div>
                  <Label className="text-xs font-semibold">Áudio nativo</Label>
                  <p className="text-[11px] text-muted-foreground">Solicita áudio junto ao vídeo.</p>
                </div>
                <Switch checked={settings.video_generate_audio} onCheckedChange={(value) => set('video_generate_audio', value)} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <Label>Prompt editorial personalizado</Label>
              <Textarea
                rows={5}
                value={settings.prompt_template}
                onChange={(event) => set('prompt_template', event.target.value)}
                placeholder="Opcional. Use {{title}}, {{category}}, {{excerpt}} e {{default_prompt}}."
                className="resize-y"
              />
              <p className="text-[11px] text-muted-foreground">Vazio = preset editorial profissional do AutoPostWP.</p>
            </div>
            <div className="space-y-2">
              <Label>Negative prompt do vídeo</Label>
              <Textarea
                rows={5}
                value={settings.negative_prompt}
                onChange={(event) => set('negative_prompt', event.target.value)}
                className="resize-y"
              />
              <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                <div>
                  <Label className="text-xs font-semibold">Proteção editorial</Label>
                  <p className="text-[11px] text-muted-foreground">Evita inventar identidade de pessoa real sem referência confiável.</p>
                </div>
                <Switch checked={settings.editorial_safety} onCheckedChange={(value) => set('editorial_safety', value)} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Executar mídia agora</p>
              <p className="text-xs text-muted-foreground">Sincroniza tarefas já enviadas e cria mídia para artigos pendentes.</p>
            </div>
            <Button onClick={processNow} disabled={processing || !settings.enabled}>
              {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Processar fila
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm">Últimos jobs Magnific</CardTitle>
              <CardDescription>A fila é assíncrona; o pipeline sincroniza o resultado nas próximas execuções.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" /> Atualizar</Button>
          </div>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum job Magnific criado ainda.
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {jobs.map((job) => (
                <div key={job.id} className="min-w-0 rounded-lg border border-border/50 bg-secondary/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                      {job.media_type === 'image' ? <ImageIcon className="h-3.5 w-3.5" /> : <Film className="h-3.5 w-3.5" />}
                      {job.media_type}
                    </span>
                    <Badge variant={statusTone(job.status) as 'default' | 'destructive' | 'secondary'}>{job.status}</Badge>
                  </div>
                  {job.output_url && <a href={job.output_url} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs text-primary hover:underline">Abrir resultado</a>}
                  {job.error_message && <p className="mt-2 line-clamp-2 text-[11px] text-destructive">{job.error_message}</p>}
                  <p className="mt-2 text-[10px] text-muted-foreground">{new Date(job.created_at).toLocaleString('pt-BR')}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
