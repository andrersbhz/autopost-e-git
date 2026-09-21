import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASIC_SCOPES = [
  "email",
  "public_profile",
  "pages_show_list",
  "pages_read_engagement"
];
const ADVANCED_SCOPES: string[] = [
  "pages_manage_posts",
  "pages_manage_metadata",
  "pages_read_user_content",
  "instagram_basic",
  "instagram_content_publish",
  "read_insights",
  "business_management",
];
const SCOPES = [...BASIC_SCOPES, ...ADVANCED_SCOPES].join(",");

const DEFAULT_RETURN_URL = "https://forex.a3solucoesdigitais.com/settings";
const ALLOWED_RETURN_HOSTS = new Set([
  "forex.a3solucoesdigitais.com",
  "trend-whisperer-18.lovable.app",
  "id-preview--9ad27b4d-8990-47e9-8d43-311f0f7d2680.lovable.app",
]);

function getSafeReturnUrl(rawValue: unknown) {
  if (typeof rawValue !== "string" || !rawValue) return DEFAULT_RETURN_URL;
  try {
    const url = new URL(rawValue);
    if (!["http:", "https:"].includes(url.protocol)) return DEFAULT_RETURN_URL;
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
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
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: credentials, error: credentialsError } = await adminSupabase
      .from("meta_app_credentials")
      .select("app_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (credentialsError) console.warn("Could not read per-user Meta credentials:", credentialsError.message);

    const appId = credentials?.app_id || Deno.env.get("FACEBOOK_APP_ID");
    if (!appId) {
      throw new Error("API da Meta não configurada. Informe App ID e App Secret em Configurações > Facebook & Instagram.");
    }

    const requestBody = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const returnUrl = getSafeReturnUrl(requestBody?.returnUrl);

    const stateNonce = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    const state = `${stateNonce}::${encodeURIComponent(returnUrl)}`;

    const { error: insertErr } = await adminSupabase
      .from("facebook_oauth_states")
      .insert({ state, user_id: userId });
    if (insertErr) throw insertErr;

    await adminSupabase.from("facebook_oauth_states").delete().lt("expires_at", new Date().toISOString());

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/facebook-oauth-callback`;
    const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    authUrl.searchParams.set("client_id", appId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", SCOPES);
    authUrl.searchParams.set("response_type", "code");

    return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("facebook-oauth-start error:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
