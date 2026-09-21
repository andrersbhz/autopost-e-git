import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_GRAPH = "https://graph.facebook.com/v21.0";
const THREADS_GRAPH = "https://graph.threads.net/v1.0";

function cleanText(value: string | null | undefined) {
  return (value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function buildArticleCaption(article: any, linkUrl: string | null) {
  const title = cleanText(article.title);
  const summary = cleanText(article.excerpt || article.meta_description || article.content).slice(0, 1500);
  return [title, summary, linkUrl ? `Leia mais: ${linkUrl}` : null].filter(Boolean).join("\n\n").slice(0, 2100);
}

async function decryptField(supabase: any, value: string | null) {
  if (!value || !value.startsWith("ENCRYPTED:")) return value;
  const { data } = await supabase.rpc("decrypt_credential", { val: value, enc_key: "" });
  return data || value;
}

async function metaJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!response.ok) throw new Error(body?.error?.message || body?.raw || `HTTP ${response.status}`);
  return body;
}

async function publishInstagram(igId: string, token: string, caption: string, imageUrl: string) {
  const container = await metaJson(`${META_GRAPH}/${igId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
  });

  for (let attempt = 0; attempt < 12; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 1200 : 2200));
    const status = await metaJson(
      `${META_GRAPH}/${container.id}?fields=status_code,status&access_token=${encodeURIComponent(token)}`
    );
    if (status.status_code === "FINISHED") break;
    if (status.status_code === "ERROR" || attempt === 11) throw new Error(status.status || "Falha ao processar mídia no Instagram");
  }

  const published = await metaJson(`${META_GRAPH}/${igId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: container.id, access_token: token }),
  });

  let permalink: string | null = null;
  try {
    const media = await metaJson(`${META_GRAPH}/${published.id}?fields=permalink&access_token=${encodeURIComponent(token)}`);
    permalink = media.permalink || null;
  } catch { /* best effort */ }
  return { id: published.id as string, permalink };
}

