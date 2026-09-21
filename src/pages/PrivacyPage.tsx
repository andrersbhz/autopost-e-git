import StaticPageLayout from '@/components/blog/StaticPageLayout';

const PrivacyPage = () => (
  <StaticPageLayout
    kicker="LGPD"
    title="Política de Privacidade"
    description="Como o A3 Portal coleta, utiliza, armazena e protege os dados pessoais dos seus leitores e usuários."
  >
    <h2 className="text-2xl font-extrabold mt-8">1. Dados que coletamos</h2>
    <p>
      Coletamos dados de navegação (cookies, IP, dispositivo) para fins estatísticos e de
      personalização da experiência. Dados pessoais — como nome e e-mail — são coletados apenas
      quando você se cadastra, comenta ou assina nossa newsletter.
    </p>

    <h2 className="text-2xl font-extrabold mt-8">2. Como usamos os dados</h2>
    <ul className="list-disc pl-6 space-y-2">
      <li>Operar e melhorar o portal e seus serviços</li>
      <li>Personalizar conteúdo e recomendações</li>
      <li>Enviar comunicações e newsletters (com seu consentimento)</li>
      <li>Cumprir obrigações legais e regulatórias</li>
    </ul>

    <h2 className="text-2xl font-extrabold mt-8">3. Compartilhamento</h2>
    <p>
      Não vendemos dados pessoais. Compartilhamos informações apenas com provedores essenciais
      (hospedagem, analytics, e-mail) sob contrato e exclusivamente para viabilizar a operação do
      serviço.
    </p>

    <h2 className="text-2xl font-extrabold mt-8">4. Seus direitos (LGPD)</h2>
    <p>
      Você pode solicitar acesso, correção, exclusão ou portabilidade dos seus dados a qualquer
      momento pelo e-mail <strong>privacidade@a3portal.com</strong>.
    </p>

    <h2 className="text-2xl font-extrabold mt-8">5. Cookies</h2>
    <p>
      Utilizamos cookies próprios e de terceiros. Você pode gerenciar suas preferências diretamente
      no navegador. A desativação pode comprometer parte da experiência.
    </p>
  </StaticPageLayout>
);

export default PrivacyPage;
