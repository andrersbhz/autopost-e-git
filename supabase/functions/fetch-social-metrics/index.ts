import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function decryptField(supabase: any, value: string | null) {
  if (!value || !value.startsWith("ENCRYPTED:")) return value;
  const { data } = await supabase.rpc("decrypt_credential", { val: value, enc_key: "" });
  return data || value;
}

function metricValue(metric: any) {
  if (metric?.total_value?.value !== undefined) return Number(metric.total_value.value || 0);
  if (Array.isArray(metric?.values)) return metric.values.reduce((sum: number, item: any) => sum + Number(item?.value || 0), 0);
  return 0;
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

    const [{ data: settings }, { data: logs }, { data: socialPublications }, { data: threadsAccounts }] = await Promise.all([
      supabase
        .from("user_settings")
        .select("wordpress_url, wordpress_username, wordpress_app_password")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("publish_log")
        .select("platform, status, created_at, published_url, article_id")
        .eq("user_id", userId),
      supabase
        .from("social_publications")
        .select("platform,status,created_at,permalink,remote_id")
        .eq("user_id", userId),
      supabase
        .from("threads_accounts")
        .select("id,threads_user_id,username,access_token,is_active")
        .eq("user_id", userId)
        .eq("is_active", true),
    ]);

    const wpLogs = (logs || []).filter((l: any) => l.platform === "wordpress");
    const fbLogs = (logs || []).filter((l: any) => l.platform === "facebook");
    const igLogs = (logs || []).filter((l: any) => l.platform === "instagram");

    const wpSuccess = wpLogs.filter((l: any) => l.status === "success");
    const fbSuccess = fbLogs.filter((l: any) => l.status === "success");
    const igSuccess = igLogs.filter((l: any) => l.status === "success");

    const socialRows = socialPublications || [];
    const threadRows = socialRows.filter((l: any) => l.platform === "threads");
    const threadSuccess = threadRows.filter((l: any) => l.status === "success");

    let wpPostsWithShares = 0;
    let totalJetpackShares = 0;
    const sharesByNetwork: Record<string, number> = {};

    if (settings?.wordpress_url && settings?.wordpress_username && settings?.wordpress_app_password) {
      try {
        const { data: decrypted } = await supabase.rpc("decrypt_credential", {
          enc_key: "",
          val: settings.wordpress_app_password,
        });
        const password = decrypted || settings.wordpress_app_password;
        const wpUrl = settings.wordpress_url.replace(/\/+$/, "");
        const auth = btoa(`${settings.wordpress_username}:${password}`);

        const postsResp = await fetch(
          `${wpUrl}/wp-json/wp/v2/posts?per_page=100&status=publish&_fields=id,title,date,jetpack_publicize_connections,jetpack_sharing_enabled,meta`,
          { headers: { Authorization: `Basic ${auth}` } }
        );

        if (postsResp.ok) {
          const posts = await postsResp.json();

          try {
            const statsResp = await fetch(`${wpUrl}/wp-json/wpcom/v2/stats/summary`, {
              headers: { Authorization: `Basic ${auth}` },
            });
            if (statsResp.ok) {
              const stats = await statsResp.json();
              if (stats.shares) totalJetpackShares = Number(stats.shares) || 0;
            }
          } catch { /* optional Jetpack stats */ }

          for (const post of posts.slice(0, 20)) {
            try {
              const shareResp = await fetch(`${wpUrl}/wp-json/jetpack/v4/publicize/${post.id}`, {
                headers: { Authorization: `Basic ${auth}` },
              });
              if (shareResp.ok) {
                const shareData = await shareResp.json();
                if (Array.isArray(shareData)) {
                  wpPostsWithShares++;
                  for (const share of shareData) {
                    const network = share.service || share.label || "unknown";
                    sharesByNetwork[network] = (sharesByNetwork[network] || 0) + 1;
                    totalJetpackShares++;
                  }
                }
              }
            } catch { /* continue */ }
          }

          wpPostsWithShares = wpPostsWithShares || posts.filter((p: any) => p.jetpack_sharing_enabled !== false).length;
        }
      } catch (err) {
        console.error("Error fetching WordPress/Jetpack data:", err);
      }
    }

    const threadsInsights: any[] = [];
    for (const account of threadsAccounts || []) {
      const token = await decryptField(supabase, account.access_token);
      if (!token) continue;
      try {
        const response = await fetch(
          `https://graph.threads.net/me/threads_insights?metric=views,likes,replies,reposts,quotes,clicks,followers_count&access_token=${encodeURIComponent(token)}`
        );
        if (!response.ok) throw new Error(await response.text());
        const payload = await response.json();
        const values: Record<string, number> = {};
        for (const metric of payload?.data || []) values[metric.name] = metricValue(metric);
        threadsInsights.push({
          account_id: account.id,
          threads_user_id: account.threads_user_id,
          username: account.username,
          ...values,
        });
      } catch (error) {
        console.warn("Threads insights unavailable for", account.username || account.threads_user_id, error);
      }
    }

    const threadsTotals = threadsInsights.reduce((acc: Record<string, number>, row: any) => {
      for (const key of ["views", "likes", "replies", "reposts", "quotes", "clicks", "followers_count"]) {
        acc[key] = (acc[key] || 0) + Number(row[key] || 0);
      }
      return acc;
    }, {});

    const result = {
      publish_log: {
        wordpress: {
          total: wpLogs.length,
          success: wpSuccess.length,
          failed: wpLogs.filter((l: any) => l.status === "failed").length,
          recent: wpSuccess.slice(-5).map((l: any) => ({ date: l.created_at, url: l.published_url })),
        },
        facebook: {
          total: fbLogs.length,
          success: fbSuccess.length,
          failed: fbLogs.filter((l: any) => l.status === "failed").length,
        },
        instagram: {
          total: igLogs.length,
          success: igSuccess.length,
          failed: igLogs.filter((l: any) => l.status === "failed").length,
        },
        threads: {
          total: threadRows.length,
          success: threadSuccess.length,
          failed: threadRows.filter((l: any) => l.status === "failed").length,
          recent: threadSuccess.slice(-5).map((l: any) => ({ date: l.created_at, url: l.permalink, id: l.remote_id })),
        },
      },
      jetpack: {
        posts_with_sharing: wpPostsWithShares,
        total_shares: totalJetpackShares,
        shares_by_network: sharesByNetwork,
      },
      threads: {
        connected_accounts: (threadsAccounts || []).length,
        accounts: threadsInsights,
        totals: threadsTotals,
      },
      summary: {
        total_published_wp: wpSuccess.length,
        total_shared_social: fbSuccess.length + igSuccess.length + threadSuccess.length + totalJetpackShares,
        total_facebook: fbSuccess.length + (sharesByNetwork["facebook"] || 0),
        total_instagram: igSuccess.length + (sharesByNetwork["instagram"] || 0),
        total_threads: threadSuccess.length,
        threads_views: threadsTotals.views || 0,
        threads_likes: threadsTotals.likes || 0,
        threads_replies: threadsTotals.replies || 0,
        threads_reposts: threadsTotals.reposts || 0,
        threads_quotes: threadsTotals.quotes || 0,
        threads_clicks: threadsTotals.clicks || 0,
        threads_followers: threadsTotals.followers_count || 0,
        total_twitter: sharesByNetwork["twitter"] || sharesByNetwork["x"] || 0,
        total_linkedin: sharesByNetwork["linkedin"] || 0,
        total_tumblr: sharesByNetwork["tumblr"] || 0,
      },
    };

    return new Response(JSON.stringify({ success: true, metrics: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("fetch-social-metrics error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
