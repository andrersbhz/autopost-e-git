import { Helmet } from 'react-helmet-async';
import BlogHeader from '@/components/blog/BlogHeader';
import { Link } from 'react-router-dom';
import { useI18n } from '@/hooks/useI18n';
import { AlertCircle, CheckCircle2, ShieldCheck, CreditCard, Scale, FileText } from 'lucide-react';

const TermsPage = () => {
  const { currentLang } = useI18n();

  const sections = [
    {
      id: "aceitacao",
      title: "Aceitação dos Termos",
      icon: <CheckCircle2 className="h-5 w-5 text-[#0669B2]" />,
      content: "Ao acessar e utilizar o site do Portal de Notícias, você declara ter lido, compreendido e aceitado integralmente as condições estabelecidas nestes Termos de Uso. Caso não concorde com qualquer parte destes termos, você deve interromper o acesso imediatamente.\n\nReservamo-nos o direito de atualizar ou modificar estes termos a qualquer momento, sem aviso prévio. Recomendamos a consulta regular desta página para estar ciente das alterações."
    },
    {
      id: "regras",
      title: "Regras de Conduta",
      icon: <AlertCircle className="h-5 w-5 text-[#C4170C]" />,
      content: "A interação em nossas áreas de comentários e fóruns deve ser pautada pelo respeito e civilidade. É expressamente proibido:",
      list: [
        "Publicar conteúdo difamatório, obsceno, odioso ou que incite a violência e discriminação.",
        "Disseminar notícias falsas (fake news) ou informações deliberadamente enganosas.",
        "Realizar spam ou promoções comerciais não autorizadas em áreas públicas."
      ]
    },
    {
      id: "propriedade",
      title: "Propriedade Intelectual",
      icon: <ShieldCheck className="h-5 w-5 text-[#06AA48]" />,
      content: "Todo o conteúdo editorial, incluindo textos, fotografias, vídeos, gráficos e logotipos, é de propriedade exclusiva do Portal de Notícias ou de seus licenciantes.\n\nA reprodução, distribuição ou modificação de qualquer conteúdo sem autorização prévia por escrito é estritamente proibida e sujeita a penalidades legais.",
      image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=80&w=800"
    },
    {
      id: "isencao",
      title: "Isenção de Responsabilidade",
      icon: <Scale className="h-5 w-5 text-white" />,
      content: "O Portal de Notícias envidará todos os esforços para garantir a precisão e a atualidade das informações publicadas. No entanto, não garantimos que o conteúdo esteja livre de erros tipográficos ou imprecisões temporárias.\n\nO portal não se responsabiliza por decisões tomadas com base no conteúdo publicado, especialmente em áreas de finanças e saúde, que não substituem aconselhamento profissional especializado.",
      highlight: true
    },
    {
      id: "assinaturas",
      title: "Assinaturas e Pagamentos",
      icon: <CreditCard className="h-5 w-5 text-[#FF8000]" />,
      content: "Determinados conteúdos podem estar sujeitos a planos de assinatura. Ao contratar um serviço, o usuário concorda com os preços e ciclos de faturamento vigentes no momento da compra.",
      cards: [
        { icon: <ShieldCheck className="h-4 w-4" />, text: "Cancelamento simples a qualquer momento." },
        { icon: <ShieldCheck className="h-4 w-4" />, text: "Ambiente de pagamento 100% seguro." }
      ]
    },
    {
      id: "jurisdicao",
      title: "Jurisdição e Foro",
      icon: <FileText className="h-5 w-5 text-[#444]" />,
      content: "Estes termos são regidos pelas leis da República Federativa do Brasil. Para dirimir quaisquer controvérsias oriundas deste documento, fica eleito o foro da Comarca de São Paulo, Estado de São Paulo, com exclusão de qualquer outro, por mais privilegiado que seja."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-black font-sans antialiased">
      <Helmet>
        <title>Termos de Uso | A3 BLOG</title>
        <meta name="description" content="Leia os termos e condições de uso do A3 BLOG para entender suas responsabilidades e direitos ao acessar nosso portal de notícias." />
        <meta name="keywords" content="termos de uso, condições de uso, regras de conduta, a3 blog" />
        <link rel="canonical" href={window.location.origin + window.location.pathname} />
      </Helmet>
      
      <BlogHeader />
      
      <main className="max-w-[1200px] mx-auto px-4 lg:px-0 py-12">
        <header className="mb-12 border-b border-gray-100 pb-8">
          <h1 className="text-4xl lg:text-5xl font-black tracking-tighter mb-4 text-[#333]">Termos de Uso</h1>
          <p className="text-sm text-gray-500 font-medium">
            Última atualização: 24 de Maio de 2024. Bem-vindo ao Portal de Notícias. Ao acessar nosso conteúdo, você concorda em cumprir estes termos e condições que visam garantir a integridade da informação e o respeito mútuo.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Sidebar / Summary */}
          <aside className="lg:col-span-3">
            <div className="sticky top-24">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">Sumário</h2>
              <nav className="space-y-4">
                {sections.map((section, idx) => (
                  <a 
                    key={section.id} 
                    href={`#${section.id}`}
                    className="block text-xs font-bold text-gray-600 hover:text-[#0669B2] transition-colors"
                  >
                    {idx + 1}. {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div className="lg:col-span-9 space-y-16">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-6">
                  {section.icon}
                  <h2 className="text-xl font-extrabold tracking-tight text-[#333] uppercase">
                    {section.title}
                  </h2>
                </div>
                
                <div className={`p-8 border border-gray-100 rounded-sm shadow-sm ${section.highlight ? 'bg-[#002B49] text-white border-none' : 'bg-white'}`}>
                  <div className="space-y-4">
                    {section.content.split('\n\n').map((para, i) => (
                      <p key={i} className={`text-sm leading-relaxed ${section.highlight ? 'text-gray-200' : 'text-gray-600'} font-medium`}>
                        {para}
                      </p>
                    ))}
                    
                    {section.list && (
                      <ul className="space-y-3 mt-6">
                        {section.list.map((item, i) => (
                          <li key={i} className="flex gap-3 text-sm text-gray-600 font-medium">
                            <span className="text-[#C4170C] font-black">/</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}

                    {section.image && (
                      <div className="mt-8 relative aspect-video lg:aspect-[21/9] overflow-hidden rounded-sm border border-gray-100">
                        <img src={section.image} alt={section.title} className="w-full h-full object-cover" />
                      </div>
                    )}

                    {section.cards && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                        {section.cards.map((card, i) => (
                          <div key={i} className="flex items-center gap-3 p-4 border border-gray-100 rounded-sm bg-gray-50/50">
                            <div className="text-gray-400">{card.icon}</div>
                            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">{card.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      <footer className="bg-[#002B49] text-white py-16 mt-20">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-white/10 pb-12 mb-12">
            <div>
              <span className="font-black text-2xl tracking-tighter mb-4 block">Portal de Notícias</span>
              <p className="text-xs text-gray-400 font-medium leading-relaxed">
                Levando a informação com autoridade editorial e compromisso com a verdade.
              </p>
            </div>
            <div className="md:col-span-2 grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">Institucional</h4>
                <ul className="space-y-2 text-[10px] font-bold uppercase tracking-tight">
                  <li><Link to="#" className="hover:text-gray-300">Mapa do site</Link></li>
                  <li><Link to="#" className="hover:text-gray-300">Privacidade</Link></li>
                  <li><Link to="/pt-br/termos" className="text-white">Termos de Uso</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">Contato</h4>
                <ul className="space-y-2 text-[10px] font-bold uppercase tracking-tight">
                  <li><Link to="#" className="hover:text-gray-300">Anuncie</Link></li>
                  <li><Link to="#" className="hover:text-gray-300">Contato</Link></li>
                  <li><Link to="#" className="hover:text-gray-300">Newsletter</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tight flex justify-between items-center">
             <span>© 2024 Portal de Notícias. Todos os direitos reservados. Conteúdo de autoridade editorial.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TermsPage;