async function publishFacebook(pageId: string, token: string, caption: string, linkUrl: string | null) {
  const body: Record<string, string> = { message: caption, access_token: token };
  if (linkUrl) body.link = linkUrl;
  const published = await metaJson(`${META_GRAPH}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { id: published.id as string, permalink: `https://www.facebook.com/${published.id}` };
}

async function publishThreads(userId: string, token: string, caption: string, imageUrl: string | null, linkUrl: string | null) {
  const text = [caption, linkUrl && !caption.includes(linkUrl) ? linkUrl : null].filter(Boolean).join("\n\n").slice(0, 500);
  const createBody: Record<string, string> = {
    media_type: imageUrl ? "IMAGE" : "TEXT",
    text,
    access_token: token,
  };
  if (imageUrl) createBody.image_url = imageUrl;

  const container = await metaJson(`${THREADS_GRAPH}/${userId}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(createBody),
  });
  const published = await metaJson(`${THREADS_GRAPH}/${userId}/threads_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: container.id, access_token: token }),
  });
  return { id: published.id as string, permalink: null as string | null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

    const token = authHeader.replace("Bearer ", "").trim();
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // Chamadas internas (pipeline automático via publish-article) usam a service role key.
    const isServiceCall = token === serviceKey;

    const body = await req.json();
    let userId: string | null = body.userId || null;

    if (!isServiceCall) {
      const authed = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: auth } = await authed.auth.getUser(token);
      if (!auth?.user) throw new Error("Unauthorized");
      userId = userId || auth.user.id;
      if (userId !== auth.user.id) throw new Error("Forbidden");
    } else if (!userId) {
      throw new Error("userId é obrigatório em chamadas internas");
    }


    const articleId: string | null = body.articleId || null;
    const targetKeys: string[] = Array.isArray(body.targetKeys) ? body.targetKeys : [];
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let article: any = null;
    let caption = cleanText(body.content?.caption);
    let imageUrl: string | null = body.content?.imageUrl || null;
    let linkUrl: string | null = body.content?.linkUrl || null;

    if (articleId) {
      const { data } = await admin.from("articles").select("*").eq("id", articleId).eq("user_id", userId).maybeSingle();
      if (!data) throw new Error("Artigo não encontrado");
      article = data;
      imageUrl = imageUrl || article.featured_image_url || null;
      if (!linkUrl) {
        const { data: log } = await admin.from("publish_log")
          .select("published_url")
          .eq("article_id", articleId)
          .eq("platform", "wordpress")
          .eq("status", "success")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        linkUrl = log?.published_url || null;
      }
      if (!caption) caption = buildArticleCaption(article, linkUrl);
    }

    if (!caption) throw new Error("Legenda obrigatória");
    if (imageUrl?.startsWith("data:")) throw new Error("A imagem precisa ter uma URL pública");

    const { data: metaAccounts } = await admin.from("facebook_accounts").select("*").eq("user_id", userId).eq("is_active", true);
    const { data: threadsAccounts } = await admin.from("threads_accounts").select("*").eq("user_id", userId).eq("is_active", true);

    const results: Array<{ accountKey: string; target: string; channel: string; ok: boolean; id?: string; permalink?: string | null; error?: string }> = [];
    const wants = (key: string) => targetKeys.length === 0 || targetKeys.includes(key);

    const saveLog = async (platform: string, key: string, name: string, ok: boolean, remoteId?: string, permalink?: string | null, error?: string) => {
      await admin.from("social_publications").insert({
        user_id: userId,
        article_id: articleId,
        platform,
        account_key: key,
        account_name: name,
        status: ok ? "success" : "failed",
        remote_id: remoteId || null,
        permalink: permalink || null,
        caption,
        image_url: imageUrl,
        link_url: linkUrl,
        error_message: error || null,
        published_at: ok ? new Date().toISOString() : null,
      }).then(() => undefined, () => undefined);
    };

    for (const account of metaAccounts || []) {
      const token = await decryptField(admin, account.access_token);
      if (!token) continue;

      const fbKey = `facebook:${account.page_id}`;
      if (account.facebook_enabled !== false && wants(fbKey)) {
        try {
          const published = await publishFacebook(account.page_id, token, caption, linkUrl);
          results.push({ accountKey: fbKey, target: account.page_name || account.page_id, channel: "facebook", ok: true, ...published });
          await saveLog("facebook", fbKey, account.page_name || account.page_id, true, published.id, published.permalink);
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e);
          results.push({ accountKey: fbKey, target: account.page_name || account.page_id, channel: "facebook", ok: false, error });
          await saveLog("facebook", fbKey, account.page_name || account.page_id, false, undefined, null, error);
        }
      }

      if (account.instagram_account_id && account.instagram_enabled !== false) {
        const igKey = `instagram:${account.instagram_account_id}`;
        if (wants(igKey)) {
          if (!imageUrl) {
            const error = "Instagram exige uma imagem pública";
            results.push({ accountKey: igKey, target: account.page_name, channel: "instagram", ok: false, error });
            await saveLog("instagram", igKey, account.page_name, false, undefined, null, error);
          } else {
            try {
              const published = await publishInstagram(account.instagram_account_id, token, caption, imageUrl);
              results.push({ accountKey: igKey, target: account.page_name, channel: "instagram", ok: true, ...published });
              await saveLog("instagram", igKey, account.page_name, true, published.id, published.permalink);
              if (articleId) await admin.from("articles").update({ instagram_post_id: published.id }).eq("id", articleId);
            } catch (e) {
              const error = e instanceof Error ? e.message : String(e);
              results.push({ accountKey: igKey, target: account.page_name, channel: "instagram", ok: false, error });
              await saveLog("instagram", igKey, account.page_name, false, undefined, null, error);
            }
          }
        }
      }
    }

    for (const account of threadsAccounts || []) {
      const key = `threads:${account.id}`;
      if (!wants(key)) continue;
      const token = await decryptField(admin, account.access_token);
      try {
        const published = await publishThreads(account.threads_user_id, token || "", caption, imageUrl, linkUrl);
        results.push({ accountKey: key, target: account.username ? `@${account.username}` : account.threads_user_id, channel: "threads", ok: true, ...published });
        await saveLog("threads", key, account.username || account.threads_user_id, true, published.id, published.permalink);
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        results.push({ accountKey: key, target: account.username ? `@${account.username}` : account.threads_user_id, channel: "threads", ok: false, error });
        await saveLog("threads", key, account.username || account.threads_user_id, false, undefined, null, error);
      }
    }

    const okCount = results.filter((r) => r.ok).length;
    return new Response(JSON.stringify({
      success: okCount > 0,
      message: results.length ? `Publicado com sucesso em ${okCount}/${results.length} destino(s).` : "Nenhuma conta conectada foi selecionada.",
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("publish-social error:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
