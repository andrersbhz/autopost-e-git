import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export interface BlogCategory {
  id: string;
  label: string;
}

interface BlogCategoryNavProps {
  categories: BlogCategory[];
  currentLang: string;
  limit?: number;
  className?: string;
  itemClassName?: string;
  withBrand?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

const BlogCategoryNav = ({
  categories,
  currentLang,
  limit,
  className = '',
  itemClassName = 'hover:opacity-70 transition-opacity text-[#444] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded',
  withBrand = false,
  loading = false,
  emptyMessage = 'Nenhuma categoria disponível',
}: BlogCategoryNavProps) => {
  const items = limit ? categories.slice(0, limit) : categories;
  const skeletonCount = limit ?? 5;

  if (loading) {
    return (
      <nav className={className} aria-label="Categorias" aria-busy="true">
        {withBrand && <span className="text-[#000] font-black mr-2">A3 BLOG</span>}
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-16" />
        ))}
        <span className="sr-only">Carregando categorias…</span>
      </nav>
    );
  }

  if (items.length === 0) {
    return (
      <nav className={className} aria-label="Categorias">
        {withBrand && <span className="text-[#000] font-black mr-2">A3 BLOG</span>}
        <span className="text-xs text-muted-foreground italic" role="status">
          {emptyMessage}
        </span>
      </nav>
    );
  }

  return (
    <nav className={className} aria-label="Categorias">
      {withBrand && <span className="text-[#000] font-black mr-2">A3 BLOG</span>}
      {items.map((cat) => (
        <Link key={cat.id} to={`/${currentLang}/${cat.id}`} className={itemClassName}>
          {cat.label}
        </Link>
      ))}
    </nav>
  );
};

export default BlogCategoryNav;
