import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GRAPH_API = "https://graph.facebook.com/v21.0";

async function decryptField(supabase: any, val: string | null): Promise<string | null> {
  if (!val) return val;
  if (!val.startsWith("ENCRYPTED:")) return val;
  const { data } = await supabase.rpc("decrypt_credential", { val, enc_key: "" });
  return data || val;
}

function cleanText(s: string | null): string {
  return (s || "").replace(/<[^>]+>/g, "").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function buildCaption(article: any, wpLink: string | null): string {
  const title = cleanText(article.title);
  const excerpt = cleanText(article.excerpt || "");
  const body = cleanText(article.content || "");
  let summary = excerpt;
  if (!summary && body) {
    summary = body.split(/(?<=[.!?])\s+/).slice(0, 3).join(" ");
  }
  const divider = "━━━━━━━━━━━━━━━━━━";
  const cta = wpLink ? `📖 Leia o artigo completo:\n${wpLink}` : `💬 Compartilhe sua opinião!`;
  const reserved = (cta?.length || 0) + 60;
  const maxSummary = 2000 - title.length - reserved;
  const trimmed = summary.length > maxSummary ? summary.substring(0, maxSummary - 3).trimEnd() + "..." : summary;
  return [title.toUpperCase(), divider, trimmed, "", cta, "", "👉 Siga para mais."].filter(Boolean).join("\n").trim();
}

async function generateHashtags(article: any): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const fallback = `#noticias #atualidades #${(article.category || "geral").toString().toLowerCase().replace(/\s+/g, "")} #brasil #trending`;
  if (!apiKey) return fallback;
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: `Gere EXATAMENTE 20 hashtags pt-BR para Instagram sobre: "${article.title}". Apenas hashtags separadas por espaço.` }],
      }),
    });
    if (!resp.ok) return fallback;
    const data = await resp.json();
    const text: string = data?.choices?.[0]?.message?.content || "";
    const tags = (text.match(/#[\p{L}0-9_]+/gu) || []).slice(0, 25).join(" ");
    return tags || fallback;
  } catch {
    return fallback;
  }
}

async function publishContainer(containerId: string, igId: string, token: string): Promise<string | null> {
  for (let i = 0; i < 15; i++) {
    const r = await fetch(`${GRAPH_API}/${containerId}?fields=status_code&access_token=${encodeURIComponent(token)}`);
    if (r.ok) {
      const s = await r.json();
      if (s.status_code === "FINISHED") break;
      if (s.status_code === "ERROR") return null;
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  const pubResp = await fetch(`${GRAPH_API}/${igId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: token }),
  });
  if (!pubResp.ok) {
    console.error("publish failed:", await pubResp.text());
    return null;
  }
  const d = await pubResp.json();
  return d.id || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId, pageId, articleId } = await req.json();
    if (!userId || !pageId) throw new Error("userId and pageId required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1) Find the Facebook page with linked IG
    const { data: account } = await supabase
      .from("facebook_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("page_id", pageId)
      .single();

    if (!account) throw new Error("Página não encontrada");

    let igId = account.instagram_account_id;
    if (!igId && account.last_metrics?.instagram?.id) {
      igId = account.last_metrics.instagram.id;
      await supabase.from("facebook_accounts").update({ instagram_account_id: igId }).eq("id", account.id);
    }
    if (!igId) throw new Error("Esta página não tem Instagram Business vinculado");

    const token = (await decryptField(supabase, account.access_token)) || "";
    if (!token) throw new Error("Token de acesso não disponível");

    // 2) Pick article: provided or latest published with image
    let article: any = null;
    if (articleId) {
      const { data } = await supabase.from("articles").select("*").eq("id", articleId).eq("user_id", userId).single();
      article = data;
    } else {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("user_id", userId)
        .not("featured_image_url", "is", null)
        .not("featured_image_url", "ilike", "data:%")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      article = data;
    }
    if (!article) throw new Error("Nenhum artigo publicado com imagem encontrado");
    if (!article.featured_image_url || article.featured_image_url.startsWith("data:")) {
      throw new Error("Artigo sem imagem pública");
    }

    // 3) WP link if exists
    const { data: wpLog } = await supabase
      .from("publish_log")
      .select("published_url")
      .eq("article_id", article.id)
      .eq("platform", "wordpress")
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const wpLink = wpLog?.published_url || null;

    const caption = buildCaption(article, wpLink);
    const hashtags = await generateHashtags(article);

    // 4) Create container
    const containerResp = await fetch(`${GRAPH_API}/${igId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: article.featured_image_url,
        caption,
        alt_text: cleanText(article.title).substring(0, 240),
        access_token: token,
      }),
    });
    if (!containerResp.ok) {
      const err = await containerResp.text();
      throw new Error(`Falha ao criar container: ${err.substring(0, 300)}`);
    }
    const container = await containerResp.json();

    const postId = await publishContainer(container.id, igId, token);
    if (!postId) throw new Error("Falha ao publicar no Instagram");

    // First comment with hashtags
    try {
      await fetch(`${GRAPH_API}/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: hashtags, access_token: token }),
      });
    } catch {}

    // Get permalink
    let permalink: string | null = null;
    try {
      const r = await fetch(`${GRAPH_API}/${postId}?fields=permalink&access_token=${encodeURIComponent(token)}`);
      if (r.ok) permalink = (await r.json()).permalink || null;
    } catch {}

    await supabase.from("publish_log").insert({
      user_id: userId,
      article_id: article.id,
      platform: "instagram",
      status: "success",
      published_url: permalink || `https://www.instagram.com/p/${postId}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Publicado em @${account.last_metrics?.instagram?.username || igId}`,
        post_id: postId,
        permalink,
        article_title: article.title,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("test-instagram-post error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
