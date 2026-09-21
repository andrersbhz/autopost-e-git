import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function decryptField(supabase: any, val: string | null, encKey: string): Promise<string | null> {
  if (!val || !val.startsWith("ENCRYPTED:")) return val;
  const { data } = await supabase.rpc("decrypt_credential", { val, enc_key: encKey });
  return data || val;
}

// Normaliza texto para comparação (sem acentos, sem pontuação, minúsculo)
function norm(s: string): string {
  return (s || "")
    .replace(/<[^>]*>/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Remove o título duplicado do corpo do artigo.
 * O WordPress já renderiza o título do post, então nenhum H1 deve ir no conteúdo.
 */
function stripDuplicateTitle(rawContent: string, title: string): string {
  let content = (rawContent || "").trim();
  if (!content) return content;

  const target = norm(title);
  let changed = true;
  let guard = 0;

  while (changed && guard < 5) {
    changed = false;
    guard++;
    content = content.trim();

    // 1) Markdown: "# Título" na primeira linha
    const mdMatch = content.match(/^#{1,3}\s*(.+?)\s*(?:\n|$)/);
    if (mdMatch && (norm(mdMatch[1]) === target || !target)) {
      content = content.slice(mdMatch[0].length).trim();
      changed = true;
      continue;
    }

    // 2) HTML: <h1>..</h1> / <h2>..</h2> logo no início igual ao título
    const hMatch = content.match(/^<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/i);
    if (hMatch && (hMatch[1] === "1" || norm(hMatch[2]) === target)) {
      content = content.slice(hMatch[0].length).trim();
      changed = true;
      continue;
    }

    // 3) Parágrafo inicial que é só o título (às vezes em <strong>)
    const pMatch = content.match(/^<p[^>]*>\s*(?:<strong>)?([\s\S]*?)(?:<\/strong>)?\s*<\/p>/i);
    if (pMatch && target && norm(pMatch[1]) === target) {
      content = content.slice(pMatch[0].length).trim();
      changed = true;
      continue;
    }

    // 4) Primeira linha em texto puro idêntica ao título
    const firstLine = content.split("\n")[0];
    if (target && firstLine && norm(firstLine) === target && firstLine.length < 200) {
      content = content.slice(firstLine.length).trim();
      changed = true;
    }
  }

  // Qualquer H1 remanescente vira H2 (SEO: um único H1 = título do post)
  content = content
    .replace(/<h1(\s[^>]*)?>/gi, "<h2$1>")
    .replace(/<\/h1>/gi, "</h2>")
    .replace(/^#\s+/gm, "## ");

  return content.trim();
}

function buildSlug(source: string): string {
  return (source || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let claimCtx: { supabase: any; articleId: string } | null = null;

  try {
    const { articleId, userId } = await req.json();
    if (!articleId || !userId) throw new Error("articleId and userId are required");


    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const encKey = Deno.env.get("DB_ENCRYPTION_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch article
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("*")
      .eq("id", articleId)
      .eq("user_id", userId)
      .single();

    if (articleError || !article) throw new Error("Artigo não encontrado: " + (articleError?.message || ""));

    // --- Idempotência: nunca republicar o mesmo artigo ---
    if (article.wordpress_post_id) {
      console.log(`[publish-article] Artigo ${articleId} já possui post no WordPress (${article.wordpress_post_id}). Ignorando republicação.`);
      await supabase.from("articles").update({ status: "published" }).eq("id", articleId);
      return new Response(
        JSON.stringify({ success: true, skipped: true, message: "Artigo já publicado no WordPress.", wpPostId: article.wordpress_post_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // "publishing" travado há mais de 10 minutos é considerado órfão e pode ser retomado
    const STALE_MS = 10 * 60 * 1000;
    const isStalePublishing =
      article.status === "publishing" &&
      article.updated_at &&
      Date.now() - new Date(article.updated_at).getTime() > STALE_MS;

    if (article.status === "published" || (article.status === "publishing" && !isStalePublishing)) {
      console.log(`[publish-article] Artigo ${articleId} em estado "${article.status}". Ignorando execução duplicada.`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, message: `Publicação já em andamento/concluída (${article.status}).` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (isStalePublishing) {
      console.warn(`[publish-article] Artigo ${articleId} preso em "publishing" há mais de 10 min. Retomando.`);
    }


    // Fetch settings
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (settingsError || !settings) throw new Error("Configurações não encontradas. Vá para a página de Configurações.");

    if (!settings.wordpress_url) throw new Error("URL do WordPress não configurada. Vá para Configurações.");
    if (!settings.wordpress_app_password) throw new Error("Senha de Aplicativo do WordPress não configurada. Vá para Configurações.");
    if (!settings.wordpress_username?.trim()) {
      throw new Error("Usuário do WordPress não configurado. Use seu usuário real do WordPress junto com uma Senha de Aplicativo.");
    }

    // Claim atômico: só um processo consegue mover o artigo para "publishing"
    const { data: claimed } = await supabase
      .from("articles")
      .update({ status: "publishing" })
      .eq("id", articleId)
      .eq("status", article.status)
      .is("wordpress_post_id", null)
      .select("id");

    if (!claimed || claimed.length === 0) {
      console.log(`[publish-article] Artigo ${articleId} já foi capturado por outra execução. Abortando.`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, message: "Outra execução já está publicando este artigo." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // A partir daqui somos donos do claim: qualquer erro deve liberar o artigo
    claimCtx = { supabase, articleId };



    // Prepare WordPress connection
    let wpUrl = settings.wordpress_url.replace(/\/$/, "");
    if (!/^https?:\/\//i.test(wpUrl)) wpUrl = `https://${wpUrl}`;
    // Force HTTPS to prevent redirect stripping POST body
    wpUrl = wpUrl.replace(/^http:\/\//i, "https://");
    const normalizedUsername = settings.wordpress_username.trim();
    const hasPlugin = normalizedUsername.toLowerCase() === 'autoblog-ai';
    const wpPassword = await decryptField(supabase, settings.wordpress_app_password, encKey) || settings.wordpress_app_password;
    console.log(`WP Config: url=${wpUrl}, user=${normalizedUsername}, pwd_len=${wpPassword?.length}, pwd_start=${wpPassword?.substring(0,4)}`);

    // --- Helper: encontra ou cria a categoria no WordPress (dinâmico, sem duplicar) ---
    async function resolveWpCategory(authHeader: string, categoryName: string): Promise<number | null> {
      const raw = (categoryName || "").trim();
      if (!raw) return null;

      const categoryLabels: Record<string, string> = {
        esportes: "Esportes",
        politica: "Política",
        policia: "Polícia",
        saude: "Saúde e Bem-Estar",
        celebridades: "Celebridades",
        financas: "Finanças",
      };
      const label = categoryLabels[norm(raw).replace(/\s+/g, "")] || raw;
      const slug = buildSlug(raw);
      const target = norm(label);

      try {
        // 1) Lista todas as categorias existentes e compara sem acento/caixa
        const all: any[] = [];
        for (let page = 1; page <= 5; page++) {
          const resp = await fetch(`${wpUrl}/wp-json/wp/v2/categories?per_page=100&page=${page}`, {
            headers: { Authorization: authHeader },
          });
          if (!resp.ok) break;
          const cats = await resp.json();
          if (!Array.isArray(cats) || cats.length === 0) break;
          all.push(...cats);
          if (cats.length < 100) break;
        }

        const match = all.find(
          (c: any) => c.slug === slug || norm(c.name) === target || norm(c.slug) === target,
        );
        if (match) {
          console.log(`Categoria WP encontrada: ${match.name} (id=${match.id})`);
          return match.id;
        }

        // 2) Cria a categoria quando não existe
        const createResp = await fetch(`${wpUrl}/wp-json/wp/v2/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authHeader },
          body: JSON.stringify({ name: label, slug }),
        });
        if (createResp.ok) {
          const newCat = await createResp.json();
          console.log(`Categoria WP criada: ${newCat.name} (id=${newCat.id})`);
          return newCat.id;
        }

        // 3) term_exists: reaproveita o id devolvido pelo WordPress
        const errJson = await createResp.json().catch(() => null);
        const existingId = errJson?.data?.term_id ?? errJson?.data?.resource_id;
        if (errJson?.code === "term_exists" && existingId) {
          console.log(`Categoria WP já existia (term_exists): id=${existingId}`);
          return existingId;
        }
        console.error("Falha ao criar categoria WP:", JSON.stringify(errJson)?.substring(0, 200));
      } catch (err) { console.error("Category resolution error:", err); }
      return null;
    }


    // --- Helper: publish via standard REST API ---
    async function publishStandard(authHeader: string) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "X-WP-Nonce": "", // Some servers require this even if empty to allow REST
      };
      // O título vai APENAS no campo title do WordPress — sem H1 no conteúdo
      const cleanContent = stripDuplicateTitle(article.content || "", article.title || "");

      const body: Record<string, unknown> = {
        title: article.title,
        content: cleanContent,
        status: "publish",
        excerpt: article.excerpt || article.meta_description || "",
      };

      // Resolve WordPress category
      const wpCategoryId = await resolveWpCategory(authHeader, article.category);
      if (wpCategoryId) {
        body.categories = [wpCategoryId];
      }

      // Slug SEO: prioriza slug salvo, depois focus keyword, depois título
      const slug = buildSlug(article.slug || article.focus_keyword || article.seo_keyword || article.title || "");
      if (slug) body.slug = slug;

      // Yoast SEO já no POST inicial (quando os metas estão expostos na REST API)
      const yoast: Record<string, string> = {};
      const yTitle = article.meta_title || article.seo_title;
      const yKw = article.focus_keyword || article.seo_keyword;
      if (yTitle) yoast._yoast_wpseo_title = yTitle;
      if (article.meta_description) yoast._yoast_wpseo_metadesc = article.meta_description;
      if (yKw) yoast._yoast_wpseo_focuskw = yKw;
      if (Object.keys(yoast).length > 0) body.meta = yoast;


      // Featured image upload with alt text
      if (article.featured_image_url) {
        try {
          let featuredMediaId = null;
          const imgSlug = (article.seo_keyword || article.title || "image").replace(/[^a-zA-Z0-9]/g, "-").substring(0, 50);
          
          let uploadedMediaId = null;
          if (article.featured_image_url.startsWith("data:image")) {
            const base64Data = article.featured_image_url.split(",")[1];
            const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
            const mediaResponse = await fetch(`${wpUrl}/wp-json/wp/v2/media`, {
              method: "POST",
              headers: { ...headers, "Content-Type": "image/png", "Content-Disposition": `attachment; filename="${imgSlug}.png"` },
              body: binaryData,
            });
            if (mediaResponse.ok) { uploadedMediaId = (await mediaResponse.json()).id; }
          } else if (article.featured_image_url.startsWith("http")) {
            const imgResp = await fetch(article.featured_image_url);
            if (imgResp.ok) {
              const imgData = new Uint8Array(await imgResp.arrayBuffer());
              const contentType = imgResp.headers.get("content-type") || "image/jpeg";
              const ext = contentType.includes("png") ? "png" : "jpg";
              const mediaResponse = await fetch(`${wpUrl}/wp-json/wp/v2/media`, {
                method: "POST",
                headers: { ...headers, "Content-Type": contentType, "Content-Disposition": `attachment; filename="${imgSlug}.${ext}"` },
                body: imgData,
              });
              if (mediaResponse.ok) { uploadedMediaId = (await mediaResponse.json()).id; }
            }
          }
          
          if (uploadedMediaId) {
            featuredMediaId = uploadedMediaId;
            body.featured_media = featuredMediaId;
            
            // Update media with alt text and caption for SEO
            const altText = article.seo_keyword ? `${article.seo_keyword} - ${article.title}` : article.title;
            try {
              await fetch(`${wpUrl}/wp-json/wp/v2/media/${featuredMediaId}`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  alt_text: altText,
                  caption: article.excerpt || article.meta_description || "",
                  description: article.title,
                }),
              });
            } catch (altErr) { console.error("Failed to set image alt text:", altErr); }
          }
        } catch (imgErr) { console.error("WP image upload failed:", imgErr); }
      }

      const endpoint = `${wpUrl}/wp-json/wp/v2/posts`;
      console.log(`POST (standard) ${endpoint}`);
      let resp = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body) });

      // Se o Yoast não expõe os metas na REST API, reenvia sem "meta"
      if (!resp.ok && body.meta) {
        const errText = await resp.clone().text();
        if (errText.includes("rest_invalid_param") || errText.includes("meta")) {
          console.log("Metas Yoast não registrados na REST API — reenviando sem meta.");
          const { meta: _omit, ...noMeta } = body as Record<string, unknown>;
          resp = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(noMeta) });
        }
      }
      return resp;
    }


    // --- Determine auth and attempt publish ---
    let wpResponse: Response;

    try {
      if (hasPlugin) {
        // Try plugin first
        const pluginEndpoint = `${wpUrl}/wp-json/autoblog-ai/v1/publish`;
        const pluginBody = {
          title: article.title,
          content: stripDuplicateTitle(article.content || "", article.title || ""),
          excerpt: article.excerpt || article.meta_description || "",
          status: "publish",
          seo_title: article.meta_title || article.seo_title || article.title,
          meta_description: article.meta_description || "",
          seo_keyword: article.focus_keyword || article.seo_keyword || "",
          slug: buildSlug(article.slug || article.focus_keyword || article.seo_keyword || article.title || ""),
          featured_image_url: article.featured_image_url || "",
          categories: [article.category],
        };

        console.log(`POST (plugin) ${pluginEndpoint}`);
        wpResponse = await fetch(pluginEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-AutoBlog-Key": wpPassword },
          body: JSON.stringify(pluginBody),
        });

        if (wpResponse.status === 404) {
          throw new Error("O plugin AutoBlog AI Connector não está instalado nesse WordPress. Conecte usando usuário real do WordPress + Senha de Aplicativo.");
        }
      } else {
        const auth = btoa(`${normalizedUsername}:${wpPassword}`);
        wpResponse = await publishStandard(`Basic ${auth}`);
      }
    } catch (fetchErr: any) {
      console.error("[publish-article] Fetch network error:", fetchErr);
      throw new Error(`Falha na conexão: Não foi possível alcançar o servidor WordPress. Verifique se a URL "${wpUrl}" está correta e se o site permite conexões externas. Erro: ${fetchErr.message}`);
    }

    const responseText = await wpResponse.text();
    console.log(`WordPress response ${wpResponse.status}: ${responseText.substring(0, 300)}`);

    if (wpResponse.ok) {
      const rawData = JSON.parse(responseText);
      // If response is an array, the POST was likely converted to GET by a redirect
      if (Array.isArray(rawData)) {
        throw new Error("WordPress retornou uma listagem em vez de criar o post. Verifique se a URL usa HTTPS e se as credenciais estão corretas.");
      }
      const wpPostId = rawData?.id ?? rawData?.post_id ?? null;
      let wpLink = rawData?.link ?? rawData?.guid?.rendered ?? null;

      // Step 2: Update post to "publish" status + set Yoast SEO meta
      if (wpPostId) {
        const auth = btoa(`${normalizedUsername}:${wpPassword}`);
        const updateBody: Record<string, unknown> = { status: "publish" };

        // Yoast SEO: título SEO, meta description e palavra-chave em foco
        const yoastMeta: Record<string, string> = {};
        const yTitle2 = article.meta_title || article.seo_title;
        const yKw2 = article.focus_keyword || article.seo_keyword;
        if (yTitle2) yoastMeta._yoast_wpseo_title = yTitle2;
        if (article.meta_description) yoastMeta._yoast_wpseo_metadesc = article.meta_description;
        if (yKw2) yoastMeta._yoast_wpseo_focuskw = yKw2;

        if (Object.keys(yoastMeta).length > 0) {
          updateBody.meta = yoastMeta;
        }


        try {
          const publishResp = await fetch(`${wpUrl}/wp-json/wp/v2/posts/${wpPostId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Basic ${auth}` },
            body: JSON.stringify(updateBody),
          });
          if (publishResp.ok) {
            const publishData = await publishResp.json();
            wpLink = publishData?.link || wpLink;
            console.log(`Post ${wpPostId} published with Yoast SEO meta: focuskw="${article.seo_keyword}", metadesc="${article.meta_description?.substring(0, 50)}..."`);
          } else {
            const errText = await publishResp.text();
            console.error(`Failed to publish post ${wpPostId}: ${publishResp.status} ${errText.substring(0, 200)}`);

            // If meta update fails (unregistered keys), retry without meta
            if (errText.includes("rest_invalid_param") || errText.includes("meta")) {
              console.log("Retrying publish without meta (Yoast may not be installed)...");
              const retryResp = await fetch(`${wpUrl}/wp-json/wp/v2/posts/${wpPostId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": `Basic ${auth}` },
                body: JSON.stringify({ status: "publish" }),
              });
              if (retryResp.ok) {
                const retryData = await retryResp.json();
                wpLink = retryData?.link || wpLink;
                console.log(`Post ${wpPostId} published (without Yoast meta - plugin may not be installed)`);
              }
            }
          }
        } catch (pubErr) {
          console.error("Error publishing post:", pubErr);
        }
      }

      await supabase.from("articles").update({
        wordpress_post_id: wpPostId ? String(wpPostId) : null,
        status: "published",
        published_at: new Date().toISOString(),
      }).eq("id", articleId);

      await supabase.from("publish_log").insert({
        user_id: userId,
        article_id: articleId,
        platform: "wordpress",
        status: "success",
        published_url: wpLink,
      });

      // Keep only the 30 most recent published articles per user
      try {
        const { data: oldPublished } = await supabase
          .from("articles")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .order("created_at", { ascending: false })
          .range(30, 500);

        const oldIds = (oldPublished || []).map((item: any) => item.id);
        if (oldIds.length > 0) {
          await supabase.from("publish_log").delete().in("article_id", oldIds);
          await supabase.from("articles").delete().in("id", oldIds);
          console.log(`Retention cleanup removed ${oldIds.length} old published articles`);
        }
      } catch (cleanupErr) {
        console.error("Retention cleanup failed:", cleanupErr);
      }

      // Trigger social publishing (Instagram feed + Stories + Facebook page Stories)
      try {
        const socialResp = await fetch(`${supabaseUrl}/functions/v1/publish-social`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ articleId, userId }),
        });
        const socialData = await socialResp.json();
        console.log(`publish-social response:`, socialData);
        
        // Log social activity
        if (socialData.success) {
          await supabase.from("automation_logs").insert({
            user_id: userId,
            level: 'info',
            module: 'robot',
            message: `Artigo compartilhado nas redes sociais: ${socialData.message}`,
            details: socialData.results
          });
        }
      } catch (socialErr) {
        console.error("publish-social call failed:", socialErr);
      }

      // Step 3: Google Indexing API
      if (wpLink) {
        try {
          console.log("Triggering Google Indexing for:", wpLink);
          const indexingResp = await fetch(`${supabaseUrl}/functions/v1/google-indexing`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ url: wpLink, userId, articleId }),
          });
          const indexingData = await indexingResp.json();
          console.log(`google-indexing response:`, indexingData);
        } catch (indexingErr) {
          console.error("google-indexing call failed:", indexingErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `✅ Artigo publicado! WP: ✅ | FB: ✅ | IG: ✅`,
          wpPostId,
          wpLink,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Parse error for better messages
      let errorDetail = responseText.substring(0, 300);
      try {
        const errJson = JSON.parse(responseText);
        if (errJson.code === "rest_cannot_create") {
          errorDetail = `O usuário "${normalizedUsername}" não tem permissão para criar posts. Verifique se ele é Editor ou Administrador no WordPress.`;
        } else if (errJson.code === "invalid_username" || errJson.code === "incorrect_password") {
          errorDetail = "Usuário ou senha incorretos. Verifique suas credenciais nas Configurações.";
        } else if (errJson.code === "rest_no_route") {
          errorDetail = "A rota da API do WordPress não foi encontrada. Verifique a URL do site e se a REST API está ativa.";
        } else if (errJson.message) {
          errorDetail = errJson.message;
        }
      } catch {}

      await supabase.from("articles").update({ status: "failed" }).eq("id", articleId);
      await supabase.from("publish_log").insert({
        user_id: userId,
        article_id: articleId,
        platform: "wordpress",
        status: "failed",
        error_message: errorDetail.substring(0, 500),
      });

      return new Response(
        JSON.stringify({
          success: false,
          message: `❌ Erro WordPress: ${errorDetail}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("publish-article error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";

    // Libera o artigo preso em "publishing" para permitir nova tentativa
    if (claimCtx) {
      try {
        await claimCtx.supabase
          .from("articles")
          .update({ status: "failed" })
          .eq("id", claimCtx.articleId)
          .eq("status", "publishing")
          .is("wordpress_post_id", null);
      } catch (e) {
        console.error("[publish-article] Falha ao liberar status do artigo:", e);
      }
    }

    const isMissingConfiguration =
      message.includes("Configurações") ||
      message.includes("não configurad") ||
      message.includes("não encontrado");


    return new Response(
      JSON.stringify({ success: false, error: message, message }),
      { status: isMissingConfiguration ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
