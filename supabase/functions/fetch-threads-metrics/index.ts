import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH = "https://graph.threads.net/v1.0";

async function decryptToken(supabase: any, token: string) {
  if (!token || !token.startsWith("ENCRYPTED:")) return token;
  const { data } = await supabase.rpc("decrypt_credential", { val: token, enc_key: "" });
  return data || token;
}

function metricValue(metric: any) {
  if (metric?.total_value?.value !== undefined) return Number(metric.total_value.value || 0);
  if (Array.isArray(metric?.values)) {
    return metric.values.reduce((sum: number, item: any) => sum + Number(item?.value || 0), 0);
  }
  return 0;
}

async function safeJson(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId } = await req.json();
    if (!userId) throw new Error("userId é obrigatório");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: accounts } = await supabase
      .from("threads_accounts")
      .select("id,threads_user_id,username,access_token,is_active,created_at")
      .eq("user_id", userId)
      .eq("is_active", true);

    const results: any[] = [];

    for (const account of accounts || []) {
      const token = await decryptToken(supabase, account.access_token);
      if (!token) continue;
      const tk = encodeURIComponent(token);

      const profile = await safeJson(
        `${GRAPH}/me?fields=id,username,name,threads_profile_picture_url,threads_biography&access_token=${tk}`,
      );

      const insightsPayload = await safeJson(
        `${GRAPH}/me/threads_insights?metric=views,likes,replies,reposts,quotes,clicks,followers_count&access_token=${tk}`,
      );
      const insights: Record<string, number> = {};
      for (const metric of insightsPayload?.data || []) insights[metric.name] = metricValue(metric);

      const postsPayload = await safeJson(
        `${GRAPH}/${account.threads_user_id}/threads?fields=id,text,permalink,timestamp,media_type,media_url,thumbnail_url&limit=25&access_token=${tk}`,
      );
      const rawPosts = postsPayload?.data || [];

      const posts: any[] = [];
      for (const post of rawPosts) {
        const postInsights = await safeJson(
          `${GRAPH}/${post.id}/insights?metric=views,likes,replies,reposts,quotes&access_token=${tk}`,
        );
        const values: Record<string, number> = {};
        for (const metric of postInsights?.data || []) values[metric.name] = metricValue(metric);
        posts.push({
          id: post.id,
          text: post.text || "",
          permalink: post.permalink || null,
          timestamp: post.timestamp || null,
          media_type: post.media_type || "TEXT",
          image: post.media_url || post.thumbnail_url || null,
          views: values.views || 0,
          likes: values.likes || 0,
          replies: values.replies || 0,
          reposts: values.reposts || 0,
          quotes: values.quotes || 0,
        });
      }

      const totals = posts.reduce(
        (acc: any, p: any) => {
          acc.views += p.views;
          acc.likes += p.likes;
          acc.replies += p.replies;
          acc.reposts += p.reposts;
          acc.quotes += p.quotes;
          return acc;
        },
        { views: 0, likes: 0, replies: 0, reposts: 0, quotes: 0 },
      );

      const engagement = totals.likes + totals.replies + totals.reposts + totals.quotes;

      const [{ count: publishedCount }, { count: pendingReplies }, { count: repliedCount }] = await Promise.all([
        supabase
          .from("social_publications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("platform", "threads")
          .eq("status", "success"),
        supabase
          .from("social_interactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("platform", "threads")
          .eq("status", "pending"),
        supabase
          .from("social_interactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("platform", "threads")
          .eq("status", "replied"),
      ]);

      results.push({
        account_id: account.id,
        threads_user_id: account.threads_user_id,
        username: profile?.username || account.username,
        name: profile?.name || null,
        biography: profile?.threads_biography || null,
        picture: profile?.threads_profile_picture_url || null,
        connected_at: account.created_at,
        insights,
        totals,
        engagement,
        avg_engagement: posts.length ? Math.round(engagement / posts.length) : 0,
        posts,
        robot: {
          published: publishedCount || 0,
          pending_replies: pendingReplies || 0,
          replied: repliedCount || 0,
        },
      });
    }

    return new Response(JSON.stringify({ success: true, accounts: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("fetch-threads-metrics error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
