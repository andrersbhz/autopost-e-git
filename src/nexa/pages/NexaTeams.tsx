import { useEffect, useState, useCallback } from "react";
import { useNexaOrg } from "@/nexa/hooks/useNexaOrg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Trash2, Loader2 } from "lucide-react";
import { logAudit } from "@/nexa/lib/auditLog";

interface Team {
  id: string; name: string; description: string | null; color: string | null;
  created_at: string;
}

export default function NexaTeams() {
  const { activeOrg, hasRole } = useNexaOrg();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canEdit = hasRole(["org_admin", "manager"]);

  const load = useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    const { data } = await supabase
      .from("nexa_teams")
      .select("id,name,description,color,created_at")
      .eq("organization_id", activeOrg.id)
      .order("name");
    setTeams(data ?? []);
    setLoading(false);
  }, [activeOrg]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!activeOrg || !name.trim()) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("nexa_teams").insert({
      organization_id: activeOrg.id, name: name.trim(),
      description: description.trim() || null, created_by: user?.id,
    });
    setSubmitting(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await logAudit({ organizationId: activeOrg.id, action: "team.created", metadata: { name } });
    setName(""); setDescription(""); setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta equipe?")) return;
    const { error } = await supabase.from("nexa_teams").delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await logAudit({ organizationId: activeOrg!.id, action: "team.deleted", entityType: "team", entityId: id });
    load();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-lime-400 mb-1">Estrutura</p>
          <h1 className="text-2xl font-bold text-slate-50">Equipes</h1>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-lime-400 text-slate-950 hover:bg-lime-300">
                <Plus className="h-4 w-4 mr-1" /> Nova equipe
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
              <DialogHeader>
                <DialogTitle>Nova equipe</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Nome *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-slate-950 border-slate-700 mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Descrição</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="bg-slate-950 border-slate-700 mt-1" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={create} disabled={submitting || !name.trim()} className="bg-lime-400 text-slate-950 hover:bg-lime-300">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-900/60 border border-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 border border-dashed border-slate-800 rounded-xl">
          <Users className="h-12 w-12 text-slate-700 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-300">Nenhuma equipe ainda</h3>
          <p className="text-sm text-slate-500 mt-1">Crie a primeira equipe para organizar seus atendentes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t) => (
            <div key={t.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-lime-400/30 transition">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-lime-400" />
                  <h3 className="font-semibold text-slate-100">{t.name}</h3>
                </div>
                {canEdit && (
                  <button onClick={() => remove(t.id)} className="text-slate-500 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-400 line-clamp-3 min-h-[40px]">
                {t.description || <span className="italic text-slate-600">Sem descrição</span>}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
