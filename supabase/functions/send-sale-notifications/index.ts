import { createClient } from "npm:@supabase/supabase-js@2";
import { sendMail } from "../_shared/smtp.ts";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function sendEmailViaLovable(to: string, subject: string, html: string): Promise<boolean> {
  try {
    await sendMail({ to, subject, html });
    return true;
  } catch (e) {
    console.warn("SMTP send failed:", (e as Error).message);
    return false;
  }
}

async function sendWhatsAppViaTwilio(toE164: string, body: string): Promise<boolean> {
  const twilioKey = Deno.env.get("TWILIO_API_KEY");
  const lovable = Deno.env.get("LOVABLE_API_KEY");
  const fromNumber = Deno.env.get("TWILIO_WHATSAPP_FROM"); // ex: +14155238886
  if (!twilioKey || !lovable || !fromNumber) return false;
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovable}`,
        "X-Connection-Api-Key": twilioKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: `whatsapp:${toE164}`,
        From: `whatsapp:${fromNumber}`,
        Body: body,
      }),
    });
    if (!res.ok) { console.warn("twilio err", await res.text()); return false; }
    return true;
  } catch (e) { console.warn(e); return false; }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  try {
    const { saleId } = await req.json();
    if (!saleId) return new Response("no sale", { status: 400 });

    const { data: sale } = await sb.from("sale_notifications").select("*,license:license_id(license_key,plan,expires_at)").eq("id", saleId).maybeSingle();
    if (!sale) return new Response("not found", { status: 404 });

    const { data: cfg } = await sb.from("payment_methods_config").select("*").limit(1).maybeSingle();
    const licenseKey = (sale as any).license?.license_key || "";
    const plan = sale.plan;
    const activateUrl = `${Deno.env.get("SITE_URL") || "https://forex.a3solucoesdigitais.com"}/ativar`;

    // Customer email with key
    if (cfg?.notify_email_customer && sale.buyer_email) {
      await sendEmailViaLovable(
        sale.buyer_email,
        `Sua licença ${plan} está pronta 🎉`,
        `<div style="font-family:system-ui;padding:24px;background:#0b1020;color:#fff;border-radius:12px">
          <h2 style="color:#a3ff12">Bem-vindo(a) à Nexa!</h2>
          <p>Seu pagamento foi confirmado. Use a chave abaixo para acessar o sistema:</p>
          <div style="font-family:monospace;font-size:22px;letter-spacing:2px;background:#141a2e;padding:16px;border-radius:8px;text-align:center;border:1px solid #a3ff12">${licenseKey}</div>
          <p style="margin-top:16px"><a href="${activateUrl}" style="background:#a3ff12;color:#000;padding:12px 24px;border-radius:999px;font-weight:bold;text-decoration:none">Ativar agora</a></p>
          <p style="color:#888;font-size:12px;margin-top:24px">Cada chave permite 1 sessão ativa. Se logar em outro dispositivo, o anterior é desconectado automaticamente.</p>
        </div>`,
      );
    }
    // Admin email
    if (cfg?.notify_email_admin && cfg?.admin_notify_email) {
      await sendEmailViaLovable(
        cfg.admin_notify_email,
        `💰 Nova venda: ${plan} — R$ ${(sale.amount_cents / 100).toFixed(2)}`,
        `<div style="font-family:system-ui">
          <h3>Nova venda aprovada</h3>
          <p><b>Cliente:</b> ${sale.buyer_name || ""} &lt;${sale.buyer_email}&gt;</p>
          <p><b>Telefone:</b> ${sale.buyer_phone || "-"}</p>
          <p><b>Plano:</b> ${plan} — R$ ${(sale.amount_cents / 100).toFixed(2)}</p>
          <p><b>Método:</b> ${sale.payment_method}</p>
          <p><b>Chave gerada:</b> <code>${licenseKey}</code></p>
        </div>`,
      );
    }
    // Admin WhatsApp
    if (cfg?.notify_whatsapp_admin && cfg?.notify_admin_whatsapp_number) {
      await sendWhatsAppViaTwilio(
        cfg.notify_admin_whatsapp_number,
        `💰 Nova venda Nexa: ${plan} R$${(sale.amount_cents / 100).toFixed(2)}\nCliente: ${sale.buyer_name || sale.buyer_email}\nChave: ${licenseKey}`,
      );
    }

    await sb.from("sale_notifications").update({ delivered_at: new Date().toISOString() }).eq("id", saleId);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
});
