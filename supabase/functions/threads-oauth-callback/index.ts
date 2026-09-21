import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const THREADS_GRAPH = "https://graph.threads.net";
const THREADS_SCOPES = [
  "threads_basic",
  "threads_content_publish",
  "threads_read_replies",
  "threads_manage_replies",
  "threads_manage_insights",
];

function redirect(url: string) {
  return new Response(null, { status: 302, headers: { Location: url } });
}

serve(async (req) => {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const oauthError = requestUrl.searchParams.get("error_message") || requestUrl.searchParams.get("error");

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let returnUrl = "https://postwp.lovable.app/social";

  try {
    if (!state) throw new Error("OAuth state ausente");
    const { data: stateRow } = await admin
      .from("threads_oauth_states")
      .select("user_id,return_url,expires_at")
      .eq("state", state)
      .maybeSingle();
    if (!stateRow) throw new Error("OAuth state inválido ou expirado");
    returnUrl = stateRow.return_url || returnUrl;
    await admin.from("threads_oauth_states").delete().eq("state", state);

    if (new Date(stateRow.expires_at).getTime() < Date.now()) throw new Error("OAuth state expirado");
    if (oauthError) throw new Error(oauthError);
    if (!code) throw new Error("Código OAuth ausente");

    const appId = Deno.env.get("THREADS_APP_ID");
    const appSecret = Deno.env.get("THREADS_APP_SECRET");
    if (!appId || !appSecret) throw new Error("THREADS_APP_ID/THREADS_APP_SECRET não configurados");

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/threads-oauth-callback`;
    const tokenBody = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });
    const tokenResp = await fetch(`${THREADS_GRAPH}/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody,
    });
    if (!tokenResp.ok) throw new Error(`Threads token: ${await tokenResp.text()}`);
    const tokenData = await tokenResp.json();
    const shortToken = tokenData.access_token as string;
    if (!shortToken) throw new Error("Threads não retornou access_token");

    // Exchange the short-lived token for the official long-lived token.
    // If Meta rejects the exchange for any transient reason, keep the short token
    // instead of breaking an otherwise valid connection.
    let accessToken = shortToken;
    let expiresIn = Number(tokenData.expires_in || 3600);
    try {
      const longUrl = new URL(`${THREADS_GRAPH}/access_token`);
      longUrl.searchParams.set("grant_type", "th_exchange_token");
      longUrl.searchParams.set("client_secret", appSecret);
      longUrl.searchParams.set("access_token", shortToken);
      const longResp = await fetch(longUrl.toString());
      if (longResp.ok) {
        const longData = await longResp.json();
        if (longData?.access_token) {
          accessToken = longData.access_token;
          expiresIn = Number(longData.expires_in || 5184000);
        }
      } else {
        console.warn("Threads long-lived token exchange failed:", await longResp.text());
      }
    } catch (exchangeError) {
      console.warn("Threads long-lived token exchange error:", exchangeError);
    }

    const profileResp = await fetch(
      `${THREADS_GRAPH}/v1.0/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`
    );
    if (!profileResp.ok) throw new Error(`Threads profile: ${await profileResp.text()}`);
    const profile = await profileResp.json();

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error } = await admin.from("threads_accounts").upsert(
      {
        user_id: stateRow.user_id,
        threads_user_id: String(profile.id),
        username: profile.username || null,
        access_token: accessToken,
        token_expires_at: expiresAt,
        scopes: THREADS_SCOPES,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,threads_user_id" }
    );
    if (error) throw error;

    const target = new URL(returnUrl);
    target.searchParams.set("threads", "connected");
    return redirect(target.toString());
  } catch (e) {
    const target = new URL(returnUrl);
    target.searchParams.set("threads", "error");
    target.searchParams.set("message", e instanceof Error ? e.message.substring(0, 180) : "Erro desconhecido");
    return redirect(target.toString());
  }
});
