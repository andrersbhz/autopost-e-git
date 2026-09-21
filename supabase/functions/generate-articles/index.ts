import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Helpers ───────────────────────────────────────────────────────────────

function stripHtml(text: string): string {
  if (!text) return "";
  return text.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function sanitizeSeoFields(parsed: AIResponse): AIResponse {
  return {
    ...parsed,
    title: (parsed.title || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(),
    excerpt: (parsed.excerpt || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(),
    seo_keyword: (parsed.seo_keyword || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(),
    seo_title: (parsed.seo_title || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(),
    meta_description: (parsed.meta_description || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(),
    slug: (parsed.slug || "").toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""),
    image_alt: (parsed.image_alt || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(),
    image_caption: (parsed.image_caption || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(),
  };
}

// ── Retry helper ─────────────────────────────────────────────────────────

function isTransientError(msg: string): boolean {
  return /429|503|504|522|RESOURCE_EXHAUSTED|UNAVAILABLE|high demand|temporarily|timeout|Failed to send a request to the Edge Function/i.test(msg);
}

function isBillingError(msg: string): boolean {
  return /402|payment_required|Not enough credits|spending cap|RESOURCE_EXHAUSTED/i.test(msg);
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, baseDelayMs = 5000): Promise<T> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      const msg = lastErr.message;
      if (attempt < maxRetries && isTransientError(msg) && !isBillingError(msg)) {
        const delay = baseDelayMs * (attempt + 1);
        console.log(`[Retry] Attempt ${attempt + 1} failed (transient), retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr;
}

// ── AI provider abstraction ──────────────────────────────────────────────

interface AIResponse { title: string; content: string; excerpt: string; seo_keyword: string; seo_title: string; meta_description: string; slug: string; image_alt: string; image_caption: string; visual_elements: string; }

const ARTICLE_TOOL_PARAMS = {
  title: "Título H1 do artigo, máximo 60 caracteres",
  content: "Conteúdo HTML completo (10.000-14.000 chars para atingir 2.000+ palavras)",
  excerpt: "Resumo para redes sociais (máx 160 chars)",
  seo_keyword: "Focus keyword do Yoast SEO (3-5 palavras)",
  seo_title: "Título SEO até 60 chars",
  meta_description: "Meta descrição 120-155 chars",
  slug: "Slug para URL",
  image_alt: "Texto alternativo da imagem",
  image_caption: "Legenda da imagem",
  visual_elements: "3 a 5 elementos visuais específicos do artigo (pessoas, cenário, ações, objetos) separados por vírgula",
};

const OBSOLETE_GEMINI = /^gemini-(1\.0|1\.5|pro|ultra)/i;
function sanitizeGeminiModel(m?: string | null) { return m && !OBSOLETE_GEMINI.test(m) ? m : ""; }

async function callGeminiDirect(apiKey: string, systemPrompt: string, userPrompt: string, modelName = ""): Promise<AIResponse> {
  const model = modelName || "gemini-3.6-flash";
  let lastError: any = null;

  try {
    // Simple fetch with generic model for best compatibility
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ 
        role: "user", 
        parts: [
          { text: `${systemPrompt}\n\nUSER REQUEST: ${userPrompt}\n\nIMPORTANT: Return ONLY valid JSON matching the article schema.` }
        ] 
      }]
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (resp.ok) {
      const data = await resp.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(text) as AIResponse;
    } else {
      const errText = await resp.text();
      console.warn(`[AI] Gemini v1beta failed (${resp.status}): ${errText.substring(0, 200)}`);
      throw new Error(`Gemini API failed with status ${resp.status}: ${errText}`);
    }
  } catch (err) {
    throw err;
  }
}

async function callOpenAIDirect(apiKey: string, systemPrompt: string, userPrompt: string, modelName = ""): Promise<AIResponse> {
  const model = modelName || "gpt-4o-mini";
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      tools: [{
        type: "function",
        function: {
          name: "create_article",
          description: "Cria um artigo completo para publicação no WordPress.",
          parameters: {
            type: "object",
            properties: Object.fromEntries(Object.entries(ARTICLE_TOOL_PARAMS).map(([k, v]) => [k, { type: "string", description: v }])),
            required: Object.keys(ARTICLE_TOOL_PARAMS),
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "create_article" } },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI API error ${resp.status}: ${errText}`);
  }

  const aiData = await resp.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) return JSON.parse(toolCall.function.arguments);
  let content = aiData.choices?.[0]?.message?.content || "";
  content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(content);
}

// Modelos Groq descontinuados que devem ser substituídos automaticamente
const GROQ_DEPRECATED_MODELS = new Set([
  "llama-3.3-70b-versatile",
  "llama3-70b-8192",
  "llama3-8b-8192",
  "mixtral-8x7b-32768",
  "gemma-7b-it",
  "gemma2-9b-it",
]);
const GROQ_DEFAULT_MODEL = "llama-3.1-8b-instant";

function sanitizeGroqModel(modelName?: string): string {
  const candidate = (modelName || "").trim();
  if (!candidate || GROQ_DEPRECATED_MODELS.has(candidate)) return GROQ_DEFAULT_MODEL;
  return candidate;
}

async function callGroqDirect(apiKey: string, systemPrompt: string, userPrompt: string, modelName = ""): Promise<AIResponse> {
  const requestGroq = async (model: string) =>
    await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        tools: [{
          type: "function",
          function: {
            name: "create_article",
            description: "Cria um artigo completo para publicação no WordPress.",
            parameters: {
              type: "object",
              properties: Object.fromEntries(Object.entries(ARTICLE_TOOL_PARAMS).map(([k, v]) => [k, { type: "string", description: v }])),
              required: Object.keys(ARTICLE_TOOL_PARAMS),
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_article" } },
      }),
    });

  const model = sanitizeGroqModel(modelName);
  let resp = await requestGroq(model);

  // Se o modelo escolhido foi descontinuado pela Groq, tenta o modelo padrão atual
  if (resp.status === 404 && model !== GROQ_DEFAULT_MODEL) {
    console.warn(`[AI] Modelo Groq "${model}" indisponível; usando "${GROQ_DEFAULT_MODEL}".`);
    resp = await requestGroq(GROQ_DEFAULT_MODEL);
  }

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Groq API error ${resp.status}: ${errText}`);
  }

  const aiData = await resp.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) return JSON.parse(toolCall.function.arguments);
  let content = aiData.choices?.[0]?.message?.content || "";
  content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(content);
}

async function callAzureOpenAIDirect(apiKey: string, endpoint: string, deployment: string, systemPrompt: string, userPrompt: string, modelName = ""): Promise<AIResponse> {
  const deploymentToUse = modelName || deployment;
  const url = `${endpoint.replace(/\/$/, "")}/openai/deployments/${deploymentToUse}/chat/completions?api-version=2024-10-21`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      tools: [{
        type: "function",
        function: {
          name: "create_article",
          description: "Cria um artigo completo para publicação no WordPress.",
          parameters: {
            type: "object",
            properties: Object.fromEntries(Object.entries(ARTICLE_TOOL_PARAMS).map(([k, v]) => [k, { type: "string", description: v }])),
            required: Object.keys(ARTICLE_TOOL_PARAMS),
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "create_article" } },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Azure OpenAI (Copilot) error ${resp.status}: ${errText}`);
  }

  const aiData = await resp.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) return JSON.parse(toolCall.function.arguments);
  let content = aiData.choices?.[0]?.message?.content || "";
  content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(content);
}

async function callLovableGateway(apiKey: string, systemPrompt: string, userPrompt: string): Promise<AIResponse> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      tools: [{
        type: "function",
        function: {
          name: "create_article",
          description: "Cria um artigo completo para publicação no WordPress.",
          parameters: {
            type: "object",
            properties: Object.fromEntries(Object.entries(ARTICLE_TOOL_PARAMS).map(([k, v]) => [k, { type: "string", description: v }])),
            required: Object.keys(ARTICLE_TOOL_PARAMS),
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "create_article" } },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gateway error ${resp.status}: ${errText}`);
  }

  const aiData = await resp.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) return JSON.parse(toolCall.function.arguments);
  let content = aiData.choices?.[0]?.message?.content || "";
  content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(content);
}

// ── Multi-provider fallback for text ─────────────────────────────────────

interface ProviderConfig {
  name: string;
  call: (systemPrompt: string, userPrompt: string) => Promise<AIResponse>;
}

async function callWithFallback(providers: ProviderConfig[], systemPrompt: string, userPrompt: string): Promise<{ result: AIResponse; provider: string }> {
  // A ordem já é definida na montagem do array 'providers' no handler principal.
  const sortedProviders = providers;

  const errors: string[] = [];
  for (const provider of sortedProviders) {
    try {
      console.log(`[AI] Trying provider: ${provider.name}`);
      const result = await withRetry(() => provider.call(systemPrompt, userPrompt), 1, 3000);
      return { result, provider: provider.name };
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[AI] Provider ${provider.name} failed: ${msg.substring(0, 200)}`);
      errors.push(`${provider.name}: ${msg}`);
    }
  }
  throw new Error(`Todos os provedores de IA falharam:\n${errors.join("\n")}`);
}

