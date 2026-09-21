import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { ADMIN_NAV } from './AdminMenu';
import { Skeleton } from '@/components/ui/skeleton';
import type { BlogCategory } from './BlogCategoryNav';
import type { User } from '@supabase/supabase-js';

interface BlogMobileMenuProps {
  categories: BlogCategory[];
  currentLang: string;
  user: User | null;
  onNavigate: () => void;
  loading?: boolean;
}

const BlogMobileMenu = ({ categories, currentLang, user, onNavigate, loading = false }: BlogMobileMenuProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onNavigate();
    };
    document.addEventListener('keydown', handleKey);
    containerRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [onNavigate]);

  return (
    <div
      ref={containerRef}
      id="blog-mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu de navegação"
      className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 animate-in slide-in-from-top duration-200 z-40"
    >
      <div className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-4" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded" />
            ))}
            <span className="sr-only">Carregando categorias…</span>
          </div>
        ) : categories.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6" role="status">
            Nenhuma categoria disponível no momento.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/${currentLang}/${cat.id}`}
                className="text-xs font-bold uppercase tracking-widest p-2 border border-gray-100 rounded text-center text-gray-700 hover:text-primary hover:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={onNavigate}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        )}

        {user && (
          <div className="border-t border-gray-100 pt-4">
            <span className="text-[10px] font-black text-[#0669B2] uppercase tracking-widest block mb-2">Painel Admin</span>
            <div className="grid grid-cols-2 gap-2">
              {ADMIN_NAV.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onNavigate}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide p-2 border border-[#0669B2]/20 rounded text-[#0669B2] hover:bg-[#0669B2] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0669B2]"
                >
                  <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 pt-4 space-y-2 text-center">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Portal de Notícias</span>
        </div>
      </div>
    </div>
  );
};

export default BlogMobileMenu;
