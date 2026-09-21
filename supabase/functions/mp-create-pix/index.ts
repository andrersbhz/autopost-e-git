import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const AMOUNT_BY_PLAN: Record<string, number> = { starter_monthly: 197.00, pro_monthly: 497.00 };
const NAME_BY_PLAN: Record<string, string> = { starter_monthly: "Nexa Starter", pro_monthly: "Nexa Pro" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  try {
    const { plan, buyerEmail, buyerName, buyerPhone, buyerDocument } = await req.json();
    if (!AMOUNT_BY_PLAN[plan]) throw new Error("Invalid plan");
    if (!buyerEmail) throw new Error("Missing buyerEmail");

    // Read MP access token from payment_methods_config
    const { data: cfg } = await sb.from("payment_methods_config").select("mercadopago_access_token,mercadopago_enabled").limit(1).maybeSingle();
    if (!cfg?.mercadopago_enabled || !cfg.mercadopago_access_token) throw new Error("Mercado Pago não configurado no painel admin");
    const token = String(cfg.mercadopago_access_token).replace(/^ENCRYPTED:/, "");

    const amount = AMOUNT_BY_PLAN[plan];
    const idempotency = crypto.randomUUID();
    const payload = {
      transaction_amount: amount,
      description: NAME_BY_PLAN[plan],
      payment_method_id: "pix",
      external_reference: `${plan}:${buyerEmail}`,
      payer: {
        email: buyerEmail,
        first_name: (buyerName || "").split(" ")[0] || undefined,
        last_name: (buyerName || "").split(" ").slice(1).join(" ") || undefined,
        identification: buyerDocument ? { type: "CPF", number: String(buyerDocument).replace(/\D/g, "") } : undefined,
      },
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`,
      metadata: { plan, buyer_email: buyerEmail, buyer_name: buyerName || "", buyer_phone: buyerPhone || "" },
    };

    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Idempotency-Key": idempotency,
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) {
      console.error("MP error", body);
      throw new Error(body?.message || "Falha ao gerar Pix");
    }

    return new Response(JSON.stringify({
      paymentId: body.id,
      qrCodeBase64: body.point_of_interaction?.transaction_data?.qr_code_base64,
      qrCode: body.point_of_interaction?.transaction_data?.qr_code,
      ticketUrl: body.point_of_interaction?.transaction_data?.ticket_url,
      status: body.status,
      amount,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
