import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, Upload, MessageCircle, Mail, CheckCircle2, QrCode, Clock } from "lucide-react";
import { toast } from "sonner";
import { onlyDigits } from "@/lib/masks";

type BuyerForm = { email: string; name: string; phone: string; document: string };

type Props = {
  plan: "starter_monthly" | "pro_monthly";
  amountBRL: number;
  buyer: BuyerForm;
  validateBuyer: () => boolean;
  onPaid: (licenseKey?: string) => void;
};

type Config = {
  pix_enabled: boolean;
  pix_key: string | null;
  pix_key_type: string | null;
  pix_owner_name: string | null;
  pix_bank: string | null;
  admin_notify_email: string | null;
  notify_admin_whatsapp_number: string | null;
};

export default function ManualPixTab({ plan, amountBRL, buyer, validateBuyer, onPaid }: Props) {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [saleId, setSaleId] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_public_payment_config");
      const row = Array.isArray(data) ? data[0] : data;
      setCfg((row as Config | null) ?? null);
    })();
  }, []);

  // Poll for confirmation once sale is created
  useEffect(() => {
    if (!saleId) return;
    setPolling(true);
    const start = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - start > 30 * 60_000) { clearInterval(timer); setPolling(false); return; }
      const { data } = await supabase
        .from("sale_notifications")
        .select("status, license:license_id(license_key)")
        .eq("id", saleId).maybeSingle();
      const status = (data as any)?.status;
      const key = (data as any)?.license?.license_key;
      if (status === "paid" || status === "delivered") {
        clearInterval(timer); setPolling(false);
        toast.success("Pagamento confirmado pelo admin!");
        onPaid(key);
      }
    }, 5000);
    return () => { clearInterval(timer); setPolling(false); };
  }, [saleId, onPaid]);

  const createSale = async () => {
    if (!validateBuyer()) return;
    if (!cfg?.pix_enabled || !cfg.pix_key) return toast.error("Pix manual não está habilitado. Fale com o suporte.");
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_pending_sale" as any, {
        p_buyer_email: buyer.email,
        p_buyer_name: buyer.name,
        p_buyer_phone: onlyDigits(buyer.phone),
        p_plan: plan,
        p_amount_cents: Math.round(amountBRL * 100),
        p_payment_method: "pix_manual",
        p_reference: null,
        p_metadata: { document: onlyDigits(buyer.document) },
      });
      if (error || !data) throw new Error(error?.message || "Falha ao registrar");
      setSaleId(data as unknown as string);

      toast.success("Venda registrada! Envie o comprovante abaixo.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao registrar venda");
    } finally { setLoading(false); }
  };

  const handleUpload = async (file: File) => {
    if (!saleId) return;
    if (file.size > 8 * 1024 * 1024) return toast.error("Arquivo muito grande (máx 8MB)");
    setUploading(true);
    try {
      const path = `${saleId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file, {
        upsert: false, contentType: file.type || "application/octet-stream",
      });
      if (upErr) throw upErr;
      const url = `payment-proofs://${path}`;
      const { error: rpcErr } = await supabase.rpc("attach_pix_proof" as any, { p_sale_id: saleId, p_proof_url: url });
      if (rpcErr) throw rpcErr;
      setProofUrl(url);
      toast.success("Comprovante enviado! Aguardando confirmação do admin.");
    } catch (e: any) {
      toast.error(e.message || "Falha no upload");
    } finally { setUploading(false); }
  };

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copiado!"); };

  if (!cfg) return <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-[#a3ff12]" /></div>;
  if (!cfg.pix_enabled || !cfg.pix_key) {
    return <div className="py-6 text-sm text-white/70">Pix manual não está habilitado no momento. Use cartão ou Pix (MP) acima.</div>;
  }

  const qrPayload = cfg.pix_key;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrPayload)}&size=280x280&margin=8`;
  const wa = cfg.notify_admin_whatsapp_number ? onlyDigits(cfg.notify_admin_whatsapp_number) : "";
  const waMsg = `Olá! Enviei o Pix de R$ ${amountBRL.toFixed(2)} do plano ${plan}. E-mail: ${buyer.email}. Segue comprovante.`;
  const waLink = wa ? `https://wa.me/55${wa}?text=${encodeURIComponent(waMsg)}` : null;
  const mailLink = cfg.admin_notify_email
    ? `mailto:${cfg.admin_notify_email}?subject=${encodeURIComponent("Comprovante Pix — " + buyer.email)}&body=${encodeURIComponent(waMsg)}`
    : null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-[#0b1020] p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-white/70"><QrCode className="w-4 h-4 text-[#a3ff12]" /> Escaneie o QR ou copie a chave Pix</div>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <img src={qrSrc} alt="QR Code Pix" className="w-56 h-56 rounded-lg bg-white p-2" />
          <div className="flex-1 w-full space-y-2 text-sm">
            <div><span className="text-white/50">Valor:</span> <b className="text-[#a3ff12]">R$ {amountBRL.toFixed(2)}</b></div>
            <div><span className="text-white/50">Titular:</span> {cfg.pix_owner_name || "—"}</div>
            <div><span className="text-white/50">Banco:</span> {cfg.pix_bank || "—"}</div>
            <div><span className="text-white/50">Tipo:</span> {cfg.pix_key_type?.toUpperCase()}</div>
            <div className="flex gap-1">
              <Input readOnly value={cfg.pix_key} className="bg-[#141a2e] border-white/10 font-mono text-xs" />
              <Button size="icon" variant="outline" className="border-white/20" onClick={() => copy(cfg.pix_key!)}><Copy className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
      </div>

      <ol className="text-sm text-white/70 space-y-1 list-decimal list-inside">
        <li>Pague o valor exato usando a chave Pix acima.</li>
        <li>Clique em <b>Registrar venda</b> para criarmos seu pedido.</li>
        <li>Envie o comprovante (upload abaixo <b>e</b> WhatsApp/E-mail).</li>
        <li>Assim que o admin confirmar, sua chave de acesso aparecerá aqui e será enviada por e-mail.</li>
      </ol>

      {!saleId ? (
        <Button onClick={createSale} disabled={loading} className="w-full bg-[#a3ff12] text-black font-bold py-6 hover:bg-[#a3ff12]/90">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <QrCode className="w-4 h-4 mr-2" />}
          Registrar venda e liberar upload
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-white/10 bg-[#0b1020] p-4 space-y-3">
            <Label className="text-sm">Enviar comprovante (imagem ou PDF, até 8MB)</Label>
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/*,application/pdf" disabled={uploading}
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                className="bg-[#141a2e] border-white/10 file:text-[#a3ff12] file:bg-transparent file:border-0" />
              {uploading && <Loader2 className="w-4 h-4 animate-spin text-[#a3ff12]" />}
            </div>
            {proofUrl && <p className="text-xs text-[#a3ff12] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Comprovante enviado</p>}
          </div>

          <div className="grid md:grid-cols-2 gap-2">
            {waLink && (
              <a href={waLink} target="_blank" rel="noreferrer">
                <Button variant="outline" className="w-full border-[#a3ff12]/40 text-[#a3ff12] hover:bg-[#a3ff12]/10">
                  <MessageCircle className="w-4 h-4 mr-2" /> Enviar por WhatsApp
                </Button>
              </a>
            )}
            {mailLink && (
              <a href={mailLink}>
                <Button variant="outline" className="w-full border-white/20 hover:bg-white/5">
                  <Mail className="w-4 h-4 mr-2" /> Enviar por E-mail
                </Button>
              </a>
            )}
          </div>

          {polling && (
            <p className="text-sm text-white/60 flex items-center justify-center gap-2 pt-2">
              <Clock className="w-4 h-4 animate-pulse text-[#a3ff12]" /> Aguardando confirmação do admin…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
