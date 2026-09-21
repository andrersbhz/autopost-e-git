import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { NexaOrgProvider, useNexaOrg, NexaRole } from "@/nexa/hooks/useNexaOrg";
import NexaLayout from "./NexaLayout";

function Gate({ children, roles }: { children: ReactNode; roles?: NexaRole[] }) {
  const { loading, memberships, activeOrg, hasRole } = useNexaOrg();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
      </div>
    );
  }

  // No org — force onboarding unless already there
  if (memberships.length === 0 && location.pathname !== "/nexa/onboarding") {
    return <Navigate to="/nexa/onboarding" replace />;
  }

  if (roles && activeOrg && !hasRole(roles)) {
    return (
      <NexaLayout>
        <div className="max-w-md mx-auto text-center py-20">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-slate-100 mb-2">Sem permissão</h2>
          <p className="text-slate-400 text-sm">Esta área é restrita a outros papéis na empresa.</p>
        </div>
      </NexaLayout>
    );
  }

  // Onboarding renders without sidebar
  if (location.pathname === "/nexa/onboarding") {
    return <>{children}</>;
  }

  return <NexaLayout>{children}</NexaLayout>;
}

export default function ProtectedNexaRoute({
  children, roles,
}: { children: ReactNode; roles?: NexaRole[] }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/nexa/login" replace />;
  return (
    <NexaOrgProvider>
      <Gate roles={roles}>{children}</Gate>
    </NexaOrgProvider>
  );
}
