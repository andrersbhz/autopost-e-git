import { useState } from "react";
import { useNexaOrg } from "@/nexa/hooks/useNexaOrg";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { logAudit } from "@/nexa/lib/auditLog";

export default function NexaSettings() {
  const { activeOrg, refresh, hasRole } = useNexaOrg();
  const { toast } = useToast();
  const [name, setName] = useState(activeOrg?.name ?? "");
  const [saving, setSaving] = useState(false);

  const canEdit = hasRole(["org_admin"]);

  if (!activeOrg) return null;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("nexa_organizations")
      .update({ name: name.trim() })
      .eq("id", activeOrg.id);
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await logAudit({ organizationId: activeOrg.id, action: "organization.updated", metadata: { name } });
    toast({ title: "Salvo" });
    refresh();
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-lime-400 mb-1">Empresa</p>
        <h1 className="text-2xl font-bold text-slate-50">Configurações</h1>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-5">
        <div>
          <Label className="text-xs text-slate-400">Identificador</Label>
          <Input value={activeOrg.slug} disabled className="bg-slate-950 border-slate-800 mt-1 text-slate-500" />
        </div>
        <div>
          <Label className="text-xs text-slate-400">Nome da empresa</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit}
            className="bg-slate-950 border-slate-700 mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-slate-400">Segmento</Label>
            <Input value={activeOrg.segment} disabled className="bg-slate-950 border-slate-800 mt-1 text-slate-500" />
          </div>
          <div>
            <Label className="text-xs text-slate-400">Plano</Label>
            <Input value={`${activeOrg.plan} (${activeOrg.status})`} disabled className="bg-slate-950 border-slate-800 mt-1 text-slate-500" />
          </div>
        </div>
        {canEdit && (
          <Button onClick={save} disabled={saving} className="bg-lime-400 text-slate-950 hover:bg-lime-300">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar alterações
          </Button>
        )}
        {!canEdit && (
          <p className="text-xs text-slate-500">Apenas administradores podem alterar estes dados.</p>
        )}
      </div>
    </div>
  );
}
