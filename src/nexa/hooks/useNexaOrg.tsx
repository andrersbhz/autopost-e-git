import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type NexaRole =
  | "super_admin" | "org_admin" | "manager" | "supervisor"
  | "quality_analyst" | "agent" | "auditor";

export interface NexaOrganization {
  id: string;
  name: string;
  slug: string;
  segment: string;
  plan: string;
  status: string;
  logo_url: string | null;
}

export interface NexaMembership extends NexaOrganization {
  role: NexaRole;
}

interface Ctx {
  loading: boolean;
  memberships: NexaMembership[];
  activeOrg: NexaMembership | null;
  setActiveOrg: (orgId: string) => Promise<void>;
  refresh: () => Promise<void>;
  role: NexaRole | null;
  hasRole: (roles: NexaRole[]) => boolean;
}

const NexaOrgContext = createContext<Ctx | undefined>(undefined);

export function NexaOrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<NexaMembership[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setMemberships([]); setActiveOrgId(null); setLoading(false); return;
    }
    setLoading(true);
    const { data: mems } = await supabase
      .from("nexa_organization_members")
      .select("role, organization_id, nexa_organizations!inner(id,name,slug,segment,plan,status,logo_url)")
      .eq("user_id", user.id)
      .eq("status", "active");

    const list: NexaMembership[] = (mems ?? []).map((m: any) => ({
      ...m.nexa_organizations,
      role: m.role as NexaRole,
    }));
    setMemberships(list);

    const { data: profile } = await supabase
      .from("nexa_profiles")
      .select("active_organization_id")
      .eq("id", user.id)
      .maybeSingle();

    let active = profile?.active_organization_id ?? null;
    if (!active || !list.find((m) => m.id === active)) {
      active = list[0]?.id ?? null;
    }
    setActiveOrgId(active);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const setActiveOrg = useCallback(async (orgId: string) => {
    if (!user) return;
    setActiveOrgId(orgId);
    await supabase.from("nexa_profiles")
      .upsert({ id: user.id, active_organization_id: orgId }, { onConflict: "id" });
  }, [user]);

  const activeOrg = memberships.find((m) => m.id === activeOrgId) ?? null;
  const role = activeOrg?.role ?? null;

  const hasRole = useCallback((roles: NexaRole[]) => {
    if (!role) return false;
    if (role === "super_admin") return true;
    return roles.includes(role);
  }, [role]);

  return (
    <NexaOrgContext.Provider value={{ loading, memberships, activeOrg, setActiveOrg, refresh: load, role, hasRole }}>
      {children}
    </NexaOrgContext.Provider>
  );
}

export function useNexaOrg() {
  const ctx = useContext(NexaOrgContext);
  if (!ctx) throw new Error("useNexaOrg must be used within NexaOrgProvider");
  return ctx;
}
