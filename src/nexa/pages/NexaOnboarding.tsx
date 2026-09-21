import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useNexaOrg } from "@/nexa/hooks/useNexaOrg";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, Users, Sparkles, Check, ChevronRight, Database } from "lucide-react";
import { logAudit } from "@/nexa/lib/auditLog";

const SEGMENTS = [
  { id: "sales", label: "Vendas" },
  { id: "support", label: "Suporte" },
  { id: "collections", label: "Cobrança" },
  { id: "finance", label: "Financeiro" },
  { id: "health", label: "Saúde" },
  { id: "education", label: "Educação" },
  { id: "telecom", label: "Telecom" },
  { id: "other", label: "Outros" },
];

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50)
    + "-" + Math.random().toString(36).slice(2, 6);
}

export default function NexaOnboarding() {
  const { user } = useAuth();
  const { refresh, setActiveOrg } = useNexaOrg();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [segment, setSegment] = useState<string>("support");
  const [adminName, setAdminName] = useState("");
  const [teamsRaw, setTeamsRaw] = useState("Atendimento N1\nAtendimento N2\nVendas");
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);

  const createOrg = async () => {
    if (!user || !companyName.trim()) return;
    setLoading(true);
    try {
      const { data: org, error } = await supabase
        .from("nexa_organizations")
        .insert({
          name: companyName.trim(),
          slug: slugify(companyName),
          segment: segment as any,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: memErr } = await supabase
        .from("nexa_organization_members")
        .insert({ organization_id: org.id, user_id: user.id, role: "org_admin" });
      if (memErr) throw memErr;

      await supabase.from("nexa_profiles").upsert(
        { id: user.id, full_name: adminName || user.email, active_organization_id: org.id },
        { onConflict: "id" }
      );

      setCreatedOrgId(org.id);
      await logAudit({ organizationId: org.id, action: "organization.created", entityType: "organization", entityId: org.id });
      setStep(3);
    } catch (err: any) {
      toast({ title: "Erro ao criar empresa", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const createTeams = async () => {
    if (!createdOrgId) return;
    setLoading(true);
    try {
      const names = teamsRaw.split("\n").map((s) => s.trim()).filter(Boolean);
      if (names.length > 0) {
        const { error } = await supabase
          .from("nexa_teams")
          .insert(names.map((name) => ({ organization_id: createdOrgId, name, created_by: user!.id })));
        if (error) throw error;
      }
      await logAudit({ organizationId: createdOrgId, action: "teams.created", metadata: { count: names.length } });
      setStep(4);
    } catch (err: any) {
      toast({ title: "Erro ao criar equipes", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const seedDemo = async () => {
    if (!createdOrgId) return;
    setSeeding(true);
    try {
      const { error } = await supabase.functions.invoke("nexa-seed-demo", {
        body: { organization_id: createdOrgId },
      });
      if (error) throw error;
      toast({ title: "Dados de demonstração criados", description: "Equipes e atendentes fictícios adicionados." });
    } catch (err: any) {
      toast({ title: "Falha ao gerar demo", description: err.message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const finish = async () => {
    if (createdOrgId) await setActiveOrg(createdOrgId);
    await refresh();
    navigate("/nexa/dashboard");
  };

  const StepHeader = ({ n, title }: { n: number; title: string }) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-9 w-9 rounded-lg bg-lime-400 text-slate-950 font-bold flex items-center justify-center">{n}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-lime-400 flex items-center justify-center">
            <span className="text-slate-950 font-black">N</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configuração inicial</h1>
            <p className="text-sm text-slate-400">Etapa {step} de 4 — vamos preparar sua área</p>
          </div>
        </div>

        {/* progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((n) => (
            <div key={n}
              className={`h-1 flex-1 rounded ${n <= step ? "bg-lime-400" : "bg-slate-800"}`} />
          ))}
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          {step === 1 && (
            <div>
              <StepHeader n={1} title="Dados da empresa" />
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-slate-300">Nome da empresa *</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                    className="bg-slate-950 border-slate-700 mt-1" placeholder="Ex: Acme Atendimentos" />
                </div>
                <div>
                  <Label className="text-xs text-slate-300">Seu nome</Label>
                  <Input value={adminName} onChange={(e) => setAdminName(e.target.value)}
                    className="bg-slate-950 border-slate-700 mt-1" placeholder="Nome completo" />
                </div>
                <div>
                  <Label className="text-xs text-slate-300">Segmento</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                    {SEGMENTS.map((s) => (
                      <button key={s.id} type="button" onClick={() => setSegment(s.id)}
                        className={`text-xs px-3 py-2 rounded-md border transition
                          ${segment === s.id
                            ? "bg-lime-400/10 border-lime-400/40 text-lime-300"
                            : "bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-600"}`}
                      >{s.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <Button onClick={() => setStep(2)} disabled={!companyName.trim()}
                  className="bg-lime-400 text-slate-950 hover:bg-lime-300">
                  Continuar <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <StepHeader n={2} title="Confirmar e criar" />
              <div className="bg-slate-950 border border-slate-800 rounded-md p-4 text-sm space-y-2 mb-4">
                <div className="flex justify-between"><span className="text-slate-400">Empresa</span><span>{companyName}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Segmento</span><span>{SEGMENTS.find(s => s.id === segment)?.label}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Seu papel</span><span className="text-lime-300">Administrador</span></div>
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)} className="text-slate-300">Voltar</Button>
                <Button onClick={createOrg} disabled={loading}
                  className="bg-lime-400 text-slate-950 hover:bg-lime-300">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Building2 className="h-4 w-4 mr-2" />}
                  Criar empresa
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <StepHeader n={3} title="Primeiras equipes" />
              <p className="text-xs text-slate-400 mb-3">Uma equipe por linha. Você pode adicionar/editar depois.</p>
              <Textarea value={teamsRaw} onChange={(e) => setTeamsRaw(e.target.value)}
                rows={6} className="bg-slate-950 border-slate-700" />
              <div className="flex justify-end mt-6">
                <Button onClick={createTeams} disabled={loading}
                  className="bg-lime-400 text-slate-950 hover:bg-lime-300">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
                  Criar equipes
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <StepHeader n={4} title="Pronto para começar" />
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 bg-slate-950 border border-slate-800 rounded-md p-4">
                  <Database className="h-5 w-5 text-lime-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Adicionar dados de demonstração</div>
                    <p className="text-xs text-slate-400 mt-1">
                      Cria atendentes fictícios para você explorar dashboards e relatórios.
                      As interações reais virão na Etapa 2.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={seedDemo} disabled={seeding}
                    className="border-lime-400/40 text-lime-300 hover:bg-lime-400/10">
                    {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-start gap-3 bg-slate-950 border border-slate-800 rounded-md p-4">
                  <Check className="h-5 w-5 text-lime-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Convidar usuários</div>
                    <p className="text-xs text-slate-400 mt-1">
                      Disponível em Configurações → Membros após o onboarding.
                    </p>
                  </div>
                </div>
              </div>
              <Button onClick={finish} className="w-full bg-lime-400 text-slate-950 hover:bg-lime-300 font-semibold">
                Ir para o Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
