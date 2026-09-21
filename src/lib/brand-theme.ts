export interface BrandThemeSettings {
  font_family_base: string;
  font_family_heading: string;
  background_color: string;
  card_color: string;
  popover_color: string;
  sidebar_color: string;
  secondary_color: string;
  muted_color: string;
  input_color: string;
  border_color: string;
  text_color: string;
  muted_text_color: string;
  link_color: string;
  link_hover_color: string;
  success_color: string;
  warning_color: string;
  danger_color: string;
  sales_background_color: string;
  sales_surface_color: string;
  sales_text_color: string;
  sales_muted_text_color: string;
  primary_button_bg: string;
  primary_button_text: string;
  primary_button_hover_bg: string;
  primary_button_hover_text: string;
  secondary_button_bg: string;
  secondary_button_text: string;
  secondary_button_hover_bg: string;
  secondary_button_hover_text: string;
  card_radius: string;
  input_radius: string;
  panel_shadow: string;
}

export const DEFAULT_BRAND_THEME: BrandThemeSettings = {
  font_family_base: "Inter, system-ui, sans-serif",
  font_family_heading: "Inter, system-ui, sans-serif",
  background_color: "#000000",
  card_color: "#050505",
  popover_color: "#080808",
  sidebar_color: "#000000",
  secondary_color: "#141414",
  muted_color: "#1a1a1a",
  input_color: "#111111",
  border_color: "#262626",
  text_color: "#ffffff",
  muted_text_color: "#b8b8bf",
  link_color: "#a3ff12",
  link_hover_color: "#b57bff",
  success_color: "#22c55e",
  warning_color: "#f59e0b",
  danger_color: "#ef4444",
  sales_background_color: "#05010f",
  sales_surface_color: "#0d0718",
  sales_text_color: "#ffffff",
  sales_muted_text_color: "#b9b5c4",
  primary_button_bg: "#a3ff12",
  primary_button_text: "#050505",
  primary_button_hover_bg: "#b57bff",
  primary_button_hover_text: "#ffffff",
  secondary_button_bg: "#151515",
  secondary_button_text: "#ffffff",
  secondary_button_hover_bg: "#2a2a2a",
  secondary_button_hover_text: "#ffffff",
  card_radius: "0.8rem",
  input_radius: "0.5rem",
  panel_shadow: "0 16px 42px -28px rgba(0,0,0,.65)",
};

export function normalizeBrandTheme(value: unknown): BrandThemeSettings {
  const incoming = value && typeof value === "object" && !Array.isArray(value)
    ? value as Partial<BrandThemeSettings>
    : {};
  return { ...DEFAULT_BRAND_THEME, ...incoming };
}

export function hexToHsl(hex: string, fallback: string) {
  const normalized = String(hex || "").trim();
  if (!/^#([0-9a-f]{6})$/i.test(normalized)) return fallback;
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function contrastForeground(hex: string, light = "0 0% 100%", dark = "222 47% 9%") {
  if (!/^#([0-9a-f]{6})$/i.test(String(hex || ""))) return light;
  const value = String(hex);
  const r = parseInt(value.slice(1, 3), 16);
  const g = parseInt(value.slice(3, 5), 16);
  const b = parseInt(value.slice(5, 7), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.62 ? dark : light;
}
