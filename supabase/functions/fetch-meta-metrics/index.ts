import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH_API = "https://graph.facebook.com/v21.0";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId, dateRange } = await req.json();
    if (!userId) throw new Error("userId is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user settings with encrypted tokens
    const { data: settings } = await supabase
      .from("user_settings")
      .select("facebook_page_id, facebook_access_token")
      .eq("user_id", userId)
      .single();

    // Also get facebook_accounts for multi-page support
    const { data: fbAccounts } = await supabase
      .from("facebook_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    // Collect all pages to query
    const pages: Array<{ pageId: string; accessToken: string; pageName: string }> = [];

    // Main settings page
    if (settings?.facebook_page_id && settings?.facebook_access_token) {
      const { data: decryptedToken } = await supabase.rpc("decrypt_credential", {
        enc_key: "",
        val: settings.facebook_access_token,
      });
      pages.push({
        pageId: settings.facebook_page_id,
        accessToken: decryptedToken || settings.facebook_access_token,
        pageName: "Página Principal",
      });
    }

    // Additional accounts
    for (const acc of fbAccounts || []) {
      if (pages.some((p) => p.pageId === acc.page_id)) continue;
      const { data: decryptedToken } = await supabase.rpc("decrypt_credential", {
        enc_key: "",
        val: acc.access_token,
      });
      pages.push({
        pageId: acc.page_id,
        accessToken: decryptedToken || acc.access_token,
        pageName: acc.page_name || acc.page_id,
      });
    }

    if (pages.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          pages: [],
          notice: "Nenhuma página do Facebook configurada. Conecte uma página em Configurações.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allMetrics: any[] = [];

    for (const page of pages) {
      const pageMetrics: any = {
        page_id: page.pageId,
        page_name: page.pageName,
        facebook: null,
        instagram: null,
      };

      try {
        // ========== FACEBOOK PAGE METRICS ==========

        // Page info
        const pageInfoResp = await fetch(
          `${GRAPH_API}/${page.pageId}?fields=name,fan_count,followers_count,talking_about_count,were_here_count,category,link,picture&access_token=${page.accessToken}`
        );
        if (pageInfoResp.ok) {
          pageMetrics.facebook = { ...(await pageInfoResp.json()) };
          pageMetrics.page_name = pageMetrics.facebook.name || page.pageName;
        } else {
          const err = await pageInfoResp.json();
          console.error(`Page info error for ${page.pageId}:`, err);
          pageMetrics.facebook = { error: err.error?.message || "Erro ao acessar página" };
          allMetrics.push(pageMetrics);
          continue;
        }

        // Page insights (last 28 days)
        // Fetch metrics individually to avoid (#100) error if one is not supported
        const insightsMetrics = [
          "page_post_engagements",
          "page_impressions",
          "page_engaged_users",
          "page_fan_adds"
        ];

        pageMetrics.facebook.insights = {};
        for (const metricName of insightsMetrics) {
          try {
            const insightsResp = await fetch(
              `${GRAPH_API}/${page.pageId}/insights?metric=${metricName}&period=day&since=${getDateDaysAgo(28)}&until=${getDateDaysAgo(0)}&access_token=${page.accessToken}`
            );
            
            if (insightsResp.ok) {
              const insightsData = await insightsResp.json();
              const metric = insightsData.data?.[0];
              if (metric) {
                const values = metric.values || [];
                const total = values.reduce((sum: number, v: any) => sum + (typeof v.value === "number" ? v.value : 0), 0);
                const latestValue = values[values.length - 1]?.value;
                
                // Calculate growth (last 7 days vs previous 7 days)
                const last7 = values.slice(-7);
                const prev7 = values.slice(-14, -7);
                const last7Total = last7.reduce((sum: number, v: any) => sum + (typeof v.value === "number" ? v.value : 0), 0);
                const prev7Total = prev7.reduce((sum: number, v: any) => sum + (typeof v.value === "number" ? v.value : 0), 0);
                const growth = prev7Total > 0 ? ((last7Total - prev7Total) / prev7Total) * 100 : 0;

                pageMetrics.facebook.insights[metricName] = {
                  total,
                  latest: typeof latestValue === "object" ? total : (latestValue ?? total),
                  growth: Math.round(growth),
                  daily: values.map((v: any) => ({
                    date: v.end_time?.split("T")[0],
                    value: typeof v.value === "number" ? v.value : 0,
                  })),
                };
              }
            } else {
              const err = await insightsResp.json();
              console.warn(`Metric ${metricName} not available for ${page.pageId}:`, err.error?.message);
            }
          } catch (e) {
            console.error(`Error fetching ${metricName}:`, e);
          }
        }

        // Recent posts with engagement
        const postsResp = await fetch(
          `${GRAPH_API}/${page.pageId}/posts?fields=id,message,created_time,shares,likes.limit(0).summary(true),comments.limit(0).summary(true),reactions.limit(0).summary(true),full_picture,permalink_url,type&limit=250&access_token=${page.accessToken}`
        );
        if (postsResp.ok) {
          const postsData = await postsResp.json();
          const posts = (postsData.data || []).map((p: any) => ({
            id: p.id,
            message: p.message?.substring(0, 100),
            created_time: p.created_time,
            type: p.type,
            permalink: p.permalink_url,
            image: p.full_picture,
            likes: p.likes?.summary?.total_count || 0,
            comments: p.comments?.summary?.total_count || 0,
            reactions: p.reactions?.summary?.total_count || 0,
            shares: p.shares?.count || 0,
          }));

          pageMetrics.facebook.posts = posts;

          // Aggregate post stats
          pageMetrics.facebook.post_stats = {
            total_posts: posts.length,
            total_likes: posts.reduce((s: number, p: any) => s + p.likes, 0),
            total_comments: posts.reduce((s: number, p: any) => s + p.comments, 0),
            total_reactions: posts.reduce((s: number, p: any) => s + p.reactions, 0),
            total_shares: posts.reduce((s: number, p: any) => s + p.shares, 0),
            avg_engagement: posts.length > 0
              ? Math.round(posts.reduce((s: number, p: any) => s + p.likes + p.comments + p.shares, 0) / posts.length)
              : 0,
          };
        }

        // ========== INSTAGRAM METRICS ==========
        // Get Instagram Business Account linked to this page
        const igResp = await fetch(
          `${GRAPH_API}/${page.pageId}?fields=instagram_business_account&access_token=${page.accessToken}`
        );
        if (igResp.ok) {
          const igData = await igResp.json();
          const igId = igData.instagram_business_account?.id;

          if (igId) {
            // Instagram profile info
            const igProfileResp = await fetch(
              `${GRAPH_API}/${igId}?fields=id,name,username,biography,followers_count,follows_count,media_count,profile_picture_url,website&access_token=${page.accessToken}`
            );
            if (igProfileResp.ok) {
              pageMetrics.instagram = { ...(await igProfileResp.json()) };
            }

            // Instagram insights — split by metric_type requirements
            // profile_views & website_clicks require metric_type=total_value (no time-series)
            // reach & follower_count use period=day time-series
            pageMetrics.instagram.insights = {};

            const processTimeSeries = (metric: any) => {
              const values = metric.values || [];
              const total = values.reduce((sum: number, v: any) => sum + (typeof v.value === "number" ? v.value : 0), 0);
              const last7 = values.slice(-7);
              const prev7 = values.slice(-14, -7);
              const last7Total = last7.reduce((sum: number, v: any) => sum + (typeof v.value === "number" ? v.value : 0), 0);
              const prev7Total = prev7.reduce((sum: number, v: any) => sum + (typeof v.value === "number" ? v.value : 0), 0);
              const growth = prev7Total > 0 ? ((last7Total - prev7Total) / prev7Total) * 100 : 0;
              pageMetrics.instagram.insights[metric.name] = {
                total,
                growth: Math.round(growth),
                daily: values.map((v: any) => ({
                  date: v.end_time?.split("T")[0],
                  value: typeof v.value === "number" ? v.value : 0,
                })),
              };
            };

            try {
              const daySeriesResp = await fetch(
                `${GRAPH_API}/${igId}/insights?metric=reach,follower_count&period=day&since=${getDateDaysAgo(28)}&until=${getDateDaysAgo(0)}&access_token=${page.accessToken}`
              );
              if (daySeriesResp.ok) {
                const data = await daySeriesResp.json();
                for (const metric of data.data || []) processTimeSeries(metric);
              } else {
                console.error("IG day insights error:", await daySeriesResp.text());
              }
            } catch (e) {
              console.error("IG day insights fetch failed:", e);
            }

            try {
              const totalValueResp = await fetch(
                `${GRAPH_API}/${igId}/insights?metric=profile_views,website_clicks&metric_type=total_value&period=day&since=${getDateDaysAgo(28)}&until=${getDateDaysAgo(0)}&access_token=${page.accessToken}`
              );
              if (totalValueResp.ok) {
                const data = await totalValueResp.json();
                for (const metric of data.data || []) {
                  const tv = metric.total_value?.value;
                  pageMetrics.instagram.insights[metric.name] = {
                    total: typeof tv === "number" ? tv : 0,
                    growth: 0,
                    daily: [],
                  };
                }
              } else {
                console.error("IG total_value insights error:", await totalValueResp.text());
              }
            } catch (e) {
              console.error("IG total_value insights fetch failed:", e);
            }


            // Instagram recent media
            const igMediaResp = await fetch(
              `${GRAPH_API}/${igId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=250&access_token=${page.accessToken}`
            );
            if (igMediaResp.ok) {
              const igMediaData = await igMediaResp.json();
              pageMetrics.instagram.posts = (igMediaData.data || []).map((m: any) => ({
                id: m.id,
                caption: m.caption?.substring(0, 100),
                type: m.media_type,
                media_url: m.media_url || m.thumbnail_url,
                permalink: m.permalink,
                timestamp: m.timestamp,
                likes: m.like_count || 0,
                comments: m.comments_count || 0,
              }));

              const igPosts = pageMetrics.instagram.posts;
              pageMetrics.instagram.post_stats = {
                total_posts: igPosts.length,
                total_likes: igPosts.reduce((s: number, p: any) => s + p.likes, 0),
                total_comments: igPosts.reduce((s: number, p: any) => s + p.comments, 0),
                avg_engagement: igPosts.length > 0
                  ? Math.round(igPosts.reduce((s: number, p: any) => s + p.likes + p.comments, 0) / igPosts.length)
                  : 0,
              };
            }

            // Instagram audience demographics
            const igDemoResp = await fetch(
              `${GRAPH_API}/${igId}/insights?metric=audience_city,audience_country,audience_gender_age&period=lifetime&access_token=${page.accessToken}`
            );
            if (igDemoResp.ok) {
              const demoData = await igDemoResp.json();
              pageMetrics.instagram.demographics = {};
              for (const metric of demoData.data || []) {
                pageMetrics.instagram.demographics[metric.name] = metric.values?.[0]?.value || {};
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error fetching metrics for page ${page.pageId}:`, err);
        pageMetrics.error = err instanceof Error ? err.message : "Erro desconhecido";
      }

      // Persist metrics to facebook_accounts table
      if (!pageMetrics.error) {
        await supabase
          .from("facebook_accounts")
          .update({
            last_metrics: pageMetrics,
            metrics_updated_at: new Date().toISOString()
          })
          .eq("user_id", userId)
          .eq("page_id", page.pageId);
      }

      allMetrics.push(pageMetrics);
    }

    return new Response(
      JSON.stringify({ success: true, pages: allMetrics }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fetch-meta-metrics error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}
