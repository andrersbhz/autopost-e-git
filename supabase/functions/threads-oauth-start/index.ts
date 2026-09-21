import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_RETURN_URL = "https://postwp.lovable.app/social";
const ALLOWED_RETURN_HOSTS = new Set([
  "postwp.lovable.app",
  "autopost.a3solucoesdigitais.com",
  "trend-whisperer-18.lovable.app",
  "id-preview--9ad27b4d-8990-47e9-8d43-311f0f7d2680.lovable.app",
  "forex.a3solucoesdigitais.com",
  "localhost",
]);

// These permissions match the features already implemented by the system:
// publishing, reading replies, replying to comments and reading insights.
const THREADS_SCOPES = [
  "threads_basic",
  "threads_content_publish",
  "threads_read_replies",
  "threads_manage_replies",
  "threads_manage_insights",
].join(",");

function safeReturnUrl(raw: unknown) {
  if (typeof raw !== "string" || !raw) return DEFAULT_RETURN_URL;
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return DEFAULT_RETURN_URL;
    return ALLOWED_RETURN_HOSTS.has(url.hostname) ? url.toString() : DEFAULT_RETURN_URL;
  } catch {
    return DEFAULT_RETURN_URL;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: auth } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!auth?.user) throw new Error("Unauthorized");

    const appId = Deno.env.get("THREADS_APP_ID");
    if (!appId) {
      console.error("[threads-oauth-start] THREADS_APP_ID ausente nas variáveis de ambiente");
      return new Response(
        JSON.stringify({
          error:
            "Integração do Threads ainda não configurada: as credenciais do app (THREADS_APP_ID/THREADS_APP_SECRET) não foram salvas no backend.",
          code: "missing_app_credentials",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const returnUrl = safeReturnUrl(body?.returnUrl);
    const state = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await admin.from("threads_oauth_states").delete().lt("expires_at", new Date().toISOString());
    const { error } = await admin.from("threads_oauth_states").insert({
      state,
      user_id: auth.user.id,
      return_url: returnUrl,
    });
    if (error) throw error;

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/threads-oauth-callback`;
    const url = new URL("https://threads.net/oauth/authorize");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", THREADS_SCOPES);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);

    return new Response(JSON.stringify({ authUrl: url.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[threads-oauth-start] erro:", e instanceof Error ? e.stack || e.message : e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
