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

    let apiKey = bodyParams.azure_openai_api_key || null;
    let endpoint = bodyParams.azure_openai_endpoint || null;
    let deployment = bodyParams.azure_openai_deployment_name || null;

    if (!apiKey || !endpoint || !deployment) {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("azure_openai_api_key, azure_openai_endpoint, azure_openai_deployment_name")
        .eq("user_id", user.id)
        .single();

      if (!apiKey && settings?.azure_openai_api_key) {
        const { data: decrypted } = await supabase.rpc("decrypt_credential", { enc_key: "", val: settings.azure_openai_api_key });
        apiKey = decrypted;
      }
      if (!endpoint) endpoint = settings?.azure_openai_endpoint;
      if (!deployment) deployment = settings?.azure_openai_deployment_name;
    }

    if (!apiKey || !endpoint || !deployment) {
      return new Response(
        JSON.stringify({ success: false, error: "Configurações da Azure incompletas." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseEndpoint = endpoint.replace(/\/$/, "");
    const testUrl = `${baseEndpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=2024-10-21`;
    const testResp = await fetch(testUrl, {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Say 'OK'" }],
        max_tokens: 5,
      }),
    });

    if (!testResp.ok) {
      const errText = await testResp.text();
      return new Response(
        JSON.stringify({ success: false, error: `Azure erro ${testResp.status}: ${errText.substring(0, 180)}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let models: Array<{ id: string; name: string; created?: number }> = [
      { id: deployment, name: deployment, created: Date.now() },
    ];

    try {
      const deploymentsResp = await fetch(`${baseEndpoint}/openai/deployments?api-version=2024-10-21`, {
        headers: { "api-key": apiKey, "Content-Type": "application/json" },
      });
      if (deploymentsResp.ok) {
        const deploymentData = await deploymentsResp.json();
        const items = deploymentData.data || deploymentData.value || [];
        const discovered = items
          .map((item: any) => {
            const id = item.id || item.name || item.deployment_name || item.deploymentName;
            const modelName = item.model || item.properties?.model?.name || item.model_name;
            const createdRaw = item.created_at || item.createdAt || item.systemData?.createdAt || 0;
            const created = typeof createdRaw === "number" ? createdRaw : Date.parse(createdRaw) || 0;
            return id ? { id, name: modelName ? `${id} (${modelName})` : id, created } : null;
          })
          .filter(Boolean);
        if (discovered.length > 0) models = discovered as Array<{ id: string; name: string; created?: number }>;
      }
    } catch (listError) {
      console.warn("Azure deployments list unavailable; using configured deployment:", listError);
    }

    if (!models.some((m) => m.id === deployment)) {
      models.unshift({ id: deployment, name: deployment, created: Date.now() });
    }

    models.sort((a, b) => Number(b.created || 0) - Number(a.created || 0));
    const recommended = models[0]?.id || deployment;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Conexão Azure Copilot OK!",
        data: {
          models: models.map(({ id, name }) => ({ id, name })),
          recommended,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});