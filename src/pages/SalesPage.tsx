import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Sparkles, Bot, Zap, TrendingUp, Globe2, ShieldCheck, Rocket, Brain,
  BarChart3, Facebook, Search, Clock, Trophy, CheckCircle2,
  ArrowRight, Star, Flame, Crown, Infinity as InfinityIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import CheckoutModal from "@/components/CheckoutModal";

const FEATURES = [
  { icon: Brain, title: "IA Multi-Provider", desc: "Gemini, OpenAI, Groq e Azure com fallback automático. Nunca fique offline." },
  { icon: Sparkles, title: "Geração Automática", desc: "Quantos artigos por dia otimizados para SEO, publicados sem você mover um dedo." },
  { icon: Globe2, title: "WordPress Nativo", desc: "Publica direto no seu portal via REST API com imagens, categorias e SEO." },
  { icon: Facebook, title: "Meta + Instagram", desc: "OAuth completo, posts, interações e crescimento orgânico automatizado." },
  { icon: Search, title: "Google Indexing", desc: "Indexação instantânea no Google Search Console. Rankeie em horas." },
  { icon: TrendingUp, title: "Trending Topics", desc: "Monitora tendências em tempo real e transforma em conteúdo viral." },
  { icon: Bot, title: "Robô Social", desc: "Engajamento humanizado 24/7. Cresce sua audiência enquanto você dorme." },
  { icon: BarChart3, title: "Analytics + IA", desc: "GA4, Jetpack e insights com Gemini. Saiba exatamente o que funciona." },
  { icon: ShieldCheck, title: "Multi-empresa", desc: "NEXA Insight: múltiplas organizações, papéis, auditoria e SSO." },
];

const TESTIMONIALS = [
  { name: "Ricardo M.", role: "CEO, Portal FinanceTop", text: "Triplicamos o tráfego orgânico em 90 dias. A automação é assustadora de tão eficiente." },
  { name: "Juliana C.", role: "Head de Marketing", text: "Economizei R$ 18k/mês em redação. O ROI apareceu no primeiro mês." },
  { name: "André S.", role: "Fundador, AgênciaX", text: "Escalei de 2 para 47 portais sem contratar ninguém. Isso não é ferramenta, é uma equipe." },
];

