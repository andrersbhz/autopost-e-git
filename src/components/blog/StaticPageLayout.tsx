import { Helmet } from 'react-helmet-async';
import { ReactNode } from 'react';
import BlogHeader from './BlogHeader';
import BlogFooter from './BlogFooter';

interface StaticPageLayoutProps {
  title: string;
  description: string;
  kicker?: string;
  children: ReactNode;
}

const StaticPageLayout = ({ title, description, kicker, children }: StaticPageLayoutProps) => {
  return (
    <div className="min-h-screen bg-white text-[hsl(var(--news-ink))] font-news">
      <Helmet>
        <title>{title} | A3 Portal</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''} />
      </Helmet>

      <BlogHeader />

      <main id="main-content" className="news-container py-12 lg:py-16 max-w-[860px]">
        <header className="mb-10 border-b border-[hsl(var(--news-line))] pb-8">
          {kicker && (
            <span className="news-kicker text-[hsl(var(--news-accent))] block mb-3">{kicker}</span>
          )}
          <h1 className="news-headline text-4xl lg:text-5xl text-[hsl(var(--news-navy-deep))] mb-4">
            {title}
          </h1>
          <p className="text-base text-[hsl(var(--news-muted))] leading-relaxed">{description}</p>
        </header>

        <article className="prose-blog space-y-6 text-[15px] leading-relaxed text-[hsl(var(--news-ink))]">
          {children}
        </article>
      </main>

      <BlogFooter />
    </div>
  );
};

export default StaticPageLayout;
