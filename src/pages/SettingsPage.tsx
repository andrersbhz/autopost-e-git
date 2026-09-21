import { useEffect, useState } from 'react';
import Preloader from '@/components/Preloader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, Cpu, Globe, Share2, BarChart3, Settings2, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WordPressSettings from '@/components/settings/WordPressSettings';
import GoogleAnalyticsSettings from '@/components/settings/GoogleAnalyticsSettings';
import GoogleIndexingSettings from '@/components/settings/GoogleIndexingSettings';
import AutomationSettings from '@/components/settings/AutomationSettings';
import GeminiSettings from '@/components/settings/GeminiSettings';
import OpenAISettings from '@/components/settings/OpenAISettings';
import GroqSettings from '@/components/settings/GroqSettings';
import AzureCopilotSettings from '@/components/settings/AzureCopilotSettings';
import JetpackSettings from '@/components/settings/JetpackSettings';
import FacebookSettings from '@/components/settings/FacebookSettings';
import { getErrorMessage, runBackendMutation, runBackendQuery } from '@/lib/backend';
import DashboardWidgetSettings from '@/components/settings/DashboardWidgetSettings';
import InstagramDirectSettings from '@/components/settings/InstagramDirectSettings';
import YouTubeSettings from '@/components/settings/YouTubeSettings';
import KnowledgeBaseSettings from '@/components/settings/KnowledgeBaseSettings';
import { BlogManager } from '@/components/blogs/BlogManager';
import { BookOpen, Layout } from 'lucide-react';

export interface UserSettings {
  wordpress_url: string;
  wordpress_username: string;
  wordpress_app_password: string;
  facebook_page_id: string;
  facebook_access_token: string;
  instagram_account_id: string;
  google_analytics_property_id: string;
  google_indexing_key: string;
  gemini_api_key: string;
  openai_api_key: string;
  azure_openai_api_key: string;
  azure_openai_endpoint: string;
  azure_openai_deployment_name: string;
  groq_api_key: string;
  gemini_model?: string;
  openai_model?: string;
  groq_model?: string;
  azure_openai_model?: string;
  youtube_api_key: string;
  categories: string[];
  priority_categories: string[];
  articles_per_day: number;
  auto_publish: boolean;
  writer_prompt: string;
  image_mode: 'ai' | 'manual' | 'none';
  image_prompt: string;
  image_format: string;
  image_knowledge_urls: string[];
  interaction_mode: string;
  dashboard_widgets: {
    stats: boolean;
    meta: boolean;
    robot: boolean;
    trends: boolean;
    categories: boolean;
    audit: boolean;
    alternate_stats: boolean;
    chart: boolean;
  };
  dashboard_order: string[];
}

const defaultOrder = ['stats', 'alternate_stats', 'chart', 'meta', 'robot', 'trends', 'categories', 'audit'];

const defaultSettings: UserSettings = {
  wordpress_url: '',
  wordpress_username: '',
  wordpress_app_password: '',
  facebook_page_id: '',
  facebook_access_token: '',
  instagram_account_id: '',
  google_analytics_property_id: '',
  google_indexing_key: '',
  gemini_api_key: '',
  openai_api_key: '',
  azure_openai_api_key: '',
  azure_openai_endpoint: '',
  azure_openai_deployment_name: '',
  groq_api_key: '',
  gemini_model: 'gemini-3.6-flash',
  openai_model: '',
  groq_model: '',
  azure_openai_model: '',
  youtube_api_key: '',
  categories: ['esportes', 'politica', 'policia', 'saude', 'celebridades', 'financas'],
  priority_categories: [],
  articles_per_day: 3,
  auto_publish: false,
  writer_prompt: '',
  image_mode: 'ai',
  image_prompt: '',
  image_format: 'instagram_portrait',
  image_knowledge_urls: [],
  interaction_mode: 'standard',
  dashboard_widgets: {
    stats: true,
    meta: true,
    robot: true,
    trends: true,
    categories: true,
    audit: true,
    alternate_stats: true,
    chart: true,
  },
  dashboard_order: defaultOrder,
};

