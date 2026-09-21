import { Link } from 'react-router-dom';
import { Calendar, User } from 'lucide-react';
import { isVideoUrl } from '@/lib/utils';
import { formatRelative } from '@/lib/date';

interface CategorySectionProps {
  category: string;
  articles: any[];
  currentLang: string;
  accentColor?: string;
}

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d';

type CardSize = 'lead' | 'medium' | 'small' | 'list';

interface CardProps {
  article: any;
  currentLang: string;
  accentColor: string;
  size: CardSize;
  showBadge?: boolean;
}

const Media = ({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) => {
  const video = isVideoUrl(src);
  return video ? (
    <video
      src={src}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      className={className}
    />
  ) : (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={(e) => {
        (e.target as HTMLImageElement).src = FALLBACK_IMG;
      }}
    />
  );
};

const NewsCardItem = ({
  article,
  currentLang,
  accentColor,
  size,
  showBadge = true,
}: CardProps) => {
  const href = `/${currentLang}/article/${article.slug || article.id}`;
  const category = article.category || 'Geral';
  const date = formatRelative(article.created_at);
  const authorName = article.author_name || 'Redação';
  const src = article.featured_image_url || FALLBACK_IMG;

  // list = G1-style horizontal small item (image on the right, text on the left)
  if (size === 'list') {
    return (
      <article className="group bg-[#141414] border border-[#141414] hover:border-[#ff2ec8] hover:shadow-[0_0_16px_rgba(255,46,200,0.35)] transition-all">
        <Link
          to={href}
          className="flex gap-3 sm:gap-4 p-3 sm:p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--news-navy))]"
        >
          <div className="flex-1 min-w-0 flex flex-col">
            <span
              className="news-kicker text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1.5"
              style={{ color: accentColor }}
            >
              {category}
            </span>
            <h4 className="news-headline text-sm sm:text-base text-white group-hover:text-[#ff2ec8] transition-colors line-clamp-3 leading-snug">
              {article.title}
            </h4>
            <time className="news-kicker text-[10px] sm:text-xs text-white/60 mt-auto pt-2">
              {date}
            </time>

          </div>
          <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 overflow-hidden bg-[hsl(var(--news-navy-deep))]">
            <Media
              src={src}
              alt={article.title}
              className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        </Link>
      </article>
    );
  }

  const aspect = 'aspect-[4/5]';

  const titleSize =
    size === 'lead'
      ? 'text-xl sm:text-2xl md:text-3xl lg:text-4xl'
      : size === 'medium'
        ? 'text-base sm:text-lg md:text-xl'
        : 'text-sm sm:text-base';

  return (
    <article className="group relative bg-[#141414] border border-[#141414] hover:border-[#ff2ec8] hover:shadow-[0_0_16px_rgba(255,46,200,0.35)] overflow-hidden flex flex-col h-full transition-all">
      <Link
        to={href}
        className="flex flex-col h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--news-navy))]"
      >
        <div
          className={`relative w-full overflow-hidden bg-[hsl(var(--news-navy-deep))] ${aspect}`}
        >
          <Media
            src={src}
            alt={article.title}
            className="absolute inset-0 w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
          {showBadge && (
            <span
              className="absolute top-2 left-2 z-10 px-2.5 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white"
              style={{ background: accentColor }}
            >
              {category}
            </span>
          )}
          {size === 'lead' && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                <h3
                  className={`news-headline text-white line-clamp-3 leading-tight ${titleSize}`}
                >
                  {article.title}
                </h3>
              </div>
            </>
          )}
        </div>

        {size !== 'lead' && (
          <div className="flex flex-col flex-1 p-3 sm:p-4">
            <h3
              className={`news-headline text-white group-hover:text-[#ff2ec8] transition-colors line-clamp-3 leading-snug ${titleSize}`}
            >
              {article.title}
            </h3>
            <div className="flex items-center justify-between gap-2 mt-auto pt-3 text-[11px] sm:text-xs text-white/60">
              <span className="inline-flex items-center gap-1 min-w-0">
                <Calendar
                  className="w-3.5 h-3.5 flex-shrink-0 text-[#a3ff12]"
                  aria-hidden="true"
                />
                <time className="truncate">{date}</time>
              </span>
              <span className="inline-flex items-center gap-1 min-w-0">
                <User className="w-3.5 h-3.5 flex-shrink-0 text-[#ff2ec8]" aria-hidden="true" />
                <span className="truncate">{authorName}</span>
              </span>
            </div>

          </div>
        )}


        {size === 'lead' && (
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 text-[11px] sm:text-xs text-white/60 border-t border-white/10 bg-[#141414]">
            <span className="inline-flex items-center gap-1 min-w-0">
              <Calendar
                className="w-3.5 h-3.5 flex-shrink-0 text-[#a3ff12]"
                aria-hidden="true"
              />
              <time className="truncate">{date}</time>
            </span>
            <span className="inline-flex items-center gap-1 min-w-0">
              <User className="w-3.5 h-3.5 flex-shrink-0 text-[#ff2ec8]" aria-hidden="true" />
              <span className="truncate">{authorName}</span>
            </span>

          </div>
        )}
      </Link>
    </article>
  );
};

const CategorySection = ({
  category,
  articles,
  currentLang,
  accentColor = 'hsl(var(--news-accent))',
}: CategorySectionProps) => {
  if (!articles || articles.length === 0) return null;

  const sorted = [...articles].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const items = sorted.slice(0, 4);
  const slug = category.toLowerCase().replace(/\s+/g, '-');

  return (
    <section
      className="py-8 sm:py-10 border-t border-[hsl(var(--news-line))]"
      aria-labelledby={`cat-${slug}`}
    >
      {/* Category header */}
      <div className="flex items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-7">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <span
            className="inline-block w-1.5 h-8 sm:h-9 flex-shrink-0"
            style={{ background: accentColor }}
            aria-hidden="true"
          />
          <h2
            id={`cat-${slug}`}
            className="news-display text-3xl sm:text-4xl md:text-5xl uppercase text-[hsl(var(--news-ink))] truncate"
          >
            {category}
          </h2>
        </div>
        <Link
          to={`/${currentLang}/${slug}`}
          className="news-kicker hidden sm:inline-flex items-center gap-2 px-4 py-2 border-2 hover:bg-[hsl(var(--news-navy))] hover:text-white hover:border-[hsl(var(--news-navy))] transition-colors whitespace-nowrap"
          aria-label={`Ver todos os posts de ${category}`}
          style={{ color: accentColor, borderColor: accentColor }}
        >
          Ver todos →
        </Link>
      </div>

      {/* 4 posts em uma linha */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
        {items.map((article) => (
          <NewsCardItem
            key={article.id}
            article={article}
            currentLang={currentLang}
            accentColor={accentColor}
            size="medium"
          />
        ))}
      </div>

      {/* "Ver todos" no mobile */}
      <div className="mt-6 flex justify-center sm:hidden">
        <Link
          to={`/${currentLang}/${slug}`}
          className="news-kicker inline-flex items-center gap-2 px-5 py-3 border-2 hover:bg-[hsl(var(--news-navy))] hover:text-white transition-colors min-h-11"
          aria-label={`Ver todos os posts de ${category}`}
          style={{ color: accentColor, borderColor: accentColor }}
        >
          Ver todos →
        </Link>
      </div>
    </section>
  );
};

export default CategorySection;
