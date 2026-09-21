import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, KeyRound, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CheckoutReturnPage() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!sessionId) { setChecking(false); return; }
    const start = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - start > 60_000) { clearInterval(timer); setChecking(false); return; }
      const { data } = await supabase.rpc("check_sale_status", { p_mp_payment_id: null, p_stripe_session_id: sessionId });
      const key = (data as any)?.license_key;
      if (key) { setLicenseKey(key); setChecking(false); clearInterval(timer); }
    }, 2500);
    return () => clearInterval(timer);
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-[#05010f] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg p-8 rounded-3xl border border-[#a3ff12]/30 bg-[#0a0518]/80 backdrop-blur-xl text-center">
        <CheckCircle2 className="w-16 h-16 text-[#a3ff12] mx-auto mb-4" />
        <h1 className="text-3xl font-black mb-2">Pagamento confirmado!</h1>
        <p className="text-white/60 mb-6">Sua assinatura está ativa.</p>

        {checking && (
          <div className="p-6 bg-[#141a2e] rounded-xl border border-white/10 flex items-center justify-center gap-2 text-white/60">
            <Loader2 className="w-4 h-4 animate-spin" /> Gerando sua chave de acesso…
          </div>
        )}

        {licenseKey && (
          <>
            <div className="p-4 bg-[#141a2e] rounded-xl border border-[#a3ff12]/40 mb-4">
              <div className="text-xs uppercase tracking-widest text-white/40 mb-2">Sua chave de licença</div>
              <div className="font-mono text-lg tracking-wider text-[#a3ff12]">{licenseKey}</div>
              <Button size="sm" variant="ghost" className="mt-2 text-white/60" onClick={() => { navigator.clipboard.writeText(licenseKey); toast.success("Copiado"); }}>
                <Copy className="w-3 h-3 mr-1" /> Copiar
              </Button>
            </div>
            <Link to="/ativar">
              <Button className="w-full bg-[#a3ff12] text-black font-bold py-6">
                <KeyRound className="w-4 h-4 mr-2" /> Ativar agora
              </Button>
            </Link>
          </>
        )}

        {!checking && !licenseKey && (
          <div>
            <p className="text-white/60 mb-4">Enviamos a chave para o seu e-mail. Verifique também a caixa de spam.</p>
            <Link to="/ativar"><Button variant="outline">Já tenho minha chave</Button></Link>
          </div>
        )}
      </div>
    </div>
  );
}
