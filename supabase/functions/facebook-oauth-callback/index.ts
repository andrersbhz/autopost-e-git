import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const GRAPH_API = "https://graph.facebook.com/v21.0";
const DEFAULT_RETURN_URL = "https://forex.a3solucoesdigitais.com/settings";

function getReturnUrlFromState(state: string | null) {
  if (!state) return DEFAULT_RETURN_URL;
  const parts = state.split("::");
  if (parts.length < 2) return DEFAULT_RETURN_URL;
  try {
    return decodeURIComponent(parts.slice(1).join("::"));
  } catch {
    return DEFAULT_RETURN_URL;
  }
}

function htmlResponse(title: string, message: string, success: boolean, redirectUrl = DEFAULT_RETURN_URL) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0b14; color: #e5e5e5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; }
    .card { background: #16161f; border: 1px solid #2a2a3a; border-radius: 12px; padding: 2rem; max-width: 420px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { margin: 0 0 0.5rem; font-size: 1.25rem; color: ${success ? "#a78bfa" : "#f87171"}; }
    p { margin: 0 0 1.5rem; color: #a3a3b8; font-size: 0.9rem; line-height: 1.5; }
    button { background: linear-gradient(135deg, #a78bfa, #ec4899); color: white; border: none; padding: 0.6rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem; }
    button:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? "✅" : "❌"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <button onclick="window.opener ? window.close() : window.location.assign(${JSON.stringify(redirectUrl)}); window.opener && window.opener.postMessage({ type: 'fb-oauth-done', success: ${success} }, '*');">${success ? "Voltar ao app" : "Tentar novamente"}</button>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'fb-oauth-done', success: ${success} }, '*');
      setTimeout(() => window.close(), 1500);
    } else {
      setTimeout(() => window.location.assign(${JSON.stringify(redirectUrl)}), 1800);
    }
  </script>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDesc = url.searchParams.get("error_description");
    const returnUrl = getReturnUrlFromState(state);

    if (error) return htmlResponse("Conexão cancelada", errorDesc || error, false, returnUrl);
    if (!code || !state) return htmlResponse("Erro", "Parâmetros 'code' ou 'state' ausentes.", false, returnUrl);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: stateRow } = await supabase
      .from("facebook_oauth_states")
      .select("user_id, expires_at")
      .eq("state", state)
      .maybeSingle();

    if (!stateRow) return htmlResponse("Sessão expirada", "Estado OAuth inválido. Tente conectar novamente.", false, returnUrl);
    if (new Date(stateRow.expires_at) < new Date()) {
      await supabase.from("facebook_oauth_states").delete().eq("state", state);
      return htmlResponse("Sessão expirada", "O link expirou. Tente conectar novamente.", false, returnUrl);
    }

    const userId = stateRow.user_id;
    await supabase.from("facebook_oauth_states").delete().eq("state", state);

    const { data: credentials, error: credentialsError } = await supabase
      .from("meta_app_credentials")
      .select("app_id, app_secret")
      .eq("user_id", userId)
      .maybeSingle();
    if (credentialsError) console.warn("Could not read per-user Meta credentials:", credentialsError.message);

    const appId = credentials?.app_id || Deno.env.get("FACEBOOK_APP_ID");
    const appSecret = credentials?.app_secret || Deno.env.get("FACEBOOK_APP_SECRET");
    if (!appId || !appSecret) {
      return htmlResponse(
        "Erro de configuração",
        "API da Meta não configurada. Informe App ID e App Secret em Configurações > Facebook & Instagram.",
        false,
        returnUrl,
      );
    }

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/facebook-oauth-callback`;

    const tokenUrl = new URL(`${GRAPH_API}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenResp = await fetch(tokenUrl.toString());
    if (!tokenResp.ok) {
      const errBody = await tokenResp.text();
      console.error("Token exchange failed:", errBody);
      return htmlResponse("Erro ao trocar código", errBody.substring(0, 200), false, returnUrl);
    }
    const tokenData = await tokenResp.json();
    const shortToken = tokenData.access_token;

    const longUrl = new URL(`${GRAPH_API}/oauth/access_token`);
    longUrl.searchParams.set("grant_type", "fb_exchange_token");
    longUrl.searchParams.set("client_id", appId);
    longUrl.searchParams.set("client_secret", appSecret);
    longUrl.searchParams.set("fb_exchange_token", shortToken);
    const longResp = await fetch(longUrl.toString());
    const longData = longResp.ok ? await longResp.json() : { access_token: shortToken };
    const userToken = longData.access_token || shortToken;

    const fields = "id,name,access_token,category,picture{url},fan_count,instagram_business_account{id,name,username,profile_picture_url,followers_count}";
    const pagesResp = await fetch(
      `${GRAPH_API}/me/accounts?fields=${fields}&limit=200&access_token=${encodeURIComponent(userToken)}`
    );
    if (!pagesResp.ok) {
      const errBody = await pagesResp.text();
      console.error("Pages fetch failed:", errBody);
      return htmlResponse("Erro ao buscar páginas", errBody.substring(0, 200), false, returnUrl);
    }
    const pagesData = await pagesResp.json();
    const pages = pagesData.data || [];

    if (pages.length === 0) {
      return htmlResponse("Nenhuma página", "Sua conta não administra nenhuma página do Facebook. Verifique no Business Manager.", false, returnUrl);
    }

    let savedCount = 0;
    for (const page of pages) {
      const igId = page.instagram_business_account?.id || null;
      const pageName = page.name || null;
      const pageId = page.id;
      const pageToken = page.access_token;
      const pictureUrl = page.picture?.data?.url || null;

      const { data: existing } = await supabase
        .from("facebook_accounts")
        .select("id")
        .eq("user_id", userId)
        .eq("page_id", pageId)
        .maybeSingle();

      if (existing) {
        const { error: updErr } = await supabase
          .from("facebook_accounts")
          .update({
            page_name: pageName,
            access_token: pageToken,
            instagram_account_id: igId,
            picture_url: pictureUrl,
            is_active: true,
          })
          .eq("id", existing.id);
        if (!updErr) savedCount++;
        else console.error("Update failed for", pageId, updErr);
      } else {
        const { error: insErr } = await supabase.from("facebook_accounts").insert({
          user_id: userId,
          page_id: pageId,
          page_name: pageName,
          access_token: pageToken,
          instagram_account_id: igId,
          picture_url: pictureUrl,
          is_active: true,
        });
        if (!insErr) savedCount++;
        else console.error("Insert failed for", pageId, insErr);
      }
    }

    return htmlResponse(
      "Conectado com sucesso!",
      `${savedCount} de ${pages.length} página(s) do Facebook conectadas. Os tokens são válidos por 60 dias.`,
      true,
      returnUrl
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tente novamente.";
    console.error("facebook-oauth-callback error:", err);
    return htmlResponse("Erro inesperado", message, false);
  }
});
