import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } catch (e) {
    console.error("[fetchWithTimeout] aborted/failed:", url, (e as any)?.message);
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function processPage(
  supabase: any,
  userId: string,
  page: { page_id: string; access_token: string; page_name?: string; picture_url?: string | null }
): Promise<{ processed: number; postsScanned: number }> {
  const { page_id: pageId, access_token: token, page_name: pageName, picture_url: pagePicture } = page;
  let processed = 0;
  let postsScanned = 0;

  let finalToken = token;
  if (token?.startsWith("ENCRYPTED:")) {
    const { data: decryptedToken } = await supabase.rpc("decrypt_credential", { val: token, enc_key: "" });
    finalToken = decryptedToken || token;
  }

  const postsResp = await fetchWithTimeout(
    `https://graph.facebook.com/v21.0/${pageId}/feed?fields=id,permalink_url&limit=8&access_token=${finalToken}`
  );
  
  if (!postsResp || !postsResp.ok) {
    const errText = postsResp ? await postsResp.text() : "timeout";
    console.error(`[handle-social-interactions] Feed error ${pageId}:`, errText);
    let details: any = errText;
    try { details = JSON.parse(errText); } catch {}
    await supabase.from("automation_logs").insert({
      user_id: userId,
      level: "error",
      module: "facebook-api",
      message: `Erro na página ${pageName || pageId}: ${postsResp ? "Permissão negada pela Meta." : "Timeout."}`,
      details,
    });
    return { processed, postsScanned };
  }

  const postsList = (await postsResp.json()).data || [];
  postsScanned = postsList.length;

  // Log detalhado no formato solicitado pelo usuário
  const { data: settings } = await supabase.from("user_settings").select("follower_growth_mode").eq("user_id", userId).single();
  const isGrowthMode = settings?.follower_growth_mode;

  // Carregar métricas reais se disponíveis
  const { data: pageRecord } = await supabase.from("facebook_accounts").select("last_metrics").eq("page_id", pageId).maybeSingle();
  const metrics = pageRecord?.last_metrics;
  
  const fanCount = metrics?.facebook?.fan_count || page.facebook?.fan_count || 0;
  const followersCount = metrics?.facebook?.followers_count || page.facebook?.followers_count || 0;
  const totalPosts = metrics?.facebook?.post_stats?.total_posts || postsList.length;
  const totalLikes = metrics?.facebook?.post_stats?.total_likes || 0;
  const totalComments = metrics?.facebook?.post_stats?.total_comments || 0;
  const totalShares = metrics?.facebook?.post_stats?.total_shares || 0;

  await supabase.from("automation_logs").insert({
    user_id: userId,
    level: "info",
    module: "robot",
    message: isGrowthMode 
      ? `Analisando página: ${pageName || pageId} (Modo Crescimento Ativo 🚀)`
      : `Analisando página: ${pageName || pageId}`,
    details: {
      curtidas: fanCount,
      seguidores: followersCount,
      compartilhamentos: totalShares,
      comentarios: totalComments,
      numero_postagens: totalPosts,
      analise: isGrowthMode 
        ? "Iniciando varredura para interagir e convidar novos seguidores"
        : "Iniciando varredura de postagens para interação com IA"
    }
  });

  const pageAvatar = pagePicture || `https://graph.facebook.com/${pageId}/picture?type=large`;

  await Promise.all(
    postsList.map(async (post: any) => {
      const [commentsResp, reactionsResp] = await Promise.all([
        fetchWithTimeout(
          `https://graph.facebook.com/v21.0/${post.id}/comments?fields=id,message,from{name,picture},created_time,permalink_url&limit=10&access_token=${finalToken}`
        ),
        fetchWithTimeout(
          `https://graph.facebook.com/v21.0/${post.id}/reactions?fields=id,name,type,pic_large&limit=5&access_token=${finalToken}`
        ),
      ]);

      const newRows: any[] = [];

      if (commentsResp?.ok) {
        const commentsList = (await commentsResp.json()).data || [];
        for (const c of commentsList) {
          newRows.push({
            user_id: userId,
            platform: "facebook",
            external_id: c.id,
            page_id: pageId,
            page_avatar: pageAvatar,
            author_name: c.from?.name || "Seguidor",
            author_avatar: c.from?.picture?.data?.url,
            content: c.message,
            original_link: c.permalink_url || post.permalink_url,
            status: "pending",
            interaction_type: "comment",
          });
        }
      }

      if (reactionsResp?.ok) {
        const reactionsList = (await reactionsResp.json()).data || [];
        for (const r of reactionsList) {
          newRows.push({
            user_id: userId,
            platform: "facebook",
            external_id: `${post.id}_${r.id}`,
            page_id: pageId,
            page_avatar: pageAvatar,
            author_name: r.name,
            author_avatar: r.pic_large,
            content: `Reagiu com ${r.type} ao seu post`,
            original_link: post.permalink_url,
            status: "processed",
            interaction_type: "reaction",
          });
        }
      }

      if (newRows.length === 0) return;

      const ids = newRows.map((r) => r.external_id);
      const { data: existing } = await supabase
        .from("social_interactions")
        .select("external_id")
        .in("external_id", ids);
      const existingSet = new Set((existing || []).map((e: any) => e.external_id));
      const toInsert = newRows.filter((r) => !existingSet.has(r.external_id));

      if (toInsert.length > 0) {
        const { error } = await supabase.from("social_interactions").insert(toInsert);
        if (!error) processed += toInsert.length;
      }
    })
  );

  return { processed, postsScanned };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId } = await req.json();
    if (!userId) throw new Error("userId is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`[handle-social-interactions] Sync para usuário: ${userId}`);

    const [{ data: accounts }, { data: settings }] = await Promise.all([
      supabase.from("facebook_accounts").select("*").eq("user_id", userId).eq("is_active", true),
      supabase.from("user_settings").select("facebook_page_id, facebook_access_token").eq("user_id", userId).single(),
    ]);

    const allPages: Array<{ page_id: string; access_token: string; page_name?: string; picture_url?: string | null }> = [];
    if (accounts && accounts.length > 0) {
      for (const acc of accounts) {
        allPages.push({ page_id: acc.page_id, access_token: acc.access_token, page_name: acc.page_name, picture_url: acc.picture_url });
      }
    }
    if (settings?.facebook_page_id && settings?.facebook_access_token) {
      if (!allPages.some((p) => p.page_id === settings.facebook_page_id)) {
        allPages.push({
          page_id: settings.facebook_page_id,
          access_token: settings.facebook_access_token,
          page_name: "Página Principal",
          picture_url: null,
        });
      }
    }

    if (allPages.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma página conectada", newInteractions: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = await Promise.all(
      allPages.map((p) =>
        processPage(supabase, userId, p).catch((err) => {
          console.error(`[handle-social-interactions] Erro página ${p.page_id}:`, err);
          return { processed: 0, postsScanned: 0 };
        })
      )
    );

    const totalProcessed = results.reduce((a, b) => a + b.processed, 0);
    const totalPosts = results.reduce((a, b) => a + b.postsScanned, 0);

    return new Response(JSON.stringify({ 
      success: true, 
      newInteractions: totalProcessed,
      postsScanned: totalPosts 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[handle-social-interactions] Erro fatal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
