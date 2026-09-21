import { supabase } from '@/integrations/supabase/client';

async function generateSitemap() {
  const baseUrl = window.location.origin;
  const languages = ['pt-br', 'eng', 'es'];
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Static pages
  languages.forEach(lang => {
    xml += `  <url>\n    <loc>${baseUrl}/${lang}</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${baseUrl}/${lang}/termos</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
  });

  // Dynamic articles
  try {
    const { data: articles } = await supabase
      .from('public_articles')
      .select('slug, id, created_at');
    
    if (articles) {
      articles.forEach(article => {
        languages.forEach(lang => {
          xml += `  <url>\n    <loc>${baseUrl}/${lang}/article/${article.slug || article.id}</loc>\n    <lastmod>${new Date(article.created_at).toISOString().split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
        });
      });
    }
  } catch (e) {
    console.error('Error fetching articles for sitemap:', e);
  }

  xml += '</urlset>';
  return xml;
}

// In a real prod environment, this would be a server-side route or build-time script.
// For this POC/App, we'll provide a way to download it or just have it as a reference.
export { generateSitemap };