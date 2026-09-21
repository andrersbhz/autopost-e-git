import { useEffect, useState, useCallback } from "react";
import { useNexaOrg, NexaRole } from "@/nexa/hooks/useNexaOrg";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserCircle } from "lucide-react";
import { logAudit } from "@/nexa/lib/auditLog";

const ROLES: NexaRole[] = [
  "org_admin", "manager", "supervisor", "quality_analyst", "agent", "auditor",
];

interface Row {
  member_id: string;
  user_id: string;
  role: NexaRole;
  status: string;
  email: string | null;
  full_name: string | null;
}

export default function NexaAgents() {
  const { activeOrg, hasRole } = useNexaOrg();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const canEdit = hasRole(["org_admin"]);

  const load = useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    const { data: members } = await supabase
      .from("nexa_organization_members")
      .select("id,user_id,role,status")
      .eq("organization_id", activeOrg.id);

    if (!members) { setRows([]); setLoading(false); return; }

    const userIds = members.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("nexa_profiles_public")
      .select("id,full_name")
      .in("id", userIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    setRows(members.map((m) => ({
      member_id: m.id,
      user_id: m.user_id,
      role: m.role as NexaRole,
      status: m.status,
      email: null,
      full_name: profileMap.get(m.user_id)?.full_name ?? null,
    })));
    setLoading(false);
  }, [activeOrg]);

  useEffect(() => { load(); }, [load]);

  const changeRole = async (memberId: string, newRole: NexaRole) => {
    const { error } = await supabase
      .from("nexa_organization_members")
      .update({ role: newRole })
      .eq("id", memberId);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await logAudit({ organizationId: activeOrg!.id, action: "member.role_changed", entityType: "member", entityId: memberId, metadata: { new_role: newRole } });
    toast({ title: "Papel atualizado" });
    load();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-lime-400 mb-1">Estrutura</p>
        <h1 className="text-2xl font-bold text-slate-50">Membros & atendentes</h1>
        <p className="text-sm text-slate-400 mt-1">
          {canEdit ? "Gerencie papéis e acessos." : "Apenas administradores podem alterar papéis."}
        </p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Nome</TableHead>
              <TableHead className="text-slate-400">Papel</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} className="text-center text-slate-500 py-10">Carregando...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-10">
                <UserCircle className="h-10 w-10 text-slate-700 mx-auto mb-2" />
                <span className="text-slate-500">Nenhum membro</span>
              </TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.member_id} className="border-slate-800 hover:bg-slate-800/30">
                <TableCell className="text-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                      {(r.full_name ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                    <span>{r.full_name ?? "(sem nome)"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {canEdit ? (
                    <Select value={r.role} onValueChange={(v) => changeRole(r.member_id, v as NexaRole)}>
                      <SelectTrigger className="w-44 bg-slate-950 border-slate-700 text-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>{role.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-slate-300">{r.role.replace("_", " ")}</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded ${
                    r.status === "active" ? "bg-lime-400/10 text-lime-300" : "bg-slate-800 text-slate-400"
                  }`}>{r.status}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
