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

    // Try to read body params (live form values)
    let bodyParams: any = {};
    try {
      bodyParams = await req.json();
    } catch {}

    const { data: settings } = await supabase
      .from("user_settings")
      .select("wordpress_url, wordpress_username, wordpress_app_password")
      .eq("user_id", user.id)
      .single();

    // Merge: body params override DB values
    const wpUrl = (bodyParams.wordpress_url || settings?.wordpress_url || "").replace(/\/$/, "");
    const wpUsername = (bodyParams.wordpress_username ?? settings?.wordpress_username ?? "").trim();
    const rawBodyPwd = bodyParams.wordpress_app_password;
    
    if (!wpUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "WordPress URL não configurada" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine password: use body password if provided, otherwise decrypt from DB
    let wpPassword: string | null = null;
    if (rawBodyPwd) {
      wpPassword = rawBodyPwd;
    } else if (settings?.wordpress_app_password) {
      wpPassword = await decryptField(supabase, settings.wordpress_app_password, encKey);
    }

    if (!wpPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "Senha/Chave API não configurada. Preencha o campo e salve ou digite a senha para testar." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!wpUsername) {
      return new Response(
        JSON.stringify({ success: false, error: "Informe o usuário do WordPress. A conexão correta usa usuário real + Senha de Aplicativo." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let finalUrl = wpUrl;
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = `https://${finalUrl}`;
    const isPlugin = wpUsername.toLowerCase() === "autoblog-ai";

    console.log(`Testing WP: ${finalUrl}, user: ${wpUsername || '(plugin)'}, mode: ${isPlugin ? 'plugin' : 'standard'}`);

    let res: Response;
    let testEndpoint: string;
    
    if (isPlugin) {
      testEndpoint = `${finalUrl}/wp-json/autoblog-ai/v1/status`;
      res = await fetch(testEndpoint, {
        headers: { "X-AutoBlog-Key": wpPassword },
      });

      if (res.status === 404) {
        return new Response(
          JSON.stringify({ success: false, error: "O endpoint do plugin não existe nesse WordPress. Use usuário real do WordPress + Senha de Aplicativo." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      testEndpoint = `${finalUrl}/wp-json/wp/v2/users/me`;
      const auth = btoa(`${wpUsername}:${wpPassword}`);
      console.log(`Auth header (base64 length): ${auth.length}`);
      res = await fetch(testEndpoint, {
        headers: { Authorization: `Basic ${auth}` },
      });
    }

    const responseText = await res.text();
    console.log(`WP response ${res.status}: ${responseText.substring(0, 500)}`);

    if (res.ok) {
      try {
        const data = JSON.parse(responseText);
        const info: Record<string, string> = {};
        if (data.name) info.name = data.name;
        if (data.roles) info.roles = data.roles.join(", ");
        if (data.capabilities) {
          info.can_publish = data.capabilities.publish_posts ? "sim" : "não";
          info.can_edit = data.capabilities.edit_posts ? "sim" : "não";
        }
        return new Response(
          JSON.stringify({ success: true, message: "Conexão OK!", data: info }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        return new Response(
          JSON.stringify({ success: true, message: "Conexão OK!" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      let errorDetail = `WordPress retornou ${res.status}`;
      try {
        const errJson = JSON.parse(responseText);
        if (errJson.code === "invalid_username") {
          errorDetail = `Usuário "${wpUsername}" não encontrado no WordPress.`;
        } else if (errJson.code === "incorrect_password") {
          errorDetail = "Senha de aplicativo incorreta. Gere uma nova em WordPress → Usuários → Perfil → Senhas de Aplicativo.";
        } else if (errJson.code === "rest_not_logged_in") {
          errorDetail = "Autenticação falhou. Verifique se a Senha de Aplicativo está correta (não é a senha de login).";
        } else if (errJson.code === "rest_cannot_create") {
          errorDetail = `O usuário \"${wpUsername}\" não tem permissão para publicar. Use um perfil Editor ou Administrador no WordPress.`;
        } else if (errJson.message) {
          errorDetail = `WordPress: ${errJson.message}`;
        }
      } catch {}
      
      return new Response(
        JSON.stringify({ success: false, error: errorDetail }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("test-wp-connection error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