// ── Image generation ─────────────────────────────────
// O prompt da imagem é DERIVADO do conteúdo do artigo + perfil do escritor (writer_prompt).
// Não há mais template fixo de imagem: a imagem segue sempre o título e os visual_elements gerados.

function buildImagePrompt(title: string, content: string | null, visualElements: string, customImagePrompt?: string | null): string {
  if (!customImagePrompt || customImagePrompt.trim().length < 5) {
    throw new Error("O 'Prompt de Imagem IA' não está configurado em Configurações > Geral. Este prompt é obrigatório.");
  }
  // REGRA: o Prompt de Imagem IA das configurações é a ÚNICA fonte de verdade para estilo/composição.
  // Deve ser seguido À RISCA. O título entra apenas como assunto/tema.
  const base = customImagePrompt.trim().replace(/\{\{?\s*title\s*\}?\}/gi, title);
  const hasTitleToken = base !== customImagePrompt.trim();
  const header = `INSTRUÇÕES DE IMAGEM (SIGA À RISCA, SEM DESVIOS — especificação obrigatória vinda das Configurações > Prompt de Imagem IA):\n\n${base}`;
  return hasTitleToken ? header : `${header}\n\n---\nAssunto da imagem (apenas tema, NÃO altere o estilo definido acima): ${title}`;
}

const IMAGE_FORMATS: Record<string, { width: number; height: number; dalle: "1024x1024" | "1024x1792" | "1792x1024"; label: string }> = {
  instagram_square:   { width: 1080, height: 1080, dalle: "1024x1024", label: "Instagram Feed Quadrado 1:1" },
  instagram_portrait: { width: 1080, height: 1350, dalle: "1024x1792", label: "Instagram Feed Retrato 4:5" },
  instagram_story:    { width: 1080, height: 1920, dalle: "1024x1792", label: "Instagram Story 9:16" },
  facebook_post:      { width: 1200, height: 630,  dalle: "1792x1024", label: "Facebook Post 1.91:1" },
  facebook_square:    { width: 1200, height: 1200, dalle: "1024x1024", label: "Facebook Quadrado 1:1" },
  facebook_story:     { width: 1080, height: 1920, dalle: "1024x1792", label: "Facebook Story 9:16" },
  linkedin_post:      { width: 1200, height: 627,  dalle: "1792x1024", label: "LinkedIn Post 1.91:1" },
  linkedin_square:    { width: 1200, height: 1200, dalle: "1024x1024", label: "LinkedIn Quadrado 1:1" },
};

