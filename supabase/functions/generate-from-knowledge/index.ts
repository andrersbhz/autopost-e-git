import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function fileToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar arquivo (${res.status})`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function decryptCredential(supabase: any, value?: string | null) {
  if (!value) return null;
  if (!value.startsWith("ENCRYPTED:")) return value;
  const { data } = await supabase.rpc("decrypt_credential", { enc_key: "", val: value });
  return typeof data === "string" && data.length > 5 ? data : null;
}

function parseJson(raw: any) {
  if (typeof raw !== "string") return raw || {};
  try { return JSON.parse(raw); } catch {}
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : {};
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { userId, knowledgeId, category, title } = await req.json();
    if (!userId || !knowledgeId) {
      return new Response(
        JSON.stringify({ error: "userId e knowledgeId são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: entry, error: entryErr } = await supabase
      .from("knowledge_entries")
      .select("*")
      .eq("id", knowledgeId)
      .eq("user_id", userId)
      .maybeSingle();

    if (entryErr || !entry) throw new Error("Entrada de conhecimento não encontrada");

    const { data: settings } = await supabase
      .from("user_settings")
      .select("writer_prompt, categories, gemini_api_key, openai_api_key, groq_api_key, azure_openai_api_key, azure_openai_endpoint, azure_openai_deployment_name, gemini_model, openai_model, groq_model, azure_openai_model")
      .eq("user_id", userId)
      .maybeSingle();

    const cats: string[] = (settings?.categories as string[]) || [
      "policia", "celebridades", "politica", "esportes", "saude", "financas",
    ];
    const finalCategory = category && cats.includes(category) ? category : (cats[0] || "geral");
    const finalTitleHint = title?.trim() || entry.title;

    const basePrompt =
      `${settings?.writer_prompt || "Você é um jornalista experiente. Escreva com fatos, SEO e verdade."}\n\n` +
      `Baseie-se ESTRITAMENTE no material de referência a seguir (base de conhecimento do usuário).\n` +
      `Título sugerido: "${finalTitleHint}"\n` +
      `Categoria: "${finalCategory}"\n\n` +
      `Retorne SOMENTE um JSON válido com os campos:\n` +
      `{"title":"...","content":"HTML completo do artigo, 1500-2500 palavras, com <h2>, <h3>, <p>, <ul>","excerpt":"...","seo_keyword":"...","seo_title":"...","meta_description":"...","slug":"...","image_alt":"...","image_caption":""}`;

    const textMaterial = entry.content && entry.content.trim().length > 0
      ? `\n\n=== MATERIAL DE REFERÊNCIA (texto) ===\n${entry.content.slice(0, 60000)}`
      : "";
    const promptText = `${basePrompt}${textMaterial}`;

    let fileData: { mime: string; b64: string } | null = null;
    if (entry.file_path) {
      const { data: signed } = await supabase.storage
        .from("knowledge-files")
        .createSignedUrl(entry.file_path, 300);
      if (signed?.signedUrl) {
        fileData = {
          mime: entry.file_type || "application/pdf",
          b64: await fileToBase64(signed.signedUrl),
        };
      }
    }

    const geminiKey = await decryptCredential(supabase, settings?.gemini_api_key);
    const openaiKey = await decryptCredential(supabase, settings?.openai_api_key);
    const groqKey = await decryptCredential(supabase, settings?.groq_api_key);
    const azureKey = await decryptCredential(supabase, settings?.azure_openai_api_key);

    const errors: string[] = [];
    let parsed: any = null;

    if (geminiKey && !parsed) {
      const rawModel = settings?.gemini_model;
      const model = rawModel && !/^gemini-(1\.0|1\.5|pro|ultra)/i.test(rawModel) ? rawModel : "gemini-3.6-flash";
      try {
        const parts: any[] = [{ text: promptText }];
        if (fileData) parts.push({ inlineData: { mimeType: fileData.mime, data: fileData.b64 } });
        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: "application/json" } }),
        });
        if (!aiRes.ok) throw new Error(`Gemini ${aiRes.status}: ${(await aiRes.text()).slice(0, 240)}`);
        const aiJson = await aiRes.json();
        parsed = parseJson(aiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
      } catch (e) { errors.push(e instanceof Error ? e.message : String(e)); }
    }

    if (openaiKey && !parsed) {
      const model = settings?.openai_model || "gpt-4o-mini";
      try {
        if (fileData && !textMaterial) throw new Error("OpenAI fallback requer conteúdo textual nesta base de conhecimento.");
        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model, messages: [{ role: "user", content: promptText }], response_format: { type: "json_object" } }),
        });
        if (!aiRes.ok) throw new Error(`OpenAI ${aiRes.status}: ${(await aiRes.text()).slice(0, 240)}`);
        const aiJson = await aiRes.json();
        parsed = parseJson(aiJson?.choices?.[0]?.message?.content || "{}");
      } catch (e) { errors.push(e instanceof Error ? e.message : String(e)); }
    }

    if (groqKey && !parsed) {
      const model = settings?.groq_model || "llama-3.3-70b-versatile";
      try {
        if (fileData && !textMaterial) throw new Error("Groq fallback requer conteúdo textual nesta base de conhecimento.");
        const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model, messages: [{ role: "user", content: promptText }], response_format: { type: "json_object" } }),
        });
        if (!aiRes.ok) throw new Error(`Groq ${aiRes.status}: ${(await aiRes.text()).slice(0, 240)}`);
        const aiJson = await aiRes.json();
        parsed = parseJson(aiJson?.choices?.[0]?.message?.content || "{}");
      } catch (e) { errors.push(e instanceof Error ? e.message : String(e)); }
    }

    if (azureKey && settings?.azure_openai_endpoint && settings?.azure_openai_deployment_name && !parsed) {
      const deployment = settings?.azure_openai_model || settings.azure_openai_deployment_name;
      try {
        if (fileData && !textMaterial) throw new Error("Azure fallback requer conteúdo textual nesta base de conhecimento.");
        const aiRes = await fetch(`${settings.azure_openai_endpoint.replace(/\/$/, "")}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=2024-10-21`, {
          method: "POST",
          headers: { "api-key": azureKey, "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: promptText }], response_format: { type: "json_object" } }),
        });
        if (!aiRes.ok) throw new Error(`Azure ${aiRes.status}: ${(await aiRes.text()).slice(0, 240)}`);
        const aiJson = await aiRes.json();
        parsed = parseJson(aiJson?.choices?.[0]?.message?.content || "{}");
      } catch (e) { errors.push(e instanceof Error ? e.message : String(e)); }
    }

    if (!parsed) throw new Error(`Nenhum provedor de IA disponível ou todos falharam. ${errors.join(" | ")}`);
    if (!parsed.title || !parsed.content) throw new Error("A IA não retornou um artigo válido.");

    const slug = parsed.slug ? slugify(parsed.slug) : slugify(parsed.title);

    const { data: inserted, error: insertErr } = await supabase
      .from("articles")
      .insert({
        user_id: userId,
        title: parsed.title,
        content: parsed.content,
        excerpt: parsed.excerpt || "",
        category: finalCategory,
        seo_keyword: parsed.seo_keyword || "",
        seo_title: parsed.seo_title || parsed.title,
        meta_description: parsed.meta_description || "",
        slug,
        status: "ready",
      })
      .select("id, title")
      .single();

    if (insertErr) throw insertErr;

    try {
      await supabase.functions.invoke("regenerate-image", {
        body: { userId, articleIds: [inserted.id], force: true },
      });
    } catch (e) {
      console.warn("[generate-from-knowledge] image gen failed", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        articleId: inserted.id,
        title: inserted.title,
        message: `Artigo criado a partir da base de conhecimento.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[generate-from-knowledge] error", err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