interface CredentialsStatus {
  has_wp_password: boolean;
  has_fb_token: boolean;
  has_gemini_key: boolean;
  has_openai_key: boolean;
  has_azure_key: boolean;
  has_groq_key: boolean;
  has_linkedin_token: boolean;
  has_google_indexing_key: boolean;
  has_youtube_key: boolean;
}

const SettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasExistingSettings, setHasExistingSettings] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [credStatus, setCredStatus] = useState<CredentialsStatus>({ 
    has_wp_password: false, 
    has_fb_token: false, 
    has_gemini_key: false, 
    has_openai_key: false, 
    has_azure_key: false, 
    has_groq_key: false,
    has_linkedin_token: false,
    has_google_indexing_key: false,
    has_youtube_key: false
  });

  useEffect(() => {
    if (!user) return;

    const fetchSettings = async () => {
      try {
        const { data: userData, error: userError } = await supabase
          .from('user_settings')
          .select('id, user_id, wordpress_url, wordpress_username, facebook_page_id, instagram_account_id, google_analytics_property_id, google_indexing_key, azure_openai_endpoint, azure_openai_deployment_name, categories, priority_categories, articles_per_day, auto_publish, writer_prompt, image_mode, image_prompt, image_format, image_knowledge_urls, interaction_mode, dashboard_widgets, dashboard_order, gemini_model, openai_model, groq_model, azure_openai_model')
          .eq('user_id', user.id)
          .maybeSingle();

        if (userError) throw userError;

        const { data: statusData, error: statusError } = await supabase.rpc('get_credentials_status');
        // Ignore status error for now if RPC doesn't exist yet

        setHasExistingSettings(!!userData);

        if (userData) {
          setSettings({
            wordpress_url: userData.wordpress_url || '',
            wordpress_username: userData.wordpress_username || '',
            wordpress_app_password: '',
            facebook_page_id: userData.facebook_page_id || '',
            facebook_access_token: '',
            instagram_account_id: userData.instagram_account_id || '',
            google_analytics_property_id: userData.google_analytics_property_id || '',
            google_indexing_key: userData.google_indexing_key || '',
            gemini_api_key: '',
            openai_api_key: '',
            azure_openai_api_key: '',
            azure_openai_endpoint: userData.azure_openai_endpoint || '',
            azure_openai_deployment_name: userData.azure_openai_deployment_name || '',
            groq_api_key: '',
            gemini_model: (userData as any).gemini_model || defaultSettings.gemini_model,
            openai_model: (userData as any).openai_model || '',
            groq_model: (userData as any).groq_model || '',
            azure_openai_model: (userData as any).azure_openai_model || userData.azure_openai_deployment_name || '',
            youtube_api_key: '',
            categories: userData.categories || defaultSettings.categories,
            priority_categories: (userData as any).priority_categories || [],
            articles_per_day: userData.articles_per_day || 3,
            auto_publish: userData.auto_publish || false,
            writer_prompt: userData.writer_prompt || '',
            image_mode: (userData.image_mode as 'ai' | 'manual' | 'none') || 'ai',
            image_prompt: userData.image_prompt || '',
            image_format: (userData as any).image_format || 'instagram_portrait',
            image_knowledge_urls: ((userData as any).image_knowledge_urls as string[]) || [],
            interaction_mode: userData.interaction_mode || 'standard',
            dashboard_widgets: (userData.dashboard_widgets as UserSettings['dashboard_widgets']) || defaultSettings.dashboard_widgets,
            dashboard_order: (userData.dashboard_order as string[]) || defaultSettings.dashboard_order,
          });
        }

        if (statusData) {
          setCredStatus(statusData as unknown as CredentialsStatus);
        }
      } catch (error) {
        console.error("Fetch settings error:", error);
        toast({ title: 'Erro ao carregar configurações', description: getErrorMessage(error), variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [toast, user]);

  const handleSave = async () => {
    if (!user) return;

    // Validação rigorosa dos Prompts de IA conforme solicitado
    if (!settings.writer_prompt || settings.writer_prompt.trim().length < 100) {
      toast({ 
        title: 'Perfil do Escritor Obrigatório', 
        description: 'O "Perfil do Escritor" deve ser detalhado (mínimo 100 caracteres) para garantir a qualidade e evitar fake news.', 
        variant: 'destructive' 
      });
      return;
    }

    if (!settings.image_prompt || settings.image_prompt.trim().length < 50) {
      toast({ 
        title: 'Prompt de Imagem Obrigatório', 
        description: 'O "Prompt de Imagem IA" deve ser preenchido para evitar imagens desconexas.', 
        variant: 'destructive' 
      });
      return;
    }

    const mandatoryKeywords = ['SEO', 'jornalista', 'verdade', 'fato'];
    const missingKeywords = mandatoryKeywords.filter(k => !settings.writer_prompt.toLowerCase().includes(k.toLowerCase()));
    if (missingKeywords.length > 0) {
      toast({ 
        title: 'Prompt sem diretrizes de veracidade', 
        description: `Para evitar fake news, seu prompt deve conter termos como: ${missingKeywords.join(', ')}.`, 
        variant: 'destructive' 
      });
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        wordpress_url: settings.wordpress_url,
        wordpress_username: settings.wordpress_username,
        facebook_page_id: settings.facebook_page_id,
        instagram_account_id: settings.instagram_account_id,
        google_analytics_property_id: settings.google_analytics_property_id,
        google_indexing_key: settings.google_indexing_key,
        azure_openai_endpoint: settings.azure_openai_endpoint,
        azure_openai_deployment_name: settings.azure_openai_deployment_name,
        gemini_model: settings.gemini_model || 'gemini-3.6-flash',
        openai_model: settings.openai_model || null,
        groq_model: settings.groq_model || null,
        azure_openai_model: settings.azure_openai_model || settings.azure_openai_deployment_name || null,
        categories: settings.categories,
        priority_categories: settings.priority_categories,
        articles_per_day: settings.articles_per_day,
        auto_publish: settings.auto_publish,
        writer_prompt: settings.writer_prompt,
        image_mode: settings.image_mode,
        image_prompt: settings.image_prompt,
        image_format: settings.image_format,
        image_knowledge_urls: settings.image_knowledge_urls,
        interaction_mode: settings.interaction_mode,
        dashboard_widgets: settings.dashboard_widgets,
        dashboard_order: settings.dashboard_order,
      };

      if (settings.wordpress_app_password) {
        payload.wordpress_app_password = settings.wordpress_app_password;
      }
      if (settings.facebook_access_token) {
        payload.facebook_access_token = settings.facebook_access_token;
      }
      if (settings.gemini_api_key) {
        payload.gemini_api_key = settings.gemini_api_key;
      }
      if (settings.openai_api_key) {
        payload.openai_api_key = settings.openai_api_key;
      }
      if (settings.azure_openai_api_key) {
        payload.azure_openai_api_key = settings.azure_openai_api_key;
      }
      if (settings.groq_api_key) {
        payload.groq_api_key = settings.groq_api_key;
      }
      if (settings.youtube_api_key) {
        payload.youtube_api_key = settings.youtube_api_key;
      }

      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await runBackendMutation(() =>
          supabase.from('user_settings').update(payload as any).eq('user_id', user.id),
        );
      } else {
        await runBackendMutation(() =>
          supabase.from('user_settings').insert({ user_id: user.id, ...payload } as any),
        );
      }

      // Audit logging happens server-side via edge functions / service role.

      setHasExistingSettings(true);
      toast({ title: 'Salvo!', description: 'Configurações atualizadas com sucesso.' });

      const status = await runBackendQuery(() => supabase.rpc('get_credentials_status'));
      if (status) setCredStatus(status as unknown as CredentialsStatus);

      setSettings(prev => ({ ...prev, wordpress_app_password: '', facebook_access_token: '', gemini_api_key: '', openai_api_key: '', azure_openai_api_key: '', groq_api_key: '', google_indexing_key: '', youtube_api_key: '' }));
    } catch (error) {
      if (getErrorMessage(error).includes('duplicate key')) {
        // Retry with update if insert failed due to race condition
        const payload: Record<string, unknown> = {
          wordpress_url: settings.wordpress_url,
          wordpress_username: settings.wordpress_username,
          facebook_page_id: settings.facebook_page_id,
          instagram_account_id: settings.instagram_account_id,
          google_analytics_property_id: settings.google_analytics_property_id,
          google_indexing_key: settings.google_indexing_key,
          azure_openai_endpoint: settings.azure_openai_endpoint,
          azure_openai_deployment_name: settings.azure_openai_deployment_name,
          gemini_model: settings.gemini_model || 'gemini-3.6-flash',
          openai_model: settings.openai_model || null,
          groq_model: settings.groq_model || null,
          azure_openai_model: settings.azure_openai_model || settings.azure_openai_deployment_name || null,
          categories: settings.categories,
          priority_categories: settings.priority_categories,
          articles_per_day: settings.articles_per_day,
          auto_publish: settings.auto_publish,
          writer_prompt: settings.writer_prompt,
          image_mode: settings.image_mode,
          image_prompt: settings.image_prompt,
          image_format: settings.image_format,
          image_knowledge_urls: settings.image_knowledge_urls,
          dashboard_widgets: settings.dashboard_widgets,
          dashboard_order: settings.dashboard_order,
        };
        await runBackendMutation(() =>
          supabase.from('user_settings').update(payload as any).eq('user_id', user.id),
        );
        toast({ title: 'Salvo!', description: 'Configurações atualizadas.' });
      } else {
        toast({ title: 'Erro', description: getErrorMessage(error), variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (partial: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const disconnectCredential = async (
    fields: Partial<Record<keyof UserSettings, null | '' | string[]>>,
    label: string,
  ) => {
    if (!user) return;
    try {
      if (hasExistingSettings) {
        await runBackendMutation(() =>
          supabase.from('user_settings').update(fields as any).eq('user_id', user.id),
        );
      }
      // Reset local UI state for those fields
      const localReset: Partial<UserSettings> = {};
      for (const k of Object.keys(fields) as (keyof UserSettings)[]) {
        const v = fields[k];
        (localReset as any)[k] = Array.isArray(v) ? v : '';
      }
      setSettings((prev) => ({ ...prev, ...localReset }));

      // Refresh credentials status from server
      const status = await runBackendQuery(() => supabase.rpc('get_credentials_status'));
      if (status) setCredStatus(status as unknown as CredentialsStatus);

      toast({ title: 'Desconectado', description: `${label} foi desconectado(a) com sucesso.` });
    } catch (error) {
      toast({ title: 'Erro ao desconectar', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  if (loading) return <Preloader message="Abrindo central de controle..." />;

  return (
    <div className="space-y-6 max-w-5xl pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie suas integrações, IAs e preferências do sistema</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-[#a3ff12] text-[#0a1128] border border-transparent hover:bg-[#a3ff12] hover:text-[#0a1128] hover:border-[#a3ff12] hover:shadow-[0_0_16px_rgba(163,255,18,0.7),0_0_32px_rgba(163,255,18,0.35)] hover:-translate-y-0.5 transition-all">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Alterações
        </Button>
      </div>

      <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 text-xs text-muted-foreground flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
        <div>
          <strong className="text-foreground block mb-1">🔄 Sistema Multi-IA Inteligente</strong>
          O sistema alterna automaticamente entre os provedores configurados para garantir alta disponibilidade. 
          Ordem de Escrita: <span className="text-foreground">Gemini → OpenAI → Groq</span>. 
          Imagens: <span className="text-foreground">DALL-E 3 → Lovable</span>.
        </div>
      </div>

      <Tabs defaultValue="ai" className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 h-auto p-1 bg-background/50 border border-border/50 backdrop-blur-sm rounded-xl">
          <TabsTrigger value="ai" className="py-2.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Cpu className="h-4 w-4 mr-2" /> Inteligência Artificial
          </TabsTrigger>
          <TabsTrigger value="blogs" className="py-2.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Layout className="h-4 w-4 mr-2" /> Meus Blogs
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="py-2.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <BookOpen className="h-4 w-4 mr-2" /> Conhecimento
          </TabsTrigger>
          <TabsTrigger value="wordpress" className="py-2.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Globe className="h-4 w-4 mr-2" /> WordPress
          </TabsTrigger>
          <TabsTrigger value="social" className="py-2.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Share2 className="h-4 w-4 mr-2" /> Redes Sociais
          </TabsTrigger>
          <TabsTrigger value="appearance" className="py-2.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <BarChart3 className="h-4 w-4 mr-2" /> Interface
          </TabsTrigger>
          <TabsTrigger value="general" className="py-2.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Settings2 className="h-4 w-4 mr-2" /> Geral
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blogs">
          <BlogManager />
        </TabsContent>

        <TabsContent value="ai" className="space-y-6 mt-0 animate-in fade-in-50 duration-300">
          <GeminiSettings settings={settings} onChange={updateSettings} hasGeminiKey={credStatus.has_gemini_key} onDisconnect={() => disconnectCredential({ gemini_api_key: '' }, 'Gemini')} />
          <OpenAISettings settings={settings} onChange={updateSettings} hasOpenaiKey={credStatus.has_openai_key} onDisconnect={() => disconnectCredential({ openai_api_key: '' }, 'OpenAI')} />
          <GroqSettings settings={settings} onChange={updateSettings} hasGroqKey={credStatus.has_groq_key} onDisconnect={() => disconnectCredential({ groq_api_key: '' }, 'Groq')} />
          <AzureCopilotSettings settings={settings} onChange={updateSettings} hasAzureKey={credStatus.has_azure_key} onDisconnect={() => disconnectCredential({ azure_openai_api_key: '', azure_openai_endpoint: '', azure_openai_deployment_name: '', azure_openai_model: '' }, 'Azure OpenAI')} />
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-6 mt-0 animate-in fade-in-50 duration-300">
          <KnowledgeBaseSettings />
        </TabsContent>

        <TabsContent value="wordpress" className="space-y-6 mt-0 animate-in fade-in-50 duration-300">
          <WordPressSettings settings={settings} onChange={updateSettings} hasWpPassword={credStatus.has_wp_password} onDisconnect={() => disconnectCredential({ wordpress_url: '', wordpress_username: '', wordpress_app_password: '' }, 'WordPress')} />
          <JetpackSettings settings={settings} hasWpPassword={credStatus.has_wp_password} />
        </TabsContent>

        <TabsContent value="social" className="space-y-6 mt-0 animate-in fade-in-50 duration-300">
          <FacebookSettings settings={settings} onChange={updateSettings} />
          <InstagramDirectSettings />
          <YouTubeSettings settings={settings} onChange={updateSettings} hasYoutubeKey={credStatus.has_youtube_key} onDisconnect={() => disconnectCredential({ youtube_api_key: '' }, 'YouTube')} />
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6 mt-0 animate-in fade-in-50 duration-300">
          <DashboardWidgetSettings 
            widgets={settings.dashboard_widgets} 
            order={settings.dashboard_order}
            onChange={(w) => updateSettings({ dashboard_widgets: w })} 
            onOrderChange={(o) => updateSettings({ dashboard_order: o })}
          />
        </TabsContent>

        <TabsContent value="general" className="space-y-6 mt-0 animate-in fade-in-50 duration-300">
          <GoogleAnalyticsSettings settings={settings} onChange={updateSettings} />
          <GoogleIndexingSettings settings={settings} onChange={updateSettings} />
          <AutomationSettings settings={settings} onChange={updateSettings} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
