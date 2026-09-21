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

    let apiKey: string | null = bodyParams.youtube_api_key || null;

    if (!apiKey) {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("youtube_api_key")
        .eq("user_id", user.id)
        .single();

      if (settings?.youtube_api_key) {
        const { data: decrypted } = await supabase.rpc("decrypt_credential", {
          enc_key: "",
          val: settings.youtube_api_key,
        });
        if (decrypted && typeof decrypted === "string" && decrypted.length > 5) {
          apiKey = decrypted;
        }
      }
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Chave do YouTube não configurada. Insira sua chave e tente novamente." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Test with a lightweight search call (1 result) which validates the key + Data API v3
    const testUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&maxResults=1&type=video&key=${apiKey}`;
    const resp = await fetch(testUrl);

    if (resp.ok) {
      const data = await resp.json();
      return new Response(
        JSON.stringify({
          success: true,
          message: "Conexão OK! YouTube Data API v3 ativa.",
          data: {
            api: "YouTube Data API v3",
            quota_unit: "100 por busca",
            resultados_teste: `${data.items?.length || 0} vídeo(s)`,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const errText = await resp.text();
      let errorDetail = `YouTube retornou ${resp.status}`;
      try {
        const errJson = JSON.parse(errText);
        const reason = errJson.error?.errors?.[0]?.reason || "";
        if (resp.status === 400 || reason === "keyInvalid") {
          errorDetail = "Chave inválida. Verifique se a chave foi copiada corretamente.";
        } else if (resp.status === 403) {
          if (reason === "accessNotConfigured") {
            errorDetail = "YouTube Data API v3 não está ativada no seu projeto Google Cloud. Ative em console.cloud.google.com.";
          } else if (reason === "quotaExceeded") {
            errorDetail = "Cota diária esgotada (10.000 unidades/dia). Aguarde 24h ou solicite aumento.";
          } else if (reason === "ipRefererBlocked") {
            errorDetail = "Chave restrita por IP/Referrer. Remova as restrições ou libere o domínio.";
          } else {
            errorDetail = errJson.error?.message || "Acesso negado (403).";
          }
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
    console.error("test-youtube-connection error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
