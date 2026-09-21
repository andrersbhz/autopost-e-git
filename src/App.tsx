import { useEffect, lazy, Suspense, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import Preloader from "@/components/Preloader";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import BrandThemeRuntime from "@/components/BrandThemeRuntime";
import { refreshGeoLangInBackground } from "@/lib/geo-language";

/** Lazy com 1 retry — evita tela branca quando um chunk falha por rede/deploy. */
const lazyRetry = (factory: () => Promise<any>) =>
  lazy(() =>
    factory().catch(
      () => new Promise((resolve) => setTimeout(resolve, 800)).then(factory)
    )
  );

const DashboardLayout = lazyRetry(() => import("@/components/DashboardLayout"));
const Auth = lazyRetry(() => import("@/pages/Auth"));
const Dashboard = lazyRetry(() => import("@/pages/Dashboard"));
const ArticlesPage = lazyRetry(() => import("@/pages/ArticlesPage"));
const TrendsPage = lazyRetry(() => import("@/pages/TrendsPage"));
const TrendDetailPage = lazyRetry(() => import("@/pages/TrendDetailPage"));
const SchedulePage = lazyRetry(() => import("@/pages/SchedulePage"));
const SettingsPage = lazyRetry(() => import("@/pages/SettingsPage"));
const AnalyticsPage = lazyRetry(() => import("@/pages/AnalyticsPage"));
const SocialRobotPage = lazyRetry(() => import("@/pages/SocialRobotPage"));
const SocialPublisherPage = lazyRetry(() => import("@/pages/SocialPublisherPage"));
const GooglePage = lazyRetry(() => import("@/pages/GooglePage"));
const MetaPage = lazyRetry(() => import("@/pages/MetaPage"));
const InstagramPage = lazyRetry(() => import("@/pages/InstagramPage"));
const ThreadsPage = lazyRetry(() => import("@/pages/ThreadsPage"));
const RepliesPage = lazyRetry(() => import("@/pages/RepliesPage"));
const MapPage = lazyRetry(() => import("@/pages/MapPage"));
const ProfilePage = lazyRetry(() => import("@/pages/ProfilePage"));
const ImageStudioPage = lazyRetry(() => import("@/pages/ImageStudioPage"));
const SalesPage = lazyRetry(() => import("@/pages/SalesPage"));
const BrandingPage = lazyRetry(() => import("@/pages/BrandingPage"));
const PaymentMethodsPage = lazyRetry(() => import("@/pages/PaymentMethodsPage"));
const AdminSalesPage = lazyRetry(() => import("@/pages/AdminSalesPage"));
const LicenseActivatePage = lazyRetry(() => import("@/pages/LicenseActivatePage"));
const CheckoutReturnPage = lazyRetry(() => import("@/pages/CheckoutReturnPage"));
const AdminSystemPage = lazyRetry(() => import("@/pages/AdminSystemPage"));

const NexaLogin = lazyRetry(() => import("@/nexa/pages/NexaLogin"));
const NexaOnboarding = lazyRetry(() => import("@/nexa/pages/NexaOnboarding"));
const NexaDashboard = lazyRetry(() => import("@/nexa/pages/NexaDashboard"));
const NexaTeams = lazyRetry(() => import("@/nexa/pages/NexaTeams"));
const NexaAgents = lazyRetry(() => import("@/nexa/pages/NexaAgents"));
const NexaSettings = lazyRetry(() => import("@/nexa/pages/NexaSettings"));
const NexaAudit = lazyRetry(() => import("@/nexa/pages/NexaAudit"));
const NexaAdmin = lazyRetry(() => import("@/nexa/pages/NexaAdmin"));
const NexaPlaceholder = lazyRetry(() => import("@/nexa/pages/NexaPlaceholder"));
const ProtectedNexaRoute = lazyRetry(() => import("@/nexa/components/ProtectedNexaRoute"));

const NotFound = lazyRetry(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <Preloader message="Validando acesso..." />;
  if (!user) return <Navigate to="/auth" replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
};

const AuthRoute = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate('/admin', { replace: true });
  }, [user, loading, navigate]);

  if (loading) return <Preloader message="Autenticando..." />;
  return <Auth />;
};

