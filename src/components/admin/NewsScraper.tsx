import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Copy, Loader2, Globe } from 'lucide-react';

export const NewsScraper = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    try {
      // In a real scenario, this would call a backend function or edge function
      // that uses a library like Playwright, Puppeteer, or a scraping API.
      // For this implementation, we'll simulate the process and show how it would integrate.
      
      const { data, error } = await supabase.functions.invoke('scrape-news', {
        body: { url }
      });

      if (error) throw error;

      toast.success('Notícia capturada com sucesso! Redirecionando para edição...');
      // Implementation logic to redirect or fill the form
    } catch (error: any) {
      console.error('Scraping error:', error);
      toast.error('Não foi possível capturar a notícia automaticamente. Tente preencher manualmente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Copiar Notícia
        </CardTitle>
        <CardDescription>
          Insira o link de uma notícia para importar o conteúdo automaticamente.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleScrape}>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="url">URL da Notícia</Label>
              <div className="flex gap-2">
                <Input 
                  id="url" 
                  placeholder="https://exemplo.com/noticia-importante" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Importar Notícia
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
