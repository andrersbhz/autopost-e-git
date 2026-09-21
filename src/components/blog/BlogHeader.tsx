import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Search, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useBlogCategories } from '@/hooks/useBlogCategories';
import AdminMenu from './AdminMenu';
import LanguageSwitcher from './LanguageSwitcher';
import BlogCategoryNav from './BlogCategoryNav';
import BlogMobileMenu from './BlogMobileMenu';
import AutoTranslate from './AutoTranslate';

const BlogHeader = () => {
  const { currentLang } = useI18n();
  const { user } = useAuth();
  const { categories, loading } = useBlogCategories();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) toggleBtnRef.current?.focus({ preventScroll: true });
  }, [isMenuOpen]);

  return (
    <>
      <AutoTranslate currentLang={currentLang as any} />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-[hsl(var(--news-accent))] focus:text-white focus:px-4 focus:py-2"
      >
        Pular para o conteúdo principal
      </a>
      <header
        className={`sticky top-0 z-50 transition-shadow ${scrolled ? 'shadow-[0_2px_20px_rgba(0,0,0,0.08)]' : ''}`}
        role="banner"
      >
        {/* Top bar */}
        <div className="bg-[hsl(var(--news-navy-deep))] text-white/85 hidden lg:block">
          <div className="news-container flex items-center justify-between h-9 text-[11px]">
            <BlogCategoryNav
              categories={categories}
              currentLang={currentLang}
              loading={loading}
              className="flex items-center gap-5 flex-wrap"
              itemClassName="news-kicker text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
            />
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              {user ? (
                <AdminMenu user={user} />
              ) : (
                <Link
                  to="/auth"
                  className="news-kicker bg-[hsl(var(--news-accent))] text-white px-3 py-1.5 hover:brightness-110 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Minha Conta
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Brand bar */}
        <div className="bg-white border-b border-[hsl(var(--news-line))]">
          <div className="news-container h-16 lg:h-20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                ref={toggleBtnRef}
                variant="ghost"
                size="icon"
                aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={isMenuOpen}
                aria-controls="blog-mobile-menu"
                className="lg:hidden h-11 w-11 text-[hsl(var(--news-navy))] hover:bg-[hsl(var(--news-paper))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--news-navy))]"
                onClick={() => setIsMenuOpen((v) => !v)}
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
              <Link
                to={`/${currentLang}`}
                aria-label="A3 Portal — página inicial"
                className="flex items-baseline gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--news-navy))] focus-visible:ring-offset-2"
              >
                <span className="news-display text-3xl lg:text-4xl text-[hsl(var(--news-navy-deep))] leading-none">
                  A3
                </span>
                <span className="news-display text-3xl lg:text-4xl text-[hsl(var(--news-accent))] leading-none">
                  PORTAL
                </span>
              </Link>

              {/* Categorias inline - todas as categorias ao lado da marca */}
              <BlogCategoryNav
                categories={categories}
                currentLang={currentLang}
                loading={loading}
                className="hidden md:flex items-center gap-x-5 gap-y-1 flex-wrap ml-2"
                itemClassName="news-kicker text-[hsl(var(--news-ink))] hover:text-[hsl(var(--news-accent))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--news-navy))] focus-visible:ring-offset-2 rounded whitespace-nowrap"
              />
            </div>

            <button
              type="button"
              aria-label="Buscar no portal"
              className="hidden md:flex items-center gap-2 px-4 h-10 bg-[hsl(var(--news-paper))] hover:bg-[hsl(var(--news-line))] border border-[hsl(var(--news-line))] transition news-kicker text-[hsl(var(--news-muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--news-navy))]"
            >
              <Search className="h-4 w-4" /> Buscar
            </button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Buscar"
              className="md:hidden h-11 w-11 text-[hsl(var(--news-navy))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--news-navy))]"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>

        </div>

        {isMenuOpen && (
          <BlogMobileMenu
            categories={categories}
            currentLang={currentLang}
            user={user}
            loading={loading}
            onNavigate={() => setIsMenuOpen(false)}
          />
        )}
      </header>
    </>
  );
};

export default BlogHeader;
