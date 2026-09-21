import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function invokeFunction(name: string, userId: string) {
  const base = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const response = await fetch(`${base}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceKey}`,
      "apikey": serviceKey,
    },
    body: JSON.stringify({ userId }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `${name} falhou`);
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId } = await req.json();
    if (!userId) throw new Error("userId is required");

    const [instagram, threads] = await Promise.allSettled([
      invokeFunction("handle-instagram-interactions", userId),
      invokeFunction("handle-threads-interactions", userId),
    ]);

    const processed = await invokeFunction("process-human-social-replies", userId);

    const instagramData = instagram.status === "fulfilled" ? instagram.value : { success: false, error: String(instagram.reason) };
    const threadsData = threads.status === "fulfilled" ? threads.value : { success: false, error: String(threads.reason) };

    return new Response(JSON.stringify({
      success: true,
      newInteractions: (instagramData?.newInteractions || 0) + (threadsData?.newInteractions || 0),
      postsScanned: (instagramData?.postsScanned || 0) + (threadsData?.postsScanned || 0),
      replied: processed?.replied || 0,
      liked: processed?.liked || 0,
      failed: processed?.failed || 0,
      engine: "rule-based-no-lovable",
      networks: { instagram: instagramData, threads: threadsData },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