function getImageFormat(key?: string | null) {
  return IMAGE_FORMATS[key || ""] || IMAGE_FORMATS.instagram_portrait;
}

function appendFormatHint(prompt: string, fmt: { width: number; height: number; label: string }) {
  return `${prompt}\n\nProporção/formato obrigatório: ${fmt.label} (${fmt.width}x${fmt.height}px).`;
}

// Geração de imagem via Lovable AI Gateway (estilo chat, sem necessidade de API específica de imagens).
// Usa LOVABLE_API_KEY (server-side) e o prompt configurado pelo usuário em Configurações > Prompt de Imagem IA.
async function generateImageLovable(title: string, content: string | null, visualElements: string, customImagePrompt?: string | null, formatKey?: string | null, knowledgeUrls: string[] = []): Promise<string | null> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) {
    console.warn("[Image] LOVABLE_API_KEY não disponível no ambiente.");
    return null;
  }
  const fmt = getImageFormat(formatKey);
  const basePrompt = appendFormatHint(buildImagePrompt(title, content, visualElements, customImagePrompt), fmt);
  const refs = (knowledgeUrls || []).slice(0, 10).filter((u) => typeof u === "string" && u.startsWith("http"));
  const promptText = refs.length
    ? `${basePrompt}\n\nCONHECIMENTO VISUAL DE REFERÊNCIA: Você recebeu ${refs.length} imagem(ns) de referência anexadas nesta mensagem. Analise cuidadosamente o estilo visual, paleta de cores, composição, iluminação, tipografia e elementos gráficos delas e SE INSPIRE nesses modelos ao gerar a nova arte. A nova imagem deve seguir o prompt acima em conjunto com o estilo/identidade visual demonstrado nas referências.`
    : basePrompt;
  const userContent: any[] = [{ type: "text", text: promptText }];
  for (const url of refs) userContent.push({ type: "image_url", image_url: { url } });
  const models = ["google/gemini-2.5-flash-image", "google/gemini-3-pro-image"];

  for (const model of models) {
    try {
      console.log(`[Image] Lovable AI (${model}) para: ${title.substring(0, 50)}... (refs: ${refs.length})`);
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: userContent }],
          modalities: ["image", "text"],
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.warn(`[Image] Lovable AI ${model} falhou (${resp.status}): ${errText.substring(0, 200)}`);
        continue;
      }

      const data = await resp.json();
      const msg = data.choices?.[0]?.message;
      const imgUrl = msg?.images?.[0]?.image_url?.url;
      if (imgUrl) {
        console.log(`[Image] Sucesso via ${model}`);
        return imgUrl;
      }
      console.warn(`[Image] ${model} não retornou imagem na resposta.`);
    } catch (err) {
      console.error(`[Image] Lovable AI ${model} erro:`, err);
    }
  }
  return null;
}

