// Seeds a NEXA organization with demo teams + members (fake profiles).
// Etapa 1 only — no interactions/scorecards yet.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Validate caller
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { organization_id } = await req.json();
    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client
    const admin = createClient(supabaseUrl, serviceKey);

    // Verify caller is org_admin of that org
    const { data: member } = await admin
      .from("nexa_organization_members")
      .select("role")
      .eq("organization_id", organization_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!member || !["org_admin", "super_admin"].includes(member.role)) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Demo teams (idempotent on name unique constraint)
    const demoTeams = [
      { name: "Equipe Demo — Suporte", description: "Atendimento técnico nível 1." },
      { name: "Equipe Demo — Vendas", description: "Prospecção e fechamento." },
      { name: "Equipe Demo — Sucesso do Cliente", description: "Pós-venda e retenção." },
    ];

    const insertedTeams: any[] = [];
    for (const t of demoTeams) {
      const { data, error } = await admin
        .from("nexa_teams")
        .upsert({ organization_id, name: t.name, description: t.description, created_by: userId },
                { onConflict: "organization_id,name" })
        .select()
        .single();
      if (!error && data) insertedTeams.push(data);
    }

    await admin.from("nexa_audit_logs").insert({
      organization_id, user_id: userId,
      action: "demo.seeded", metadata: { teams: insertedTeams.length },
    });

    return new Response(JSON.stringify({
      ok: true,
      teams_created: insertedTeams.length,
      note: "Demo de equipes criado. Atendentes e interações reais virão nas próximas etapas.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
