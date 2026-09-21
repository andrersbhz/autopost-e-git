import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound, ShieldCheck, LogOut } from "lucide-react";
import { toast } from "sonner";

const LS_KEY = "nexa_license_session_token";

async function getPublicIP(): Promise<string> {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const j = await r.json();
    return j.ip || "";
  } catch { return ""; }
}

export default function LicenseActivatePage() {
  const nav = useNavigate();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [kickedInfo, setKickedInfo] = useState<{ ip?: string; reason?: string } | null>(null);

  // If already has a valid session, redirect straight to app
  useEffect(() => {
    (async () => {
      const tok = localStorage.getItem(LS_KEY);
      if (!tok) return setChecking(false);
      const { data } = await supabase.rpc("validate_license_session", { p_session_token: tok });
      const res = data as any;
      if (res?.ok) return nav("/admin", { replace: true });
      if (res?.error === "kicked") setKickedInfo({ reason: "Você foi desconectado — outra sessão está usando esta chave." });
      setChecking(false);
    })();
  }, [nav]);

  const activate = async () => {
    if (!/^NEXA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(key.trim())) {
      return toast.error("Chave inválida. Formato: NEXA-XXXX-XXXX-XXXX-XXXX");
    }
    setLoading(true);
    const ip = await getPublicIP();
    const ua = navigator.userAgent;
    const { data, error } = await supabase.rpc("activate_license_session", {
      p_license_key: key.trim().toUpperCase(),
      p_ip: ip,
      p_user_agent: ua,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    const res = data as any;
    if (!res?.ok) {
      const msg: Record<string,string> = { invalid_key: "Chave não encontrada", expired: "Chave expirada", revoked: "Chave revogada", suspended: "Chave suspensa" };
      return toast.error(msg[res?.error] || "Não foi possível ativar");
    }
    localStorage.setItem(LS_KEY, res.session_token);
    setKickedInfo(null);
    toast.success("Licença ativada! Redirecionando…");
    nav("/admin", { replace: true });
  };

  const logoutHere = () => { localStorage.removeItem(LS_KEY); setKickedInfo(null); };

  if (checking) return <div className="min-h-screen bg-[#0b1020] flex items-center justify-center"><Loader2 className="animate-spin text-[#a3ff12]" /></div>;

  return (
    <div className="min-h-screen bg-[#0b1020] text-white flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(163,255,18,0.08),transparent),radial-gradient(circle_at_80%_80%,rgba(200,155,255,0.08),transparent)] pointer-events-none" />

      <Card className="relative w-full max-w-lg bg-[#141a2e] border-white/10 shadow-[0_0_60px_rgba(163,255,18,0.15)]">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-[#a3ff12]/10 border border-[#a3ff12]/30 flex items-center justify-center mb-3">
            <ShieldCheck className="text-[#a3ff12] w-7 h-7" />
          </div>
          <CardTitle className="text-2xl font-black">Ativar licença</CardTitle>
          <p className="text-white/60 text-sm mt-2">Cole a chave enviada por e-mail após a confirmação do pagamento.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {kickedInfo && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
              {kickedInfo.reason}
              <Button variant="ghost" size="sm" className="mt-2 h-8 text-red-200 hover:text-white" onClick={logoutHere}>
                <LogOut className="w-3 h-3 mr-1" /> Limpar sessão local
              </Button>
            </div>
          )}
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} placeholder="NEXA-XXXX-XXXX-XXXX-XXXX"
              className="pl-10 h-12 bg-[#0b1020] border-white/10 font-mono tracking-wider text-center uppercase" maxLength={24} />
          </div>
          <Button onClick={activate} disabled={loading}
            className="w-full h-12 rounded-full font-bold text-black bg-gradient-to-r from-[#a3ff12] to-[#c8ff5c] hover:opacity-90">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Ativar acesso
          </Button>
          <p className="text-xs text-white/40 text-center">Cada chave permite 1 sessão ativa. Novo login em outro dispositivo desloga o anterior automaticamente.</p>
        </CardContent>
      </Card>
    </div>
  );
}
