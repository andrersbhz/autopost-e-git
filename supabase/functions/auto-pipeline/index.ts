import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all users with auto_publish enabled
    const { data: users, error: usersErr } = await supabase
      .from("user_settings")
      .select("user_id, auto_publish, articles_per_day, categories")
      .eq("auto_publish", true);

    if (usersErr) throw usersErr;
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: "No users with auto_publish enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ userId: string; step: string; result: string }> = [];

    const processMagnific = async (userId: string, phase: string) => {
      try {
        const mediaResp = await fetch(`${supabaseUrl}/functions/v1/magnific-media`, {
          method: "POST",
          headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ action: "process-pending", userId }),
        });
        const raw = await mediaResp.text();
        let data: any = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: raw.slice(0, 180) }; }

        if (mediaResp.status === 503 && String(data?.error || "").includes("MAGNIFIC_API_KEY")) {
          results.push({ userId, step: `magnific-${phase}`, result: "not configured" });
          return;
        }
        if (!mediaResp.ok) throw new Error(data?.error || `HTTP ${mediaResp.status}`);

        const sync = data?.sync || {};
        const queued = data?.queued || {};
        results.push({
          userId,
          step: `magnific-${phase}`,
          result: `sync ${sync.completed || 0}/${sync.checked || 0}; queued ${queued.imagesQueued || 0} images, ${queued.videosQueued || 0} videos`,
        });
      } catch (error) {
        console.error(`[Pipeline] Magnific ${phase} error for ${userId}:`, error);
        results.push({ userId, step: `magnific-${phase}`, result: `error: ${error}` });
      }
    };

    for (const userSettings of users) {
      const userId = userSettings.user_id;
      const articlesPerDay = Math.max(userSettings.articles_per_day || 10, 1);
      const intervalMs = (24 / articlesPerDay) * 60 * 60 * 1000;
      console.log(`[Pipeline] Processing user: ${userId}`);

      const now = new Date();

      // Step 0: Synchronize previously queued media before publishing.
      // If Magnific is not configured/enabled this is a safe no-op.
      await processMagnific(userId, "pre-publish");

      // Step 1: Publish ready articles FIRST (before any rescheduling)
      try {
        const { data: magnificSettings } = await supabase
          .from("magnific_settings")
          .select("enabled, auto_generate_images, auto_generate_videos")
          .eq("user_id", userId)
          .maybeSingle();
        const requireImage = magnificSettings?.enabled === true && magnificSettings?.auto_generate_images === true;
        const requireVideo = magnificSettings?.enabled === true && magnificSettings?.auto_generate_videos === true;

        const { data: readyArticles } = await supabase
          .from("articles")
          .select("id, featured_image_url, generated_video_url")
          .eq("user_id", userId)
          .eq("status", "ready")
          .eq("is_approved", true)
          .not("scheduled_at", "is", null)
          .lte("scheduled_at", now.toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(10);

        const publishableArticles = (readyArticles || []).filter((article: any) =>
          (!requireImage || Boolean(article.featured_image_url)) &&
          (!requireVideo || Boolean(article.generated_video_url))
        );
        const mediaBlocked = (readyArticles?.length || 0) - publishableArticles.length;
        if (mediaBlocked > 0) {
          results.push({ userId, step: "auto-publish-media-gate", result: `${mediaBlocked} waiting for required media` });
        }

        if (publishableArticles.length > 0) {
          let published = 0;
          for (const article of publishableArticles) {
            try {
              const pubResp = await fetch(`${supabaseUrl}/functions/v1/publish-article`, {
                method: "POST",
                headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({ articleId: article.id, userId }),
              });
              if (pubResp.ok) {
                published++;
              } else {
                const errBody = await pubResp.text().catch(() => "");
                console.error(`[Pipeline] Publish failed for article ${article.id}: ${pubResp.status} ${errBody.substring(0, 200)}`);
              }
              await new Promise((r) => setTimeout(r, 3000));
            } catch (e) {
              console.error(`[Pipeline] Publish error article ${article.id}:`, e);
            }
          }
          results.push({ userId, step: "auto-publish", result: `${published}/${publishableArticles.length} published` });
          console.log(`[Pipeline] Published ${published}/${publishableArticles.length} articles for ${userId}`);
        } else {
          results.push({ userId, step: "auto-publish", result: "no articles ready" });
        }
      } catch (err) {
        console.error(`[Pipeline] Publish error for ${userId}:`, err);
        results.push({ userId, step: "auto-publish", result: `error: ${err}` });
      }

      // Step 2: Reagendar TODOS os itens vencidos ainda não publicados
      // (inclui 'ready' que falharam ao publicar, 'draft', 'scheduled', etc.)
      // Reconsulta após a etapa de publicação para pegar apenas os que sobraram.
      try {
        const { data: pendingArticles } = await supabase
          .from("articles")
          .select("id, scheduled_at, created_at, status")
          .eq("user_id", userId)
          .neq("status", "published")
          .not("scheduled_at", "is", null)
          .order("scheduled_at", { ascending: true })
          .order("created_at", { ascending: true });

        const nowTs = Date.now();
        const overdue = (pendingArticles || []).filter((a: any) => a.scheduled_at && new Date(a.scheduled_at).getTime() < nowTs);
        const future = (pendingArticles || []).filter((a: any) => a.scheduled_at && new Date(a.scheduled_at).getTime() >= nowTs);

        let queueCursor = future.length > 0
          ? new Date(future[future.length - 1].scheduled_at)
          : new Date(nowTs);

        let rescheduled = 0;
        for (const article of overdue) {
          queueCursor = new Date(Math.max(queueCursor.getTime(), nowTs) + intervalMs);
          const { error: updErr } = await supabase
            .from("articles")
            .update({ scheduled_at: queueCursor.toISOString() })
            .eq("id", article.id);
          if (updErr) {
            console.error(`[Pipeline] Reschedule update failed for ${article.id}:`, updErr);
          } else {
            rescheduled++;
          }
        }

        if (overdue.length > 0) {
          console.log(`[Pipeline] Reagendados ${rescheduled}/${overdue.length} artigos vencidos para ${userId}`);
          results.push({ userId, step: "reschedule-overdue", result: `${rescheduled}/${overdue.length} reagendados` });
        } else {
          results.push({ userId, step: "reschedule-overdue", result: "nenhum vencido" });
        }
      } catch (err) {
        console.error(`[Pipeline] Reschedule error for ${userId}:`, err);
        results.push({ userId, step: "reschedule-overdue", result: `error: ${err}` });
      }

      await new Promise((r) => setTimeout(r, 2000));

      // Step 3: Fetch trends
      try {
        const trendResp = await fetch(`${supabaseUrl}/functions/v1/fetch-trends`, {
          method: "POST",
          headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const trendData = await trendResp.json();
        results.push({ userId, step: "fetch-trends", result: trendData.message || "done" });
        console.log(`[Pipeline] Trends for ${userId}: ${trendData.message}`);
      } catch (err) {
        console.error(`[Pipeline] Trends error for ${userId}:`, err);
        results.push({ userId, step: "fetch-trends", result: `error: ${err}` });
      }

      await new Promise((r) => setTimeout(r, 2000));

      // Step 4: Generate articles
      try {
        const genResp = await fetch(`${supabaseUrl}/functions/v1/generate-articles`, {
          method: "POST",
          headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const rawBody = await genResp.text();
        let genData: any = {};
        try {
          genData = rawBody ? JSON.parse(rawBody) : {};
        } catch {
          genData = { error: `Non-JSON response (HTTP ${genResp.status}): ${rawBody.slice(0, 200)}` };
        }
        if (!genResp.ok && !genData.error) {
          genData.error = `HTTP ${genResp.status}`;
        }
        results.push({ userId, step: "generate-articles", result: genData.message || genData.error || "done" });
        console.log(`[Pipeline] Articles for ${userId}: ${genData.message || genData.error}`);
      } catch (err) {
        console.error(`[Pipeline] Generation error for ${userId}:`, err);
        results.push({ userId, step: "generate-articles", result: `error: ${err}` });
      }

      // Step 5: Queue media for newly generated articles and sync anything that finished meanwhile.
      await processMagnific(userId, "post-generate");
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("auto-pipeline error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
