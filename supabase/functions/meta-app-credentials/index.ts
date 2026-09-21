import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userId = userData.user.id;

    if (req.method === "GET") {
      const { data, error } = await admin
        .from("meta_app_credentials")
        .select("app_id, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return json({
        configured: Boolean(data?.app_id),
        appId: data?.app_id || "",
        hasSecret: Boolean(data?.app_id),
        updatedAt: data?.updated_at || null,
        usingGlobalFallback: !data?.app_id && Boolean(Deno.env.get("FACEBOOK_APP_ID") && Deno.env.get("FACEBOOK_APP_SECRET")),
      });
    }

    if (req.method === "DELETE") {
      const { error } = await admin.from("meta_app_credentials").delete().eq("user_id", userId);
      if (error) throw error;
      return json({ success: true });
    }

    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const body = await req.json().catch(() => ({}));
    const appId = typeof body.appId === "string" ? body.appId.trim() : "";
    const submittedSecret = typeof body.appSecret === "string" ? body.appSecret.trim() : "";

    if (!/^\d{6,32}$/.test(appId)) {
      return json({ error: "App ID inválido. Use o ID numérico exibido no Meta for Developers." }, 400);
    }

    const { data: existing, error: readError } = await admin
      .from("meta_app_credentials")
      .select("app_secret")
      .eq("user_id", userId)
      .maybeSingle();
    if (readError) throw readError;

    const appSecret = submittedSecret || existing?.app_secret || "";
    if (appSecret.length < 20) {
      return json({ error: "App Secret inválido ou incompleto." }, 400);
    }

    const { error } = await admin.from("meta_app_credentials").upsert(
      { user_id: userId, app_id: appId, app_secret: appSecret },
      { onConflict: "user_id" },
    );
    if (error) throw error;

    return json({ success: true, configured: true, appId, hasSecret: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("meta-app-credentials error:", error);
    return json({ error: message }, 500);
  }
});