async function generateImageGemini(apiKey: string, title: string, content: string | null, visualElements: string, customImagePrompt?: string | null, formatKey?: string | null): Promise<string | null> {
  const fmt = getImageFormat(formatKey);
  const models = ["gemini-2.0-flash-exp", "gemini-2.5-flash"];
  for (const model of models) {
    try {
      console.log(`[Image] Attempting generation with Gemini model: ${model}`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const body = {
        contents: [{ parts: [{ text: appendFormatHint(buildImagePrompt(title, content, visualElements, customImagePrompt), fmt) }] }],
        generationConfig: { 
          responseModalities: ["IMAGE"] 
        },
      };

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.warn(`[Image] Gemini model ${model} failed (${resp.status}): ${errText.substring(0, 200)}`);
        continue;
      }

      const data = await resp.json();
      const imgPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));

      if (imgPart?.inlineData) {
        console.log(`[Image] Success! Image generated with model: ${model}`);
        return `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
      }
    } catch (err) {
      console.error(`[Image] Gemini model ${model} error:`, err);
    }
  }
  return null;
}

// Redimensiona um data URL PNG para as dimensões EXATAS do formato (cover crop, mantém proporção).
async function resizeDataUrlToExact(dataUrl: string, targetW: number, targetH: number): Promise<string> {
  try {
    if (!dataUrl.startsWith("data:image/")) return dataUrl;
    const { Image } = await import("https://deno.land/x/imagescript@1.2.17/mod.ts");
    const b64 = dataUrl.split(",")[1];
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const img = await Image.decode(bin);
    // cover-crop: escala pelo maior lado e recorta o excesso
    const scale = Math.max(targetW / img.width, targetH / img.height);
    const scaledW = Math.round(img.width * scale);
    const scaledH = Math.round(img.height * scale);
    img.resize(scaledW, scaledH);
    const cropX = Math.max(0, Math.floor((scaledW - targetW) / 2));
    const cropY = Math.max(0, Math.floor((scaledH - targetH) / 2));
    img.crop(cropX, cropY, targetW, targetH);
    const out = await img.encode(); // PNG
    let outB64 = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < out.length; i += CHUNK) {
      outB64 += String.fromCharCode(...out.subarray(i, i + CHUNK));
    }
    return `data:image/png;base64,${btoa(outB64)}`;
  } catch (e) {
    console.warn("[Image] Falha ao redimensionar para tamanho exato:", e);
    return dataUrl;
  }
}

// Geração via OpenAI (ChatGPT) usando gpt-image-1 — modelo que segue o prompt com precisão.
// Suporta referências visuais (conhecimento) via endpoint /v1/images/edits multipart.
async function generateImageOpenAI(
  apiKey: string,
  title: string,
  content: string | null,
  visualElements: string,
  customImagePrompt?: string | null,
  formatKey?: string | null,
  knowledgeUrls: string[] = [],
): Promise<string | null> {
  const fmt = getImageFormat(formatKey);
  // gpt-image-1 aceita: 1024x1024, 1024x1536, 1536x1024
  const ratio = fmt.width / fmt.height;
  const size: "1024x1024" | "1024x1536" | "1536x1024" =
    ratio > 1.15 ? "1536x1024" : ratio < 0.85 ? "1024x1536" : "1024x1024";
  const basePrompt = appendFormatHint(buildImagePrompt(title, content, visualElements, customImagePrompt), fmt);
  const refs = (knowledgeUrls || []).slice(0, 10).filter((u) => typeof u === "string" && u.startsWith("http"));

  const finalize = async (dataUrl: string) => await resizeDataUrlToExact(dataUrl, fmt.width, fmt.height);

  try {
    if (refs.length > 0) {
      const form = new FormData();
      form.append("model", "gpt-image-1");
      form.append("prompt", `${basePrompt}\n\nUse as imagens anexadas como REFERÊNCIA VISUAL obrigatória de estilo, paleta, composição e identidade visual. Siga o prompt em conjunto com o estilo dessas referências.`);
      form.append("size", size);
      form.append("n", "1");
      let added = 0;
      for (const url of refs) {
        try {
          const r = await fetch(url);
          if (!r.ok) continue;
          const blob = await r.blob();
          form.append("image[]", blob, `ref-${added}.png`);
          added++;
        } catch { /* ignora */ }
      }
      if (added > 0) {
        console.log(`[Image] OpenAI gpt-image-1 (edits, refs=${added}) size=${size} → ${fmt.width}x${fmt.height}`);
        const resp = await fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
        });
        if (!resp.ok) {
          const errText = await resp.text();
          console.warn(`[Image] OpenAI edits falhou (${resp.status}): ${errText.substring(0, 300)}`);
        } else {
          const data = await resp.json();
          const b64 = data.data?.[0]?.b64_json;
          if (b64) return await finalize(`data:image/png;base64,${b64}`);
        }
      }
    }

    console.log(`[Image] OpenAI gpt-image-1 (generations, size=${size}) → ${fmt.width}x${fmt.height}`);
    const resp = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-image-1", prompt: basePrompt, size, n: 1 }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.warn(`[Image] OpenAI gpt-image-1 falhou (${resp.status}): ${errText.substring(0, 300)}`);
      return null;
    }
    const data = await resp.json();
    const b64 = data.data?.[0]?.b64_json;
    if (b64) return await finalize(`data:image/png;base64,${b64}`);
    const url = data.data?.[0]?.url;
    if (url) {
      // Baixa e converte para data URL para poder redimensionar
      try {
        const r = await fetch(url);
        const buf = new Uint8Array(await r.arrayBuffer());
        let s = "";
        const CHUNK = 0x8000;
        for (let i = 0; i < buf.length; i += CHUNK) s += String.fromCharCode(...buf.subarray(i, i + CHUNK));
        return await finalize(`data:image/png;base64,${btoa(s)}`);
      } catch {
        return url;
      }
    }
    return null;
  } catch (err) {
    console.error("[Image] OpenAI gpt-image-1 erro:", err);
    return null;
  }
}


// ── System + User prompts ─────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `Você é um jornalista digital brasileiro sênior, especialista em SEO avançado e redação para WordPress com Yoast SEO e Jetpack.

REGRAS CRÍTICAS DE VERACIDADE E ANTI-FAKE NEWS (OBRIGATÓRIO):
1. PROIBIDO FAKE NEWS: Você NUNCA deve inventar fatos, nomes, datas ou acontecimentos. A precisão é a prioridade número 1.
2. FONTE ÚNICA: Use APENAS as informações contidas no tópico do Google Trends fornecido e no contexto real. Se o tópico for vago, escreva um artigo informativo contextualizando o tema com fatos históricos reais e conhecidos, mas NUNCA invente notícias recentes que não ocorreram.
3. VERIFICAÇÃO: Se não tiver certeza de um detalhe específico sobre a notícia do momento, foque em informações gerais, oficiais e educativas sobre o assunto.
4. ESTILO JORNALÍSTICO: Mantenha um tom sério, informativo e autoritativo. Evite sensacionalismo barato que possa ser interpretado como desinformação.

REGRAS OBRIGATÓRIAS DE ESTRUTURA PARA CADA ARTIGO:

1. TÍTULO (H1): Máximo 60 caracteres, DEVE conter a palavra-chave principal, atrativo e 100% verdadeiro.

2. CONTEÚDO EM HTML: MÍNIMO 10.000 e MÁXIMO 14.000 caracteres no HTML total para garantir a profundidade solicitada (2.000+ palavras). Lead jornalístico com keyword nas primeiras 100 palavras. Use <h2>/<h3> com <strong>. NUNCA use <h1>. Parágrafos curtos (<p>). <strong> para keywords. <ul>/<li> para escaneabilidade. Keyword no primeiro parágrafo, em 1+ H2, densidade 1-2%. Conclusão com CTA.

3. SEO AVANÇADO:
   - Use LSI keywords (Latent Semantic Indexing) naturalmente no texto.
   - Otimize para Featured Snippets: inclua parágrafos de definição curtos (40-60 palavras).
   - Inclua perguntas (People Also Ask) como subtítulos H2/H3.
   - Use schema-friendly structure para FAQ e HowTo snippets.
   - E-E-A-T: demonstre expertise, experiência, autoridade e confiabilidade.

4. ESTILO: Mescle notícia trending com valor evergreen. Tom informativo e autoritativo. Inclua dados relevantes e reais. Evite linguagem de IA (como "no vasto mundo de", "em suma").

5. SEO (Yoast + Jetpack): seo_keyword: cauda longa 3-5 palavras. seo_title: até 60 chars, keyword no início. meta_description: 120-155 chars, keyword na primeira metade, CTA sutil. excerpt: 2 frases (máx 160 chars). slug: keyword em formato URL.

6. IMAGEM E SINCRONIA: 
   - visual_elements: Liste 3 a 5 elementos visuais concretos (pessoas, objetos, cenário, ação) que representem FIELMENTE a notícia.
   - image_alt: Texto alternativo técnico descrevendo exatamente os visual_elements.
   - image_caption: Legenda jornalística que descreve a cena baseada nos visual_elements.`;

function buildSystemPrompt(writerPrompt?: string | null): string {
  if (!writerPrompt || writerPrompt.trim().length < 10) {
    throw new Error("O 'Prompt do Artigo (Writer Prompt)' não está configurado em Configurações > Geral. Este prompt é obrigatório para garantir a qualidade e veracidade dos artigos.");
  }

  // O perfil do escritor é a base dinâmica obrigatória.
  return `### DIRETRIZES DINÂMICAS DO USUÁRIO (PRIORIDADE MÁXIMA) ###
${writerPrompt.trim()}

### FIM DAS DIRETRIZES DINÂMICAS ###

Aplique as diretrizes acima como sua persona, tom de voz, estilo de escrita e abordagem editorial em TODO o artigo. Estas instruções são dinâmicas e definem como você deve escrever.

As regras técnicas a seguir são OBRIGATÓRIAS e complementam o estilo acima, focando em veracidade e SEO:

${BASE_SYSTEM_PROMPT}`;
}

function buildUserPrompt(topic: string, category: string, context?: string): string {
  return `TÓPICO PRINCIPAL: "${topic}"
CONTEXTO REAL (NOTÍCIA DO DIA): "${context || "Fatos reais associados ao termo de pesquisa em alta"}"
CATEGORIA: ${category}
DATA: ${new Date().toLocaleDateString("pt-BR")}

INSTRUÇÃO: Escreva um artigo jornalístico de ALTA VERACIDADE. Use o contexto real fornecido para evitar alucinações. Se o contexto for sobre um evento específico, descreva-o com precisão.

REGRAS TÉCNICAS:
- Conteúdo HTML entre 10.000-14.000 chars (mínimo de 2.000 palavras).
- Keyword no título, lead (primeiro parágrafo), ao menos um H2 e meta description.
- Use técnicas avançadas de SEO: LSI keywords, otimize para featured snippets.
- Gere todos os metadados SEO e de imagem solicitados.`;
}

const MAX_GENERATION_BATCH = 2;

// ── Main handler ──────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const reqBody = await req.text();
    if (!reqBody) throw new Error("Request body is empty");
    const { userId, topics: manualTopics, forceCategory } = JSON.parse(reqBody);
    if (!userId) throw new Error("userId is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase.from("user_settings").select("*, gemini_model, openai_model, groq_model, azure_openai_model").eq("user_id", userId).single();
    const writerPrompt = settings?.writer_prompt || null;
    const systemPrompt = buildSystemPrompt(writerPrompt);
    const imageMode = settings?.image_mode || "ai";

    let geminiApiKey: string | null = null;
    if (settings?.gemini_api_key) {
      const { data: decrypted } = await supabase.rpc("decrypt_credential", { enc_key: "", val: settings.gemini_api_key });
      if (decrypted && typeof decrypted === "string" && decrypted.length > 5) {
        geminiApiKey = decrypted;
        console.log(`[Pipeline] Gemini API Key loaded (length: ${geminiApiKey.length})`);
      } else {
        console.warn(`[Pipeline] Failed to decrypt Gemini API Key or key is invalid.`);
      }
    }

    let openaiApiKey: string | null = null;
    if (settings?.openai_api_key) {
      const { data: decrypted } = await supabase.rpc("decrypt_credential", { enc_key: "", val: settings.openai_api_key });
      if (decrypted && typeof decrypted === "string" && decrypted.length > 5) {
        openaiApiKey = decrypted;
        console.log(`[Pipeline] OpenAI API Key loaded (length: ${openaiApiKey.length})`);
      }
    }

    let groqApiKey: string | null = null;
    if (settings?.groq_api_key) {
      const { data: decrypted } = await supabase.rpc("decrypt_credential", { enc_key: "", val: settings.groq_api_key });
      if (decrypted && typeof decrypted === "string" && decrypted.length > 5) {
        groqApiKey = decrypted;
        console.log(`[Pipeline] Groq API Key loaded (length: ${groqApiKey.length})`);
      }
    }


    let azureApiKey: string | null = null;
    if (settings?.azure_openai_api_key) {
      const { data: decrypted } = await supabase.rpc("decrypt_credential", { enc_key: "", val: settings.azure_openai_api_key });
      if (decrypted && typeof decrypted === "string" && decrypted.length > 5) azureApiKey = decrypted;
    }

    const providers: ProviderConfig[] = [];
    // Ordem de redundância ajustada:
    // Ordem de execução: 1. Gemini, 2. OpenAI, 3. Groq
    
    // 1. Gemini (Agora o primeiro a ser executado)
    if (geminiApiKey) {
      console.log(`[Pipeline] Adding Gemini provider as primary execution...`);
      providers.push({ name: "Gemini", call: (s, u) => callGeminiDirect(geminiApiKey!, s, u, sanitizeGeminiModel(settings?.gemini_model)) });
    }
    
    // 2. OpenAI / ChatGPT (Segundo)
    if (openaiApiKey) {
      providers.push({ name: "OpenAI", call: (s, u) => callOpenAIDirect(openaiApiKey!, s, u, settings?.openai_model) });
    }
    
    // 3. Groq (Terceiro - Fallback de texto)
    if (groqApiKey) {
      providers.push({ name: "Groq", call: (s, u) => callGroqDirect(groqApiKey!, s, u, settings?.groq_model) });
    }
    
    // 4. Azure Copilot (Final fallback)
    if (azureApiKey && settings?.azure_openai_endpoint && settings?.azure_openai_deployment_name) {
      providers.push({ 
        name: "Azure Copilot", 
        call: (s, u) => callAzureOpenAIDirect(azureApiKey!, settings.azure_openai_endpoint, settings.azure_openai_deployment_name, s, u, settings?.azure_openai_model) 
      });
    }

    if (providers.length === 0) {
      throw new Error("Nenhuma chave de IA configurada. Configure sua chave Gemini ou Groq em Configurações.");
    }

    console.log(`[Pipeline] Available AI providers: ${providers.map(p => p.name).join(" → ")}`);

    let topics = [];
    const userCategoriesToSearch: string[] = settings?.categories || ["esportes", "politica", "policia", "saude", "celebridades", "financas"];

    // Janela das últimas 24h — usada para priorizar trends recentes e evitar repetição de assunto
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Carrega artigos das últimas 24h (para contagem por categoria + deduplicação de assunto)
    const { data: recentArticlesFull } = await supabase
      .from("articles")
      .select("category, title, trending_topic, created_at")
      .eq("user_id", userId)
      .gte("created_at", since24h);

    const normalize = (s: string) =>
      (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const usedTopicsSet = new Set<string>();
    for (const a of (recentArticlesFull || [])) {
      if (a.trending_topic) usedTopicsSet.add(normalize(a.trending_topic));
      if (a.title) usedTopicsSet.add(normalize(a.title));
    }

    if (manualTopics && Array.isArray(manualTopics) && manualTopics.length > 0) {
      topics = manualTopics.map(t => typeof t === "string" ? { topic: t, category: forceCategory || "geral" } : t);
      console.log(`[Pipeline] Using ${topics.length} manual topics`);
    } else {
      // Apenas tópicos das últimas 24h, ainda não usados, em categorias marcadas
      const { data: dbTopics } = await supabase
        .from("trending_topics")
        .select("*")
        .eq("user_id", userId)
        .eq("used", false)
        .gte("fetched_at", since24h)
        .in("category", userCategoriesToSearch)
        .order("fetched_at", { ascending: false });
      topics = dbTopics || [];

      // Remove tópicos cujo assunto já foi coberto por artigos das últimas 24h
      const before = topics.length;
      topics = topics.filter((t: any) => {
        const key = normalize(t.topic);
        if (!key) return false;
        for (const used of usedTopicsSet) {
          if (!used) continue;
          if (used === key || used.includes(key) || key.includes(used)) return false;
        }
        return true;
      });
      console.log(`[Pipeline] Trends 24h: ${before} → ${topics.length} após remover assuntos já publicados`);
    }

    const manualCategories: string[] = (manualTopics && Array.isArray(manualTopics) && manualTopics.length > 0)
      ? Array.from(new Set(topics.map((t: any) => t.category).filter(Boolean)))
      : [];
    const userCategories: string[] = forceCategory 
      ? [forceCategory] 
      : (manualCategories.length > 0 ? Array.from(new Set([...manualCategories, ...userCategoriesToSearch])) : userCategoriesToSearch);

    const countsByCategory: Record<string, number> = {};
    for (const cat of userCategories) countsByCategory[cat] = 0;
    for (const a of (recentArticlesFull || [])) {
      if (a.category in countsByCategory) countsByCategory[a.category]++;
    }
    console.log(`[Pipeline] Artigos últimas 24h por categoria:`, countsByCategory);

    // Score de prioridade por volume de busca (quanto maior, mais "em alta")
    const volumeScore = (v: string | null | undefined): number => {
      const s = (v || "").toLowerCase();
      if (s.includes("alto") || s === "high") return 3;
      if (s.includes("médio") || s.includes("medio") || s === "medium") return 2;
      if (s.includes("baixo") || s === "low") return 1;
      if (s.includes("evergreen")) return 0;
      return 1;
    };

    // Agrupa tópicos disponíveis por categoria + ordena cada categoria por volume DESC (alto primeiro)
    const topicsByCategory: Record<string, any[]> = {};
    for (const cat of userCategories) topicsByCategory[cat] = [];
    for (const t of (topics || [])) {
      if (t.category in topicsByCategory) topicsByCategory[t.category].push(t);
    }
    for (const cat of userCategories) {
      topicsByCategory[cat].sort((a, b) => volumeScore(b.search_volume) - volumeScore(a.search_volume));
    }
    // Fallback (default topic) para categorias SEM tópicos disponíveis
    for (const cat of userCategories) {
      if (topicsByCategory[cat].length === 0) {
        topicsByCategory[cat].push({ topic: getDefaultTopic(cat), category: cat, id: null, search_volume: "evergreen" });
      }
    }

    // Score combinado: prioriza categorias com tópicos QUENTES (alta busca),
    // mas penaliza significativamente categorias já saturadas nas últimas 24h para garantir equilíbrio.
    // O multiplicador 10 para 'peak' (volume) mantém a preferência por trends, 
    // mas o multiplicador 4 para 'recent' garante que após 2-3 posts a prioridade mude.
    const priorityCategories: string[] = Array.isArray(settings?.priority_categories) ? settings.priority_categories : [];
    const categoryPriority = (cat: string): number => {
      const top = topicsByCategory[cat][0];
      const peak = top ? volumeScore(top.search_volume) : 0;
      const recent = countsByCategory[cat] || 0;
      const priorityBoost = priorityCategories.includes(cat) ? 100 : 0;
      
      // Prioridade: (Boost manual) + (Peso do Volume x 20) - (Peso da Saturação x 4)
      // O boost de 100 garante que categorias marcadas como prioritárias venham primeiro,
      // mas ainda permite rotação para evitar saturação extrema.
      return priorityBoost - recent * 6 + peak * 20 - recent * 4.0;
    };

    // Round-robin ponderado: a cada rodada reordena por prioridade atual,
    // pegando 1 tópico da categoria mais "quente vs saturada" do momento.
    const topicsToUse: any[] = [];
    while (topicsToUse.length < 50) {
      const available = userCategories.filter((c) => topicsByCategory[c].length > 0);
      if (available.length === 0) break;
      available.sort((a, b) => categoryPriority(b) - categoryPriority(a));
      const cat = available[0];
      const next = topicsByCategory[cat].shift();
      if (!next) break;
      topicsToUse.push(next);
      // simula que a categoria "ganhou" um post para o próximo cálculo
      countsByCategory[cat] = (countsByCategory[cat] || 0) + 1;
    }
    console.log(`[Pipeline] Ordem priorizando ALTA (primeiros 8):`,
      topicsToUse.slice(0, 8).map(t => `${t.category}[${t.search_volume || "?"}]`).join(" → "));

    const articlesPerDay = Math.max(settings?.articles_per_day || 10, 1);
    const intervalMs = (24 / articlesPerDay) * 60 * 60 * 1000;
    const now = new Date();
    const generatedArticles: any[] = [];
    const failureReasons: Array<{ status: number; message: string }> = [];
    let allProvidersExhausted = false;
    let rescheduledCount = 0;

    const { data: pendingArticles } = await supabase
      .from("articles")
      .select("id, scheduled_at, created_at, status")
      .eq("user_id", userId)
      .neq("status", "published")
      .neq("status", "ready")
      .not("scheduled_at", "is", null)
      .order("scheduled_at", { ascending: true })
      .order("created_at", { ascending: true });

    const pendingQueue = (pendingArticles || []) as Array<{ id: string; scheduled_at: string | null; created_at: string; status: string }>;
    const overdueArticles = pendingQueue.filter((article) => article.scheduled_at && new Date(article.scheduled_at).getTime() < now.getTime());
    const futureArticles = pendingQueue.filter((article) => article.scheduled_at && new Date(article.scheduled_at).getTime() >= now.getTime());

    let queueCursor = futureArticles.length > 0
      ? new Date(futureArticles[futureArticles.length - 1].scheduled_at as string)
      : new Date(now);

    for (const overdueArticle of overdueArticles) {
      queueCursor = new Date(Math.max(queueCursor.getTime(), now.getTime()) + intervalMs);
      const nextIso = queueCursor.toISOString();
      const { error: rescheduleError } = await supabase
        .from("articles")
        .update({ scheduled_at: nextIso })
        .eq("id", overdueArticle.id);
      if (!rescheduleError) {
        overdueArticle.scheduled_at = nextIso;
        rescheduledCount++;
      }
    }

    // Count "ready" articles too — they shouldn't be rescheduled but DO count toward the daily quota
    const { count: readyCount } = await supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "ready")
      .not("scheduled_at", "is", null);

    const currentPendingCount = pendingQueue.length + (readyCount || 0);
    const remainingToTarget = Math.max(0, articlesPerDay - currentPendingCount);
    // Se forceCategory estiver presente, geramos todos os tópicos disponíveis dessa categoria (ou o limite máximo do batch)
    const articlesToGenerate = (forceCategory || (manualTopics && manualTopics.length > 0))
      ? Math.min(MAX_GENERATION_BATCH, topicsToUse.length)
      : Math.min(MAX_GENERATION_BATCH, remainingToTarget, topicsToUse.length);

    if (articlesToGenerate === 0) {
      const queueSize = Math.min(currentPendingCount, articlesPerDay);
      return new Response(
        JSON.stringify({
          success: true,
          message: rescheduledCount > 0
            ? `Fila reorganizada: ${rescheduledCount} agendamentos vencidos foram realocados. Fila atual ${queueSize}/${articlesPerDay}.`
            : `Fila já está completa com ${queueSize}/${articlesPerDay} artigos agendados.`,
          articles: 0,
          failed: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseScheduledTime = queueCursor.getTime();

    for (let i = 0; i < articlesToGenerate; i++) {
      if (allProvidersExhausted) break;

      const topic = topicsToUse[i];
      const scheduledAt = new Date(baseScheduledTime + (i + 1) * intervalMs);

      try {
        const userPrompt = buildUserPrompt(topic.topic, topic.category, topic.context);

        let parsed: AIResponse;
        let usedProvider: string;

        try {
          const result = await callWithFallback(providers, systemPrompt, userPrompt);
          parsed = sanitizeSeoFields(result.result);
          usedProvider = result.provider;

          // Etapa de Validação: Revisar o texto contra o tópico original (fact-check leve baseado em heurística)
          // Verifica se o título/conteúdo realmente menciona o tópico (evita artigos completamente fora do tema)
          try {
            const topicWords = topic.topic
              .toLowerCase()
              .replace(/[^a-záéíóúâêôãõç0-9\s]/gi, " ")
              .split(/\s+/)
              .filter((w: string) => w.length > 3);
            const haystack = `${parsed.title} ${stripHtml(parsed.content)}`.toLowerCase();
            const matched = topicWords.filter((w: string) => haystack.includes(w)).length;
            const ratio = topicWords.length > 0 ? matched / topicWords.length : 1;
            console.log(`[Validation] Topic "${topic.topic}" word-match ratio: ${(ratio * 100).toFixed(0)}% (${matched}/${topicWords.length})`);
            if (topicWords.length >= 2 && ratio < 0.3) {
              console.warn(`[Validation] Article rejected — does not reference topic enough.`);
              failureReasons.push({ status: 422, message: `Artigo descartado por baixa aderência ao tópico "${topic.topic}".` });
              continue;
            }
          } catch (vErr) {
            console.warn("[Validation] Skipped:", vErr);
          }

        } catch (err: any) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`All providers failed for topic ${topic.topic}:`, msg.substring(0, 300));
          if (isBillingError(msg)) {
            allProvidersExhausted = true;
            failureReasons.push({ status: 402, message: msg });
            break;
          }
          failureReasons.push({ status: 500, message: msg });
          continue;
        }

        if (!parsed.title || !parsed.content) {
          failureReasons.push({ status: 500, message: `Campos obrigatórios ausentes para: ${topic.topic}` });
          continue;
        }

        // GERAÇÃO DE IMAGEM: depende do imageMode configurado
        let featuredImageUrl: string | null = null;
        const customImagePrompt = settings?.image_prompt || null;
        const imageFormatKey = (settings as any)?.image_format || "instagram_portrait";
        const imageKnowledgeUrls: string[] = Array.isArray((settings as any)?.image_knowledge_urls) ? (settings as any).image_knowledge_urls : [];

        if (imageMode === "ai") {
          // ÚNICO PROVEDOR: OpenAI ChatGPT (gpt-image-1) — segue o prompt à risca.
          if (!openaiApiKey) {
            console.warn(`[Image] OPENAI_API_KEY do usuário não configurada — imagem não será gerada para "${parsed.title}". Configure em Configurações > OpenAI.`);
          } else {
            try {
              featuredImageUrl = await generateImageOpenAI(
                openaiApiKey,
                parsed.title,
                parsed.content,
                parsed.visual_elements,
                customImagePrompt,
                imageFormatKey,
                imageKnowledgeUrls,
              );
            } catch (imgErr) {
              console.warn(`[Image] OpenAI falhou para "${parsed.title}":`, imgErr);
            }
          }
          if (!featuredImageUrl) {
            console.warn(`[Image] Não foi possível gerar imagem para "${parsed.title}" — artigo criado sem imagem.`);
          }
        } else if (imageMode === "manual") {
          console.log(`[Image] Modo manual detectado para "${parsed.title}" — aguardando upload.`);
          featuredImageUrl = null;
        } else {
          console.log(`[Image] Modo "nenhuma" detectado para "${parsed.title}".`);
          featuredImageUrl = null;
        }

        const { data: article, error: insertError } = await supabase.from("articles").insert({
          user_id: userId,
          title: parsed.title,
          content: parsed.content,
          excerpt: parsed.excerpt || "",
          category: topic.category,
          seo_keyword: parsed.seo_keyword || "",
          seo_title: parsed.seo_title || parsed.title,
          meta_description: parsed.meta_description || "",
          featured_image_url: featuredImageUrl,
          status: settings?.auto_publish ? "ready" : "draft",
          scheduled_at: scheduledAt.toISOString(),
          trending_topic: topic.topic,
          ai_provider: usedProvider,
          visual_elements: parsed.visual_elements,
          image_alt: parsed.image_alt,
          image_caption: parsed.image_caption,
        }).select().single();
        
        if (insertError) {
          console.error(`[Pipeline] Supabase insert error for ${parsed.title}:`, insertError.message);
          failureReasons.push({ status: 500, message: insertError.message });
          continue;
        }

        if (topic.id) {
          const { error: updateError } = await supabase.from("trending_topics").update({ used: true }).eq("id", topic.id);
          if (updateError) console.warn(`[Pipeline] Failed to mark topic as used: ${updateError.message}`);
        }

        generatedArticles.push(article);
        console.log(`[Pipeline] Article successfully saved: ${article.id}`);
        console.log(`[Pipeline] Article ${i + 1} generated via ${usedProvider}: ${parsed.title}`);
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Error generating article for ${topic.topic}:`, err);
        failureReasons.push({ status: 500, message: err instanceof Error ? err.message : String(err) });
      }
    }

    const totalAttempted = articlesToGenerate;

    if (generatedArticles.length === 0) {
      const errorMessage = allProvidersExhausted
        ? "Nenhum artigo gerado: Gemini/OpenAI/Groq estão sem quota. Adicione créditos no Gemini (AI Studio) ou aguarde a renovação diária do Groq."
        : failureReasons[0]?.message || "Nenhum artigo pôde ser gerado.";

      // Sempre retorna 200 com fallback:true para evitar que o cliente trate como erro fatal (tela em branco).
      return new Response(
        JSON.stringify({
          success: false,
          fallback: true,
          message: errorMessage,
          warning: errorMessage,
          articles: 0,
          failed: failureReasons.length,
          providersExhausted: allProvidersExhausted,
          details: failureReasons.slice(0, 3),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const queueAfterRun = currentPendingCount + generatedArticles.length;
    const message = failureReasons.length > 0
      ? `${generatedArticles.length} de ${totalAttempted} artigos gerados nesta execução (${failureReasons.length} falharam). Fila atual ${queueAfterRun}/${articlesPerDay}.${rescheduledCount > 0 ? ` ${rescheduledCount} vencidos foram reagendados.` : ""}`
      : `${generatedArticles.length} artigos gerados nesta execução. Fila atual ${queueAfterRun}/${articlesPerDay}.${rescheduledCount > 0 ? ` ${rescheduledCount} vencidos foram reagendados.` : ""}`;

    return new Response(
      JSON.stringify({ success: true, message, articles: generatedArticles.length, failed: failureReasons.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-articles error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getDefaultTopic(category: string): string {
  const defaults: Record<string, string> = {
    esportes: "Últimas notícias do futebol brasileiro",
    politica: "Cenário político atual no Brasil",
    policia: "Segurança pública no Brasil",
    saude: "Dicas de saúde e bem-estar",
    celebridades: "Novidades do mundo das celebridades brasileiras",
    financas: "Economia e mercado financeiro no Brasil",
  };
  return defaults[category] || "Notícias do Brasil";
}
