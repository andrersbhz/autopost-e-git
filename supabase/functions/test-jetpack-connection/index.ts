import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function decryptField(supabase: any, val: string | null, encKey: string): Promise<string | null> {
  if (!val || !val.startsWith("ENCRYPTED:")) return val;
  const { data, error } = await supabase.rpc("decrypt_credential", { val, enc_key: encKey });
  if (error) {
    console.error("Decrypt error:", error);
    return null;
  }
  return data || val;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const encKey = Deno.env.get("DB_ENCRYPTION_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Invalid token");

    let bodyParams: any = {};
    try { bodyParams = await req.json(); } catch {}

    const { data: settings } = await supabase
      .from("user_settings")
      .select("wordpress_url, wordpress_username, wordpress_app_password")
      .eq("user_id", user.id)
      .single();

    const wpUrl = (bodyParams.wordpress_url || settings?.wordpress_url || "").replace(/\/+$/, "");
    const wpUsername = (bodyParams.wordpress_username ?? settings?.wordpress_username ?? "").trim();
    const rawBodyPwd = bodyParams.wordpress_app_password;

    if (!wpUrl) {
      return new Response(JSON.stringify({ success: false, error: "URL do WordPress não configurada" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let wpPassword: string | null = null;
    if (rawBodyPwd) {
      wpPassword = rawBodyPwd;
    } else if (settings?.wordpress_app_password) {
      wpPassword = await decryptField(supabase, settings.wordpress_app_password, encKey);
    }

    if (!wpPassword || !wpUsername) {
      return new Response(JSON.stringify({ success: false, error: "Credenciais do WordPress incompletas" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let finalUrl = wpUrl;
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = `https://${finalUrl}`;
    const auth = btoa(`${wpUsername}:${wpPassword}`);
    const headers = { Authorization: `Basic ${auth}` };

    const info: Record<string, string> = {};

    // 1. Check if Jetpack plugin is active via wp/v2/plugins
    let jetpackActive = false;
    try {
      const pluginsRes = await fetch(`${finalUrl}/wp-json/wp/v2/plugins`, { headers });
      if (pluginsRes.ok) {
        const plugins = await pluginsRes.json();
        const jetpack = plugins.find((p: any) => 
          p.plugin?.includes("jetpack") || p.name?.toLowerCase().includes("jetpack")
        );
        if (jetpack) {
          jetpackActive = jetpack.status === "active";
          info.version = jetpack.version || "desconhecida";
          info.status = jetpack.status || "desconhecido";
        }
      }
    } catch (e) {
      console.log("Could not check plugins endpoint:", e);
    }

    // 2. Try Jetpack connection endpoint
    try {
      const connRes = await fetch(`${finalUrl}/wp-json/jetpack/v4/connection`, { headers });
      if (connRes.ok) {
        const connData = await connRes.json();
        jetpackActive = true;
        if (connData.isActive !== undefined) info.connected = connData.isActive ? "sim" : "não";
        if (connData.blog_id) info.site_id = String(connData.blog_id);
      }
    } catch (e) {
      console.log("Jetpack connection endpoint not available");
    }

    // 3. Try to get modules
    try {
      const modulesRes = await fetch(`${finalUrl}/wp-json/jetpack/v4/module/all`, { headers });
      if (modulesRes.ok) {
        const modules = await modulesRes.json();
        jetpackActive = true;
        const activeModules = Object.entries(modules)
          .filter(([_, m]: [string, any]) => m.activated)
          .map(([key]: [string, any]) => key);
        
        info.modules = activeModules.length > 10 
          ? `${activeModules.length} módulos ativos`
          : activeModules.join(", ") || "nenhum";
        
        info.publicize = (modules as any).publicize?.activated ? "ativo ✅" : "inativo ❌";
        info.stats = (modules as any).stats?.activated ? "ativo ✅" : "inativo ❌";
      }
    } catch (e) {
      console.log("Jetpack modules endpoint not available");
    }

    // 4. Try Jetpack stats summary
    try {
      const statsRes = await fetch(`${finalUrl}/wp-json/wpcom/v2/stats/summary`, { headers });
      if (statsRes.ok) {
        jetpackActive = true;
        const stats = await statsRes.json();
        if (stats.views !== undefined) info.total_views = String(stats.views);
        if (stats.visitors !== undefined) info.total_visitors = String(stats.visitors);
      }
    } catch (e) {
      console.log("Jetpack stats not available");
    }

    // 5. Try Publicize connections
    try {
      const pubRes = await fetch(`${finalUrl}/wp-json/jetpack/v4/publicize/connections`, { headers });
      if (pubRes.ok) {
        const connections = await pubRes.json();
        if (Array.isArray(connections) && connections.length > 0) {
          info.publicize_connections = connections.map((c: any) => c.service || c.label).join(", ");
        }
      }
    } catch (e) {
      console.log("Publicize connections not available");
    }

    if (jetpackActive || Object.keys(info).length > 1) {
      return new Response(JSON.stringify({ success: true, info }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: "Jetpack não encontrado ou inativo neste WordPress. Instale e ative o plugin Jetpack." 
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("test-jetpack-connection error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
