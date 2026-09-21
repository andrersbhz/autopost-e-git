import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH_API = "https://graph.facebook.com/v21.0";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const accessToken = typeof body?.accessToken === "string" ? body.accessToken.trim() : "";

    // Validate token format before sending to Facebook
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Token de acesso ausente. Cole seu User Access Token da Meta." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Facebook tokens typically start with "EAA" and are at least 50 chars long
    if (accessToken.length < 30 || /\s/.test(accessToken)) {
      return new Response(
        JSON.stringify({
          error: "Formato de token inválido. Tokens da Meta começam com 'EAA' e não contêm espaços.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Debug token to check validity and scopes
    const debugUrl = `${GRAPH_API}/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(accessToken)}`;
    const debugRes = await fetch(debugUrl);
    let debugInfo: any = null;
    if (debugRes.ok) {
      const data = await debugRes.json();
      debugInfo = data.data;
      if (debugInfo && debugInfo.is_valid === false) {
        return new Response(
          JSON.stringify({
            error: `Token inválido ou expirado: ${debugInfo.error?.message || "reconecte sua conta Facebook."}`,
            debug: debugInfo,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 2. Fetch all pages the user manages
    const fields =
      "id,name,access_token,category,picture{url},fan_count,instagram_business_account{id,name,username,profile_picture_url,followers_count}";
    const pagesRes = await fetch(
      `${GRAPH_API}/me/accounts?fields=${fields}&limit=100&access_token=${encodeURIComponent(accessToken)}`
    );

    if (!pagesRes.ok) {
      const err = await pagesRes.json().catch(() => ({}));
      const message = err?.error?.message || `Meta API error: ${pagesRes.status}`;
      return new Response(
        JSON.stringify({ error: message, debug: debugInfo }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pagesData = await pagesRes.json();

    const pages = (pagesData.data || []).map((page: any) => ({
      page_id: page.id,
      page_name: page.name,
      category: page.category || null,
      picture_url: page.picture?.data?.url || null,
      fan_count: page.fan_count || 0,
      page_access_token: page.access_token,
      instagram: page.instagram_business_account
        ? {
            id: page.instagram_business_account.id,
            name: page.instagram_business_account.name,
            username: page.instagram_business_account.username,
            profile_picture_url: page.instagram_business_account.profile_picture_url,
            followers_count: page.instagram_business_account.followers_count,
          }
        : null,
    }));

    return new Response(JSON.stringify({ pages, debug: debugInfo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("fetch-meta-pages error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
