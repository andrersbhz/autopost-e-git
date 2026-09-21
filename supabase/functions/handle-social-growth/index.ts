import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId } = await req.json();
    if (!userId) throw new Error("userId is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await supabase
      .from("user_settings")
      .select("follower_growth_mode")
      .eq("user_id", userId)
      .maybeSingle();

    if (!settings?.follower_growth_mode) {
      return new Response(JSON.stringify({ success: true, message: "Modo crescimento desativado", followed: 0, unfollowed: 0, opportunities: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // A API oficial do Instagram não oferece endpoints para seguir/desseguir usuários
    // nem para transformar curtidores de posts em follows automáticos. Em vez de simular
    // a ação, mantemos uma fila de oportunidades baseada em interações reais.
    const { data: interactions } = await supabase
      .from("social_interactions")
      .select("id,platform,external_id,author_name,author_avatar,interaction_type,created_at")
      .eq("user_id", userId)
      .in("platform", ["instagram", "facebook", "threads"])
      .order("created_at", { ascending: false })
      .limit(50);

    const unique = new Map<string, any>();
    for (const item of interactions || []) {
      const key = `${item.platform}:${item.author_name || item.external_id}`;
      if (!unique.has(key)) unique.set(key, item);
    }

    const opportunities = Array.from(unique.values()).slice(0, 20);

    await supabase.from("automation_logs").insert({
      user_id: userId,
      level: "info",
      module: "growth",
      message: `${opportunities.length} oportunidades de relacionamento identificadas. Follow automático não é executado porque a API oficial não disponibiliza essa ação.`,
      details: {
        action: "growth-opportunities",
        supported_follow_api: false,
        opportunities: opportunities.map((x) => ({ platform: x.platform, author: x.author_name, interaction_type: x.interaction_type })),
      },
    });

    return new Response(JSON.stringify({
      success: true,
      followed: 0,
      unfollowed: 0,
      opportunities: opportunities.length,
      supportedFollowApi: false,
      message: "Oportunidades identificadas sem simular follows inexistentes.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
