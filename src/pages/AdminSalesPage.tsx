import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Bell, Copy, Send, RefreshCw, KeyRound, FileCheck2, CheckCircle2, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Sale = {
  id: string;
  buyer_email: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  plan: string;
  amount_cents: number;
  currency: string;
  payment_method: string;
  status: string;
  license_id: string | null;
  created_at: string;
  read_at: string | null;
  delivered_at: string | null;
  proof_url: string | null;
  admin_note: string | null;
};

type License = {
  id: string;
  license_key: string;
  plan: string;
  status: string;
  user_id: string | null;
};

export default function AdminSalesPage() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [licensesById, setLicensesById] = useState<Record<string, License>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("sale_notifications").select("*").order("created_at", { ascending: false }).limit(100);
    setSales((data || []) as Sale[]);
    const ids = (data || []).map((s: any) => s.license_id).filter(Boolean);
    if (ids.length) {
      const { data: lics } = await supabase.from("license_keys").select("id,license_key,plan,status,user_id").in("id", ids);
      const map: Record<string, License> = {};
      (lics || []).forEach((l: any) => { map[l.id] = l; });
      setLicensesById(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("nexa_organization_members")
        .select("role").eq("user_id", user.id).eq("role", "super_admin").eq("status", "active").maybeSingle();
      setIsAdmin(!!data);
      if (data) await load();
    })();
  }, [user]);

  // Realtime: new sales
  useEffect(() => {
    if (!isAdmin) return;
    const ch = supabase.channel("sales-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "sale_notifications" }, () => {
        load();
        try { new Audio("data:audio/wav;base64,UklGRhwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=").play(); } catch {}
        toast("🔔 Nova atividade em vendas");
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin]);

  const generateLicense = async (sale: Sale) => {
    const { data: keyData } = await supabase.rpc("generate_license_key");
    const licenseKey = keyData as string;
    const { data: newLic, error } = await supabase.from("license_keys").insert({
      license_key: licenseKey, plan: sale.plan, status: "active", notes: `Venda ${sale.id}`,
    }).select().single();
    if (error || !newLic) return toast.error("Erro ao gerar chave: " + error?.message);
    await supabase.from("sale_notifications").update({ license_id: newLic.id, status: "paid" }).eq("id", sale.id);
    toast.success("Chave gerada: " + licenseKey);
    supabase.functions.invoke("send-sale-notifications", { body: { saleId: sale.id } }).catch(() => {});
    load();
  };

  const confirmManualPix = async (sale: Sale) => {
    const { data, error } = await supabase.rpc("admin_confirm_pix_sale" as any, { p_sale_id: sale.id, p_period_days: 30 });
    if (error) return toast.error("Erro: " + error.message);
    const res = data as any;
    if (!res?.ok) return toast.error("Falhou: " + (res?.error || "desconhecido"));
    toast.success("Pagamento confirmado! Chave: " + res.license_key);
    supabase.functions.invoke("send-sale-notifications", { body: { saleId: sale.id } }).catch(() => {});
    load();
  };

  const changeStatus = async (id: string, status: string) => {
    await supabase.from("sale_notifications").update({ status }).eq("id", id);
    toast.success("Status atualizado");
    load();
  };

  const viewProof = async (proofUrl: string) => {
    // proof stored as `payment-proofs://<path>`
    const path = proofUrl.replace(/^payment-proofs:\/\//, "");
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60 * 10);
    if (error || !data?.signedUrl) return toast.error("Não foi possível abrir o comprovante");
    window.open(data.signedUrl, "_blank");
  };

  const markDelivered = async (id: string) => {
    await supabase.from("sale_notifications").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const copyKey = (k: string) => { navigator.clipboard.writeText(k); toast.success("Chave copiada"); };

  if (authLoading) return <div className="min-h-screen bg-[#0b1020] flex items-center justify-center"><Loader2 className="animate-spin text-[#a3ff12]" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin === false) return <Navigate to="/admin" replace />;

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    awaiting_confirmation: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    paid: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    delivered: "bg-green-500/20 text-green-300 border-green-500/40",
    cancelled: "bg-red-500/20 text-red-300 border-red-500/40",
  };
  const STATUSES = ["pending", "awaiting_confirmation", "paid", "delivered", "cancelled"];

  return (
    <div className="min-h-screen bg-[#0b1020] text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3"><Bell className="text-[#a3ff12]" /> Vendas & Licenças</h1>
            <p className="text-white/60 mt-1">Feed em tempo real. Confirme o pagamento, gere a chave e envie ao cliente.</p>
          </div>
          <Button variant="outline" onClick={load} className="border-white/20 bg-white/5"><RefreshCw className="w-4 h-4 mr-2" /> Atualizar</Button>
        </header>

        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#a3ff12]" /></div> : sales.length === 0 ? (
          <Card className="bg-[#141a2e] border-white/10"><CardContent className="py-16 text-center text-white/60">Nenhuma venda ainda. Quando um cliente iniciar um checkout Pix, aparecerá aqui.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {sales.map(s => {
              const lic = s.license_id ? licensesById[s.license_id] : null;
              return (
                <Card key={s.id} className="bg-[#141a2e] border-white/10">
                  <CardHeader className="flex flex-row items-start justify-between pb-3">
                    <div>
                      <CardTitle className="text-lg">{s.buyer_name || s.buyer_email}</CardTitle>
                      <p className="text-sm text-white/50">{s.buyer_email} · {s.buyer_phone || "—"}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={statusColor[s.status] || ""}>{s.status}</Badge>
                      <p className="text-xs text-white/40 mt-1">{new Date(s.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-4 gap-4 items-end">
                    <div><p className="text-xs text-white/40">Plano</p><p className="font-bold text-[#a3ff12]">{s.plan}</p></div>
                    <div><p className="text-xs text-white/40">Valor</p><p className="font-bold">{(s.amount_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: s.currency })}</p></div>
                    <div><p className="text-xs text-white/40">Método</p><p className="font-bold uppercase">{s.payment_method}</p></div>
                    <div>
                      <p className="text-xs text-white/40">Alterar status</p>
                      <Select value={s.status} onValueChange={(v) => changeStatus(s.id, v)}>
                        <SelectTrigger className="bg-[#0b1020] border-white/10 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-4 flex flex-wrap gap-2 pt-2 border-t border-white/10">
                      {s.proof_url && (
                        <Button size="sm" variant="outline" onClick={() => viewProof(s.proof_url!)} className="border-[#a3ff12]/40 text-[#a3ff12] hover:bg-[#a3ff12]/10">
                          <FileCheck2 className="w-3 h-3 mr-1" /> Ver comprovante
                        </Button>
                      )}
                      {s.payment_method === "pix_manual" && !lic && (
                        <Button size="sm" onClick={() => confirmManualPix(s)} className="bg-[#a3ff12] text-black hover:bg-[#c8ff5c]">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Confirmar pagamento e gerar chave
                        </Button>
                      )}
                      {s.payment_method !== "pix_manual" && !lic && (
                        <Button size="sm" onClick={() => generateLicense(s)} className="bg-[#a3ff12] text-black hover:bg-[#c8ff5c]">
                          <KeyRound className="w-3 h-3 mr-1" /> Gerar chave
                        </Button>
                      )}
                      {lic && s.status !== "delivered" && (
                        <Button size="sm" onClick={() => markDelivered(s.id)} className="bg-green-500 text-black hover:bg-green-400">
                          <Send className="w-3 h-3 mr-1" /> Marcar enviado
                        </Button>
                      )}
                      {s.status !== "cancelled" && (
                        <Button size="sm" variant="outline" onClick={() => changeStatus(s.id, "cancelled")} className="border-red-500/40 text-red-300 hover:bg-red-500/10">
                          <XCircle className="w-3 h-3 mr-1" /> Cancelar
                        </Button>
                      )}
                    </div>

                    {lic && (
                      <div className="md:col-span-4 flex items-center gap-2 pt-2 border-t border-white/10">
                        <Input readOnly value={lic.license_key} className="bg-[#0b1020] border-white/10 font-mono" />
                        <Button size="icon" variant="outline" className="border-white/20" onClick={() => copyKey(lic.license_key)}><Copy className="w-4 h-4" /></Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
