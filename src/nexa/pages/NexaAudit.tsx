import { useEffect, useState } from "react";
import { useNexaOrg } from "@/nexa/hooks/useNexaOrg";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FileSearch } from "lucide-react";

interface AuditRow {
  id: string;
  action: string;
  entity_type: string | null;
  user_id: string | null;
  created_at: string;
  metadata: any;
}

export default function NexaAudit() {
  const { activeOrg } = useNexaOrg();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeOrg) return;
    setLoading(true);
    supabase
      .from("nexa_audit_logs")
      .select("id,action,entity_type,user_id,created_at,metadata")
      .eq("organization_id", activeOrg.id)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setRows((data ?? []) as AuditRow[]);
        setLoading(false);
      });
  }, [activeOrg]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-lime-400 mb-1">Conformidade</p>
        <h1 className="text-2xl font-bold text-slate-50">Auditoria</h1>
        <p className="text-sm text-slate-400 mt-1">Últimos 200 registros desta empresa.</p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Data</TableHead>
              <TableHead className="text-slate-400">Ação</TableHead>
              <TableHead className="text-slate-400">Entidade</TableHead>
              <TableHead className="text-slate-400">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-slate-500 py-10">Carregando...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12">
                <FileSearch className="h-10 w-10 text-slate-700 mx-auto mb-2" />
                <span className="text-slate-500 text-sm">Nenhum registro ainda.</span>
              </TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id} className="border-slate-800 hover:bg-slate-800/20">
                <TableCell className="text-slate-400 text-xs whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell className="text-slate-200 text-sm font-mono">{r.action}</TableCell>
                <TableCell className="text-slate-400 text-xs">{r.entity_type ?? "—"}</TableCell>
                <TableCell className="text-slate-500 text-xs max-w-md truncate">
                  {r.metadata && Object.keys(r.metadata).length ? JSON.stringify(r.metadata) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
