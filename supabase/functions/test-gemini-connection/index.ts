import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Invalid token");

    let bodyParams: any = {};
    try { bodyParams = await req.json(); } catch {}

    let apiKey: string | null = bodyParams.gemini_api_key || null;

    if (!apiKey) {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("gemini_api_key")
        .eq("user_id", user.id)
        .single();

      if (settings?.gemini_api_key) {
        const { data: decrypted } = await supabase.rpc("decrypt_credential", {
          enc_key: "",
          val: settings.gemini_api_key,
        });
        if (decrypted && typeof decrypted === "string" && decrypted.length > 5) {
          apiKey = decrypted;
        }
      }
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Chave do Gemini não configurada. Insira sua chave e tente novamente." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);

    if (resp.ok) {
      const data = await resp.json();
      const allModels = data.models || [];
      // Modelos obsoletos/descontinuados que não devem ser exibidos nem selecionados
      const OBSOLETE = /^(models\/)?gemini-(1\.0|1\.5|pro|ultra)/i;
      const models = allModels
        .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m: any) => ({
          id: m.name.split("/").pop(),
          name: m.displayName || m.name.split("/").pop(),
        }))
        .filter((m: any) => !OBSOLETE.test(m.id))
        .sort((a: any, b: any) => a.id.localeCompare(b.id));

      const preferred = models.find((m: any) => m.id === "gemini-3.6-flash")?.id;
      const latestFlash = [...models]
        .filter((m: any) => /gemini-.*flash/i.test(m.id) && !/image|lite|preview|exp/i.test(m.id))
        .sort((a: any, b: any) => b.id.localeCompare(a.id))[0]?.id;
      const recommended = preferred || latestFlash || models[0]?.id || "gemini-3.6-flash";

      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Conexão OK!",
          data: {
            models,
            recommended,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const errText = await resp.text();
      let errorDetail = `Gemini retornou ${resp.status}`;
      try {
        const errJson = JSON.parse(errText);
        if (resp.status === 400 || resp.status === 403) {
          errorDetail = "Chave inválida ou sem permissão. Verifique sua chave em aistudio.google.com/apikey.";
        } else if (resp.status === 429) {
          errorDetail = "Limite de requisições atingido. Aguarde alguns minutos e tente novamente.";
        } else if (errJson.error?.message) {
          errorDetail = errJson.error.message;
        }
      } catch {}

      return new Response(
        JSON.stringify({ success: false, error: errorDetail }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("test-gemini-connection error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
