import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart3, TrendingUp, TrendingDown, Eye, MousePointerClick, Users,
  Lightbulb, RefreshCw, Loader2, Globe, Clock, ArrowUpRight, Percent,
  FileText, Smartphone, Monitor, Tablet, Facebook, Instagram, Heart, Share2,
  Twitter, Linkedin, Send, PieChart as PieChartIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import { getErrorMessage, runBackendQuery } from '@/lib/backend';
import { useNavigate, useLocation } from 'react-router-dom';

interface AnalyticsData {
  pageviews: number;
  sessions: number;
  users: number;
  newUsers: number;
  bounceRate: number;
  avgSessionDuration: string;
  pagesPerSession: number;
  topPages: { page: string; views: number; avgTime: string }[];
  trafficSources: { source: string; value: number }[];
  dailyViews: { date: string; views: number; users: number; sessions: number }[];
  devices: { device: string; value: number }[];
  countries: { country: string; users: number }[];
  topReferrers: { referrer: string; visits: number }[];
  hourlyTraffic: { hour: string; views: number }[];
  categoryStats?: { category: string; views: number; percentage: number }[];
}

interface SocialMetrics {
  publish_log: {
    wordpress: { total: number; success: number; failed: number; recent: { date: string; url: string }[] };
    facebook: { total: number; success: number; failed: number };
    instagram: { total: number; success: number; failed: number };
  };
  jetpack: {
    posts_with_sharing: number;
    total_shares: number;
    shares_by_network: Record<string, number>;
  };
  summary: {
    total_published_wp: number;
    total_shared_social: number;
    total_facebook: number;
    total_instagram: number;
    total_twitter: number;
    total_linkedin: number;
    total_tumblr: number;
  };
}

interface JetpackStats {
  available: boolean;
  summary?: {
    views: number; visitors: number; likes: number; comments: number;
    followers: number; shares: number; posts: number;
    views_today: number; views_yesterday: number;
    views_best_day: string | null; views_best_day_total: number;
  };
  topPosts?: { title: string; views: number; url: string }[];
  dailyViews?: { date: string; views: number }[];
  referrers?: { name: string; views: number }[];
  searchTerms?: { term: string; views: number }[];
  countries?: { country: string; views: number }[];
  publicizeConnections?: { service: string; external_name: string; status: string }[];
}

interface AiTip {
  category: string;
  tip: string;
  priority: 'alta' | 'média' | 'baixa';
}

const CHART_COLORS = [
  'hsl(210, 100%, 50%)',
  'hsl(190, 100%, 50%)',
  'hsl(220, 100%, 40%)',
  'hsl(180, 100%, 45%)',
  'hsl(0, 85%, 60%)',
  'hsl(160, 85%, 55%)',
];

