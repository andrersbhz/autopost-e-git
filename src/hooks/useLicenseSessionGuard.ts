import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const LS_KEY = "nexa_license_session_token";

/**
 * Validates the current license session every 60s and on window focus.
 * If kicked (other device logged in) → clears token and sends user to /license.
 * Safe to call from any protected layout.
 */
export function useLicenseSessionGuard(enabled: boolean = true) {
  const nav = useNavigate();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const check = async () => {
      const tok = localStorage.getItem(LS_KEY);
      if (!tok) return; // no license yet — user is on classic auth flow, ignore
      const { data } = await supabase.rpc("validate_license_session", { p_session_token: tok });
      if (cancelled) return;
      const res = data as any;
      if (!res?.ok) {
        localStorage.removeItem(LS_KEY);
        if (res?.error === "kicked") {
          nav("/license?kicked=1", { replace: true });
        } else if (res?.error) {
          nav("/license", { replace: true });
        }
      }
    };

    check();
    const iv = setInterval(check, 60_000);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; clearInterval(iv); window.removeEventListener("focus", onFocus); };
  }, [enabled, nav]);
}
