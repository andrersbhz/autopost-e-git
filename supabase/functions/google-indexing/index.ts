import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAccessTokenFromServiceAccount(jsonKey: string): Promise<string> {
  const sa = JSON.parse(jsonKey);
  const { JWT } = await import("https://esm.sh/google-auth-library@9.4.1");
  const client = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ["https://www.googleapis.com/auth/indexing"],
  });
  const token = await client.authorize();
  return token.access_token || "";
}

async function getOAuthClientCredentials(supabase: any, userId: string) {
  const { data } = await supabase.rpc("get_google_oauth_credentials_for_backend", {
    p_user_id: userId,
  });
  return {
    clientId: data?.client_id || Deno.env.get("GOOGLE_CLIENT_ID") || "",
    clientSecret: data?.client_secret || Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
  };
}

async function getAccessTokenFromOAuth(
  supabase: any,
  userId: string,
  tokenData: any
): Promise<string> {
  const now = Date.now();
  if (tokenData.access_token && tokenData.expires_at && tokenData.expires_at > now + 60_000) {
    return tokenData.access_token;
  }

  if (!tokenData.refresh_token) {
    return tokenData.access_token || "";
  }

  const { clientId, clientSecret } = await getOAuthClientCredentials(supabase, userId);
  if (!clientId || !clientSecret) {
    console.warn("Google OAuth Client ID/Secret not configured — cannot refresh token");
    return tokenData.access_token || "";
  }

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokenData.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`OAuth refresh failed: ${errBody}`);
  }

  const refreshed = await resp.json();
  const newToken = {
    ...tokenData,
    access_token: refreshed.access_token,
    expires_at: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
  };

  await supabase
    .from("user_settings")
    .update({ google_search_console_token: JSON.stringify(newToken) })
    .eq("user_id", userId);

  return refreshed.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let userId: string | null = null;
  let articleId: string | null = null;
  let url = "";
  let supabase: any = null;

  try {
    const body = await req.json();
    url = body.url;
    userId = body.userId;
    articleId = body.articleId ?? null;
    if (!url || !userId) throw new Error("URL and userId are required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const encKey = Deno.env.get("DB_ENCRYPTION_KEY") || "";
    supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase
      .from("user_settings")
      .select("google_indexing_key, google_search_console_token")
      .eq("user_id", userId)
      .maybeSingle();

    let accessToken = "";
    let source = "";

    if (settings?.google_search_console_token) {
      try {
        const tokenData = JSON.parse(settings.google_search_console_token);
        accessToken = await getAccessTokenFromOAuth(supabase, userId, tokenData);
        if (accessToken) source = "user_oauth";
      } catch (e) {
        console.error("OAuth token error:", e);
      }
    }

    if (!accessToken && settings?.google_indexing_key) {
      try {
        let jsonKey = settings.google_indexing_key;
        if (jsonKey.startsWith("ENCRYPTED:")) {
          const { data: decrypted } = await supabase.rpc("decrypt_credential", { val: jsonKey, enc_key: encKey });
          jsonKey = decrypted || jsonKey;
        }
        accessToken = await getAccessTokenFromServiceAccount(jsonKey);
        if (accessToken) source = "user_sa";
      } catch (e) {
        console.error("User SA token error:", e);
      }
    }

    if (!accessToken) {
      const projectSaJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
      if (projectSaJson) {
        try {
          accessToken = await getAccessTokenFromServiceAccount(projectSaJson);
          if (accessToken) source = "project_sa";
        } catch (e) {
          console.error("Project SA token error:", e);
        }
      }
    }

    if (!accessToken) {
      const msg = "Google Indexing não configurado. Configure em Configurações → Google Indexing (OAuth ou JSON de Service Account).";
      await supabase.from("automation_logs").insert({
        user_id: userId, level: "warning", module: "robot",
        message: `⚠️ Indexação não enviada: ${msg}`,
        details: { url },
      });
      return new Response(JSON.stringify({ success: false, message: msg }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://indexing.googleapis.com/v1/urlNotifications:publish", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ url, type: "URL_UPDATED" }),
    });

    const result = await response.json();

    if (response.ok) {
      await supabase.from("google_indexing_history").insert({
        user_id: userId, article_id: articleId, url, status: "success",
        response_details: { source, ...result },
      });
      await supabase.from("automation_logs").insert({
        user_id: userId, level: "info", module: "robot",
        message: `✅ Indexação enviada ao Google: ${url}`,
        details: { source, result },
      });
      return new Response(JSON.stringify({ success: true, source, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const errorMsg = result?.error?.message || `HTTP ${response.status}`;
    const errorCode = result?.error?.code || response.status;
    await supabase.from("google_indexing_history").insert({
      user_id: userId, article_id: articleId, url, status: "error",
      response_details: { source, status: response.status, ...result },
    });
    await supabase.from("automation_logs").insert({
      user_id: userId, level: "error", module: "robot",
      message: `❌ Erro na Indexing API (${errorCode}): ${errorMsg}`,
      details: { url, source, response: result },
    });

    return new Response(JSON.stringify({ success: false, error: errorMsg, code: errorCode, source }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Google Indexing fatal error:", error);
    if (supabase && userId) {
      try {
        await supabase.from("google_indexing_history").insert({
          user_id: userId, article_id: articleId, url, status: "error",
          response_details: { fatal: error.message },
        });
        await supabase.from("automation_logs").insert({
          user_id: userId, level: "error", module: "robot",
          message: `❌ Falha ao indexar: ${error.message}`,
          details: { url },
        });
      } catch (_) {}
    }
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
