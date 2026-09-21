import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, KeyRound, Wallet, CreditCard, Bell, Zap } from "lucide-react";
import { maskPhoneBR, maskCpfCnpj } from "@/lib/masks";

type Config = {
  id?: string;
  pix_enabled: boolean;
  pix_key: string;
  pix_key_type: string;
  pix_owner_name: string;
  pix_owner_document: string;
  pix_bank: string;
  mercadopago_enabled: boolean;
  mercadopago_public_key: string;
  mercadopago_access_token: string;
  pagarme_enabled: boolean;
  pagarme_api_key: string;
  stripe_enabled: boolean;
  admin_notify_email: string;
  admin_notify_phone: string;
  admin_notify_whatsapp: boolean;
  notify_email_customer: boolean;
  notify_email_admin: boolean;
  notify_whatsapp_admin: boolean;
  notify_admin_whatsapp_number: string;
};

const EMPTY: Config = {
  pix_enabled: false, pix_key: "", pix_key_type: "email", pix_owner_name: "", pix_owner_document: "", pix_bank: "",
  mercadopago_enabled: false, mercadopago_public_key: "", mercadopago_access_token: "",
  pagarme_enabled: false, pagarme_api_key: "",
  stripe_enabled: false,
  admin_notify_email: "", admin_notify_phone: "", admin_notify_whatsapp: false,
  notify_email_customer: true, notify_email_admin: true, notify_whatsapp_admin: false, notify_admin_whatsapp_number: "",
};

