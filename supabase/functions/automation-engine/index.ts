import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[automation-engine] Iniciando varredura de automação...");

    // 1. Buscar todos os usuários com automação ligada
    const { data: users, error: usersError } = await supabase
      .from("user_settings")
      .select("user_id")
      .eq("automation_enabled", true);

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum usuário com automação ativa." }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log(`[automation-engine] Processando ${users.length} usuários...`);

    for (const user of users) {
      try {
        console.log(`[automation-engine] Executando para usuário: ${user.user_id}`);
        
        // Log start
        await supabase.from("automation_logs").insert({
          user_id: user.user_id,
          level: 'info',
          module: 'automation',
          message: 'Iniciando ciclo de automação 24/7'
        });

        // Sincronizar interações
        const syncResp = await supabase.functions.invoke("handle-social-interactions", {
          body: { userId: user.user_id }
        });
        
        if (syncResp.error) {
           await supabase.from("automation_logs").insert({
            user_id: user.user_id,
            level: 'error',
            module: 'sync',
            message: `Falha na sincronização: ${syncResp.error.message || 'Erro desconhecido'}`,
            details: syncResp.error
          });
        } else {
           await supabase.from("automation_logs").insert({
            user_id: user.user_id,
            level: 'info',
            module: 'sync',
            message: `Sincronização concluída: ${syncResp.data?.postsScanned || 0} postagens analisadas e ${syncResp.data?.newInteractions || 0} novas interações.`,
            details: syncResp.data
          });
        }

        // Processar respostas
        const replyResp = await supabase.functions.invoke("process-social-replies", {
          body: { userId: user.user_id }
        });

        if (replyResp.error) {
          await supabase.from("automation_logs").insert({
            user_id: user.user_id,
            level: 'error',
            module: 'reply',
            message: `Falha ao gerar respostas: ${replyResp.error.message || 'Erro desconhecido'}`,
            details: replyResp.error
          });
        } else {
          await supabase.from("automation_logs").insert({
            user_id: user.user_id,
            level: 'info',
            module: 'reply',
            message: `Respostas geradas: ${replyResp.data?.replied || 0} novas interações respondidas.`,
            details: replyResp.data
          });
        }

        // Processar crescimento social (Follow/Unfollow)
        const growthResp = await supabase.functions.invoke("handle-social-growth", {
          body: { userId: user.user_id }
        });

        if (growthResp.error) {
          await supabase.from("automation_logs").insert({
            user_id: user.user_id,
            level: 'warn',
            module: 'growth',
            message: `Aviso no ciclo de crescimento: ${growthResp.error.message || 'Erro desconhecido'}`,
            details: growthResp.error
          });
        } else {
          const { followed, unfollowed } = growthResp.data || {};
          if (followed > 0 || unfollowed > 0) {
            await supabase.from("automation_logs").insert({
              user_id: user.user_id,
              level: 'info',
              module: 'growth',
              message: `Ciclo de crescimento concluído: ${followed} seguidos, ${unfollowed} deixados de seguir.`,
              details: growthResp.data
            });
          }
        }

      } catch (userErr: any) {
        console.error(`[automation-engine] Erro no usuário ${user.user_id}:`, userErr);
        await supabase.from("automation_logs").insert({
          user_id: user.user_id,
          level: 'error',
          module: 'automation',
          message: `Erro fatal no ciclo: ${userErr.message}`,
          details: { error: userErr.stack }
        });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: users.length }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    console.error("[automation-engine] Erro fatal:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
