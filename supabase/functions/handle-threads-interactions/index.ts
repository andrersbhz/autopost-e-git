import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const GRAPH = "https://graph.threads.net/v1.0";
async function decryptToken(supabase: any, token: string) {
  if (!token || !token.startsWith("ENCRYPTED:")) return token;
  const { data } = await supabase.rpc("decrypt_credential", { val: token, enc_key: "" });
  return data || token;
}
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { userId } = await req.json();
    if (!userId) throw new Error("userId is required");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: accounts } = await supabase.from("threads_accounts").select("id,threads_user_id,username,access_token,is_active").eq("user_id", userId).eq("is_active", true);
    let newInteractions = 0, postsScanned = 0;
    for (const account of accounts || []) {
      const token = await decryptToken(supabase, account.access_token);
      if (!token) continue;
      const postsResp = await fetch(`${GRAPH}/${account.threads_user_id}/threads?fields=id,text,permalink,timestamp&limit=12&access_token=${encodeURIComponent(token)}`);
      if (!postsResp.ok) {
        await supabase.from("automation_logs").insert({ user_id: userId, level: "warn", module: "threads-robot", message: `Threads @${account.username || account.threads_user_id}: não foi possível ler as publicações.`, details: { error: await postsResp.text() } });
        continue;
      }
      const posts = (await postsResp.json()).data || [];
      postsScanned += posts.length;
      for (const post of posts) {
        const repliesResp = await fetch(`${GRAPH}/${post.id}/replies?fields=id,text,timestamp,username,permalink&reverse=false&limit=25&access_token=${encodeURIComponent(token)}`);
        if (!repliesResp.ok) continue;
        const replies = (await repliesResp.json()).data || [];
        for (const reply of replies) {
          const externalId = String(reply.id);
          const { data: existing } = await supabase.from("social_interactions").select("id").eq("user_id", userId).eq("platform", "threads").eq("external_id", externalId).maybeSingle();
          if (existing) continue;
          const { error } = await supabase.from("social_interactions").insert({
            user_id: userId, platform: "threads", external_id: externalId, page_id: account.id,
            author_name: reply.username ? `@${reply.username}` : "Seguidor", content: reply.text || "",
            original_link: reply.permalink || post.permalink || null, status: "pending", interaction_type: "comment",
            metadata: { post_id: post.id, post_text: post.text || "", post_permalink: post.permalink || null }
          });
          if (!error) newInteractions++;
        }
      }
    }
    return new Response(JSON.stringify({ success: true, newInteractions, postsScanned }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
