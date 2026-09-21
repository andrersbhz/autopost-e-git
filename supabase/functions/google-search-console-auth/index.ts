import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_RETURN_URL = "https://forex.a3solucoesdigitais.com/settings";
const ALLOWED_RETURN_HOSTS = new Set([
  "forex.a3solucoesdigitais.com",
  "trend-whisperer-18.lovable.app",
]);

function getSafeReturnUrl(rawValue: unknown) {
  if (typeof rawValue !== "string" || !rawValue) return DEFAULT_RETURN_URL;
  try {
    const url = new URL(rawValue);
    if (!["http:", "https:"].includes(url.protocol)) return DEFAULT_RETURN_URL;
    if (url.hostname.includes("lovable.app") || url.hostname === "localhost") return url.toString();
    if (!ALLOWED_RETURN_HOSTS.has(url.hostname)) return DEFAULT_RETURN_URL;
    return url.toString();
  } catch {
    return DEFAULT_RETURN_URL;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const adminSupabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: savedCreds } = await adminSupabase.rpc("get_google_oauth_credentials_for_backend", {
      p_user_id: userId,
    });

    const clientId = savedCreds?.client_id || Deno.env.get("GOOGLE_CLIENT_ID") || "";
    if (!clientId) {
      throw new Error("Google OAuth Client ID não configurado. Salve as credenciais em Configurações → Geral → Google Search Console.");
    }

    const requestBody = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const returnUrl = getSafeReturnUrl(requestBody?.returnUrl);

    const stateNonce = crypto.randomUUID();
    const state = `${stateNonce}::${encodeURIComponent(returnUrl)}`;

    const { error: insertErr } = await adminSupabase
      .from("google_search_console_oauth_states")
      .insert({ state, user_id: userId });
    if (insertErr) throw insertErr;

    const redirectUri = `${supabaseUrl}/functions/v1/google-search-console-callback`;
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/indexing");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");

    return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("google-search-console-auth error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
