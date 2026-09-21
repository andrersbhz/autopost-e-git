import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/theme-provider';
import {
  LayoutDashboard, FileText, Settings, TrendingUp, Clock, LogOut, Newspaper, Menu, X,
  Sparkles, Loader2, Bot, Activity, Globe, Download, Search, Facebook, Instagram, AtSign,
  User, Sun, Moon, ImageIcon, Palette, Wallet, Bell, Send, MessagesSquare,
} from 'lucide-react';
import { useLicenseSessionGuard } from '@/hooks/useLicenseSessionGuard';
import { getPerformanceLogs, exportLogsToCSV } from '@/lib/performance';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/backend';
import SpaceBackground from './SpaceBackground';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import a3Logo from '@/assets/a3-logo.jpg';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: FileText, label: 'Artigos', path: '/articles' },
  { icon: ImageIcon, label: 'Estúdio de Imagens', path: '/image-studio' },
  { icon: Send, label: 'Publicador Social', path: '/social' },
  { icon: Search, label: 'Google', path: '/google' },
  { icon: Facebook, label: 'Facebook', path: '/meta' },
  { icon: Instagram, label: 'Instagram', path: '/instagram' },
  { icon: AtSign, label: 'Threads', path: '/threads' },
  { icon: TrendingUp, label: 'Tendências', path: '/trends' },
  { icon: Bot, label: 'Robô Social', path: '/robot' },
  { icon: MessagesSquare, label: 'Central de Respostas', path: '/replies' },
  { icon: Activity, label: 'Analytics', path: '/analytics' },
  { icon: Globe, label: 'Mapa Live', path: '/map' },
  { icon: Clock, label: 'Agendamentos', path: '/schedule' },
  { icon: Newspaper, label: 'Ver Página de Vendas', path: '/vendas' },
  { icon: User, label: 'Meu Perfil', path: '/profile' },
  { icon: Palette, label: 'Marca / Vendas', path: '/branding' },
  { icon: Wallet, label: 'Meios de Pagamento', path: '/payment-methods' },
  { icon: Bell, label: 'Vendas & Licenças', path: '/admin-sales' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
  { icon: Bot, label: 'Painel Admin', path: '/admin/system', adminOnly: true },
];

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  useLicenseSessionGuard(true);
  const { user, signOut, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const { toast } = useToast();
  const { settings: brand } = usePlatformSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [logCount, setLogCount] = useState(0);

  useEffect(() => {
    if (brand?.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = brand.favicon_url;
    }
    if (brand?.brand_name) document.title = brand.brand_name;
  }, [brand?.favicon_url, brand?.brand_name]);

  useEffect(() => {
    const handleLogAdded = () => setLogCount((prev) => prev + 1);
    window.addEventListener('performance-log-added', handleLogAdded);
    return () => window.removeEventListener('performance-log-added', handleLogAdded);
  }, []);

  const handleGlobalGenerate = async () => {
    if (!user || generating) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-articles', { body: { userId: user.id } });
      if (error) throw error;
      toast({
        title: data?.success ? 'Artigos gerados!' : 'Atenção',
        description: data?.message || 'A geração de artigos foi iniciada com sucesso.',
        variant: data?.success ? 'default' : 'destructive',
      });
      if (location.pathname === '/articles') window.dispatchEvent(new CustomEvent('refresh-articles'));
    } catch (error) {
      toast({ title: 'Erro ao gerar artigos', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => setSidebarOpen(false), [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const currentLabel = navItems.find((i) => i.path === location.pathname)?.label || 'Dashboard';
  const userInitial = (user?.email?.[0] || 'U').toUpperCase();

  return (
    <div className="min-h-screen flex relative">
      <SpaceBackground />
      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/75 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 inset-y-0 left-0 z-50 w-72 lg:w-64 h-screen bg-background/92 backdrop-blur-xl flex flex-col transition-transform duration-200 ease-out border-r border-border/60 shadow-xl',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        aria-label="Navegação principal"
      >
        <div className="px-4 py-4 flex items-center justify-between border-b border-border/60">
          <Link to="/admin" className="flex items-center gap-3 group min-w-0">
            <div className="h-11 w-11 shrink-0 rounded-lg overflow-hidden border border-border/60 bg-card p-1.5">
              <img src={brand?.logo_url || a3Logo} alt={brand?.brand_name || 'Logo'} className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <span className="block font-semibold text-sm tracking-tight text-foreground truncate">{brand?.brand_name || 'A3 PostWP'}</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Publishing Suite</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.filter(item => !item.adminOnly || isAdmin).map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] nav-link',
                  active
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-[17px] w-[17px] shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-background" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border/60 space-y-2">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/50 border border-border/50">
              <div className="h-9 w-9 rounded-lg bg-foreground flex items-center justify-center text-background font-semibold text-sm shrink-0">{userInitial}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">{user.email}</p>
                <p className="text-[10px] text-muted-foreground">Conta ativa</p>
              </div>
            </div>
          )}
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}><LogOut className="h-4 w-4" />Sair</Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/60 px-4 lg:px-8 h-14 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden -ml-1 p-2 rounded-lg hover:bg-muted text-foreground transition-colors" aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="font-semibold text-sm text-foreground truncate">{currentLabel}</h2>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Popover>
              <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Activity className="h-4 w-4" /></Button></PopoverTrigger>
              <PopoverContent className="w-80 p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h4 className="font-semibold text-xs">Monitor de Performance</h4>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => exportLogsToCSV()} title="Exportar CSV"><Download className="h-3 w-3" /></Button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {getPerformanceLogs().length === 0 ? (
                      <p className="text-xs text-muted-foreground">Aguardando métricas...</p>
                    ) : (
                      getPerformanceLogs().slice().reverse().map((log, i) => (
                        <div key={i} className="flex justify-between items-center gap-2 text-xs bg-muted/40 p-2 rounded-md">
                          <span className="truncate font-medium">{log.label}</span>
                          <span className={cn('font-semibold tabular-nums shrink-0', log.duration > 1000 ? 'text-destructive' : log.duration > 500 ? 'text-warning' : 'text-success')}>{log.duration}ms</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={handleGlobalGenerate} disabled={generating} size="sm">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>{generating ? 'Gerando...' : 'Ligar Robô'}</span>
            </Button>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-success/5 border border-success/20">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              <span className="text-[11px] font-medium text-success">Online</span>
            </div>
          </div>
        </header>
        <div className="p-4 sm:p-6 lg:p-8 animate-fade-in flex-1">
          <div className="page-container">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
