import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const AMOUNT_CENTS: Record<string, number> = { starter_monthly: 19700, pro_monthly: 49700 };

async function notify(saleId: string) {
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sale-notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({ saleId }),
    });
  } catch (e) { console.error(e); }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });
  try {
    const body = await req.json().catch(() => ({}));
    const paymentId = body?.data?.id || new URL(req.url).searchParams.get("id");
    if (!paymentId) return new Response(JSON.stringify({ received: true }), { status: 200 });

    const { data: cfg } = await sb.from("payment_methods_config").select("mercadopago_access_token").limit(1).maybeSingle();
    const token = String(cfg?.mercadopago_access_token || "").replace(/^ENCRYPTED:/, "");
    if (!token) return new Response(JSON.stringify({ received: true, err: "no_token" }), { status: 200 });

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payment = await res.json();
    if (!res.ok) { console.error(payment); return new Response("err", { status: 200 }); }

    if (payment.status !== "approved") {
      console.log("mp payment not approved yet:", payment.status);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const meta = payment.metadata || {};
    const plan = meta.plan || (payment.external_reference || "").split(":")[0];
    if (!AMOUNT_CENTS[plan]) return new Response("bad plan", { status: 200 });

    const { data, error } = await sb.rpc("create_license_after_payment", {
      p_buyer_email: meta.buyer_email || payment.payer?.email || "",
      p_buyer_name: meta.buyer_name || "",
      p_buyer_phone: meta.buyer_phone || "",
      p_plan: plan,
      p_amount_cents: AMOUNT_CENTS[plan],
      p_currency: "brl",
      p_payment_method: "pix_mp",
      p_period_days: 30,
      p_stripe_subscription_id: null,
      p_stripe_session_id: null,
      p_mp_payment_id: String(payment.id),
    });
    if (error) console.error(error);
    const res2 = data as any;
    if (res2?.sale_id) await notify(res2.sale_id);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (e) {
    console.error("mp-webhook error", e);
    return new Response("err", { status: 200 });
  }
});
