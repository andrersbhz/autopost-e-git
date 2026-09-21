import { useState } from 'react';
import StaticPageLayout from '@/components/blog/StaticPageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Mail } from 'lucide-react';

const NewsletterPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ title: 'Inscrição confirmada', description: `Você receberá novidades em ${email}.` });
      setEmail('');
    }, 600);
  };

  return (
    <StaticPageLayout
      kicker="Newsletter"
      title="Receba o melhor do A3 no seu e-mail"
      description="Uma seleção diária com as principais notícias, análises e bastidores — direto na sua caixa de entrada."
    >
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 not-prose my-8">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--news-muted))]" />
          <Input
            required
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <Button type="submit" disabled={loading} className="bg-[hsl(var(--news-accent))] hover:brightness-110 text-white h-11 px-6">
          {loading ? 'Inscrevendo…' : 'Inscrever-me'}
        </Button>
      </form>

      <h2 className="text-2xl font-extrabold mt-8">O que você vai receber</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>Resumo diário das principais notícias</li>
        <li>Análises exclusivas da redação</li>
        <li>Recomendações de leitura do dia</li>
        <li>Conteúdo especial aos finais de semana</li>
      </ul>

      <p className="text-sm text-[hsl(var(--news-muted))] mt-8">
        Você pode cancelar a inscrição a qualquer momento. Respeitamos sua privacidade conforme a LGPD.
      </p>
    </StaticPageLayout>
  );
};

export default NewsletterPage;
