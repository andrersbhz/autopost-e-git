import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformSettings, DEFAULT_PLANS, type PlanTier } from "@/hooks/usePlatformSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Upload, Save, ExternalLink, Palette, Image as ImageIcon, ShieldCheck, DollarSign, Plus, Trash2, Star, MousePointer2, Type, MonitorPlay, Link2, Search } from "lucide-react";
import { Link } from "react-router-dom";

const BrandingPage = () => {
  const { user } = useAuth();
  const { settings, loading, reload } = usePlatformSettings();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [isSuper, setIsSuper] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "favicon" | "hero" | null>(null);

  useEffect(() => setForm(settings), [settings]);

  useEffect(() => {
    if (!user || !settings.id) return;
    supabase
      .from("platform_settings")
      .select("contact_email,contact_phone")
      .eq("id", settings.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setForm((s) => ({ ...s, contact_email: data.contact_email, contact_phone: data.contact_phone }));
      });
  }, [user, settings.id]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("nexa_organization_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .eq("status", "active")
      .maybeSingle()
      .then(({ data }) => setIsSuper(!!data));
  }, [user]);

  const update = (k: keyof typeof form, v: any) => setForm((s) => ({ ...s, [k]: v }));

  const updatePlan = (i: number, patch: Partial<PlanTier>) => {
    setForm((s) => {
      const plans = [...(s.plans_json || [])];
      plans[i] = { ...plans[i], ...patch };
      return { ...s, plans_json: plans };
    });
  };
  const addPlan = () => {
    setForm((s) => ({
      ...s,
      plans_json: [...(s.plans_json || []), { name: "Novo Plano", plan: null, amountBRL: 0, price: "R$ 0", period: "/mês", highlight: false, tag: "Personalizado", cta: "Assinar", features: ["Recurso 1"] }],
    }));
  };
  const removePlan = (i: number) => setForm((s) => ({ ...s, plans_json: (s.plans_json || []).filter((_, idx) => idx !== i) }));
  const updateFeature = (pi: number, fi: number, val: string) => {
    const feats = [...(form.plans_json[pi]?.features || [])];
    feats[fi] = val;
    updatePlan(pi, { features: feats });
  };
  const addFeature = (pi: number) => updatePlan(pi, { features: [...(form.plans_json[pi]?.features || []), "Novo recurso"] });
  const removeFeature = (pi: number, fi: number) => updatePlan(pi, { features: (form.plans_json[pi]?.features || []).filter((_, i) => i !== fi) });
  const resetPlans = () => setForm((s) => ({ ...s, plans_json: DEFAULT_PLANS }));

  const handleUpload = async (file: File, kind: "logo" | "favicon" | "hero") => {
    if (!user) return;
    setUploading(kind);
    try {
      if (kind === "hero" && !file.type.startsWith("image/")) throw new Error("Selecione uma imagem válida.");
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/brand/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("article-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("article-images").getPublicUrl(path);
      update(kind === "logo" ? "logo_url" : kind === "favicon" ? "favicon_url" : "hero_image_url", data.publicUrl);
      toast.success(`${kind === "logo" ? "Logo" : kind === "favicon" ? "Favicon" : "Imagem do slider"} enviado`);
    } catch (e: any) {
      toast.error(e.message || "Erro no upload");
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    if (!settings.id) return toast.error("Configurações não carregadas");
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings")
      .update({
        brand_name: form.brand_name,
        brand_short: form.brand_short,
        tagline: form.tagline,
        description: form.description,
        logo_url: form.logo_url,
        favicon_url: form.favicon_url,
        hero_video_url: form.hero_video_url,
        hero_image_url: form.hero_image_url,
        hero_title_color: form.hero_title_color,
        hero_title_size: form.hero_title_size,
        hero_description_color: form.hero_description_color,
        hero_description_size: form.hero_description_size,
        hero_link_url: form.hero_link_url || null,
        hero_link_label: form.hero_link_label,
        hero_button_bg_color: form.hero_button_bg_color,
        hero_button_text_color: form.hero_button_text_color,
        primary_color: form.primary_color,
        accent_color: form.accent_color,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        cta_primary: form.cta_primary,
        cta_secondary: form.cta_secondary,
        offer_badge: form.offer_badge,
        footer_text: form.footer_text,
        button_radius: form.button_radius,
        button_hover_style: form.button_hover_style,
        font_color_base: form.font_color_base,
        font_color_muted: form.font_color_muted,
        plans_json: form.plans_json as any,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
        google_site_verification: form.google_site_verification,
      } as any)
      .eq("id", settings.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
    reload();
  };

  if (loading) return <div className="p-12 text-center text-white/60">Carregando...</div>;

  if (!isSuper) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <ShieldCheck className="h-12 w-12 mx-auto text-lime-400 mb-4" />
        <h2 className="text-xl font-bold mb-2">Acesso restrito</h2>
        <p className="text-white/60 text-sm">Apenas administradores gerais podem editar a marca da plataforma.</p>
      </div>
    );
  }

  const previewTitleSize = Math.max(18, Math.min(36, Math.round((form.hero_title_size || 64) * 0.45)));
  const previewDescriptionSize = Math.max(10, Math.min(18, Math.round((form.hero_description_size || 22) * 0.62)));

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-lime-400 font-bold">Super Admin</p>
          <h1 className="text-3xl font-black text-white">Marca e Identidade</h1>
          <p className="text-white/60 text-sm mt-1">Personalize nome, logo, slider, cores e textos da página de vendas e do sistema.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/vendas" target="_blank">
            <Button variant="outline" className="border-white/20 bg-white/5 text-white"><ExternalLink className="h-4 w-4 mr-2" /> Ver página</Button>
          </Link>
          <Button onClick={save} disabled={saving} className="bg-[#a3ff12] text-black font-bold hover:bg-[#a3ff12]/90 hover:shadow-[0_0_16px_rgba(163,255,18,0.7)] hover:-translate-y-0.5 transition-all">
            <Save className="h-4 w-4 mr-2" />{saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>

      <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800"><ImageIcon className="h-5 w-5 text-lime-400" /><h2 className="text-lg font-bold text-white">Identidade Visual</h2></div>
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label className="text-white">Nome completo</Label><Input value={form.brand_name} onChange={(e) => update("brand_name", e.target.value)} className="bg-slate-950 border-slate-700 text-white" /></div>
          <div><Label className="text-white">Nome curto / abreviação</Label><Input value={form.brand_short} onChange={(e) => update("brand_short", e.target.value)} className="bg-slate-950 border-slate-700 text-white" /></div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-white flex items-center gap-2">Logo</Label>
            <div className="flex items-center gap-3 mt-2">
              {form.logo_url && <img src={form.logo_url} alt="Logo" className="h-14 w-14 rounded-lg object-contain bg-slate-950 border border-slate-700 p-1" />}
              <label className="cursor-pointer"><input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "logo")} /><Button asChild variant="outline" className="border-white/20 bg-white/5 text-white cursor-pointer" disabled={uploading === "logo"}><span><Upload className="h-4 w-4 mr-2" />{uploading === "logo" ? "Enviando..." : "Enviar logo"}</span></Button></label>
            </div>
            <Input value={form.logo_url || ""} onChange={(e) => update("logo_url", e.target.value)} placeholder="ou cole uma URL" className="bg-slate-950 border-slate-700 text-white mt-2 text-xs" />
          </div>
          <div>
            <Label className="text-white">Favicon</Label>
            <div className="flex items-center gap-3 mt-2">
              {form.favicon_url && <img src={form.favicon_url} alt="Favicon" className="h-14 w-14 rounded-lg object-contain bg-slate-950 border border-slate-700 p-1" />}
              <label className="cursor-pointer"><input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "favicon")} /><Button asChild variant="outline" className="border-white/20 bg-white/5 text-white cursor-pointer" disabled={uploading === "favicon"}><span><Upload className="h-4 w-4 mr-2" />{uploading === "favicon" ? "Enviando..." : "Enviar favicon"}</span></Button></label>
            </div>
            <Input value={form.favicon_url || ""} onChange={(e) => update("favicon_url", e.target.value)} placeholder="ou cole uma URL" className="bg-slate-950 border-slate-700 text-white mt-2 text-xs" />
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <Search className="h-5 w-5 text-lime-400" />
          <h2 className="text-lg font-bold text-white">Google Search Console</h2>
        </div>
        <div>
          <Label className="text-white">Código de Verificação (google-site-verification)</Label>
          <p className="text-[11px] text-white/50 mb-2">
            Insira apenas o código da meta tag (ex: 1234567890abcdef).
          </p>
          <Input 
            value={form.google_site_verification || ""} 
            onChange={(e) => update("google_site_verification", e.target.value)} 
            placeholder="Ex: P6u_Z1uX2W..."
            className="bg-slate-950 border-slate-700 text-white" 
          />
        </div>
      </Card>

      <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800"><MonitorPlay className="h-5 w-5 text-lime-400" /><div><h2 className="text-lg font-bold text-white">Slider principal do site</h2><p className="text-xs text-white/50">Imagem, textos, cores, tamanhos e botão opcional com preview em tempo real.</p></div></div>
        <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-6 items-start">
          <div className="space-y-4">
            <div><Label className="text-white">Título do slider</Label><Input value={form.tagline} onChange={(e) => update("tagline", e.target.value)} className="bg-slate-950 border-slate-700 text-white" /></div>
            <div><Label className="text-white">Texto do slider</Label><Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} className="bg-slate-950 border-slate-700 text-white" /></div>

            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 space-y-3">
              <Label className="text-white">Imagem do slider</Label>
              <div className="flex flex-wrap items-center gap-3">
                {form.hero_image_url && <img src={form.hero_image_url} alt="Imagem do slider" className="h-16 w-28 rounded-md object-cover border border-slate-700" />}
                <label className="cursor-pointer"><input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "hero")} /><Button asChild variant="outline" className="border-white/20 bg-white/5 text-white cursor-pointer" disabled={uploading === "hero"}><span><Upload className="h-4 w-4 mr-2" />{uploading === "hero" ? "Enviando..." : "Enviar imagem"}</span></Button></label>
                {form.hero_image_url && <Button type="button" variant="ghost" className="text-red-300 hover:text-white" onClick={() => update("hero_image_url", null)}>Remover imagem</Button>}
              </div>
              <Input value={form.hero_image_url || ""} onChange={(e) => update("hero_image_url", e.target.value)} placeholder="ou cole a URL da imagem" className="bg-slate-950 border-slate-700 text-white text-xs" />
              <div><Label className="text-white/70 text-xs">Vídeo de fundo (fallback quando não houver imagem)</Label><Input value={form.hero_video_url || ""} onChange={(e) => update("hero_video_url", e.target.value)} placeholder="https://...mp4" className="bg-slate-950 border-slate-700 text-white mt-1" /></div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label className="text-white">Cor do título</Label><div className="flex gap-2 mt-1"><input type="color" value={form.hero_title_color || "#ffffff"} onChange={(e) => update("hero_title_color", e.target.value)} className="h-10 w-14 rounded cursor-pointer bg-transparent" /><Input value={form.hero_title_color || "#ffffff"} onChange={(e) => update("hero_title_color", e.target.value)} className="bg-slate-950 border-slate-700 text-white" /></div></div>
              <div><Label className="text-white">Tamanho do título: {form.hero_title_size}px</Label><input type="range" min="24" max="120" value={form.hero_title_size || 64} onChange={(e) => update("hero_title_size", Number(e.target.value))} className="w-full mt-3 accent-lime-400" /></div>
              <div><Label className="text-white">Cor do texto</Label><div className="flex gap-2 mt-1"><input type="color" value={form.hero_description_color || "#b3b3b3"} onChange={(e) => update("hero_description_color", e.target.value)} className="h-10 w-14 rounded cursor-pointer bg-transparent" /><Input value={form.hero_description_color || "#b3b3b3"} onChange={(e) => update("hero_description_color", e.target.value)} className="bg-slate-950 border-slate-700 text-white" /></div></div>
              <div><Label className="text-white">Tamanho do texto: {form.hero_description_size}px</Label><input type="range" min="12" max="48" value={form.hero_description_size || 22} onChange={(e) => update("hero_description_size", Number(e.target.value))} className="w-full mt-3 accent-lime-400" /></div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 space-y-3">
              <div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-lime-400" /><div><Label className="text-white">Botão opcional do slider</Label><p className="text-[11px] text-white/50">Fica oculto automaticamente enquanto o campo Link estiver vazio.</p></div></div>
              <div><Label className="text-white text-xs">Link</Label><Input value={form.hero_link_url || ""} onChange={(e) => update("hero_link_url", e.target.value)} placeholder="https://... ou /pagina" className="bg-slate-950 border-slate-700 text-white" /></div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div><Label className="text-white text-xs">Texto do botão</Label><Input value={form.hero_link_label || ""} onChange={(e) => update("hero_link_label", e.target.value)} placeholder="Saiba mais" className="bg-slate-950 border-slate-700 text-white" /></div>
                <div><Label className="text-white text-xs">Fundo</Label><input type="color" value={form.hero_button_bg_color || form.primary_color} onChange={(e) => update("hero_button_bg_color", e.target.value)} className="mt-1 h-10 w-full rounded cursor-pointer bg-transparent" /></div>
                <div><Label className="text-white text-xs">Texto</Label><input type="color" value={form.hero_button_text_color || "#0a1128"} onChange={(e) => update("hero_button_text_color", e.target.value)} className="mt-1 h-10 w-full rounded cursor-pointer bg-transparent" /></div>
              </div>
            </div>
          </div>

          <div className="lg:sticky lg:top-6">
            <Label className="text-white mb-2 block">Preview do slider</Label>
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-700 bg-[#05010f] shadow-2xl">
              {form.hero_image_url ? <img src={form.hero_image_url} alt="Preview" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1a0033_0%,#05010f_68%,#000_100%)]" />}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25" />
              <div className="relative z-10 flex h-full flex-col items-start justify-center p-6 text-left">
                <h3 className="max-w-[92%] font-black leading-[1.05] tracking-tight" style={{ color: form.hero_title_color, fontSize: `${previewTitleSize}px` }}>{form.tagline || "Título do slider"}</h3>
                <p className="mt-3 max-w-[88%] leading-relaxed" style={{ color: form.hero_description_color, fontSize: `${previewDescriptionSize}px` }}>{form.description || "Texto de apoio do slider."}</p>
                {form.hero_link_url && <span className="mt-4 inline-flex items-center rounded-lg px-4 py-2 text-xs font-bold shadow-lg" style={{ backgroundColor: form.hero_button_bg_color, color: form.hero_button_text_color }}>{form.hero_link_label || "Saiba mais"}</span>}
              </div>
            </div>
            <p className="mt-2 text-[11px] text-white/40">O preview é reduzido; o site usa os tamanhos configurados de forma responsiva.</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800"><Palette className="h-5 w-5 text-lime-400" /><h2 className="text-lg font-bold text-white">Cores da Marca</h2></div>
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label className="text-white">Cor primária</Label><div className="flex gap-2 mt-1"><input type="color" value={form.primary_color} onChange={(e) => update("primary_color", e.target.value)} className="h-10 w-16 rounded cursor-pointer bg-transparent" /><Input value={form.primary_color} onChange={(e) => update("primary_color", e.target.value)} className="bg-slate-950 border-slate-700 text-white" /></div></div>
          <div><Label className="text-white">Cor de destaque</Label><div className="flex gap-2 mt-1"><input type="color" value={form.accent_color} onChange={(e) => update("accent_color", e.target.value)} className="h-10 w-16 rounded cursor-pointer bg-transparent" /><Input value={form.accent_color} onChange={(e) => update("accent_color", e.target.value)} className="bg-slate-950 border-slate-700 text-white" /></div></div>
        </div>
      </Card>

      <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800"><MousePointer2 className="h-5 w-5 text-lime-400" /><h2 className="text-lg font-bold text-white">Interface e Botões</h2></div>
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label className="text-white">Arredondamento dos botões (Ex: 0.5rem, 9999px)</Label><Input value={form.button_radius} onChange={(e) => update("button_radius", e.target.value)} className="bg-slate-950 border-slate-700 text-white mt-1" /></div>
          <div><Label className="text-white">Estilo de Hover</Label><select value={form.button_hover_style} onChange={(e) => update("button_hover_style", e.target.value)} className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-700 text-white rounded-md mt-1 outline-none focus:ring-2 focus:ring-lime-400/50"><option value="glow">Brilho Neon (Verde/Lilás)</option><option value="scale">Escala Suave (+5%)</option><option value="outline">Apenas Contorno</option><option value="standard">Padrão</option></select></div>
        </div>
      </Card>

      <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800"><Type className="h-5 w-5 text-lime-400" /><h2 className="text-lg font-bold text-white">Tipografia e Cores de Fonte</h2></div>
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label className="text-white">Cor da fonte base</Label><div className="flex gap-2 mt-1"><input type="color" value={form.font_color_base} onChange={(e) => update("font_color_base", e.target.value)} className="h-10 w-16 rounded cursor-pointer bg-transparent" /><Input value={form.font_color_base} onChange={(e) => update("font_color_base", e.target.value)} className="bg-slate-950 border-slate-700 text-white" /></div></div>
          <div><Label className="text-white">Cor da fonte secundária (Muted)</Label><div className="flex gap-2 mt-1"><input type="color" value={form.font_color_muted} onChange={(e) => update("font_color_muted", e.target.value)} className="h-10 w-16 rounded cursor-pointer bg-transparent" /><Input value={form.font_color_muted} onChange={(e) => update("font_color_muted", e.target.value)} className="bg-slate-950 border-slate-700 text-white" /></div></div>
        </div>
      </Card>

      <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white pb-2 border-b border-slate-800">Textos da Página de Vendas</h2>
        <div><Label className="text-white">Selo de oferta</Label><Input value={form.offer_badge || ""} onChange={(e) => update("offer_badge", e.target.value)} className="bg-slate-950 border-slate-700 text-white" /></div>
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label className="text-white">Botão primário (CTA)</Label><Input value={form.cta_primary} onChange={(e) => update("cta_primary", e.target.value)} className="bg-slate-950 border-slate-700 text-white" /></div>
          <div><Label className="text-white">Botão secundário</Label><Input value={form.cta_secondary} onChange={(e) => update("cta_secondary", e.target.value)} className="bg-slate-950 border-slate-700 text-white" /></div>
        </div>
        <div><Label className="text-white">Texto do rodapé (opcional)</Label><Input value={form.footer_text || ""} onChange={(e) => update("footer_text", e.target.value)} className="bg-slate-950 border-slate-700 text-white" /></div>
      </Card>

      <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-lime-400" /><h2 className="text-lg font-bold text-white">Planos e Preços</h2></div>
          <div className="flex gap-2"><Button size="sm" variant="outline" onClick={resetPlans} className="border-white/20 bg-white/5 text-white">Restaurar padrão</Button><Button size="sm" onClick={addPlan} className="bg-lime-400 text-slate-950 hover:bg-lime-300 font-bold"><Plus className="h-4 w-4 mr-1" /> Adicionar plano</Button></div>
        </div>
        <div className="space-y-6">
          {(form.plans_json || []).map((p, i) => (
            <div key={i} className="p-4 rounded-lg border border-slate-700 bg-slate-950/50 space-y-3">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-xs font-bold text-lime-400">PLANO #{i + 1}</span>{p.highlight && <span className="text-[10px] px-2 py-0.5 rounded-full bg-lime-400/20 text-lime-300 font-bold flex items-center gap-1"><Star className="h-3 w-3" /> DESTAQUE</span>}</div><Button size="sm" variant="ghost" onClick={() => removePlan(i)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></Button></div>
              <div className="grid md:grid-cols-3 gap-3">
                <div><Label className="text-white text-xs">Nome</Label><Input value={p.name} onChange={(e) => updatePlan(i, { name: e.target.value })} className="bg-slate-900 border-slate-700 text-white" /></div>
                <div><Label className="text-white text-xs">Selo (tag)</Label><Input value={p.tag} onChange={(e) => updatePlan(i, { tag: e.target.value })} className="bg-slate-900 border-slate-700 text-white" /></div>
                <div><Label className="text-white text-xs">ID do plano (checkout)</Label><Input value={p.plan ?? ""} onChange={(e) => updatePlan(i, { plan: e.target.value || null })} placeholder="ex.: pro_monthly ou vazio p/ contato" className="bg-slate-900 border-slate-700 text-white" /></div>
              </div>
              <div className="grid md:grid-cols-4 gap-3">
                <div><Label className="text-white text-xs">Preço exibido</Label><Input value={p.price} onChange={(e) => updatePlan(i, { price: e.target.value })} className="bg-slate-900 border-slate-700 text-white" /></div>
                <div><Label className="text-white text-xs">Período</Label><Input value={p.period} onChange={(e) => updatePlan(i, { period: e.target.value })} placeholder="/mês" className="bg-slate-900 border-slate-700 text-white" /></div>
                <div><Label className="text-white text-xs">Valor (R$) para cobrança</Label><Input type="number" value={p.amountBRL} onChange={(e) => updatePlan(i, { amountBRL: Number(e.target.value) })} className="bg-slate-900 border-slate-700 text-white" /></div>
                <div><Label className="text-white text-xs">Texto do botão</Label><Input value={p.cta} onChange={(e) => updatePlan(i, { cta: e.target.value })} className="bg-slate-900 border-slate-700 text-white" /></div>
              </div>
              <div className="flex items-center gap-3"><Switch checked={p.highlight} onCheckedChange={(v) => updatePlan(i, { highlight: v })} /><Label className="text-white text-sm">Destacar este plano (mais escolhido)</Label></div>
              <div>
                <div className="flex items-center justify-between mb-2"><Label className="text-white text-xs">Recursos incluídos</Label><Button size="sm" variant="ghost" onClick={() => addFeature(i)} className="text-lime-400 hover:text-lime-300 h-7"><Plus className="h-3 w-3 mr-1" /> Adicionar</Button></div>
                <div className="space-y-2">{(p.features || []).map((f, fi) => <div key={fi} className="flex gap-2"><Input value={f} onChange={(e) => updateFeature(i, fi, e.target.value)} className="bg-slate-900 border-slate-700 text-white text-sm" /><Button size="icon" variant="ghost" onClick={() => removeFeature(i, fi)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-shrink-0"><Trash2 className="h-4 w-4" /></Button></div>)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 bg-slate-900/60 border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white pb-2 border-b border-slate-800">Contato</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label className="text-white">E-mail</Label><Input type="email" value={form.contact_email || ""} onChange={(e) => update("contact_email", e.target.value)} className="bg-slate-950 border-slate-700 text-white" /></div>
          <div><Label className="text-white">Telefone / WhatsApp</Label><Input value={form.contact_phone || ""} onChange={(e) => update("contact_phone", e.target.value)} className="bg-slate-950 border-slate-700 text-white" /></div>
        </div>
      </Card>

      <div className="flex justify-end pt-4"><Button onClick={save} disabled={saving} className="bg-[#a3ff12] text-[#0a1128] font-bold hover:bg-[#a3ff12] hover:shadow-[0_0_16px_rgba(163,255,18,0.7)] hover:-translate-y-0.5 transition-all"><Save className="h-4 w-4 mr-2" />{saving ? "Salvando..." : "Salvar alterações"}</Button></div>
    </div>
  );
};

export default BrandingPage;
