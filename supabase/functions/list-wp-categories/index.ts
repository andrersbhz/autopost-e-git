import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function decrypt(supabase: any, val: string | null, encKey: string) {
  if (!val || !val.startsWith("ENCRYPTED:")) return val;
  const { data } = await supabase.rpc("decrypt_credential", { val, enc_key: encKey });
  return data || val;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { userId } = await req.json();
    if (!userId) throw new Error("userId required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const encKey = Deno.env.get("DB_ENCRYPTION_KEY") || "";

    const { data: s } = await supabase
      .from("user_settings")
      .select("wordpress_url, wordpress_username, wordpress_app_password")
      .eq("user_id", userId)
      .single();

    if (!s?.wordpress_url || !s?.wordpress_username || !s?.wordpress_app_password) {
      return new Response(JSON.stringify({ categories: [], reason: "wp_not_configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let url = s.wordpress_url.replace(/\/$/, "");
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    url = url.replace(/^http:\/\//i, "https://");

    const pwd = (await decrypt(supabase, s.wordpress_app_password, encKey)) || s.wordpress_app_password;
    const auth = "Basic " + btoa(`${s.wordpress_username.trim()}:${pwd}`);

    const names: string[] = [];
    const items: { id: number; name: string; slug: string; count: number }[] = [];
    let lastStatus = 0;
    for (let page = 1; page <= 5; page++) {
      const resp = await fetch(
        `${url}/wp-json/wp/v2/categories?per_page=100&page=${page}&orderby=name&order=asc`,
        { headers: { Authorization: auth } },
      );
      lastStatus = resp.status;
      if (!resp.ok) break;
      const cats = await resp.json();
      if (!Array.isArray(cats) || cats.length === 0) break;
      for (const c of cats) {
        const name = (c?.name || "").toString().trim();
        if (name && name.toLowerCase() !== "sem categoria" && name.toLowerCase() !== "uncategorized") {
          names.push(name);
          items.push({ id: c.id, name, slug: c.slug, count: c.count ?? 0 });
        }
      }
      if (cats.length < 100) break;
    }

    const unique = Array.from(new Set(names));
    return new Response(JSON.stringify({ categories: unique, items, status: lastStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ categories: [], error: e.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
