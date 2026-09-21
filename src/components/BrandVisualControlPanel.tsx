import { useEffect, useMemo, useState } from "react";
import { Palette, Save, Settings2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { DEFAULT_BRAND_THEME, normalizeBrandTheme, type BrandThemeSettings } from "@/lib/brand-theme";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const COLOR_FIELDS: Array<[keyof BrandThemeSettings, string]> = [
  ["background_color", "Fundo do sistema"],
  ["card_color", "Cards / painéis"],
  ["popover_color", "Menus / popovers"],
  ["sidebar_color", "Sidebar"],
  ["secondary_color", "Superfície secundária"],
  ["muted_color", "Superfície neutra"],
  ["input_color", "Campos / inputs"],
  ["border_color", "Bordas"],
  ["text_color", "Texto principal"],
  ["muted_text_color", "Texto secundário"],
  ["link_color", "Links"],
  ["link_hover_color", "Links no hover"],
  ["success_color", "Sucesso / conectado"],
  ["warning_color", "Avisos"],
  ["danger_color", "Erro / destrutivo"],
  ["sales_background_color", "Vendas: fundo"],
  ["sales_surface_color", "Vendas: cards"],
  ["sales_text_color", "Vendas: texto"],
  ["sales_muted_text_color", "Vendas: texto secundário"],
  ["primary_button_bg", "Botão primário: fundo"],
  ["primary_button_text", "Botão primário: texto"],
  ["primary_button_hover_bg", "Botão primário: hover fundo"],
  ["primary_button_hover_text", "Botão primário: hover texto"],
  ["secondary_button_bg", "Botão secundário: fundo"],
  ["secondary_button_text", "Botão secundário: texto"],
  ["secondary_button_hover_bg", "Botão secundário: hover fundo"],
  ["secondary_button_hover_text", "Botão secundário: hover texto"],
];

export default function BrandVisualControlPanel() {
  const { settings } = usePlatformSettings();
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [allowed, setAllowed] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<BrandThemeSettings>(DEFAULT_BRAND_THEME);

  useEffect(() => {
    const id = window.setInterval(() => setPathname(window.location.pathname), 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let active = true;
    async function checkAccess() {
      const { data: auth } = await supabase.auth.getUser();
      if (!active || !auth.user) return setAllowed(false);
      const { data } = await supabase
        .from("nexa_organization_members")
        .select("role")
        .eq("user_id", auth.user.id)
        .eq("role", "super_admin")
        .eq("status", "active")
        .maybeSingle();
      if (active) setAllowed(!!data);
    }
    checkAccess();
    return () => { active = false; };
  }, [pathname]);

  useEffect(() => {
    if (!settings.id || pathname !== "/branding" || !allowed) return;
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const { data } = await supabase
          .from("platform_settings")
          .select("theme_json")
          .eq("id", settings.id)
          .maybeSingle();
        if (active) setDraft(normalizeBrandTheme((data as any)?.theme_json));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [settings.id, pathname, allowed]);

  const visible = pathname === "/branding" && allowed;
  const changed = useMemo(() => JSON.stringify(draft) !== JSON.stringify(DEFAULT_BRAND_THEME), [draft]);
  if (!visible) return null;

  const set = <K extends keyof BrandThemeSettings>(key: K, value: BrandThemeSettings[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  async function save() {
    if (!settings.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings")
      .update({ theme_json: draft as any, updated_at: new Date().toISOString() } as any)
      .eq("id", settings.id);
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("theme_json")
        ? "A coluna theme_json ainda não foi aplicada no banco. Execute a migration incluída neste projeto."
        : error.message);
      return;
    }
    window.dispatchEvent(new CustomEvent("brand-theme-updated", { detail: draft }));
    toast.success("Visual global atualizado");
  }

  function restore() {
    setDraft({ ...DEFAULT_BRAND_THEME });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[120] inline-flex items-center gap-2 rounded-full border border-primary/40 bg-card px-4 py-3 text-sm font-bold text-foreground shadow-2xl transition hover:border-primary"
      >
        <Palette className="h-4 w-4 text-primary" /> Controle visual completo
      </button>

      {open && (
        <div className="fixed inset-0 z-[130] bg-black/55 backdrop-blur-sm" onMouseDown={(e) => e.currentTarget === e.target && setOpen(false)}>
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><Settings2 className="h-4 w-4" /> Marca / Vendas</div>
                <h2 className="mt-1 text-2xl font-black text-foreground">Controle total do visual</h2>
                <p className="mt-1 text-sm text-muted-foreground">Essas opções têm prioridade sobre presets antigos e hardcodes visuais do sistema.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-5 w-5" /></Button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loading ? <div className="py-16 text-center text-muted-foreground">Carregando configurações…</div> : (
                <div className="space-y-7">
                  <section>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-foreground">Tipografia</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Fonte do sistema"><input value={draft.font_family_base} onChange={(e) => set("font_family_base", e.target.value)} /></Field>
                      <Field label="Fonte de títulos"><input value={draft.font_family_heading} onChange={(e) => set("font_family_heading", e.target.value)} /></Field>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Aceita pilhas CSS, por exemplo: Inter, Arial, sans-serif. O sistema não força mais Montserrat como fonte visual.</p>
                  </section>

                  <section>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-foreground">Cores globais e página de vendas</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {COLOR_FIELDS.map(([key, label]) => (
                        <ColorField key={key} label={label} value={String(draft[key])} onChange={(value) => set(key, value as never)} />
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-foreground">Formas e profundidade</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Raio de cards"><input value={draft.card_radius} onChange={(e) => set("card_radius", e.target.value)} /></Field>
                      <Field label="Raio de inputs"><input value={draft.input_radius} onChange={(e) => set("input_radius", e.target.value)} /></Field>
                      <Field label="Sombra dos painéis" className="md:col-span-2"><input value={draft.panel_shadow} onChange={(e) => set("panel_shadow", e.target.value)} /></Field>
                    </div>
                  </section>

                  <section className="rounded-xl border border-border bg-card p-4">
                    <h3 className="text-sm font-bold text-foreground">Preview de contraste</h3>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border p-4" style={{ background: draft.card_color, borderColor: draft.border_color, color: draft.text_color }}>
                        <strong>Card do sistema</strong><p className="mt-1 text-sm" style={{ color: draft.muted_text_color }}>Texto secundário e bordas configuráveis.</p>
                      </div>
                      <div className="rounded-xl border p-4" style={{ background: draft.sales_surface_color, borderColor: draft.border_color, color: draft.sales_text_color }}>
                        <strong>Card de vendas</strong><p className="mt-1 text-sm" style={{ color: draft.sales_muted_text_color }}>Visual da landing page.</p>
                      </div>
                      <button className="rounded-lg px-4 py-3 font-bold transition" style={{ background: draft.primary_button_bg, color: draft.primary_button_text }}>Botão primário</button>
                      <button className="rounded-lg px-4 py-3 font-bold transition" style={{ background: draft.secondary_button_bg, color: draft.secondary_button_text }}>Botão secundário</button>
                    </div>
                  </section>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card p-4">
              <Button variant="outline" onClick={restore}>Restaurar base neutra</Button>
              <div className="flex items-center gap-2">
                {changed && <span className="text-xs text-muted-foreground">Alterações não salvas</span>}
                <Button onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Salvando…" : "Salvar visual"}</Button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={className}><span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span><div className="[&_input]:h-10 [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-input [&_input]:bg-background [&_input]:px-3 [&_input]:text-sm [&_input]:text-foreground">{children}</div></label>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const safe = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return (
    <label>
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="flex gap-2">
        <input type="color" value={safe} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background p-1" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground" />
      </div>
    </label>
  );
}