const RootRoute = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { refreshGeoLangInBackground(); }, []);
  useEffect(() => {
    if (!loading && user) navigate('/admin', { replace: true });
  }, [user, loading, navigate]);

  if (loading) return <Preloader message="Carregando..." />;
  return <SalesPage />;
};

const PresenceTracker = () => {
  useOnlinePresence();
  return null;
};

const AppContent = () => {
  const { settings } = usePlatformSettings();

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        {settings.google_site_verification && (
          <Helmet>
            <meta name="google-site-verification" content={settings.google_site_verification} />
          </Helmet>
        )}
        <ThemeProvider defaultTheme="dark" storageKey="a3-dashboard-theme">
          <BrandThemeRuntime />
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <PresenceTracker />
                <Suspense fallback={<Preloader message="Carregando..." />}>
                  <Routes>
                    <Route path="/" element={<RootRoute />} />
                    <Route path="/vendas" element={<SalesPage />} />
                    <Route path="/pricing" element={<SalesPage />} />
                    <Route path="/auth" element={<AuthRoute />} />
                    <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/articles" element={<ProtectedRoute><ArticlesPage /></ProtectedRoute>} />
                    <Route path="/trends" element={<ProtectedRoute><TrendsPage /></ProtectedRoute>} />
                    <Route path="/trends/:trendId" element={<ProtectedRoute><TrendDetailPage /></ProtectedRoute>} />
                    <Route path="/schedule" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
                    <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
                    <Route path="/robot" element={<ProtectedRoute><SocialRobotPage /></ProtectedRoute>} />
                    <Route path="/social" element={<ProtectedRoute><SocialPublisherPage /></ProtectedRoute>} />
                    <Route path="/google" element={<ProtectedRoute><GooglePage /></ProtectedRoute>} />
                    <Route path="/meta" element={<ProtectedRoute><MetaPage /></ProtectedRoute>} />
                    <Route path="/instagram" element={<ProtectedRoute><InstagramPage /></ProtectedRoute>} />
                    <Route path="/threads" element={<ProtectedRoute><ThreadsPage /></ProtectedRoute>} />
                    <Route path="/replies" element={<ProtectedRoute><RepliesPage /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                    <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    <Route path="/image-studio" element={<ProtectedRoute><ImageStudioPage /></ProtectedRoute>} />
                    <Route path="/branding" element={<ProtectedRoute><BrandingPage /></ProtectedRoute>} />
                    <Route path="/payment-methods" element={<ProtectedRoute><PaymentMethodsPage /></ProtectedRoute>} />
                    <Route path="/admin-sales" element={<ProtectedRoute><AdminSalesPage /></ProtectedRoute>} />
                    <Route path="/license" element={<LicenseActivatePage />} />
                    <Route path="/ativar" element={<LicenseActivatePage />} />
                    <Route path="/checkout/return" element={<CheckoutReturnPage />} />
                    <Route path="/admin/system" element={<ProtectedRoute><AdminSystemPage /></ProtectedRoute>} />
                    <Route path="/nexa" element={<Navigate to="/nexa/dashboard" replace />} />
                    <Route path="/nexa/login" element={<NexaLogin />} />
                    <Route path="/nexa/onboarding" element={<ProtectedNexaRoute><NexaOnboarding /></ProtectedNexaRoute>} />
                    <Route path="/nexa/dashboard" element={<ProtectedNexaRoute><NexaDashboard /></ProtectedNexaRoute>} />
                    <Route path="/nexa/teams" element={<ProtectedNexaRoute><NexaTeams /></ProtectedNexaRoute>} />
                    <Route path="/nexa/agents" element={<ProtectedNexaRoute><NexaAgents /></ProtectedNexaRoute>} />
                    <Route path="/nexa/settings" element={<ProtectedNexaRoute><NexaSettings /></ProtectedNexaRoute>} />
                    <Route path="/nexa/audit" element={<ProtectedNexaRoute roles={["org_admin","auditor"]}><NexaAudit /></ProtectedNexaRoute>} />
                    <Route path="/nexa/admin" element={<ProtectedNexaRoute roles={["super_admin"]}><NexaAdmin /></ProtectedNexaRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
};

const App = () => (
  <AppErrorBoundary>
    <AppContent />
  </AppErrorBoundary>
);

export default App;
