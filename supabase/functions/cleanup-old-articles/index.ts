import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let userId: string | null = null;
    try {
      const body = await req.json();
      userId = body?.userId ?? null;
    } catch {
      // no body — cron call
    }

    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('articles')
      .delete()
      .lt('created_at', cutoff)
      .select('id, featured_image_url');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const deletedCount = data?.length ?? 0;
    console.log(`[cleanup-old-articles] Deleted ${deletedCount} articles older than 3 days${userId ? ` for user ${userId}` : ' (all users)'}`);

    return new Response(
      JSON.stringify({
        success: true,
        deleted: deletedCount,
        message: `${deletedCount} artigos antigos (>3 dias) foram apagados.`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('[cleanup-old-articles] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
