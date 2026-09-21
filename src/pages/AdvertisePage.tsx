import { BarChart3, Megaphone, Target, Users } from 'lucide-react';
import StaticPageLayout from '@/components/blog/StaticPageLayout';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useI18n } from '@/hooks/useI18n';

const AdvertisePage = () => {
  const { currentLang } = useI18n();
  return (
    <StaticPageLayout
      kicker="Mídia"
      title="Anuncie no A3 Portal"
      description="Conecte sua marca a uma audiência qualificada interessada em notícias, tecnologia, economia, esportes e entretenimento."
    >
      <div className="grid sm:grid-cols-2 gap-4 not-prose my-8">
        {[
          { icon: Users, t: 'Audiência qualificada', d: 'Leitores engajados em múltiplas categorias.' },
          { icon: Target, t: 'Segmentação precisa', d: 'Por categoria, geografia e perfil de leitura.' },
          { icon: BarChart3, t: 'Relatórios completos', d: 'Métricas de impressão, cliques e conversão.' },
          { icon: Megaphone, t: 'Formatos premium', d: 'Display, branded content e newsletters.' },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="border border-[hsl(var(--news-line))] p-5">
            <Icon className="h-5 w-5 text-[hsl(var(--news-accent))] mb-3" />
            <div className="font-bold text-[hsl(var(--news-navy-deep))]">{t}</div>
            <div className="text-sm text-[hsl(var(--news-muted))] mt-1">{d}</div>
          </div>
        ))}
      </div>

      <h2 className="text-2xl font-extrabold mt-8">Formatos disponíveis</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>Banners display (desktop e mobile)</li>
        <li>Branded content e publieditoriais</li>
        <li>Patrocínio de seções e newsletters</li>
        <li>Campanhas em redes sociais do portal</li>
      </ul>

      <div className="mt-10 not-prose">
        <Link to={`/${currentLang}/contato`}>
          <Button className="bg-[hsl(var(--news-accent))] hover:brightness-110 text-white">
            Solicitar mídia kit
          </Button>
        </Link>
      </div>
    </StaticPageLayout>
  );
};

export default AdvertisePage;
