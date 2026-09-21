import StaticPageLayout from '@/components/blog/StaticPageLayout';

const EditorialPage = () => (
  <StaticPageLayout
    kicker="Transparência"
    title="Princípios Editoriais"
    description="Os compromissos que guiam o trabalho jornalístico do A3 Portal — independência, precisão, pluralidade e responsabilidade."
  >
    <h2 className="text-2xl font-extrabold mt-8">Independência</h2>
    <p>
      Nosso conteúdo editorial é produzido com total independência de anunciantes, partidos
      políticos, governos e grupos econômicos. Conteúdos patrocinados são sempre identificados.
    </p>

    <h2 className="text-2xl font-extrabold mt-8">Precisão e checagem</h2>
    <p>
      Toda informação publicada é checada em pelo menos uma fonte primária. Quando utilizamos
      ferramentas de inteligência artificial na produção, há sempre supervisão humana.
    </p>

    <h2 className="text-2xl font-extrabold mt-8">Pluralidade</h2>
    <p>
      Buscamos representar diferentes perspectivas sobre os fatos, com respeito à diversidade de
      opinião, gênero, raça, religião e orientação.
    </p>

    <h2 className="text-2xl font-extrabold mt-8">Correções</h2>
    <p>
      Erros acontecem. Quando identificados, são corrigidos com transparência e sinalização clara.
      Para apontar um erro, escreva para <strong>correcao@a3portal.com</strong>.
    </p>

    <h2 className="text-2xl font-extrabold mt-8">Uso de IA</h2>
    <p>
      Utilizamos inteligência artificial como ferramenta de apoio na curadoria, tradução e produção
      de conteúdo. Toda publicação é revisada por nossa equipe editorial antes de ir ao ar.
    </p>
  </StaticPageLayout>
);

export default EditorialPage;
