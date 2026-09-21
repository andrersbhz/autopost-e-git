import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlanTier {
  name: string;
  plan: "starter_monthly" | "pro_monthly" | null | string;
  amountBRL: number;
  price: string;
  period: string;
  highlight: boolean;
  tag: string;
  cta: string;
  features: string[];
}

export interface PlatformSettings {
  id: string;
  brand_name: string;
  brand_short: string;
  tagline: string;
  description: string;
  logo_url: string | null;
  favicon_url: string | null;
  hero_video_url: string | null;
  hero_image_url: string | null;
  hero_title_color: string;
  hero_title_size: number;
  hero_description_color: string;
  hero_description_size: number;
  hero_link_url: string | null;
  hero_link_label: string;
  hero_button_bg_color: string;
  hero_button_text_color: string;
  primary_color: string;
  accent_color: string;
  contact_email: string | null;
  contact_phone: string | null;
  cta_primary: string;
  cta_secondary: string;
  offer_badge: string | null;
  footer_text: string | null;
  button_radius: string;
  button_hover_style: string;
  font_color_base: string;
  font_color_muted: string;
  plans_json: PlanTier[];
  google_site_verification?: string | null;
}

export const DEFAULT_PLANS: PlanTier[] = [
  {
    name: "Completo", plan: "pro_monthly", amountBRL: 197, price: "R$ 197", period: "/mês", highlight: true, tag: "Todos os recursos", cta: "Assinar Completo",
    features: ["1 portal WordPress", "Artigos ilimitados gerados por IA", "Multi-contas Meta (Facebook + Instagram)", "Google Indexing + Search Console", "Robô Social humanizado 24/7", "Analytics avançado + insights com IA", "Base de conhecimento personalizada", "Image Studio (geração de imagens por IA)", "Agendamento e reagendamento inteligente", "Notícias virais e Google Trends em tempo real", "Suporte prioritário"],
  },
  {
    name: "Licença Adicional", plan: "starter_monthly", amountBRL: 49.9, price: "R$ 49,90", period: "/mês", highlight: false, tag: "Para expandir", cta: "Adicionar licença",
    features: ["Requer plano Completo ativo", "1 portal WordPress adicional", "Crie quantos artigos quiser", "1 conta Facebook + Instagram", "Analytics básico", "Suporte por e-mail"],
  },
  {
    name: "Personalizado", plan: null, amountBRL: 0, price: "Sob consulta", period: "", highlight: false, tag: "Sob medida", cta: "Falar com vendas",
    features: ["Portais WordPress ilimitados", "Integrações e APIs customizadas", "White-label e domínio próprio", "SSO, auditoria e compliance", "Gerente de sucesso dedicado", "SLA 99.9%"],
  },
];

const DEFAULTS: PlatformSettings = {
  id: "",
  brand_name: "A3 Plataforma",
  brand_short: "A3",
  tagline: "Seu portal no piloto automático com o poder da IA",
  description: "Publique quantos artigos quiser, distribua em Meta/Instagram, indexe no Google e escale seu tráfego sem contratar redatores.",
  logo_url: null,
  favicon_url: null,
  hero_video_url: "https://cdn.pixabay.com/video/2023/10/26/186098-878428480_large.mp4",
  hero_image_url: null,
  hero_title_color: "#ffffff",
  hero_title_size: 64,
  hero_description_color: "#b3b3b3",
  hero_description_size: 22,
  hero_link_url: null,
  hero_link_label: "Saiba mais",
  hero_button_bg_color: "#a3ff12",
  hero_button_text_color: "#0a1128",
  primary_color: "#a3ff12",
  accent_color: "#b57bff",
  contact_email: "contato@a3plataforma.com",
  contact_phone: null,
  cta_primary: "Começar agora — 7 dias grátis",
  cta_secondary: "Ver planos e preços",
  offer_badge: "OFERTA DE LANÇAMENTO — apenas 47 vagas restantes",
  footer_text: null,
  button_radius: "0.5rem",
  button_hover_style: "glow",
  font_color_base: "#ffffff",
  font_color_muted: "rgba(255,255,255,0.6)",
  plans_json: DEFAULT_PLANS,
  google_site_verification: null,
};

export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("platform_settings")
      .select("id,brand_name,brand_short,tagline,description,logo_url,favicon_url,hero_video_url,hero_image_url,hero_title_color,hero_title_size,hero_description_color,hero_description_size,hero_link_url,hero_link_label,hero_button_bg_color,hero_button_text_color,primary_color,accent_color,cta_primary,cta_secondary,offer_badge,footer_text,button_radius,button_hover_style,font_color_base,font_color_muted,plans_json,updated_at,google_site_verification")
      .limit(1)
      .maybeSingle();

    if (data) {
      const d: any = data;
      const plans = Array.isArray(d.plans_json) && d.plans_json.length > 0 ? d.plans_json : DEFAULT_PLANS;
      setSettings({ ...DEFAULTS, ...d, plans_json: plans });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { settings, loading, reload: load };
}
