import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAGNIFIC_BASE_URL = "https://api.magnific.com/v1/ai";
const ACTIVE_STATUSES = ["CREATED", "IN_PROGRESS", "PENDING", "PROCESSING"];
const DONE_STATUS = "COMPLETED";

type MediaType = "image" | "video";

type MagnificSettings = {
  user_id: string;
  enabled: boolean;
  auto_generate_images: boolean;
  auto_generate_videos: boolean;
  image_aspect_ratio: string;
  image_resolution: string;
  image_model: string;
  video_aspect_ratio: string;
  video_resolution: string;
  video_duration: number;
  video_generate_audio: boolean;
  prompt_template: string | null;
  negative_prompt: string;
  editorial_safety: boolean;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeMysticAspectRatio(value?: string | null) {
  const aliases: Record<string, string> = {
    landscape_16_9: "widescreen_16_9",
    portrait_9_16: "social_story_9_16",
    "16:9": "widescreen_16_9",
    "9:16": "social_story_9_16",
    "1:1": "square_1_1",
  };
  const candidate = aliases[value || ""] || value || "widescreen_16_9";
  const valid = new Set([
    "square_1_1",
    "classic_4_3",
    "traditional_3_4",
    "widescreen_16_9",
    "social_story_9_16",
    "smartphone_horizontal_20_9",
    "smartphone_vertical_9_20",
    "standard_3_2",
    "portrait_2_3",
    "horizontal_2_1",
    "vertical_1_2",
    "social_5_4",
    "social_post_4_5",
  ]);
  return valid.has(candidate) ? candidate : "widescreen_16_9";
}

function normalizeMysticModel(value?: string | null) {
  const valid = new Set(["realism", "fluid", "zen", "flexible", "super_real", "editorial_portraits"]);
  return valid.has(value || "") ? value! : "realism";
}

async function magnificRequest(apiKey: string, path: string, init?: RequestInit) {
  const response = await fetch(`${MAGNIFIC_BASE_URL}${path}`, {
    ...init,
    headers: {
      "x-magnific-api-key": apiKey,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });

  const raw = await response.text();
  let payload: any = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = { raw };
  }

  if (!response.ok) {
    const detail = payload?.message || payload?.error || raw || `HTTP ${response.status}`;
    throw new Error(`Magnific API: ${detail}`);
  }

  return payload;
}

function buildEditorialPrompt(article: any, settings: MagnificSettings) {
  const defaultPrompt = [
    "Create a premium photorealistic editorial news image for a digital publication.",
    `Article title: ${article.title}.`,
    article.category ? `Category: ${article.category}.` : "",
    article.excerpt ? `Context: ${article.excerpt.slice(0, 900)}.` : "",
    "Strong professional composition, realistic lighting and shadows, high contrast, newsroom-quality photography, clean framing.",
    "No logos, no watermark, no interface elements, no written headline inside the image.",
    settings.editorial_safety
      ? "Editorial accuracy rule: do not fabricate an identifiable real person. If the story names a public figure and identity cannot be represented accurately from reliable visual reference, use a contextual scene, environment, object, venue, silhouette, or non-identifying editorial composition instead."
      : "",
  ].filter(Boolean).join(" ");

  if (!settings.prompt_template?.trim()) return defaultPrompt;

  return settings.prompt_template
    .replaceAll("{{title}}", article.title || "")
    .replaceAll("{{category}}", article.category || "")
    .replaceAll("{{excerpt}}", article.excerpt || "")
    .replaceAll("{{default_prompt}}", defaultPrompt);
}

function buildVideoPrompt(article: any) {
  return [
    `Create a subtle cinematic editorial motion clip based on the source image for the article: ${article.title}.`,
    "Use restrained camera movement, realistic depth and natural motion. Preserve the subject identity and scene composition.",
    "Do not add text, logos, watermarks, new people, new objects, dramatic fictional events, or misleading actions.",
  ].join(" ");
}

async function createImageTask(apiKey: string, prompt: string, settings: MagnificSettings) {
  const response = await magnificRequest(apiKey, "/mystic", {
    method: "POST",
    body: JSON.stringify({
      prompt,
      resolution: settings.image_resolution || "2k",
      aspect_ratio: normalizeMysticAspectRatio(settings.image_aspect_ratio),
      model: normalizeMysticModel(settings.image_model),
      creative_detailing: 35,
      engine: "automatic",
      fixed_generation: false,
      filter_nsfw: true,
    }),
  });
  return response.data;
}

async function createVideoTask(apiKey: string, imageUrl: string, prompt: string, settings: MagnificSettings) {
  const response = await magnificRequest(apiKey, "/image-to-video/veo-3-1", {
    method: "POST",
    body: JSON.stringify({
      image: imageUrl,
      prompt,
      negative_prompt: settings.negative_prompt,
      duration: settings.video_duration || 8,
      resolution: settings.video_resolution || "720p",
      aspect_ratio: settings.video_aspect_ratio || "9:16",
      generate_audio: settings.video_generate_audio ?? true,
    }),
  });
  return response.data;
}

async function fetchTask(apiKey: string, mediaType: MediaType, taskId: string) {
  const path = mediaType === "image"
    ? `/mystic/${taskId}`
    : `/image-to-video/veo-3-1/${taskId}`;
  const response = await magnificRequest(apiKey, path, { method: "GET" });
  return response.data;
}

async function syncJobs(supabase: any, apiKey: string, userId: string) {
  const { data: jobs, error } = await supabase
    .from("media_generation_jobs")
    .select("id, article_id, media_type, task_id, status")
    .eq("user_id", userId)
    .in("status", ACTIVE_STATUSES)
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) throw error;

  let completed = 0;
  for (const job of jobs || []) {
    try {
      const task = await fetchTask(apiKey, job.media_type as MediaType, job.task_id);
      const status = String(task?.status || job.status || "IN_PROGRESS").toUpperCase();
      const generated = Array.isArray(task?.generated) ? task.generated : [];
      const outputUrl = generated.find((url: unknown) => typeof url === "string") || null;

      await supabase.from("media_generation_jobs").update({
        status,
        output_url: outputUrl,
        error_message: null,
        updated_at: new Date().toISOString(),
        completed_at: status === DONE_STATUS ? new Date().toISOString() : null,
        metadata: task || {},
      }).eq("id", job.id);

      if (status === DONE_STATUS && outputUrl && job.article_id) {
        const articleUpdate = job.media_type === "image"
          ? { featured_image_url: outputUrl, updated_at: new Date().toISOString() }
          : { generated_video_url: outputUrl, updated_at: new Date().toISOString() };
        await supabase.from("articles").update(articleUpdate)
          .eq("id", job.article_id)
          .eq("user_id", userId);
        completed++;
      }
    } catch (error) {
      console.error(`[Magnific] Failed to sync job ${job.id}`, error);
      await supabase.from("media_generation_jobs").update({
        error_message: error instanceof Error ? error.message : String(error),
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);
    }
  }

  return { checked: jobs?.length || 0, completed };
}

async function assertArticleOwnership(supabase: any, articleId: unknown, userId: string) {
  if (!articleId) return null;
  const normalizedId = String(articleId);
  const { data, error } = await supabase
    .from("articles")
    .select("id")
    .eq("id", normalizedId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Article not found for the authenticated user");
  return normalizedId;
}

async function queueMissingArticleMedia(supabase: any, apiKey: string, settings: MagnificSettings) {
  if (!settings.enabled) return { imagesQueued: 0, videosQueued: 0 };

  let imagesQueued = 0;
  let videosQueued = 0;

  if (settings.auto_generate_images) {
    const { data: articles, error } = await supabase
      .from("articles")
      .select("id, title, excerpt, category, featured_image_url, generated_video_url, created_at")
      .eq("user_id", settings.user_id)
      .is("featured_image_url", null)
      .neq("status", "published")
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) throw error;

    for (const article of articles || []) {
      const { data: existing } = await supabase
        .from("media_generation_jobs")
        .select("id")
        .eq("article_id", article.id)
        .eq("media_type", "image")
        .in("status", [...ACTIVE_STATUSES, DONE_STATUS])
        .limit(1);
      if (existing?.length) continue;

      try {
        const prompt = buildEditorialPrompt(article, settings);
        const task = await createImageTask(apiKey, prompt, settings);
        if (!task?.task_id) throw new Error("Magnific did not return an image task_id");
        await supabase.from("media_generation_jobs").insert({
          user_id: settings.user_id,
          article_id: article.id,
          provider: "magnific",
          media_type: "image",
          task_id: task.task_id,
          status: String(task.status || "CREATED").toUpperCase(),
          prompt,
          metadata: task,
        });
        imagesQueued++;
      } catch (error) {
        console.error(`[Magnific] Could not queue image for article ${article.id}`, error);
      }
    }
  }

  if (settings.auto_generate_videos) {
    const { data: articles, error } = await supabase
      .from("articles")
      .select("id, title, excerpt, category, featured_image_url, generated_video_url, created_at")
      .eq("user_id", settings.user_id)
      .not("featured_image_url", "is", null)
      .is("generated_video_url", null)
      .neq("status", "published")
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw error;

    for (const article of articles || []) {
      const { data: existing } = await supabase
        .from("media_generation_jobs")
        .select("id")
        .eq("article_id", article.id)
        .eq("media_type", "video")
        .in("status", [...ACTIVE_STATUSES, DONE_STATUS])
        .limit(1);
      if (existing?.length) continue;

      try {
        const prompt = buildVideoPrompt(article);
        const task = await createVideoTask(apiKey, article.featured_image_url, prompt, settings);
        if (!task?.task_id) throw new Error("Magnific did not return a video task_id");
        await supabase.from("media_generation_jobs").insert({
          user_id: settings.user_id,
          article_id: article.id,
          provider: "magnific",
          media_type: "video",
          task_id: task.task_id,
          status: String(task.status || "CREATED").toUpperCase(),
          prompt,
          input_url: article.featured_image_url,
          metadata: task,
        });
        videosQueued++;
      } catch (error) {
        console.error(`[Magnific] Could not queue video for article ${article.id}`, error);
      }
    }
  }

  return { imagesQueued, videosQueued };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get("MAGNIFIC_API_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Supabase environment is incomplete" }, 500);
    if (!apiKey) return json({ error: "MAGNIFIC_API_KEY is not configured in Supabase Edge Function secrets" }, 503);

    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "");
    const isServiceRequest = bearer === serviceKey;
    const admin = createClient(supabaseUrl, serviceKey);
    let authenticatedUserId: string | null = null;

    if (!isServiceRequest) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: authData, error: authError } = await userClient.auth.getUser();
      if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);
      authenticatedUserId = authData.user.id;
    }

    const body = req.method === "GET" ? {} : await req.json().catch(() => ({}));
    const action = body.action || "test";
    const requestedUserId = body.userId || authenticatedUserId;
    if (!requestedUserId) return json({ error: "userId is required" }, 400);
    if (!isServiceRequest && requestedUserId !== authenticatedUserId) return json({ error: "Forbidden" }, 403);

    if (action === "test") {
      const response = await magnificRequest(apiKey, "/mystic", { method: "GET" });
      return json({ success: true, configured: true, tasksVisible: Array.isArray(response.data) ? response.data.length : 0 });
    }

    const { data: settingsData, error: settingsError } = await admin
      .from("magnific_settings")
      .select("*")
      .eq("user_id", requestedUserId)
      .maybeSingle();
    if (settingsError) throw settingsError;

    const settings: MagnificSettings = settingsData || {
      user_id: requestedUserId,
      enabled: false,
      auto_generate_images: true,
      auto_generate_videos: false,
      image_aspect_ratio: "widescreen_16_9",
      image_resolution: "2k",
      image_model: "realism",
      video_aspect_ratio: "9:16",
      video_resolution: "720p",
      video_duration: 8,
      video_generate_audio: true,
      prompt_template: null,
      negative_prompt: "blurry, low quality, distorted, watermark, logo, unreadable text, duplicate subjects",
      editorial_safety: true,
    };

    if (action === "process-pending") {
      if (!isServiceRequest && !settings.enabled) return json({ success: true, skipped: "Magnific is disabled" });
      const sync = await syncJobs(admin, apiKey, requestedUserId);
      const queued = await queueMissingArticleMedia(admin, apiKey, settings);
      return json({ success: true, sync, queued });
    }

    if (action === "sync") {
      const sync = await syncJobs(admin, apiKey, requestedUserId);
      return json({ success: true, sync });
    }

    if (action === "generate-image") {
      const prompt = String(body.prompt || "").trim();
      if (!prompt) return json({ error: "prompt is required" }, 400);
      const articleId = await assertArticleOwnership(admin, body.articleId, requestedUserId);
      const task = await createImageTask(apiKey, prompt, settings);
      if (!task?.task_id) return json({ error: "Magnific did not return task_id" }, 502);
      await admin.from("media_generation_jobs").insert({
        user_id: requestedUserId,
        article_id: articleId,
        provider: "magnific",
        media_type: "image",
        task_id: task.task_id,
        status: String(task.status || "CREATED").toUpperCase(),
        prompt,
        metadata: task,
      });
      return json({ success: true, task });
    }

    if (action === "generate-video") {
      const prompt = String(body.prompt || "").trim();
      const image = String(body.image || "").trim();
      if (!prompt || !image) return json({ error: "prompt and image are required" }, 400);
      const articleId = await assertArticleOwnership(admin, body.articleId, requestedUserId);
      const task = await createVideoTask(apiKey, image, prompt, settings);
      if (!task?.task_id) return json({ error: "Magnific did not return task_id" }, 502);
      await admin.from("media_generation_jobs").insert({
        user_id: requestedUserId,
        article_id: articleId,
        provider: "magnific",
        media_type: "video",
        task_id: task.task_id,
        status: String(task.status || "CREATED").toUpperCase(),
        prompt,
        input_url: image,
        metadata: task,
      });
      return json({ success: true, task });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("magnific-media error", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