export default function PaymentMethodsPage() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [cfg, setCfg] = useState<Config>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: memberships } = await supabase
        .from("nexa_organization_members")
        .select("role").eq("user_id", user.id).eq("role", "super_admin").eq("status", "active").maybeSingle();
      setIsAdmin(!!memberships);

      const { data } = await supabase.from("payment_methods_config").select("*").limit(1).maybeSingle();
      if (data) setCfg({ ...EMPTY, ...data } as Config);
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    setSaving(true);
    const payload = { ...cfg, singleton: true };
    delete (payload as any).id;
    const { error } = cfg.id
      ? await supabase.from("payment_methods_config").update(payload).eq("id", cfg.id)
      : await supabase.from("payment_methods_config").update(payload).eq("singleton", true);
    setSaving(false);
    if (error) return toast.error("Falha ao salvar: " + error.message);
    toast.success("Meios de pagamento atualizados");
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-[#0b1020]"><Loader2 className="animate-spin text-[#a3ff12]" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin === false) return <Navigate to="/admin" replace />;

  const set = <K extends keyof Config>(k: K, v: Config[K]) => setCfg((p) => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen bg-[#0b1020] text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-black tracking-tight">Meios de Pagamento</h1>
          <p className="text-white/60 mt-1">Configure Pix manual, Mercado Pago e Pagar.me. Notificações vão para o e-mail e telefone abaixo.</p>
        </header>

        {/* Pix */}
        <Card className="bg-[#141a2e] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg"><KeyRound className="text-[#a3ff12]" /> Pix (manual)</CardTitle>
            <Switch checked={cfg.pix_enabled} onCheckedChange={(v) => set("pix_enabled", v)} />
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div><Label>Tipo de chave</Label>
              <Select value={cfg.pix_key_type} onValueChange={(v) => set("pix_key_type", v)}>
                <SelectTrigger className="bg-[#0b1020] border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem><SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem><SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="random">Aleatória</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Chave Pix</Label><Input className="bg-[#0b1020] border-white/10" value={cfg.pix_key} onChange={(e) => {
              const v = e.target.value;
              if (cfg.pix_key_type === "cpf" || cfg.pix_key_type === "cnpj") set("pix_key", maskCpfCnpj(v));
              else if (cfg.pix_key_type === "phone") set("pix_key", maskPhoneBR(v));
              else set("pix_key", v);
            }} maxLength={140} /></div>
            <div><Label>Titular</Label><Input className="bg-[#0b1020] border-white/10" value={cfg.pix_owner_name} onChange={(e) => set("pix_owner_name", e.target.value)} maxLength={140} /></div>
            <div><Label>CPF/CNPJ do titular</Label><Input className="bg-[#0b1020] border-white/10" inputMode="numeric" value={cfg.pix_owner_document} onChange={(e) => set("pix_owner_document", maskCpfCnpj(e.target.value))} placeholder="000.000.000-00" maxLength={18} /></div>
            <div className="md:col-span-2"><Label>Banco</Label><Input className="bg-[#0b1020] border-white/10" value={cfg.pix_bank} onChange={(e) => set("pix_bank", e.target.value)} maxLength={80} /></div>
          </CardContent>
        </Card>

        {/* Mercado Pago */}
        <Card className="bg-[#141a2e] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg"><Wallet className="text-[#a3ff12]" /> Mercado Pago</CardTitle>
            <Switch checked={cfg.mercadopago_enabled} onCheckedChange={(v) => set("mercadopago_enabled", v)} />
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div><Label>Public Key</Label><Input className="bg-[#0b1020] border-white/10" value={cfg.mercadopago_public_key} onChange={(e) => set("mercadopago_public_key", e.target.value)} placeholder="APP_USR-..." /></div>
            <div><Label>Access Token</Label><Input className="bg-[#0b1020] border-white/10" type="password" value={cfg.mercadopago_access_token} onChange={(e) => set("mercadopago_access_token", e.target.value)} placeholder="APP_USR-..." /></div>
            <p className="md:col-span-2 text-xs text-white/50">Pegue em: mercadopago.com.br → Suas integrações → Credenciais de produção.</p>
          </CardContent>
        </Card>

        {/* Pagar.me */}
        <Card className="bg-[#141a2e] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg"><CreditCard className="text-[#a3ff12]" /> Pagar.me</CardTitle>
            <Switch checked={cfg.pagarme_enabled} onCheckedChange={(v) => set("pagarme_enabled", v)} />
          </CardHeader>
          <CardContent>
            <Label>API Key</Label>
            <Input className="bg-[#0b1020] border-white/10" type="password" value={cfg.pagarme_api_key} onChange={(e) => set("pagarme_api_key", e.target.value)} placeholder="sk_test_... ou sk_live_..." />
            <p className="text-xs text-white/50 mt-2">Pegue em: dashboard.pagar.me → Configurações → Chaves de API.</p>
          </CardContent>
        </Card>

        {/* Stripe (Cartão) */}
        <Card className="bg-[#141a2e] border-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg"><Zap className="text-[#a3ff12]" /> Stripe (Cartão)</CardTitle>
            <Switch checked={cfg.stripe_enabled} onCheckedChange={(v) => set("stripe_enabled", v)} />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-white/70">
              Habilite para exibir a aba <b>Cartão</b> no checkout. As chaves do Stripe são gerenciadas pelo Lovable Cloud —
              basta ativar a integração de pagamentos do projeto para começar a receber via cartão.
            </p>
            <p className="text-xs text-white/50 mt-2">Quando desligado, apenas Pix aparece para o cliente.</p>
          </CardContent>
        </Card>



        {/* Notificações */}
        <Card className="bg-[#141a2e] border-white/10">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Bell className="text-[#a3ff12]" /> Notificações de venda</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div><Label>E-mail do administrador</Label><Input className="bg-[#0b1020] border-white/10" type="email" value={cfg.admin_notify_email} onChange={(e) => set("admin_notify_email", e.target.value)} /></div>
            <div><Label>WhatsApp admin (DDD + número)</Label><Input className="bg-[#0b1020] border-white/10" inputMode="numeric" value={maskPhoneBR(cfg.notify_admin_whatsapp_number)} onChange={(e) => set("notify_admin_whatsapp_number", maskPhoneBR(e.target.value))} placeholder="(11) 99999-9999" maxLength={16} /></div>
            <div className="md:col-span-2 space-y-2 pt-2">
              <div className="flex items-center gap-3"><Switch checked={cfg.notify_email_customer} onCheckedChange={(v) => set("notify_email_customer", v)} /><Label className="cursor-pointer">Enviar chave de acesso ao cliente por e-mail</Label></div>
              <div className="flex items-center gap-3"><Switch checked={cfg.notify_email_admin} onCheckedChange={(v) => set("notify_email_admin", v)} /><Label className="cursor-pointer">Avisar admin por e-mail a cada venda</Label></div>
              <div className="flex items-center gap-3"><Switch checked={cfg.notify_whatsapp_admin} onCheckedChange={(v) => set("notify_whatsapp_admin", v)} /><Label className="cursor-pointer">Avisar admin por WhatsApp (requer Twilio conectado)</Label></div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button onClick={save} disabled={saving}
            className="h-12 px-8 rounded-full font-bold text-black bg-gradient-to-r from-[#a3ff12] to-[#c8ff5c] hover:opacity-90 shadow-[0_0_30px_rgba(163,255,18,0.35)]">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar alterações
          </Button>
        </div>
      </div>
    </div>
  );
}
