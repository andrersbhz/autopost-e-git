import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ProviderResult = { imageUrl?: string; error?: string; paused?: boolean };

async function tryLovable(prompt: string): Promise<ProviderResult> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return { error: "LOVABLE_API_KEY ausente", paused: true };

  const models = ["openai/gpt-image-2", "openai/gpt-image-1-mini", "google/gemini-3.1-flash-image", "google/gemini-3-pro-image"];
  const errs: string[] = [];
  let paused = false;

  for (const model of models) {
    try {
      const isOpenAI = model.startsWith("openai/");
      const url = isOpenAI
        ? "https://ai.gateway.lovable.dev/v1/images/generations"
        : "https://ai.gateway.lovable.dev/v1/chat/completions";
      const body = isOpenAI
        ? { model, prompt, size: "1024x1024", n: 1 }
        : {
            model,
            messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
            modalities: ["image", "text"],
          };
      const resp = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const text = (await resp.text()).slice(0, 300);
        if (resp.status === 402 || resp.status === 429 || resp.status >= 500) paused = true;
        errs.push(`Lovable ${model}: ${resp.status} ${text}`);
        continue;
      }
      const data = await resp.json();
      if (isOpenAI) {
        const b64 = data.data?.[0]?.b64_json;
        const dUrl = data.data?.[0]?.url;
        if (b64) return { imageUrl: `data:image/png;base64,${b64}` };
        if (dUrl) return { imageUrl: dUrl };
      } else {
        const imgUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (imgUrl) return { imageUrl: imgUrl };
      }
      errs.push(`Lovable ${model}: sem imagem`);
    } catch (e) {
      errs.push(`Lovable ${model}: ${e instanceof Error ? e.message : String(e)}`);
      paused = true;
    }
  }
  return { error: errs.join(" | "), paused };
}

async function tryOpenAI(apiKey: string, prompt: string, selectedModel?: string | null): Promise<ProviderResult> {
  const model = selectedModel && /image/i.test(selectedModel) ? selectedModel : "gpt-image-1";
  try {
    const resp = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, size: "1024x1024", n: 1 }),
    });
    if (!resp.ok) return { error: `OpenAI ${model}: ${resp.status} ${(await resp.text()).slice(0, 250)}` };
    const data = await resp.json();
    const b64 = data.data?.[0]?.b64_json;
    const url = data.data?.[0]?.url;
    if (b64) return { imageUrl: `data:image/png;base64,${b64}` };
    if (url) return { imageUrl: url };
    return { error: `OpenAI ${model}: sem imagem no retorno` };
  } catch (e) {
    return { error: `OpenAI ${model}: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function tryGemini(apiKey: string, prompt: string, selectedModel?: string | null): Promise<ProviderResult> {
  const models = selectedModel && /image/i.test(selectedModel)
    ? [selectedModel]
    : ["gemini-3.1-flash-image", "gemini-3-pro-image"];
  const errs: string[] = [];
  for (const model of models) {
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      });
      if (!resp.ok) {
        errs.push(`Gemini ${model}: ${resp.status} ${(await resp.text()).slice(0, 200)}`);
        continue;
      }
      const data = await resp.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const img = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));
      if (img?.inlineData) return { imageUrl: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}` };
      errs.push(`Gemini ${model}: sem imagem`);
    } catch (e) {
      errs.push(`Gemini ${model}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { error: errs.join(" | ") };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, userId } = await req.json();
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Prompt inválido. Descreva a imagem desejada." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const errors: string[] = [];
    let hasUserProvider = false;

    if (userId) {
      const supaUrl = Deno.env.get("SUPABASE_URL")!;
      const supaKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supaUrl, supaKey);
      const { data: settings } = await supabase
        .from("user_settings")
        .select("openai_api_key, gemini_api_key, openai_model, gemini_model")
        .eq("user_id", userId)
        .single();

      const decrypt = async (val: string | null | undefined): Promise<string | null> => {
        if (!val) return null;
        if (!val.startsWith("ENCRYPTED:")) return val;
        try {
          const { data } = await supabase.rpc("decrypt_credential", { enc_key: "", val });
          return typeof data === "string" && data.length > 5 ? data : null;
        } catch { return null; }
      };

      const openaiKey = await decrypt(settings?.openai_api_key);
      if (openaiKey) {
        hasUserProvider = true;
        const r = await tryOpenAI(openaiKey, prompt, settings?.openai_model);
        if (r.imageUrl) {
          return new Response(JSON.stringify({ imageUrl: r.imageUrl, provider: "openai" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (r.error) errors.push(r.error);
      }

      const geminiKey = await decrypt(settings?.gemini_api_key);
      if (geminiKey) {
        hasUserProvider = true;
        const r = await tryGemini(geminiKey, prompt, settings?.gemini_model);
        if (r.imageUrl) {
          return new Response(JSON.stringify({ imageUrl: r.imageUrl, provider: "gemini" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (r.error) errors.push(r.error);
      }
    }

    const envOpenAI = Deno.env.get("OPENAI_API_KEY");
    if (!hasUserProvider && envOpenAI) {
      const r = await tryOpenAI(envOpenAI, prompt);
      if (r.imageUrl) {
        return new Response(JSON.stringify({ imageUrl: r.imageUrl, provider: "openai-env" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (r.error) errors.push(r.error);
    }

    const envGemini = Deno.env.get("GEMINI_API_KEY");
    if (!hasUserProvider && envGemini) {
      const r = await tryGemini(envGemini, prompt);
      if (r.imageUrl) {
        return new Response(JSON.stringify({ imageUrl: r.imageUrl, provider: "gemini-env" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (r.error) errors.push(r.error);
    }

    // Último fallback somente quando não há chave própria funcional.
    const lovable = await tryLovable(prompt);
    if (lovable.imageUrl) {
      return new Response(JSON.stringify({ imageUrl: lovable.imageUrl, provider: "lovable" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (lovable.error) errors.push(lovable.error);

    return new Response(JSON.stringify({
      error: `Falha ao gerar imagem em todos os provedores. ${errors.join(" | ").slice(0, 500)}`,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
