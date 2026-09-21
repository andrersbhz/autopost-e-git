import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function decryptField(supabase: any, val: string | null, encKey: string): Promise<string | null> {
  if (!val || !val.startsWith("ENCRYPTED:")) return val;
  const { data, error } = await supabase.rpc("decrypt_credential", { val, enc_key: encKey });
  if (error) { console.error("Decrypt error:", error); return null; }
  return data || val;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId, dateRange } = await req.json();
    if (!userId) throw new Error("userId is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const encKey = Deno.env.get("DB_ENCRYPTION_KEY") || "";

    const { data: settings } = await supabase
      .from("user_settings")
      .select("wordpress_url, wordpress_username, wordpress_app_password")
      .eq("user_id", userId)
      .single();

    if (!settings?.wordpress_url || !settings?.wordpress_username || !settings?.wordpress_app_password) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          jetpack: { available: false }, 
          warning: "WordPress não configurado. Vá para Configurações para conectar." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const password = await decryptField(supabase, settings.wordpress_app_password, encKey);
    if (!password) throw new Error("Não foi possível decriptar a senha");

    let wpUrl = settings.wordpress_url.replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(wpUrl)) wpUrl = `https://${wpUrl}`;
    const auth = btoa(`${settings.wordpress_username}:${password}`);
    const headers = { Authorization: `Basic ${auth}` };

    const result: Record<string, any> = { available: false };

    // 1. Jetpack site stats summary
    try {
      const res = await fetch(`${wpUrl}/wp-json/wpcom/v2/stats/summary`, { headers });
      if (res.ok) {
        const stats = await res.json();
        result.available = true;
        result.summary = {
          views: stats.views || 0,
          visitors: stats.visitors || 0,
          likes: stats.likes || 0,
          comments: stats.comments || 0,
          followers: stats.followers || 0,
          shares: stats.shares || 0,
          posts: stats.posts || 0,
          views_today: stats.views_today || 0,
          views_yesterday: stats.views_yesterday || 0,
          views_best_day: stats.views_best_day || null,
          views_best_day_total: stats.views_best_day_total || 0,
        };
      }
    } catch (e) { console.log("Stats summary not available:", e); }

    // 2. Jetpack top posts (last 7 days)
    try {
      const res = await fetch(`${wpUrl}/wp-json/wpcom/v2/stats/top-posts?num=7`, { headers });
      if (res.ok) {
        const data = await res.json();
        result.available = true;
        if (data.days) {
          const allPosts: Record<string, { title: string; views: number; url: string }> = {};
          for (const day of Object.values(data.days) as any[]) {
            if (day.postviews) {
              for (const pv of day.postviews) {
                const key = String(pv.id);
                if (!allPosts[key]) {
                  allPosts[key] = { title: pv.title || "Sem título", views: 0, url: pv.href || "" };
                }
                allPosts[key].views += pv.views || 0;
              }
            }
          }
          result.topPosts = Object.values(allPosts).sort((a, b) => b.views - a.views).slice(0, 10);
        }
      }
    } catch (e) { console.log("Top posts not available:", e); }

    // 3. Jetpack daily views (last 30 days or custom range)
    try {
      let quantity = 30;
      if (dateRange?.from && dateRange?.to) {
        const start = new Date(dateRange.from);
        const end = new Date(dateRange.to);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        quantity = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        // Limit to 90 days to avoid API timeouts
        quantity = Math.min(quantity, 90);
      }

      const res = await fetch(`${wpUrl}/wp-json/wpcom/v2/stats/visits?unit=day&quantity=${quantity}${dateRange?.to ? `&date=${dateRange.to}` : ""}`, { headers });
      if (res.ok) {
        const data = await res.json();
        result.available = true;
        if (data.data) {
          result.dailyViews = data.data.map((d: any) => ({
            date: d[0],
            views: d[1] || 0,
          }));
          
          // If we have a range, filter explicitly to be sure
          if (dateRange?.from) {
            result.dailyViews = result.dailyViews.filter((d: any) => d.date >= dateRange.from);
          }
        }
      }
    } catch (e) { console.log("Daily views not available:", e); }

    // 4. Referrers
    try {
      const res = await fetch(`${wpUrl}/wp-json/wpcom/v2/stats/referrers?num=7`, { headers });
      if (res.ok) {
        const data = await res.json();
        result.available = true;
        if (data.days) {
          const refMap: Record<string, number> = {};
          for (const day of Object.values(data.days) as any[]) {
            if (day.groups) {
              for (const g of day.groups) {
                const name = g.name || g.group || "Desconhecido";
                refMap[name] = (refMap[name] || 0) + (g.total || g.views || 0);
              }
            }
          }
          result.referrers = Object.entries(refMap)
            .map(([name, views]) => ({ name, views }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);
        }
      }
    } catch (e) { console.log("Referrers not available:", e); }

    // 5. Search terms
    try {
      const res = await fetch(`${wpUrl}/wp-json/wpcom/v2/stats/search-terms?num=7`, { headers });
      if (res.ok) {
        const data = await res.json();
        result.available = true;
        if (data.days) {
          const termMap: Record<string, number> = {};
          for (const day of Object.values(data.days) as any[]) {
            if (day.search_terms) {
              for (const t of day.search_terms) {
                const term = t.term || "Desconhecido";
                termMap[term] = (termMap[term] || 0) + (t.views || 0);
              }
            }
          }
          result.searchTerms = Object.entries(termMap)
            .map(([term, views]) => ({ term, views }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 15);
        }
      }
    } catch (e) { console.log("Search terms not available:", e); }

    // 6. Country views
    try {
      const res = await fetch(`${wpUrl}/wp-json/wpcom/v2/stats/country-views?num=7`, { headers });
      if (res.ok) {
        const data = await res.json();
        result.available = true;
        if (data.days) {
          const countryMap: Record<string, number> = {};
          for (const day of Object.values(data.days) as any[]) {
            if (day.views) {
              for (const cv of day.views) {
                const name = cv.country_full || cv.country || "Desconhecido";
                countryMap[name] = (countryMap[name] || 0) + (cv.views || 0);
              }
            }
          }
          result.countries = Object.entries(countryMap)
            .map(([country, views]) => ({ country, views }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);
        }
      }
    } catch (e) { console.log("Country views not available:", e); }

    // 7. Publicize connections
    try {
      const res = await fetch(`${wpUrl}/wp-json/jetpack/v4/publicize/connections`, { headers });
      if (res.ok) {
        const connections = await res.json();
        if (Array.isArray(connections)) {
          result.publicizeConnections = connections.map((c: any) => ({
            service: c.service || c.label || "unknown",
            external_name: c.external_name || c.external_display || "",
            status: c.status || "ok",
          }));
        }
      }
    } catch (e) { console.log("Publicize not available:", e); }

    return new Response(JSON.stringify({ success: true, jetpack: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("fetch-jetpack-stats error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
