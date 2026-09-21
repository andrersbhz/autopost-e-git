import { useEffect, useState } from "react";
import { useNexaOrg } from "@/nexa/hooks/useNexaOrg";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Crown } from "lucide-react";

export default function NexaAdmin() {
  const { hasRole } = useNexaOrg();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasRole(["super_admin"])) { setLoading(false); return; }
    supabase
      .from("nexa_organizations")
      .select("id,name,slug,segment,plan,status,created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrgs(data ?? []);
        setLoading(false);
      });
  }, [hasRole]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Crown className="h-6 w-6 text-lime-400" />
        <div>
          <p className="text-xs uppercase tracking-wider text-lime-400">Plataforma</p>
          <h1 className="text-2xl font-bold text-slate-50">Super Admin</h1>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Empresa</TableHead>
              <TableHead className="text-slate-400">Segmento</TableHead>
              <TableHead className="text-slate-400">Plano</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Criada em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-10">Carregando...</TableCell></TableRow>
            ) : orgs.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-10">Nenhuma empresa visível</TableCell></TableRow>
            ) : orgs.map((o) => (
              <TableRow key={o.id} className="border-slate-800 hover:bg-slate-800/20">
                <TableCell className="text-slate-200">{o.name}</TableCell>
                <TableCell className="text-slate-400 text-sm">{o.segment}</TableCell>
                <TableCell className="text-slate-400 text-sm">{o.plan}</TableCell>
                <TableCell>
                  <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">{o.status}</span>
                </TableCell>
                <TableCell className="text-slate-500 text-xs">
                  {new Date(o.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
