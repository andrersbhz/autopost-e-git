import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import BrandVisualControlPanel from "@/components/BrandVisualControlPanel";
import { contrastForeground, hexToHsl, normalizeBrandTheme, type BrandThemeSettings } from "@/lib/brand-theme";

export default function BrandThemeRuntime() {
  const { settings } = usePlatformSettings();
  const [theme, setTheme] = useState<BrandThemeSettings>(() => normalizeBrandTheme(null));

  useEffect(() => {
    if (!settings.id) return;
    let active = true;
    async function loadTheme() {
      const { data } = await supabase.from("platform_settings").select("theme_json").eq("id", settings.id).maybeSingle();
      if (active) setTheme(normalizeBrandTheme((data as any)?.theme_json));
    }
    loadTheme();
    const onThemeUpdate = (event: Event) => setTheme(normalizeBrandTheme((event as CustomEvent<BrandThemeSettings>).detail));
    window.addEventListener("brand-theme-updated", onThemeUpdate);
    return () => { active = false; window.removeEventListener("brand-theme-updated", onThemeUpdate); };
  }, [settings.id]);

  const [isDark, setIsDark] = useState<boolean>(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const primary = settings.primary_color || "#a3ff12";
    const accent = settings.accent_color || "#b57bff";
    const primaryForeground = contrastForeground(primary);
    const accentForeground = contrastForeground(accent);

    // Tokens de marca — aplicados nos modos claro e escuro
    const brandVariables: Record<string, string> = {
      "--primary": hexToHsl(primary, "83 100% 54%"),
      "--primary-foreground": primaryForeground,
      "--accent": hexToHsl(accent, "266 100% 74%"),
      "--accent-foreground": accentForeground,
      "--ring": hexToHsl(primary, "83 100% 54%"),
      "--success": hexToHsl(theme.success_color, "142 71% 45%"),
      "--success-foreground": contrastForeground(theme.success_color),
      "--warning": hexToHsl(theme.warning_color, "38 92% 50%"),
      "--warning-foreground": contrastForeground(theme.warning_color),
      "--destructive": hexToHsl(theme.danger_color, "0 84% 60%"),
      "--destructive-foreground": contrastForeground(theme.danger_color),
      "--sidebar-primary": hexToHsl(primary, "83 100% 54%"),
      "--sidebar-primary-foreground": primaryForeground,
      "--sidebar-ring": hexToHsl(primary, "83 100% 54%"),
      "--brand-button-radius": settings.button_radius || "0.5rem",
      "--brand-card-radius": theme.card_radius,
      "--brand-input-radius": theme.input_radius,
      "--brand-font-family": theme.font_family_base,
      "--brand-heading-font-family": theme.font_family_heading,
      "--brand-primary-hex": primary,
      "--brand-accent-hex": accent,
      "--brand-link": theme.link_color,
      "--brand-link-hover": theme.link_hover_color,
      "--brand-panel-shadow": theme.panel_shadow,
      "--brand-sales-background": theme.sales_background_color,
      "--brand-sales-surface": theme.sales_surface_color,
      "--brand-sales-text": theme.sales_text_color,
      "--brand-sales-muted": theme.sales_muted_text_color,
      "--brand-button-primary-bg": theme.primary_button_bg || primary,
      "--brand-button-primary-text": theme.primary_button_text || `hsl(${primaryForeground})`,
      "--brand-button-primary-hover-bg": theme.primary_button_hover_bg || accent,
      "--brand-button-primary-hover-text": theme.primary_button_hover_text || `hsl(${accentForeground})`,
      "--brand-button-secondary-bg": theme.secondary_button_bg,
      "--brand-button-secondary-text": theme.secondary_button_text,
      "--brand-button-secondary-hover-bg": theme.secondary_button_hover_bg,
      "--brand-button-secondary-hover-text": theme.secondary_button_hover_text,
      "--brand-tab-active-bg": primary,
      "--brand-tab-active-text": `hsl(${primaryForeground})`,
    };

    // Tokens de superfície/tipografia escura — só no modo escuro,
    // para o modo claro usar a paleta :root definida no index.css
    const darkOnlyVariables: Record<string, string> = {
      "--background": hexToHsl(theme.background_color, "0 0% 0%"),
      "--foreground": hexToHsl(theme.text_color, "0 0% 100%"),
      "--card": hexToHsl(theme.card_color, "0 0% 2%"),
      "--card-foreground": hexToHsl(theme.text_color, "0 0% 100%"),
      "--popover": hexToHsl(theme.popover_color, "0 0% 3%"),
      "--popover-foreground": hexToHsl(theme.text_color, "0 0% 100%"),
      "--secondary": hexToHsl(theme.secondary_color, "0 0% 8%"),
      "--secondary-foreground": hexToHsl(theme.text_color, "0 0% 100%"),
      "--muted": hexToHsl(theme.muted_color, "0 0% 10%"),
      "--muted-foreground": hexToHsl(theme.muted_text_color, "0 0% 72%"),
      "--input": hexToHsl(theme.input_color, "0 0% 15%"),
      "--border": hexToHsl(theme.border_color, "0 0% 15%"),
      "--sidebar-background": hexToHsl(theme.sidebar_color, "0 0% 0%"),
      "--sidebar-foreground": hexToHsl(theme.text_color, "0 0% 100%"),
      "--sidebar-accent": hexToHsl(theme.secondary_color, "0 0% 8%"),
      "--sidebar-accent-foreground": hexToHsl(theme.text_color, "0 0% 100%"),
      "--sidebar-border": hexToHsl(theme.border_color, "0 0% 15%"),
      "--brand-font-color-base": theme.text_color || settings.font_color_base || "#ffffff",
      "--brand-font-color-muted": theme.muted_text_color || settings.font_color_muted || "#b8b8bf",
      "--brand-tab-hover-bg": theme.secondary_color,
      "--brand-tab-hover-text": theme.text_color,
    };

    Object.entries(brandVariables).forEach(([name, value]) => root.style.setProperty(name, value));
    Object.entries(darkOnlyVariables).forEach(([name, value]) => {
      if (isDark) root.style.setProperty(name, value);
      else root.style.removeProperty(name);
    });

    const hoverShadow = settings.button_hover_style === "glow" ? `0 0 18px ${primary}66` : settings.button_hover_style === "outline" ? "none" : settings.button_hover_style === "scale" ? "0 10px 24px rgba(0,0,0,.18)" : theme.panel_shadow;
    root.style.setProperty("--brand-button-hover-shadow", hoverShadow);
    document.body.dataset.buttonHoverStyle = settings.button_hover_style || "standard";
  }, [settings, theme, isDark]);

  return <BrandVisualControlPanel />;
}
