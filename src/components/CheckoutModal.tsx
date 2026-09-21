import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, QrCode, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { maskPhoneBR, maskCPF, isValidPhoneBR, onlyDigits } from "@/lib/masks";
import { buildPixPayload } from "@/lib/pix";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: "starter_monthly" | "pro_monthly";
  planLabel: string;
  amountBRL: number;
};

export default function CheckoutModal({ open, onOpenChange, plan, planLabel, amountBRL }: Props) {
  const [form, setForm] = useState({ email: "", name: "", phone: "", document: "" });
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"card" | "pix">("pix");
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [pixCfg, setPixCfg] = useState<{ key: string; owner: string; bank: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.rpc("get_public_payment_config");
      const cfg = Array.isArray(data) ? data[0] : data;
      const stripeOn = !!(cfg as any)?.stripe_enabled;
      setStripeEnabled(stripeOn);
      setTab(stripeOn ? "card" : "pix");
      setPixCfg({
        key: (cfg as any)?.pix_key || "",
        owner: (cfg as any)?.pix_owner_name || "Andre Rocha Soares",
        bank: (cfg as any)?.pix_bank || "Nubank",
      });
    })();
  }, [open]);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);

  const reset = () => {
    setClientSecret(null); setPaid(false); setIssuedKey(null);
    setSaleRef(null); setSaleId(null); setProofSent(false);
  };


  const handleClose = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  const validateCommon = () => {
    if (!form.email) { toast.error("Informe seu e-mail"); return false; }
    if (!form.name.trim()) { toast.error("Informe seu nome"); return false; }
    if (!isValidPhoneBR(form.phone)) { toast.error("Telefone inválido (DDD + número)"); return false; }
    return true;
  };

  const startCard = async () => {
    if (!validateCommon()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          priceId: plan,
          customerEmail: form.email,
          customerName: form.name,
          customerPhone: onlyDigits(form.phone),
          returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
        },
      });
      if (error || !data?.clientSecret) throw new Error(error?.message || "Falha no checkout");
      setClientSecret(data.clientSecret);
    } catch (e: any) {
      toast.error(e.message || "Erro ao iniciar checkout");
    } finally { setLoading(false); }
  };

  const pixPayload = pixCfg?.key
    ? buildPixPayload({
        key: pixCfg.key,
        amount: amountBRL,
        merchantName: pixCfg.owner || "Andre Rocha Soares",
        merchantCity: "SAO PAULO",
        txid: `${plan}${Date.now().toString().slice(-8)}`,
        description: planLabel,
      })
    : "";

  const copyPixCode = () => {
    if (!pixPayload) return toast.error("Chave Pix não configurada");
    navigator.clipboard.writeText(pixPayload);
    toast.success("Código Pix copiado!");
  };

  // ---- Registro da venda Pix + acompanhamento da confirmação ----
  const [saleRef, setSaleRef] = useState<string | null>(null);
  const [saleId, setSaleId] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [proofSent, setProofSent] = useState(false);

  const registerPixSale = async () => {
    if (!validateCommon()) return;
    if (saleRef) return;
    setRegistering(true);
    try {
      const ref = `pixman_${crypto.randomUUID()}`;
      const { data, error } = await supabase.rpc("create_pending_sale" as any, {
        p_buyer_email: form.email,
        p_buyer_name: form.name,
        p_buyer_phone: onlyDigits(form.phone),
        p_plan: plan,
        p_amount_cents: Math.round(amountBRL * 100),
        p_payment_method: "pix_manual",
        p_reference: ref,
        p_metadata: { document: onlyDigits(form.document), plan_label: planLabel },
      });
      if (error || !data) throw new Error(error?.message || "Falha ao registrar a venda");
      setSaleId(data as unknown as string);

      setSaleRef(ref);
      toast.success("Pagamento registrado! Envie o comprovante para agilizar a liberação.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao registrar pagamento");
    } finally {
      setRegistering(false);
    }
  };

  const uploadProof = async (file: File) => {
    if (!saleId) return;
    if (file.size > 8 * 1024 * 1024) return toast.error("Arquivo muito grande (máx 8MB)");
    setUploading(true);
    try {
      const path = `${saleId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
      if (upErr) throw upErr;
      const { error: rpcErr } = await supabase.rpc("attach_pix_proof" as any, {
        p_sale_id: saleId,
        p_proof_url: `payment-proofs://${path}`,
      });
      if (rpcErr) throw rpcErr;
      setProofSent(true);
      toast.success("Comprovante enviado! Aguardando confirmação.");
    } catch (e: any) {
      toast.error(e.message || "Falha no envio do comprovante");
    } finally {
      setUploading(false);
    }
  };

  // Poll status via RPC (security definer) até o admin/gateway confirmar
  useEffect(() => {
    if (!saleRef || paid) return;
    const started = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - started > 30 * 60_000) { clearInterval(timer); return; }
      const { data } = await supabase.rpc("check_sale_status" as any, { p_mp_payment_id: saleRef });
      const res = data as any;
      if (res?.found && (res.status === "paid" || res.status === "delivered")) {
        clearInterval(timer);
        setIssuedKey(res.license_key || null);
        setPaid(true);
        toast.success("Pagamento confirmado!");
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [saleRef, paid]);




  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-[#0a0518] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">
            Assinar {planLabel} — <span className="text-[#a3ff12]">R$ {amountBRL.toFixed(2)}/mês</span>
          </DialogTitle>
        </DialogHeader>

        {paid ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-[#a3ff12] mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Pagamento aprovado!</h3>
            <p className="text-white/60 mb-4">Sua chave de licença foi enviada para <b>{form.email}</b>.</p>
            {issuedKey && (
              <div className="flex items-center gap-2 max-w-md mx-auto mb-6">
                <input readOnly value={issuedKey} className="flex-1 bg-[#141a2e] border border-[#a3ff12]/40 rounded px-3 py-2 font-mono text-[#a3ff12] text-center" />
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(issuedKey); toast.success("Copiada!"); }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            )}
            <Button onClick={() => (window.location.href = "/ativar")} className="bg-[#a3ff12] text-black font-bold hover:bg-[#a3ff12]/90">
              Ativar agora
            </Button>
          </div>
        ) : clientSecret ? (
          <div id="checkout" className="max-h-[70vh] overflow-y-auto">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret: async () => clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>E-mail *</Label><Input required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" className="bg-[#141a2e] border-white/10" /></div>
              <div><Label>Nome *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-[#141a2e] border-white/10" /></div>
              <div><Label>Telefone *</Label><Input required inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: maskPhoneBR(e.target.value) })} placeholder="(11) 99999-9999" maxLength={16} className="bg-[#141a2e] border-white/10" /></div>
              <div><Label>CPF (para Pix) *</Label><Input required inputMode="numeric" value={form.document} onChange={(e) => setForm({ ...form, document: maskCPF(e.target.value) })} placeholder="000.000.000-00" maxLength={14} className="bg-[#141a2e] border-white/10" /></div>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-4">
              <TabsList className={`bg-[#141a2e] border border-white/10 ${stripeEnabled ? "" : "flex justify-center w-full"}`}>
                <TabsTrigger value="pix" className={stripeEnabled ? "" : "mx-auto"}><QrCode className="w-4 h-4 mr-1" /> Pix direto (recomendado)</TabsTrigger>
                {stripeEnabled && (
                  <TabsTrigger value="card"><CreditCard className="w-4 h-4 mr-1" /> Cartão</TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="pix" className="mt-4">
                {pixCfg?.key ? (
                  <div className="text-center space-y-3">
                    <p className="text-sm text-white/70">
                      Valor: <b className="text-[#a3ff12]">R$ {amountBRL.toFixed(2).replace(".", ",")}</b>
                    </p>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(pixPayload)}&size=280x280&margin=8`}
                      alt="QR Code Pix"
                      className="w-56 h-56 mx-auto rounded-lg bg-white p-2"
                    />
                    <div className="p-2 bg-[#141a2e] border border-white/10 rounded font-mono text-[10px] break-all max-h-24 overflow-auto">{pixPayload}</div>
                    <Button size="sm" variant="outline" onClick={copyPixCode}>
                      <Copy className="w-3 h-3 mr-1" /> Copiar código Pix
                    </Button>
                    <p className="text-xs text-white/50 pt-1">Titular: {pixCfg.owner}{pixCfg.bank ? ` — ${pixCfg.bank}` : ""}</p>

                    {!saleRef ? (
                      <Button onClick={registerPixSale} disabled={registering} className="w-full bg-[#a3ff12] text-black font-bold py-6 hover:bg-[#a3ff12]/90">
                        {registering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Já fiz o pagamento
                      </Button>
                    ) : (
                      <div className="space-y-3 text-left">
                        <Label className="text-sm">Enviar comprovante (imagem ou PDF, até 8MB)</Label>
                        <div className="flex items-center gap-2">
                          <Input type="file" accept="image/*,application/pdf" disabled={uploading}
                            onChange={(e) => e.target.files?.[0] && uploadProof(e.target.files[0])}
                            className="bg-[#141a2e] border-white/10 file:text-[#a3ff12] file:bg-transparent file:border-0" />
                          {uploading && <Loader2 className="w-4 h-4 animate-spin text-[#a3ff12]" />}
                        </div>
                        {proofSent && <p className="text-xs text-[#a3ff12] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Comprovante enviado</p>}
                        <p className="text-sm text-white/60 flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-[#a3ff12]" /> Aguardando confirmação do pagamento…
                        </p>
                      </div>
                    )}
                  </div>
                ) : (

                  <p className="text-sm text-white/60">Chave Pix não configurada. Fale com o suporte.</p>
                )}
              </TabsContent>
              {stripeEnabled && (
                <TabsContent value="card" className="mt-4">
                  <p className="text-sm text-white/60 mb-3">Cobrança mensal automática via Stripe. Cancele quando quiser pelo portal.</p>
                  <Button onClick={startCard} disabled={loading} className="w-full bg-[#a3ff12] text-black font-bold py-6 hover:bg-[#a3ff12]/90">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                    Pagar com cartão
                  </Button>
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
