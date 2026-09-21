import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, verifyWebhook } from "../_shared/stripe.ts";

let _sb: ReturnType<typeof createClient> | null = null;
function sb() {
  if (!_sb) _sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  return _sb;
}

const AMOUNT_BY_PLAN: Record<string, number> = { starter_monthly: 19700, pro_monthly: 49700 };

async function triggerNotify(saleId: string) {
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sale-notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ saleId }),
    });
  } catch (e) {
    console.error("notify trigger failed", e);
  }
}

async function handleCheckoutCompleted(session: any, env: StripeEnv, stripe: any) {
  if (session.mode !== "subscription") return;
  const subId = session.subscription;
  if (!subId) return;
  const sub = await stripe.subscriptions.retrieve(subId, { expand: ["items.data.price"] });
  const item = sub.items?.data?.[0];
  const priceLookup = item?.price?.lookup_key || item?.price?.id;
  const meta = { ...(sub.metadata || {}), ...(session.metadata || {}) };
  const customer = await stripe.customers.retrieve(sub.customer);

  const buyerEmail = customer?.email || meta.buyer_email || "";
  const buyerName = customer?.name || meta.buyer_name || "";
  const buyerPhone = customer?.phone || meta.buyer_phone || "";
  const amount = AMOUNT_BY_PLAN[priceLookup] || 0;

  const { data, error } = await sb().rpc("create_license_after_payment", {
    p_buyer_email: buyerEmail,
    p_buyer_name: buyerName,
    p_buyer_phone: buyerPhone,
    p_plan: priceLookup,
    p_amount_cents: amount,
    p_currency: (item?.price?.currency || "brl").toLowerCase(),
    p_payment_method: "stripe_card",
    p_period_days: 30,
    p_stripe_subscription_id: sub.id,
    p_stripe_session_id: session.id,
    p_mp_payment_id: null,
  });
  if (error) { console.error("rpc failed", error); return; }
  const res = data as any;

  // Upsert subscriptions row
  const periodStart = item?.current_period_start ?? sub.current_period_start;
  const periodEnd = item?.current_period_end ?? sub.current_period_end;
  await sb().from("subscriptions").upsert({
    stripe_subscription_id: sub.id,
    stripe_customer_id: sub.customer,
    product_id: typeof item?.price?.product === "string" ? item.price.product : item?.price?.product?.id,
    price_id: priceLookup,
    status: sub.status,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end || false,
    environment: env,
    license_id: res?.license_id || null,
    user_id: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_subscription_id" });

  if (res?.sale_id) await triggerNotify(res.sale_id);
}

async function handleSubscriptionUpdated(sub: any, env: StripeEnv) {
  const item = sub.items?.data?.[0];
  const periodStart = item?.current_period_start ?? sub.current_period_start;
  const periodEnd = item?.current_period_end ?? sub.current_period_end;
  await sb().from("subscriptions").update({
    status: sub.status,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end || false,
    updated_at: new Date().toISOString(),
  }).eq("stripe_subscription_id", sub.id).eq("environment", env);

  // If active and paid → extend license
  if (sub.status === "active") {
    await sb().rpc("extend_license_by_subscription", { p_stripe_subscription_id: sub.id, p_period_days: 30 });
  }
}

async function handleSubscriptionDeleted(sub: any, env: StripeEnv) {
  await sb().from("subscriptions").update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", sub.id).eq("environment", env);
  await sb().rpc("revoke_license_by_subscription", { p_stripe_subscription_id: sub.id });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), { status: 200 });
  }
  const env: StripeEnv = rawEnv;
  try {
    const event = await verifyWebhook(req, env);
    const stripe = createStripeClient(env);
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, env, stripe);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object, env);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, env);
        break;
      case "invoice.payment_failed":
        console.log("payment failed for sub:", (event.data.object as any).subscription);
        break;
      default:
        console.log("unhandled", event.type);
    }
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
