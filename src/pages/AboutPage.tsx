import StaticPageLayout from '@/components/blog/StaticPageLayout';

const AboutPage = () => (
  <StaticPageLayout
    kicker="Quem Somos"
    title="Sobre o A3 Portal"
    description="Um portal de notícias independente, com curadoria editorial e tecnologia para entregar informação relevante em tempo real."
  >
    <h2 className="text-2xl font-extrabold mt-8">Nossa missão</h2>
    <p>
      Acreditamos que informação de qualidade é a base de uma sociedade melhor. O A3 Portal nasceu
      para oferecer cobertura jornalística independente, plural e acessível sobre os temas que
      moldam o nosso dia a dia — política, economia, tecnologia, esportes, cultura e
      entretenimento.
    </p>

    <h2 className="text-2xl font-extrabold mt-8">O que fazemos</h2>
    <p>
      Combinamos jornalismo humano com inteligência artificial responsável para acelerar a apuração,
      ampliar a cobertura e oferecer ao leitor uma experiência rica, rápida e confiável. Toda
      publicação passa por critérios editoriais claros antes de ir ao ar.
    </p>

    <h2 className="text-2xl font-extrabold mt-8">Nossos valores</h2>
    <ul className="list-disc pl-6 space-y-2">
      <li>Independência editorial e transparência</li>
      <li>Compromisso com a verdade e a checagem de fatos</li>
      <li>Respeito à pluralidade de vozes</li>
      <li>Inovação tecnológica a serviço da informação</li>
    </ul>
  </StaticPageLayout>
);

export default AboutPage;