const SalesPage = () => {
  const { settings: s } = usePlatformSettings();
  const [checkout, setCheckout] = useState<{ plan: "starter_monthly" | "pro_monthly"; label: string; amount: number } | null>(null);
  const openEnterprise = () => {
    window.location.href = `mailto:contato@a3solucoesdigitais.com?subject=Interesse Enterprise ${encodeURIComponent(s.brand_name)}&body=Olá, gostaria de saber mais sobre o plano Enterprise.`;
  };
  const heroTitleSize = Math.max(24, Math.min(120, Number(s.hero_title_size) || 64));
  const heroDescriptionSize = Math.max(12, Math.min(48, Number(s.hero_description_size) || 22));

  return (
    <div className="relative min-h-screen bg-[#05010f] text-white overflow-x-hidden">
      <Helmet>
        <title>{s.brand_name} — {s.tagline}</title>
        <meta name="description" content={s.description} />
        <meta property="og:title" content={`${s.brand_name} — ${s.tagline}`} />
        <meta property="og:description" content={s.description} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        {s.hero_image_url && <meta property="og:image" content={s.hero_image_url} />}
        {s.favicon_url && <link rel="icon" href={s.favicon_url} />}
      </Helmet>

      <div className="fixed inset-0 -z-10 overflow-hidden">
        {!s.hero_image_url && s.hero_video_url && (
          <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-40" poster="">
            <source src={s.hero_video_url} type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1a0033_0%,#05010f_60%,#000_100%)]" />
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(163,255,18,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(163,255,18,0.08)_1px,transparent_1px)] [background-size:50px_50px]" />
        <div className="absolute top-1/4 -left-40 w-[600px] h-[600px] rounded-full blur-[160px] animate-pulse" style={{ backgroundColor: `${s.primary_color}1a` }} />
        <div className="absolute bottom-1/4 -right-40 w-[600px] h-[600px] rounded-full blur-[160px] animate-pulse" style={{ backgroundColor: `${s.accent_color}26`, animationDelay: "2s" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#05010f]/60 via-transparent to-[#05010f]" />
      </div>

      <header className="relative z-20 border-b border-white/5 backdrop-blur-md bg-[#05010f]/40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {s.logo_url ? (
              <img src={s.logo_url} alt={s.brand_name} className="h-9 w-9 rounded-lg object-contain" />
            ) : (
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.primary_color }}>
                <Zap className="h-5 w-5 text-[#0a1128]" strokeWidth={3} />
              </div>
            )}
            <span className="font-black text-xl tracking-tight">
              {s.brand_short}<span style={{ color: s.primary_color }}>.</span>
              <span className="uppercase">{s.brand_name.replace(s.brand_short, "").trim() || "PLATAFORMA"}</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#recursos" className="hover:text-[#a3ff12] transition">Recursos</a>
            <a href="#planos" className="hover:text-[#a3ff12] transition">Planos</a>
            <a href="#depoimentos" className="hover:text-[#a3ff12] transition">Clientes</a>
          </nav>
          <Link to="/auth">
            <Button className="bg-[#a3ff12] text-black font-bold hover:bg-[#a3ff12]/90 hover:shadow-[0_0_20px_rgba(163,255,18,0.7)] hover:-translate-y-0.5 transition-all">Entrar</Button>
          </Link>
        </div>
      </header>

      <section className="relative z-10 overflow-hidden border-b border-white/5">
        {s.hero_image_url && (
          <div className="absolute inset-0">
            <img src={s.hero_image_url} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#05010f]/95 via-[#05010f]/72 to-[#05010f]/55" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#05010f]/30 via-transparent to-[#05010f]" />
          </div>
        )}
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
          {s.offer_badge && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-black/30 backdrop-blur-md text-xs font-semibold mb-8 animate-pulse" style={{ color: s.primary_color }}>
              <Flame className="h-3.5 w-3.5" />{s.offer_badge}
            </div>
          )}

          <h1
            className="font-black leading-[1.05] tracking-tight mb-8 max-w-5xl mx-auto"
            style={{
              color: s.hero_title_color || "#ffffff",
              fontSize: `clamp(${Math.max(32, Math.round(heroTitleSize * 0.52))}px, 7vw, ${heroTitleSize}px)`,
            }}
          >
            {s.tagline}
          </h1>

          <p
            className="max-w-3xl mx-auto mb-8 leading-relaxed"
            style={{
              color: s.hero_description_color || "#b3b3b3",
              fontSize: `clamp(${Math.max(15, Math.round(heroDescriptionSize * 0.78))}px, 2.2vw, ${heroDescriptionSize}px)`,
            }}
          >
            {s.description}
          </p>

          {s.hero_link_url && (
            <div className="mb-8">
              <a href={s.hero_link_url} target={s.hero_link_url.startsWith("http") ? "_blank" : undefined} rel={s.hero_link_url.startsWith("http") ? "noreferrer" : undefined}>
                <Button
                  size="lg"
                  className="font-black px-8 py-6 hover:-translate-y-1 transition-all shadow-lg"
                  style={{ backgroundColor: s.hero_button_bg_color || s.primary_color, color: s.hero_button_text_color || "#0a1128" }}
                >
                  {s.hero_link_label || "Saiba mais"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link to="/auth">
              <Button size="lg" className="bg-[#a3ff12] text-black font-black text-base px-8 py-6 hover:bg-[#a3ff12]/90 hover:shadow-[0_0_32px_rgba(163,255,18,0.8),0_0_64px_rgba(163,255,18,0.3)] hover:-translate-y-1 transition-all">
                {s.cta_primary}<ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="#planos"><Button size="lg" variant="outline" className="border-white/20 bg-white/5 hover:bg-white/10 text-white hover:text-white focus:text-white active:text-white px-8 py-6">{s.cta_secondary}</Button></a>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-white/50">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#a3ff12]" /> Sem cartão de crédito</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#a3ff12]" /> Cancele quando quiser</span>
            <span className="hidden md:flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#a3ff12]" /> Setup em 5 minutos</span>
          </div>

          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[{ n: "500K+", l: "Artigos gerados" }, { n: "12", l: "Países ativos" }, { n: "99.9%", l: "Uptime SLA" }, { n: "4.9★", l: "Satisfação" }].map((m) => (
              <div key={m.l} className="p-6 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md">
                <div className="text-3xl md:text-4xl font-black" style={{ color: s.primary_color }}>{m.n}</div>
                <div className="text-xs uppercase tracking-widest text-white/50 mt-1">{m.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="recursos" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <div className="inline-block text-xs uppercase tracking-widest text-[#a3ff12] font-bold mb-4">Tudo integrado</div>
          <h2 className="text-4xl md:text-5xl font-black mb-4">Um único painel. <span className="text-[#a3ff12]">Zero fricção.</span></h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">Substitua 12 ferramentas por uma. Chega de assinaturas espalhadas e integrações quebradas.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="group relative p-8 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm hover:border-[#a3ff12]/40 hover:bg-white/[0.04] hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(163,255,18,0.15)] transition-all duration-300">
              <div className="h-12 w-12 rounded-xl bg-[#a3ff12]/10 border border-[#a3ff12]/20 flex items-center justify-center mb-5 group-hover:bg-[#a3ff12]/20 transition"><f.icon className="h-6 w-6 text-[#a3ff12]" /></div>
              <h3 className="text-xl font-bold mb-2">{f.title}</h3><p className="text-white/60 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs uppercase tracking-widest text-[#a3ff12] font-bold mb-4">Por que agora</div>
            <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">Cada dia sem automação é <span className="text-[#ff4d6d]">dinheiro perdido</span>.</h2>
            <p className="text-white/70 text-lg leading-relaxed mb-8">Enquanto você escreve manualmente, seus concorrentes publicam 90 artigos por mês. Rankeiam antes. Vendem antes. <b className="text-[#a3ff12]">Você fica pra trás.</b></p>
            <div className="space-y-4">
              {[{ i: Clock, t: "Economize 40h/semana", d: "Sem redação, sem edição, sem publicação manual." }, { i: Rocket, t: "Escale 10x mais rápido", d: "Do primeiro artigo à indexação no Google em 8 minutos." }, { i: Trophy, t: "Domine seu nicho", d: "Trending topics + IA = você sempre chega primeiro." }].map((b) => (
                <div key={b.t} className="flex gap-4"><div className="h-10 w-10 rounded-lg bg-[#a3ff12]/10 border border-[#a3ff12]/30 flex items-center justify-center flex-shrink-0"><b.i className="h-5 w-5 text-[#a3ff12]" /></div><div><div className="font-bold text-white">{b.t}</div><div className="text-white/60 text-sm">{b.d}</div></div></div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-[#a3ff12]/20 to-[#b57bff]/20 blur-3xl rounded-full" />
            <div className="relative p-8 rounded-3xl border border-white/10 bg-[#0a0518]/80 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-6"><div className="h-3 w-3 rounded-full bg-red-500" /><div className="h-3 w-3 rounded-full bg-yellow-500" /><div className="h-3 w-3 rounded-full bg-[#a3ff12]" /><span className="text-xs text-white/40 ml-2">a3.plataforma/live</span></div>
              <div className="space-y-3 font-mono text-sm">
                {[{ t: "IA detectou tendência: 'Bitcoin ETF'", s: "ok" }, { t: "Artigo gerado (1.847 palavras)", s: "ok" }, { t: "Imagem otimizada + alt-text", s: "ok" }, { t: "Publicado no WordPress", s: "ok" }, { t: "Post agendado no Facebook + Instagram", s: "ok" }, { t: "Indexação Google enviada", s: "ok" }, { t: "Analytics tracking ativo", s: "run" }].map((l, i) => (
                  <div key={i} className="flex items-center gap-3 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]" style={{ animationDelay: `${i * 0.15}s` }}>{l.s === "ok" ? <CheckCircle2 className="h-4 w-4 text-[#a3ff12] flex-shrink-0" /> : <div className="h-4 w-4 rounded-full border-2 border-[#a3ff12] border-t-transparent animate-spin flex-shrink-0" />}<span className="text-white/80">{l.t}</span></div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between"><span className="text-xs text-white/40">Tempo total</span><span className="text-[#a3ff12] font-black text-lg">8min 24s</span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="planos" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16"><div className="inline-block text-xs uppercase tracking-widest text-[#a3ff12] font-bold mb-4">Planos e preços</div><h2 className="text-4xl md:text-5xl font-black mb-4">Investimento que <span className="text-[#a3ff12]">se paga em 15 dias</span></h2><p className="text-white/60 text-lg">Sem taxas escondidas. Cancele quando quiser.</p></div>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto justify-center">
          {[
            {
              name: "Básico",
              price: "R$ 39,90",
              amountBRL: 39.9,
              period: "/mês",
              plan: "starter_monthly",
              highlight: false,
              tag: "Starter",
              features: ["Conectar 1 Blog", "Geração de Artigos IA", "SEO Yoast", "Suporte Base"],
              cta: "Assinar Agora"
            },
            {
              name: "Avançado",
              price: "R$ 89,90",
              amountBRL: 89.9,
              period: "/mês",
              plan: "pro_monthly",
              highlight: true,
              tag: "Popular",
              features: ["Até 10 Blogs", "Geração Priority IA", "Social Robot Full", "Robô Social Integrado", "Suporte Prioritário"],
              cta: "Assinar Agora"
            },
            {
              name: "Enterprise",
              price: "R$ 149,90",
              amountBRL: 149.9,
              period: "/mês",
              plan: null,
              highlight: false,
              tag: "Empresarial",
              features: ["Até 50 Blogs", "API White-label", "Infra Dedicada", "Consultoria SEO Mensal"],
              cta: "Falar com Vendas"
            }
          ].map((t) => (
            <div key={t.name} className={`relative p-8 rounded-3xl border backdrop-blur-sm transition-all hover:-translate-y-2 ${t.highlight ? "border-[#a3ff12] bg-gradient-to-b from-[#a3ff12]/10 to-transparent shadow-[0_0_60px_rgba(163,255,18,0.2)] scale-105" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}>
              {t.highlight && <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#a3ff12] text-[#0a1128] text-xs font-black uppercase tracking-wider flex items-center gap-1"><Crown className="h-3.5 w-3.5" /> {t.tag}</div>}
              {!t.highlight && <div className="text-xs uppercase tracking-widest text-white/40 mb-2">{t.tag}</div>}
              <h3 className="text-2xl font-black mb-2">{t.name}</h3><div className="mb-6"><span className="text-4xl md:text-5xl font-black">{t.price}</span><span className="text-white/50">{t.period}</span></div>
              <ul className="space-y-3 mb-8">{t.features.map((f) => <li key={f} className="flex items-start gap-2 text-white/80 text-sm"><CheckCircle2 className="h-5 w-5 text-[#a3ff12] flex-shrink-0 mt-0.5" /><span>{f}</span></li>)}</ul>
              <Button onClick={() => t.plan ? setCheckout({ plan: t.plan as "starter_monthly" | "pro_monthly", label: t.name, amount: t.amountBRL }) : openEnterprise()} className={`w-full font-bold py-6 ${t.highlight ? "bg-[#a3ff12] text-[#0a1128] hover:bg-[#a3ff12] hover:shadow-[0_0_24px_rgba(163,255,18,0.7)]" : "bg-white/5 border border-white/20 hover:bg-white/10 text-white"} transition-all`}>{t.cta}</Button>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center"><div className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/10 bg-white/[0.02] text-sm"><ShieldCheck className="h-4 w-4 text-[#a3ff12]" /><span className="text-white/70">Garantia incondicional de <b className="text-white">30 dias</b> ou seu dinheiro de volta</span></div></div>
      </section>

      <section id="depoimentos" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16"><div className="inline-block text-xs uppercase tracking-widest text-[#a3ff12] font-bold mb-4">Prova social</div><h2 className="text-4xl md:text-5xl font-black mb-4">Quem já <span className="text-[#a3ff12]">automatizou</span> não volta atrás</h2></div>
        <div className="grid md:grid-cols-3 gap-6">{TESTIMONIALS.map((t) => <div key={t.name} className="p-8 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm"><div className="flex gap-1 mb-4">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-[#a3ff12] text-[#a3ff12]" />)}</div><p className="text-white/80 mb-6 leading-relaxed">"{t.text}"</p><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#a3ff12] to-[#b57bff] flex items-center justify-center text-[#0a1128] font-black">{t.name[0]}</div><div><div className="font-bold text-sm">{t.name}</div><div className="text-xs text-white/50">{t.role}</div></div></div></div>)}</div>
      </section>

      <section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <div className="relative p-12 md:p-16 rounded-3xl border border-[#a3ff12]/30 bg-gradient-to-br from-[#0a0518] via-[#1a0033]/50 to-[#0a0518] text-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(163,255,18,0.15)_0%,transparent_70%)]" />
          <div className="relative"><InfinityIcon className="h-12 w-12 text-[#a3ff12] mx-auto mb-6" /><h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">Pronto para escalar <br /><span className="text-[#a3ff12] [text-shadow:0_0_40px_rgba(163,255,18,0.6)]">sem limites</span>?</h2><p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">Junte-se aos <b className="text-white">3.400+ editores</b> que já delegaram o operacional para a IA.</p><Link to="/auth"><Button size="lg" className="bg-[#a3ff12] text-[#0a1128] font-black text-lg px-10 py-7 hover:bg-[#a3ff12] hover:shadow-[0_0_40px_rgba(163,255,18,0.9),0_0_80px_rgba(163,255,18,0.4)] hover:-translate-y-1 transition-all">Começar agora — grátis por 7 dias<ArrowRight className="ml-2 h-6 w-6" /></Button></Link><p className="text-xs text-white/40 mt-6">Últimas <b className="text-[#a3ff12]">47 vagas</b> desta safra • Sem cartão • Setup em 5 min</p></div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/40"><div className="flex items-center gap-2"><div className="h-6 w-6 rounded bg-[#a3ff12] flex items-center justify-center"><Zap className="h-3.5 w-3.5 text-[#0a1128]" strokeWidth={3} /></div><span>{s.footer_text || `© ${new Date().getFullYear()} ${s.brand_name}. Todos os direitos reservados.`}</span></div><div className="flex items-center gap-6"><Link to="/auth" className="hover:text-[#a3ff12]">Entrar</Link><a href="#planos" className="hover:text-[#a3ff12]">Planos</a></div></div>
      </footer>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {checkout && <CheckoutModal open={!!checkout} onOpenChange={(v) => !v && setCheckout(null)} plan={checkout.plan} planLabel={checkout.label} amountBRL={checkout.amount} />}
    </div>
  );
};

export default SalesPage;