const AnalyticsPage = ({ isModal = false, pageId }: { isModal?: boolean; pageId?: string | null }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const selectedPageId = pageId || queryParams.get('page');
  
  const [blogs, setBlogs] = useState<any[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState<string>('all');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [socialMetrics, setSocialMetrics] = useState<SocialMetrics | null>(null);
  const [tips, setTips] = useState<AiTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTips, setLoadingTips] = useState(false);
  const [gaConnected, setGaConnected] = useState(false);
  const [articleStats, setArticleStats] = useState({ total: 0, published: 0, failed: 0 });
  const [metaMetrics, setMetaMetrics] = useState<any[] | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [jetpackStats, setJetpackStats] = useState<JetpackStats | null>(null);
  const [loadingJetpack, setLoadingJetpack] = useState(false);
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area');
  const [pieChartType, setPieChartType] = useState<'pie' | 'donut'>('donut');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    if (!user) return;
    fetchBlogs();
    checkGaConnection();
    fetchArticleStats();
    fetchSocialMetrics();
    fetchMetaMetrics();
    fetchJetpackStats();
  }, [user, dateRange, selectedBlogId]);

  const fetchBlogs = async () => {
    const { data } = await supabase.from('user_blogs').select('id, name');
    setBlogs(data || []);
  };

  const fetchArticleStats = async () => {
    if (!user) return;

    try {
      let query = supabase.from('articles').select('status', { count: 'exact' }).eq('user_id', user.id);
      
      if (selectedBlogId !== 'all') {
        query = query.eq('blog_id', selectedBlogId);
      }

      const data = await runBackendQuery(() => query);
      
      const stats = {
        total: data?.length || 0,
        published: (data || []).filter((a) => a.status === 'published').length,
        failed: (data || []).filter((a) => a.status === 'failed').length,
      };
      setArticleStats(stats);
    } catch {
      setArticleStats({ total: 0, published: 0, failed: 0 });
    }
  };

  const fetchSocialMetrics = async () => {
    if (!user) return;

    try {
      const data = await runBackendQuery(() =>
        supabase.functions.invoke('fetch-social-metrics', {
          body: { userId: user.id, dateRange },
        }),
      );

      if (data?.metrics) {
        setSocialMetrics(data.metrics);
      }
    } catch {
      setSocialMetrics(null);
    }
  };

  const fetchMetaMetrics = async () => {
    if (!user) return;
    setLoadingMeta(true);
    try {
      const data = await runBackendQuery(() =>
        supabase.functions.invoke('fetch-meta-metrics', {
          body: { userId: user.id, dateRange },
        }),
      );
      if (data?.pages) {
        // Filter out pages that only have errors (expired token, etc.)
        const validPages = (data.pages as any[]).filter((pg: any) => {
          const hasFbError = pg.facebook?.error;
          const hasFbData = pg.facebook && !pg.facebook.error && (pg.facebook.fan_count || pg.facebook.followers_count);
          const hasIgData = pg.instagram && !pg.instagram.error && (pg.instagram.followers_count || pg.instagram.media_count);
          return hasFbData || hasIgData;
        });
        setMetaMetrics(validPages.length > 0 ? validPages : null);
      }
    } catch (error) {
      console.error('Meta metrics error:', error);
      setMetaMetrics(null);
    } finally {
      setLoadingMeta(false);
    }
  };

  const fetchJetpackStats = async () => {
    if (!user) return;
    setLoadingJetpack(true);
    try {
      const data = await runBackendQuery(() =>
        supabase.functions.invoke('fetch-jetpack-stats', { body: { userId: user.id, dateRange } }),
      );
      if (data?.jetpack?.available) {
        setJetpackStats(data.jetpack);
      } else {
        setJetpackStats(null);
      }
    } catch {
      setJetpackStats(null);
    } finally {
      setLoadingJetpack(false);
    }
  };

  const checkGaConnection = async () => {
    if (!user) return;

    try {
      const data = await runBackendQuery(() =>
        supabase
          .from('user_settings')
          .select('google_analytics_property_id')
          .eq('user_id', user.id)
          .maybeSingle(),
      );

      const connected = !!(data as any)?.google_analytics_property_id;
      setGaConnected(connected);

      if (connected) {
        fetchAnalytics();
      } else {
        setLoading(false);
      }
    } catch {
      setGaConnected(false);
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await runBackendQuery(() =>
        supabase.functions.invoke('fetch-analytics', {
          body: { userId: user?.id, dateRange },
        }),
      );

      if (data?.analytics) setAnalytics(data.analytics);
    } catch (error) {
      toast({ title: 'Erro', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generateTips = async () => {
    if (!analytics) return;
    setLoadingTips(true);
    try {
      const data = await runBackendQuery(() =>
        supabase.functions.invoke('generate-analytics-tips', {
          body: { userId: user?.id, analytics, socialMetrics },
        }),
      );

      setTips(data?.tips || []);
    } catch (error) {
      toast({ title: 'Erro', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setLoadingTips(false);
    }
  };

  const priorityColors: Record<string, string> = {
    alta: 'bg-destructive/20 text-destructive',
    média: 'bg-warning/20 text-warning',
    baixa: 'bg-primary/20 text-primary',
  };

  const deviceIcons: Record<string, any> = {
    Desktop: Monitor,
    Mobile: Smartphone,
    Tablet: Tablet,
  };

  const customTooltipStyle = {
    backgroundColor: 'hsl(230, 25%, 6%)',
    border: '1px solid hsl(230, 20%, 20%)',
    borderRadius: '0px',
    color: 'hsl(210, 20%, 98%)',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const blogSelector = blogs.length > 0 && (
    <div className="flex items-center gap-2 mb-6 bg-accent/5 p-3 rounded-lg border border-accent/10">
      <Globe className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium text-foreground">Filtrar por Blog:</span>
      <select 
        value={selectedBlogId} 
        onChange={(e) => setSelectedBlogId(e.target.value)}
        className="bg-background border border-border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
      >
        <option value="all">Todos os Blogs</option>
        {blogs.map(blog => (
          <option key={blog.id} value={blog.id}>{blog.name}</option>
        ))}
      </select>
    </div>
  );

  const sm = socialMetrics?.summary;
  const jp = socialMetrics?.jetpack;
  const pl = socialMetrics?.publish_log;

  const filteredMetaMetrics = metaMetrics?.filter((pg: any) => !selectedPageId || pg.page_id === selectedPageId || pg.instagram?.id === selectedPageId);

  const socialSection = (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold neon-text-pink flex items-center gap-2">
        <Share2 className="h-5 w-5" /> Redes Sociais
      </h2>

      {/* Main counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { icon: Globe, label: 'Publicados WP', value: sm?.total_published_wp || 0, color: 'text-primary' },
          { icon: Share2, label: 'Compartilhados', value: sm?.total_shared_social || 0, color: 'text-accent' },
          { icon: Facebook, label: 'Facebook', value: sm?.total_facebook || 0, color: 'text-accent' },
          { icon: Instagram, label: 'Instagram', value: sm?.total_instagram || 0, color: 'text-primary' },
          { icon: Twitter, label: 'Twitter/X', value: sm?.total_twitter || 0, color: 'text-muted-foreground' },
          { icon: Linkedin, label: 'LinkedIn', value: sm?.total_linkedin || 0, color: 'text-muted-foreground' },
        ].map((s) => (
          <Card key={s.label} className="glass-card neon-border-pink">
            <CardContent className="p-4">
              <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
              <p className="text-xl font-bold text-foreground">{s.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Jetpack Publicize details */}
      {jp && jp.total_shares > 0 && (
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Send className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Jetpack Publicize</p>
              <Badge variant="secondary" className="ml-auto">{jp.total_shares} compartilhamentos</Badge>
            </div>
            {Object.keys(jp.shares_by_network).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(jp.shares_by_network).map(([network, count]) => (
                  <Badge key={network} variant="outline" className="text-xs">
                    {network}: {count}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Publish log details */}
      {pl && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'WordPress', total: pl.wordpress.total, success: pl.wordpress.success, failed: pl.wordpress.failed, color: 'text-primary' },
            { label: 'Facebook', total: pl.facebook.total, success: pl.facebook.success, failed: pl.facebook.failed, color: 'text-accent' },
            { label: 'Instagram', total: pl.instagram.total, success: pl.instagram.success, failed: pl.instagram.failed, color: 'text-primary' },
          ].map((p) => (
            <Card key={p.label} className="glass-card">
              <CardContent className="p-4">
                <p className={`text-sm font-medium ${p.color} mb-2`}>{p.label}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Total: <strong className="text-foreground">{p.total}</strong></span>
                  <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">{p.success} ✓</Badge>
                  {p.failed > 0 && <Badge variant="destructive" className="text-xs">{p.failed} ✗</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* === META API COMPARISON PANEL === */}
      {metaMetrics && metaMetrics.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card neon-border-pink">
            <CardHeader>
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Seguidores por Conta
              </CardTitle>
              <CardDescription>Comparação de audiência total entre suas contas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Button 
                  variant={chartType === 'area' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setChartType('area')}
                  className="h-8 text-xs px-2"
                >
                  Área
                </Button>
                <Button 
                  variant={chartType === 'line' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setChartType('line')}
                  className="h-8 text-xs px-2"
                >
                  Linhas
                </Button>
                <Button 
                  variant={chartType === 'bar' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setChartType('bar')}
                  className="h-8 text-xs px-2"
                >
                  Barras
                </Button>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart
                      data={metaMetrics.map(pg => ({
                        name: pg.page_name,
                        "Facebook": pg.facebook?.followers_count || pg.facebook?.fan_count || 0,
                        "Instagram": pg.instagram?.followers_count || 0,
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 15%)" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        fontSize={11} 
                        stroke="hsl(260, 10%, 65%)" 
                        interval={0}
                        height={80}
                      />
                      <YAxis fontSize={11} stroke="hsl(260, 10%, 65%)" />
                      <Tooltip 
                        contentStyle={customTooltipStyle}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="Facebook" fill="hsl(220, 80%, 55%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Instagram" fill="hsl(330, 80%, 60%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : chartType === 'line' ? (
                    <LineChart
                      data={metaMetrics.map(pg => ({
                        name: pg.page_name,
                        "Facebook": pg.facebook?.followers_count || pg.facebook?.fan_count || 0,
                        "Instagram": pg.instagram?.followers_count || 0,
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 15%)" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        fontSize={11} 
                        stroke="hsl(260, 10%, 65%)" 
                        interval={0}
                        height={80}
                      />
                      <YAxis fontSize={11} stroke="hsl(260, 10%, 65%)" />
                      <Tooltip contentStyle={customTooltipStyle} />
                      <Legend verticalAlign="top" height={36} />
                      <Line type="monotone" dataKey="Facebook" stroke="hsl(220, 80%, 55%)" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Instagram" stroke="hsl(330, 80%, 60%)" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  ) : (
                    <AreaChart
                      data={metaMetrics.map(pg => ({
                        name: pg.page_name,
                        "Facebook": pg.facebook?.followers_count || pg.facebook?.fan_count || 0,
                        "Instagram": pg.instagram?.followers_count || 0,
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 15%)" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        fontSize={11} 
                        stroke="hsl(260, 10%, 65%)" 
                        interval={0}
                        height={80}
                      />
                      <YAxis fontSize={11} stroke="hsl(260, 10%, 65%)" />
                      <Tooltip contentStyle={customTooltipStyle} />
                      <Legend verticalAlign="top" height={36} />
                      <Area type="monotone" dataKey="Facebook" stroke="hsl(220, 80%, 55%)" fill="hsl(220, 80%, 55%, 0.15)" strokeWidth={3} />
                      <Area type="monotone" dataKey="Instagram" stroke="hsl(330, 80%, 60%)" fill="hsl(330, 80%, 60%, 0.15)" strokeWidth={3} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card neon-border-pink">
            <CardHeader>
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" /> Engajamento Comparado
              </CardTitle>
              <CardDescription>Total de interações em posts recentes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart
                      data={metaMetrics.map(pg => ({
                        name: pg.page_name,
                        "Engajamento FB": pg.facebook?.post_stats?.total_likes + pg.facebook?.post_stats?.total_comments + pg.facebook?.post_stats?.total_shares || 0,
                        "Engajamento IG": pg.instagram?.post_stats?.total_likes + pg.instagram?.post_stats?.total_comments || 0,
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 15%)" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        fontSize={11} 
                        stroke="hsl(260, 10%, 65%)" 
                        interval={0}
                        height={80}
                      />
                      <YAxis fontSize={11} stroke="hsl(260, 10%, 65%)" />
                      <Tooltip 
                        contentStyle={customTooltipStyle}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="Engajamento FB" fill="hsl(200, 70%, 50%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Engajamento IG" fill="hsl(280, 70%, 50%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : chartType === 'line' ? (
                    <LineChart
                      data={metaMetrics.map(pg => ({
                        name: pg.page_name,
                        "Engajamento FB": pg.facebook?.post_stats?.total_likes + pg.facebook?.post_stats?.total_comments + pg.facebook?.post_stats?.total_shares || 0,
                        "Engajamento IG": pg.instagram?.post_stats?.total_likes + pg.instagram?.post_stats?.total_comments || 0,
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 15%)" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        fontSize={11} 
                        stroke="hsl(260, 10%, 65%)" 
                        interval={0}
                        height={80}
                      />
                      <YAxis fontSize={11} stroke="hsl(260, 10%, 65%)" />
                      <Tooltip contentStyle={customTooltipStyle} />
                      <Legend verticalAlign="top" height={36} />
                      <Line type="monotone" dataKey="Engajamento FB" stroke="hsl(200, 70%, 50%)" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Engajamento IG" stroke="hsl(280, 70%, 50%)" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  ) : (
                    <AreaChart
                      data={metaMetrics.map(pg => ({
                        name: pg.page_name,
                        "Engajamento FB": pg.facebook?.post_stats?.total_likes + pg.facebook?.post_stats?.total_comments + pg.facebook?.post_stats?.total_shares || 0,
                        "Engajamento IG": pg.instagram?.post_stats?.total_likes + pg.instagram?.post_stats?.total_comments || 0,
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 15%)" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        fontSize={11} 
                        stroke="hsl(260, 10%, 65%)" 
                        interval={0}
                        height={80}
                      />
                      <YAxis fontSize={11} stroke="hsl(260, 10%, 65%)" />
                      <Tooltip contentStyle={customTooltipStyle} />
                      <Legend verticalAlign="top" height={36} />
                      <Area type="monotone" dataKey="Engajamento FB" stroke="hsl(200, 70%, 50%)" fill="hsl(200, 70%, 50%, 0.15)" strokeWidth={3} />
                      <Area type="monotone" dataKey="Engajamento IG" stroke="hsl(280, 70%, 50%)" fill="hsl(280, 70%, 50%, 0.15)" strokeWidth={3} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card neon-border-pink lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg text-foreground flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-primary" /> Distribuição de Alcance (28d)
              </CardTitle>
              <CardDescription>Alcance total por conta em ambas as plataformas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={metaMetrics.map(pg => ({
                      name: pg.page_name,
                      "Alcance FB": pg.facebook?.insights?.page_impressions?.total || 0,
                      "Alcance IG": pg.instagram?.insights?.reach?.total || 0,
                    }))}
                    margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 15%)" horizontal={false} />
                    <XAxis type="number" fontSize={11} stroke="hsl(260, 10%, 65%)" />
                    <YAxis dataKey="name" type="category" fontSize={11} stroke="hsl(260, 10%, 65%)" width={90} />
                    <Tooltip 
                      contentStyle={customTooltipStyle}
                      cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="Alcance FB" fill="hsl(210, 100%, 50%)" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Alcance IG" fill="hsl(330, 100%, 50%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* === META API METRICS === */}
      {loadingMeta && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando métricas do Meta...
        </div>
      )}
      {metaMetrics && metaMetrics.length > 0 && filteredMetaMetrics && filteredMetaMetrics.length > 0 && filteredMetaMetrics
        .map((pg: any, idx: number) => (
        <div key={idx} className="space-y-3">
          <h3 className="text-md font-semibold text-foreground flex items-center gap-2">
            <Facebook className="h-4 w-4 text-accent" /> {pg.page_name || 'Página'}
          </h3>
          {pg.facebook && !pg.facebook.error && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Seguidores', value: pg.facebook.followers_count || pg.facebook.fan_count || 0 },
                  { label: 'Curtidas', value: pg.facebook.fan_count || 0 },
                  { label: 'Falando sobre', value: pg.facebook.talking_about_count || 0 },
                  { label: 'Check-ins', value: pg.facebook.were_here_count || 0 },
                ].map((s: any) => (
                  <Card key={s.label} className="glass-card"><CardContent className="p-3">
                    <p className="text-lg font-bold text-foreground">{(s.value || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </CardContent></Card>
                ))}
              </div>
              {pg.facebook.insights && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Impressões (28d)', value: pg.facebook.insights.page_impressions?.total || 0, growth: pg.facebook.insights.page_impressions?.growth },
                    { label: 'Alcance Único', value: pg.facebook.insights.page_impressions_unique?.total || 0, growth: pg.facebook.insights.page_impressions_unique?.growth },
                    { label: 'Engajamento', value: pg.facebook.insights.page_post_engagements?.total || 0, growth: pg.facebook.insights.page_post_engagements?.growth },
                    { label: 'Engajados', value: pg.facebook.insights.page_engaged_users?.total || 0, growth: pg.facebook.insights.page_engaged_users?.growth },
                    { label: 'Views Página', value: pg.facebook.insights.page_views_total?.total || 0, growth: pg.facebook.insights.page_views_total?.growth },
                    { label: 'Novos Fãs', value: pg.facebook.insights.page_fan_adds?.total || 0, growth: pg.facebook.insights.page_fan_adds?.growth },
                    { label: 'Fãs Perdidos', value: pg.facebook.insights.page_fan_removes?.total || 0, growth: pg.facebook.insights.page_fan_removes?.growth },
                    { label: 'Feedback Neg.', value: pg.facebook.insights.page_negative_feedback?.total || 0, growth: pg.facebook.insights.page_negative_feedback?.growth },
                  ].map((s: any) => (
                    <Card key={s.label} className="glass-card"><CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <p className="text-lg font-bold text-foreground">{(s.value || 0).toLocaleString()}</p>
                        {s.growth !== undefined && (
                          <div className={cn(
                            "flex items-center text-[10px] font-bold px-1 rounded",
                            s.growth > 0 ? "text-success bg-success/10" : s.growth < 0 ? "text-destructive bg-destructive/10" : "text-muted-foreground bg-secondary"
                          )}>
                            {s.growth > 0 ? <TrendingUp className="h-2.5 w-2.5 mr-0.5" /> : s.growth < 0 ? <TrendingDown className="h-2.5 w-2.5 mr-0.5" /> : null}
                            {Math.abs(s.growth)}%
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </CardContent></Card>
                  ))}
                </div>
              )}
              {pg.facebook.post_stats && (
                <Card className="glass-card"><CardContent className="p-4">
                  <p className="text-sm font-medium text-foreground mb-3">📊 Últimos {pg.facebook.post_stats.total_posts} Posts</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                    {[
                      { label: 'Curtidas', value: pg.facebook.post_stats.total_likes },
                      { label: 'Comentários', value: pg.facebook.post_stats.total_comments },
                      { label: 'Reações', value: pg.facebook.post_stats.total_reactions },
                      { label: 'Compartilh.', value: pg.facebook.post_stats.total_shares },
                      { label: 'Eng. Médio', value: pg.facebook.post_stats.avg_engagement },
                    ].map((s: any) => (
                      <div key={s.label}>
                        <p className="text-lg font-bold text-foreground">{(s.value || 0).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent></Card>
              )}
              {pg.facebook.insights?.page_impressions?.daily?.length > 0 && (
                <Card className="glass-card"><CardHeader><CardTitle className="text-sm text-foreground">Impressões FB (28d)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={pg.facebook.insights.page_impressions.daily}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 15%)" />
                        <XAxis dataKey="date" fontSize={10} stroke="hsl(260, 10%, 45%)" />
                        <YAxis fontSize={10} stroke="hsl(260, 10%, 45%)" />
                        <Tooltip contentStyle={customTooltipStyle} />
                        <Area type="monotone" dataKey="value" name="Impressões" stroke="hsl(220, 80%, 55%)" fill="hsl(220, 80%, 55%, 0.15)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
          {/* Error messages are hidden - only show when there's valid data */}
          {pg.instagram && (
            <>
              <h3 className="text-md font-semibold text-foreground flex items-center gap-2 mt-4">
                <Instagram className="h-4 w-4 text-primary" /> Instagram {pg.instagram.username ? `@${pg.instagram.username}` : ''}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Seguidores', value: pg.instagram.followers_count || 0 },
                  { label: 'Seguindo', value: pg.instagram.follows_count || 0 },
                  { label: 'Publicações', value: pg.instagram.media_count || 0 },
                  { label: 'Eng. Médio', value: pg.instagram.post_stats?.avg_engagement || 0 },
                ].map((s: any) => (
                  <Card key={s.label} className="glass-card"><CardContent className="p-3">
                    <p className="text-lg font-bold text-foreground">{(s.value || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </CardContent></Card>
                ))}
              </div>
              {pg.instagram.insights && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Impressões (28d)', value: pg.instagram.insights.impressions?.total || 0, growth: pg.instagram.insights.impressions?.growth },
                    { label: 'Alcance (28d)', value: pg.instagram.insights.reach?.total || 0, growth: pg.instagram.insights.reach?.growth },
                    { label: 'Visitas Perfil', value: pg.instagram.insights.profile_views?.total || 0, growth: pg.instagram.insights.profile_views?.growth },
                    { label: 'Cliques Site', value: pg.instagram.insights.website_clicks?.total || 0, growth: pg.instagram.insights.website_clicks?.growth },
                  ].map((s: any) => (
                    <Card key={s.label} className="glass-card"><CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <p className="text-lg font-bold text-foreground">{(s.value || 0).toLocaleString()}</p>
                        {s.growth !== undefined && (
                          <div className={cn(
                            "flex items-center text-[10px] font-bold px-1 rounded",
                            s.growth > 0 ? "text-success bg-success/10" : s.growth < 0 ? "text-destructive bg-destructive/10" : "text-muted-foreground bg-secondary"
                          )}>
                            {s.growth > 0 ? <TrendingUp className="h-2.5 w-2.5 mr-0.5" /> : s.growth < 0 ? <TrendingDown className="h-2.5 w-2.5 mr-0.5" /> : null}
                            {Math.abs(s.growth)}%
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </CardContent></Card>
                  ))}
                </div>
              )}
              {pg.instagram.post_stats && (
                <Card className="glass-card"><CardContent className="p-4">
                  <p className="text-sm font-medium text-foreground mb-3">📸 Últimos {pg.instagram.post_stats.total_posts} Posts</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: 'Curtidas', value: pg.instagram.post_stats.total_likes },
                      { label: 'Comentários', value: pg.instagram.post_stats.total_comments },
                      { label: 'Eng. Médio', value: pg.instagram.post_stats.avg_engagement },
                    ].map((s: any) => (
                      <div key={s.label}>
                        <p className="text-lg font-bold text-foreground">{(s.value || 0).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent></Card>
              )}
              {pg.instagram.demographics?.audience_country && (
                <Card className="glass-card"><CardHeader><CardTitle className="text-sm text-foreground">Audiência por País</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(pg.instagram.demographics.audience_country as Record<string, number>)
                        .sort(([, a], [, b]) => (b as number) - (a as number)).slice(0, 10)
                        .map(([country, count]) => (
                          <div key={country} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30">
                            <span className="text-sm text-foreground">{country}</span>
                            <Badge variant="secondary" className="text-xs">{(count as number).toLocaleString()}</Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {pg.instagram.insights?.reach?.daily?.length > 0 && (
                <Card className="glass-card"><CardHeader><CardTitle className="text-sm text-foreground">Alcance IG (28d)</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={pg.instagram.insights.reach.daily}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 20%, 18%)" />
                        <XAxis dataKey="date" fontSize={10} stroke="hsl(260, 10%, 45%)" />
                        <YAxis fontSize={10} stroke="hsl(260, 10%, 45%)" />
                        <Tooltip contentStyle={customTooltipStyle} />
                        <Area type="monotone" dataKey="value" name="Alcance" stroke="hsl(320, 80%, 55%)" fill="hsl(320, 80%, 55%, 0.15)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      ))}
      {!loadingMeta && (!metaMetrics || metaMetrics.length === 0) && (
        <Card className="glass-card neon-border-pink">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-[#1877F2]/15 flex items-center justify-center ring-2 ring-[#1877F2]/40 shadow-[0_0_20px_rgba(24,119,242,0.45)]">
              <Facebook className="h-7 w-7 text-[#1877F2]" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Nenhuma página conectada</p>
              <p className="text-xs text-muted-foreground">
                Conecte com o Facebook que você está logado no navegador para puxar páginas, Instagram e métricas do Gerenciador de Negócios.
              </p>
            </div>
            <Button
              onClick={() => navigate('/settings#facebook')}
              className="bg-[#1877F2] hover:bg-[#166FE5] text-white shadow-[0_0_18px_rgba(24,119,242,0.55)] hover:shadow-[0_0_28px_rgba(24,119,242,0.75)] transition-all"
            >
              <Facebook className="h-4 w-4 mr-2" />
              Conectar com Facebook
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const jetpackSection = (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold neon-text-lilac flex items-center gap-2">
        <BarChart3 className="h-5 w-5" /> Jetpack Stats
      </h2>

      {loadingJetpack && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando dados do Jetpack...
        </div>
      )}

      {!loadingJetpack && !jetpackStats && (
        <Card className="glass-card neon-border-lilac overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row items-center">
              <div className="w-full md:w-1/3 bg-lilac/5 p-6 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-lilac/20">
                <div className="w-16 h-16 rounded-full bg-lilac/10 flex items-center justify-center mb-4 ring-2 ring-lilac/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                  <BarChart3 className="h-8 w-8 text-lilac" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Jetpack Inativo</h3>
                <p className="text-xs text-muted-foreground max-w-[200px]">
                  Estatísticas em tempo real diretamente do seu WordPress
                </p>
              </div>
              
              <div className="w-full md:w-2/3 p-6 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Como ativar as estatísticas:</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-xs text-muted-foreground">
                      <div className="mt-1 bg-lilac/20 text-lilac rounded-full p-0.5"><Clock className="h-3 w-3" /></div>
                      <span>Verifique se o plugin <strong>Jetpack</strong> está instalado e ativo no seu WordPress.</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-muted-foreground">
                      <div className="mt-1 bg-lilac/20 text-lilac rounded-full p-0.5"><Globe className="h-3 w-3" /></div>
                      <span>Certifique-se de que o site está conectado a uma conta <strong>WordPress.com</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-muted-foreground">
                      <div className="mt-1 bg-lilac/20 text-lilac rounded-full p-0.5"><RefreshCw className="h-3 w-3" /></div>
                      <span>Confirme se a <strong>URL, usuário e senha de aplicativo</strong> estão corretos nas configurações.</span>
                    </li>
                  </ul>
                </div>
                
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button 
                    onClick={() => navigate('/settings')} 
                    size="sm"
                    className="bg-lilac hover:bg-lilac/80 text-white"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Configurar WordPress
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('https://jetpack.com/support/getting-started-with-jetpack/', '_blank')}
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Tutorial Jetpack
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {jetpackStats?.summary && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {[
              { icon: Eye, label: 'Views Totais', value: jetpackStats.summary.views, color: 'text-primary' },
              { icon: Users, label: 'Visitantes', value: jetpackStats.summary.visitors, color: 'text-accent' },
              { icon: Heart, label: 'Curtidas', value: jetpackStats.summary.likes, color: 'text-destructive' },
              { icon: FileText, label: 'Comentários', value: jetpackStats.summary.comments, color: 'text-warning' },
              { icon: Users, label: 'Seguidores', value: jetpackStats.summary.followers, color: 'text-primary' },
              { icon: Eye, label: 'Views Hoje', value: jetpackStats.summary.views_today, color: 'text-primary' },
              { icon: Eye, label: 'Views Ontem', value: jetpackStats.summary.views_yesterday, color: 'text-muted-foreground' },
              { icon: Share2, label: 'Compartilh.', value: jetpackStats.summary.shares, color: 'text-accent' },
              { icon: FileText, label: 'Posts', value: jetpackStats.summary.posts, color: 'text-muted-foreground' },
              { icon: TrendingUp, label: 'Recorde', value: jetpackStats.summary.views_best_day_total, color: 'text-warning' },
            ].map((s) => (
              <Card key={s.label} className="glass-card">
                <CardContent className="p-4">
                  <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
                  <p className="text-xl font-bold text-foreground">{(s.value || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {jetpackStats.summary.views_best_day && (
            <p className="text-xs text-muted-foreground">
              📅 Melhor dia: <strong className="text-foreground">{jetpackStats.summary.views_best_day}</strong> com {jetpackStats.summary.views_best_day_total.toLocaleString()} views
            </p>
          )}
        </>
      )}

      {jetpackStats?.dailyViews && jetpackStats.dailyViews.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm text-foreground">Visitas Diárias (Jetpack - 30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={jetpackStats.dailyViews}>
                <defs>
                  <linearGradient id="colorJpViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(275, 70%, 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(275, 70%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 20%, 18%)" />
                <XAxis dataKey="date" fontSize={10} stroke="hsl(260, 10%, 45%)" />
                <YAxis fontSize={10} stroke="hsl(260, 10%, 45%)" />
                <Tooltip contentStyle={customTooltipStyle} />
                <Area type="monotone" dataKey="views" name="Views" stroke="hsl(275, 70%, 50%)" fill="url(#colorJpViews)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {jetpackStats?.topPosts && jetpackStats.topPosts.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm text-foreground">📈 Top Posts (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {jetpackStats.topPosts.map((post, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xs font-bold text-primary w-5">{i + 1}</span>
                      <span className="text-sm text-foreground truncate">{post.title}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary shrink-0">{post.views}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {jetpackStats?.referrers && jetpackStats.referrers.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm text-foreground">🔗 Referências (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {jetpackStats.referrers.map((ref, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{ref.name}</span>
                    </div>
                    <Badge variant="secondary" className="bg-accent/10 text-accent">{ref.views}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {jetpackStats?.searchTerms && jetpackStats.searchTerms.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm text-foreground">🔍 Termos de Busca (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {jetpackStats.searchTerms.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                    <span className="text-sm text-foreground">{t.term}</span>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">{t.views}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {jetpackStats?.countries && jetpackStats.countries.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm text-foreground">🌍 Países (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {jetpackStats.countries.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                    <span className="text-sm text-foreground">{c.country}</span>
                    <Badge variant="secondary" className="bg-accent/10 text-accent">{c.views}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {jetpackStats?.publicizeConnections && jetpackStats.publicizeConnections.length > 0 && (
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Send className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Conexões Publicize</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {jetpackStats.publicizeConnections.map((c, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {c.service}{c.external_name ? ` (${c.external_name})` : ''}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (!gaConnected) {
    return (
      <div className="space-y-6">
        {!isModal && (
          <div>
            <h1 className="text-2xl font-bold neon-text-lilac">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">Métricas e insights do seu blog</p>
          </div>
        )}
        {socialSection}
        {jetpackSection}
        <Card className="glass-card">
          <CardContent className="py-16 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium">Google Analytics não conectado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Vá em Configurações e conecte seu Google Analytics para ver as métricas completas
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    { icon: Eye, label: 'Pageviews', value: analytics?.pageviews?.toLocaleString() || '0', color: 'text-primary' },
    { icon: Users, label: 'Usuários', value: analytics?.users?.toLocaleString() || '0', color: 'text-accent' },
    { icon: MousePointerClick, label: 'Sessões', value: analytics?.sessions?.toLocaleString() || '0', color: 'text-primary' },
    { icon: Percent, label: 'Taxa de Rejeição', value: `${analytics?.bounceRate || 0}%`, color: 'text-warning' },
    { icon: Clock, label: 'Duração Média', value: analytics?.avgSessionDuration || '0:00', color: 'text-primary' },
    { icon: ArrowUpRight, label: 'Págs/Sessão', value: analytics?.pagesPerSession?.toFixed(1) || '0', color: 'text-accent' },
    { icon: Users, label: 'Novos Usuários', value: analytics?.newUsers?.toLocaleString() || '0', color: 'text-primary' },
    { icon: FileText, label: 'Artigos Publicados', value: String(articleStats.published), color: 'text-accent' },
  ];


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {!isModal && (
          <div>
            <h1 className="text-2xl font-bold neon-text-lilac">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">Métricas completas e insights do seu blog</p>
          </div>
        )}
        {blogSelector}
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 px-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <input 
                type="date" 
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="bg-transparent text-xs text-foreground outline-none border-none [color-scheme:dark]"
              />
              <span className="text-muted-foreground text-xs">até</span>
              <input 
                type="date" 
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="bg-transparent text-xs text-foreground outline-none border-none [color-scheme:dark]"
              />
              {(dateRange.from || dateRange.to) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setDateRange({ from: '', to: '' })}
                  className="h-6 w-6 p-0 hover:bg-white/10"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={generateTips} disabled={loadingTips || !analytics} className="border-accent/30 hover:bg-accent/10 text-accent h-9">
              {loadingTips ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lightbulb className="h-4 w-4 mr-2" />}
              Dicas IA
            </Button>
            <Button onClick={fetchAnalytics} className="gradient-primary text-primary-foreground shadow-neon-lilac h-9">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`h-5 w-5 ${stat.color} opacity-80`} />
              </div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Social Metrics */}
      {socialSection}

      {/* Jetpack Stats */}
      {jetpackSection}

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {analytics?.dailyViews && analytics.dailyViews.length > 0 && (
          <Card className="glass-card lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg text-foreground">Tráfego dos Últimos {dateRange.from ? 'Dias Selecionados' : '30 Dias'}</CardTitle>
                <CardDescription>Visualizações, usuários e sessões diárias</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant={chartType === 'area' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setChartType('area')}
                  className="h-8 w-8 p-0"
                  title="Gráfico de Área"
                >
                  <TrendingUp className="h-4 w-4" />
                </Button>
                <Button 
                  variant={chartType === 'bar' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setChartType('bar')}
                  className="h-8 w-8 p-0"
                  title="Gráfico de Barras"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                {chartType === 'bar' ? (
                  <BarChart data={analytics.dailyViews}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 20%, 18%)" />
                    <XAxis dataKey="date" fontSize={11} stroke="hsl(260, 10%, 45%)" />
                    <YAxis fontSize={11} stroke="hsl(260, 10%, 45%)" />
                    <Tooltip contentStyle={customTooltipStyle} />
                    <Legend />
                    <Bar dataKey="views" name="Views" fill="hsl(145, 80%, 45%)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="users" name="Usuários" fill="hsl(320, 80%, 55%)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={analytics.dailyViews}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(145, 80%, 45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(145, 80%, 45%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(320, 80%, 55%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(320, 80%, 55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 20%, 18%)" />
                    <XAxis dataKey="date" fontSize={11} stroke="hsl(260, 10%, 45%)" />
                    <YAxis fontSize={11} stroke="hsl(260, 10%, 45%)" />
                    <Tooltip contentStyle={customTooltipStyle} />
                    <Legend />
                    <Area type="monotone" dataKey="views" name="Views" stroke="hsl(145, 80%, 45%)" fill="url(#colorViews)" strokeWidth={2} />
                    <Area type="monotone" dataKey="users" name="Usuários" stroke="hsl(320, 80%, 55%)" fill="url(#colorUsers)" strokeWidth={2} />
                    <Line type="monotone" dataKey="sessions" name="Sessões" stroke="hsl(275, 70%, 50%)" strokeWidth={2} dot={false} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {analytics?.topPages && analytics.topPages.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Páginas Mais Visitadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.topPages.slice(0, 10).map((page, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xs font-bold text-primary w-5">{i + 1}</span>
                      <span className="text-sm text-foreground truncate">{page.page}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">{page.avgTime}</span>
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">{page.views}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {analytics?.trafficSources && analytics.trafficSources.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-foreground">Fontes de Tráfego</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant={pieChartType === 'pie' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setPieChartType('pie')}
                  className="h-8 w-8 p-0"
                  title="Gráfico de Pizza"
                >
                  <PieChartIcon className="h-4 w-4" />
                </Button>
                <Button 
                  variant={pieChartType === 'donut' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setPieChartType('donut')}
                  className="h-8 w-8 p-0"
                  title="Gráfico de Rosca"
                >
                  <div className="relative h-4 w-4 flex items-center justify-center">
                    <div className="absolute inset-0 border-2 border-current rounded-full" />
                  </div>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <defs>
                      {analytics.trafficSources.map((_, index) => (
                        <filter key={`shadow-${index}`} id={`shadow-${index}`} height="200%">
                          <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.5" />
                        </filter>
                      ))}
                    </defs>
                    <Pie
                      data={analytics.trafficSources}
                      cx="50%"
                      cy="50%"
                      innerRadius={pieChartType === 'donut' ? 60 : 0}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="source"
                      stroke="none"
                    >
                      {analytics.trafficSources.map((_, index) => (
                        <Cell 
                          key={index} 
                          fill={CHART_COLORS[index % CHART_COLORS.length]} 
                          style={{ 
                            filter: `url(#shadow-${index})`,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{...customTooltipStyle, border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'}}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value, entry: any) => (
                        <span className="text-xs font-medium text-muted-foreground">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Central overlay for semi-3D donut effect */}
                {pieChartType === 'donut' && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110px] h-[110px] rounded-full bg-background/20 backdrop-blur-sm border border-white/5 pointer-events-none flex items-center justify-center shadow-inner">
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total</p>
                      <p className="text-lg font-bold text-foreground">
                        {analytics.trafficSources.reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {analytics?.devices && analytics.devices.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Dispositivos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.devices.map((d, i) => {
                  const Icon = deviceIcons[d.device] || Monitor;
                  const total = analytics.devices.reduce((s, x) => s + x.value, 0);
                  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{d.device}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {analytics?.hourlyTraffic && analytics.hourlyTraffic.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Tráfego por Hora</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.hourlyTraffic}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 15%)" />
                  <XAxis dataKey="hour" fontSize={10} stroke="hsl(215, 15%, 50%)" />
                  <YAxis fontSize={10} stroke="hsl(215, 15%, 50%)" />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Bar dataKey="views" fill="hsl(190, 100%, 50%)" radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {analytics?.topReferrers && analytics.topReferrers.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Principais Referências</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.topReferrers.map((ref, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{ref.referrer}</span>
                    </div>
                    <Badge variant="secondary" className="bg-accent/10 text-accent">{ref.visits}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {analytics?.countries && analytics.countries.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Países</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.countries.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                    <span className="text-sm text-foreground">{c.country}</span>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">{c.users} usuários</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {analytics?.categoryStats && analytics.categoryStats.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Acessos por Tema (Categoria)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.categoryStats.map((c, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground capitalize">{c.category}</span>
                      <span className="text-xs font-medium text-muted-foreground">{c.views.toLocaleString()} views ({c.percentage}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${c.percentage}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* AI Tips */}
      {tips.length > 0 && (
        <Card className="glass-card neon-border-lilac">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-warning" />
              <CardTitle className="text-lg text-foreground">Dicas da IA para Melhorar</CardTitle>
            </div>
            <CardDescription>Sugestões personalizadas baseadas nos dados de analytics e redes sociais</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                  <Badge className={priorityColors[tip.priority]} variant="secondary">
                    {tip.priority}
                  </Badge>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">{tip.category}</p>
                    <p className="text-sm text-foreground">{tip.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPageId && (
        <div className="flex justify-center mt-6">
          <Button 
            onClick={() => navigate('/analytics')} 
            variant="outline" 
            className="neon-border-lilac text-foreground hover:bg-secondary/40"
          >
            Ver métricas de todas as páginas
          </Button>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
