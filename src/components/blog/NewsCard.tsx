import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import NewsImage from './NewsImage';
import { formatRelative } from '@/lib/date';

type Variant = 'lead' | 'grid' | 'list' | 'sidebar';

interface NewsCardProps {
  article: {
    id: string;
    slug?: string | null;
    title: string;
    meta_description?: string | null;
    featured_image_url?: string | null;
    category?: string | null;
    created_at?: string | null;
  };
  currentLang: string;
  variant?: Variant;
  accentColor?: string;
  index?: number;
}

const NewsCard = ({
  article,
  currentLang,
  variant = 'grid',
  accentColor = 'hsl(var(--news-accent))',
  index,
}: NewsCardProps) => {
  const href = `/${currentLang}/article/${article.slug || article.id}`;
  const category = article.category || 'Geral';
  const date = formatRelative(article.created_at);

  const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--news-navy))] focus-visible:ring-offset-2 focus-visible:ring-offset-white';

  if (variant === 'lead') {
    return (
      <article className="group news-card-hover h-full">
        <Link to={href} className={`block h-full ${focusRing}`}>
          <div className="relative aspect-[4/5] overflow-hidden bg-[hsl(var(--news-paper))] mb-4">
            <NewsImage
              src={article.featured_image_url || ''}
              alt={article.title}
              aspectRatio="hero"
              className="news-card-img w-full h-full"
            />
            <span
              className="absolute top-3 left-3 news-kicker text-white px-3 py-1.5"
              style={{ background: accentColor }}
            >
              {category}
            </span>
          </div>
          <h3 className="news-headline text-xl sm:text-2xl md:text-3xl text-[hsl(var(--news-ink))] group-hover:text-[hsl(var(--news-navy))] transition-colors line-clamp-3 mb-2">
            {article.title}
          </h3>
          {article.meta_description && (
            <p className="font-news text-sm sm:text-base text-[hsl(var(--news-muted))] line-clamp-2 mb-2">
              {article.meta_description}
            </p>
          )}
          <time className="news-kicker text-[hsl(var(--news-muted))] inline-flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" /> {date}
          </time>
        </Link>
      </article>
    );
  }

  if (variant === 'list') {
    return (
      <article className="group news-card-hover">
        <Link to={href} className={`flex gap-3 sm:gap-4 min-h-[88px] ${focusRing}`}>
          <div className="w-24 h-24 sm:w-32 sm:h-24 flex-shrink-0 overflow-hidden bg-[hsl(var(--news-paper))]">
            <NewsImage
              src={article.featured_image_url || ''}
              alt={article.title}
              aspectRatio="square"
              className="news-card-img w-full h-full"
            />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <span
              className="news-kicker mb-1"
              style={{ color: accentColor }}
            >
              {category}
            </span>
            <h4 className="news-headline text-sm sm:text-base text-[hsl(var(--news-ink))] group-hover:text-[hsl(var(--news-navy))] transition-colors line-clamp-3">
              {article.title}
            </h4>
            <time className="news-kicker text-[hsl(var(--news-muted))] mt-1.5">{date}</time>
          </div>
        </Link>
      </article>
    );
  }

  if (variant === 'sidebar') {
    return (
      <article className="group">
        <Link
          to={href}
          className={`flex gap-3 p-3 sm:p-4 min-h-[80px] hover:bg-[hsl(var(--news-paper))] transition-colors ${focusRing} focus-visible:ring-inset`}
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 overflow-hidden bg-[hsl(var(--news-paper))]">
            <NewsImage
              src={article.featured_image_url || ''}
              alt={article.title}
              aspectRatio="square"
              className="news-card-img w-full h-full"
            />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <span className="news-kicker" style={{ color: accentColor }}>
              {category}
            </span>
            <h4 className="news-headline mt-1 line-clamp-3 text-[hsl(var(--news-ink))] group-hover:text-[hsl(var(--news-navy))] transition-colors" style={{ fontSize: '20px', lineHeight: 1.25 }}>
              {article.title}
            </h4>
            <time className="news-kicker text-[hsl(var(--news-muted))] mt-1 block">{date}</time>
          </div>
        </Link>
      </article>
    );
  }

  // grid
  return (
    <article className="group news-card-hover flex flex-col h-full">
      <Link to={href} className={`flex flex-col h-full ${focusRing}`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-[hsl(var(--news-paper))] mb-3">
          <NewsImage
            src={article.featured_image_url || ''}
            alt={article.title}
            aspectRatio="video"
            className="news-card-img w-full h-full"
          />
          <span
            className="absolute top-2 left-2 news-kicker text-white px-2.5 py-1"
            style={{ background: accentColor }}
          >
            {category}
          </span>
        </div>
        <h3 className="news-headline text-base sm:text-lg text-[hsl(var(--news-ink))] group-hover:text-[hsl(var(--news-navy))] transition-colors line-clamp-3 mb-2 flex-grow">
          {article.title}
        </h3>
        <time className="news-kicker text-[hsl(var(--news-muted))] inline-flex items-center gap-1">
          <Clock className="w-3 h-3" aria-hidden="true" /> {date}
        </time>
      </Link>
    </article>
  );
};

export default NewsCard;
