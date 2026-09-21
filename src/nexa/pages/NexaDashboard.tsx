import { useEffect, useState } from "react";
import { useNexaOrg } from "@/nexa/hooks/useNexaOrg";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCircle, Building2, ShieldCheck, MessageSquare, Activity } from "lucide-react";

interface Stat { label: string; value: number | string; icon: any; hint: string; }

export default function NexaDashboard() {
  const { activeOrg, role } = useNexaOrg();
  const [stats, setStats] = useState({ teams: 0, members: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeOrg) return;
    setLoading(true);
    Promise.all([
      supabase.from("nexa_teams").select("id", { count: "exact", head: true }).eq("organization_id", activeOrg.id),
      supabase.from("nexa_organization_members").select("id", { count: "exact", head: true }).eq("organization_id", activeOrg.id).eq("status", "active"),
    ]).then(([t, m]) => {
      setStats({ teams: t.count ?? 0, members: m.count ?? 0 });
      setLoading(false);
    });
  }, [activeOrg]);

  if (!activeOrg) return null;

  const cards: Stat[] = [
    { label: "Equipes", value: stats.teams, icon: Users, hint: "ativas na empresa" },
    { label: "Membros", value: stats.members, icon: UserCircle, hint: "com acesso" },
    { label: "Atendimentos", value: "—", icon: MessageSquare, hint: "disponível na Etapa 2" },
    { label: "Score médio", value: "—", icon: ShieldCheck, hint: "disponível na Etapa 3" },
    { label: "Health Score", value: "—", icon: Activity, hint: "disponível na Etapa 4" },
    { label: "Plano", value: activeOrg.plan, icon: Building2, hint: activeOrg.status },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-wider text-lime-400 mb-1">Dashboard</p>
        <h1 className="text-2xl font-bold text-slate-50">Bem-vindo, {activeOrg.name}</h1>
        <p className="text-sm text-slate-400 mt-1">
          Visão geral da operação. Seu papel atual: <span className="text-lime-300 font-medium">{role?.replace("_", " ")}</span>.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wider text-slate-400">{c.label}</span>
                <Icon className="h-4 w-4 text-lime-400" />
              </div>
              <div className="text-3xl font-bold text-slate-50">
                {loading ? <span className="inline-block h-8 w-12 bg-slate-800 rounded animate-pulse" /> : c.value}
              </div>
              <div className="text-xs text-slate-500 mt-1">{c.hint}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Próximas etapas</h3>
        <ul className="space-y-2 text-sm text-slate-400">
          <li>• <span className="text-slate-200">Etapa 2:</span> upload de áudio, texto e central de atendimentos.</li>
          <li>• <span className="text-slate-200">Etapa 3:</span> transcrição, análise por IA e cálculo de scorecards.</li>
          <li>• <span className="text-slate-200">Etapa 4:</span> Health Score, alertas, feedbacks e relatórios.</li>
          <li>• <span className="text-slate-200">Etapa 5:</span> pesquisa semântica e assistente Insight.</li>
          <li>• <span className="text-slate-200">Etapa 6:</span> webhooks, integrações e controle de consumo.</li>
        </ul>
      </div>
    </div>
  );
}
