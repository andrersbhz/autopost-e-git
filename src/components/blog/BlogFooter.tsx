import { Link } from 'react-router-dom';
import { useI18n } from '@/hooks/useI18n';
import { useBlogCategories } from '@/hooks/useBlogCategories';

const BlogFooter = () => {
  const { currentLang } = useI18n();
  const { categories } = useBlogCategories();

  return (
    <footer className="bg-[hsl(var(--news-navy-deep))] text-white/80 mt-20">
      <div className="news-container py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <div className="flex items-baseline gap-2 mb-4">
            <span className="news-display text-4xl text-white leading-none">A3</span>
            <span className="news-display text-4xl text-[hsl(var(--news-accent))] leading-none">
              PORTAL
            </span>
          </div>
          <p className="font-news text-sm text-white/65 max-w-md leading-relaxed">
            Portal de notícias independente cobrindo esportes, tecnologia, entretenimento e o que
            mais importa — atualizado em tempo real.
          </p>
        </div>

        <div>
          <h3 className="news-kicker text-white mb-4">Categorias</h3>
          <ul className="space-y-2">
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link
                  to={`/${currentLang}/${c.id}`}
                  className="font-news text-sm text-white/70 hover:text-[hsl(var(--news-accent))] transition-colors"
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="news-kicker text-white mb-4">Institucional</h3>
          <ul className="space-y-2 font-news text-sm">
            <li><Link to={`/${currentLang}/sobre`} className="text-white/70 hover:text-[hsl(var(--news-accent))]">Sobre</Link></li>
            <li><Link to={`/${currentLang}/principios-editoriais`} className="text-white/70 hover:text-[hsl(var(--news-accent))]">Princípios Editoriais</Link></li>
            <li><Link to={`/${currentLang}/termos`} className="text-white/70 hover:text-[hsl(var(--news-accent))]">Termos de Uso</Link></li>
            <li><Link to={`/${currentLang}/privacidade`} className="text-white/70 hover:text-[hsl(var(--news-accent))]">Privacidade</Link></li>
            <li><Link to={`/${currentLang}/contato`} className="text-white/70 hover:text-[hsl(var(--news-accent))]">Contato</Link></li>
            <li><Link to={`/${currentLang}/anuncie`} className="text-white/70 hover:text-[hsl(var(--news-accent))]">Anuncie</Link></li>
            <li><Link to={`/${currentLang}/newsletter`} className="text-white/70 hover:text-[hsl(var(--news-accent))]">Newsletter</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="news-container py-5 text-[11px] text-white/50 font-news flex flex-col sm:flex-row gap-2 sm:justify-between">
          <span>© {new Date().getFullYear()} A3 Portal — Todos os direitos reservados.</span>
          <span>Feito com jornalismo e tecnologia.</span>
        </div>
      </div>
    </footer>
  );
};

export default BlogFooter;
