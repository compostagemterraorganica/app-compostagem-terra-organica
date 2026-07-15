const { baseCss } = require('./shared-to-styles')

const htmlSnapshot = `
<section class="to-page to-privacidade">
  <header class="to-page-hero to-page-hero--brand">
    <div class="to-page-hero-inner">
      <h1 class="to-page-hero-heading">Política de<br><strong>Privacidade</strong></h1>
      <p class="to-page-hero-lead">Como o aplicativo e o site Terra Orgânica acessam, coletam, usam, compartilham e protegem seus dados</p>
    </div>
  </header>

  <div class="to-section">
    <div class="to-prose">
      <p><strong>Última atualização:</strong> 11 de julho de 2026</p>
      <p>Esta Política de Privacidade descreve de forma transparente como a <strong>Compostagem Terra Orgânica</strong> (“nós”, “nossa organização”) trata dados pessoais e dados sensíveis de usuários do aplicativo móvel <strong>Terra Orgânica</strong> (pacote <code>com.terraorganica.app</code>) e do site/plataforma associados, em conformidade com a legislação brasileira aplicável (incluindo a LGPD) e com as políticas de <a href="https://support.google.com/googleplay/android-developer/topic/9877467" target="_blank" rel="noopener noreferrer">Privacidade, Engano e Abuso de Dispositivo do Google Play</a>, em especial a política de <a href="https://support.google.com/googleplay/android-developer/answer/10144311" target="_blank" rel="noopener noreferrer">Dados do usuário</a>.</p>

      <h2>1. Controlador e contato de privacidade</h2>
      <p><strong>Entidade responsável:</strong> Compostagem Terra Orgânica</p>
      <ul>
        <li><strong>Localização:</strong> Florianópolis, SC, Brasil</li>
        <li><strong>E-mail de contato / privacidade:</strong> <a href="mailto:contato@compostagemterraorganica.com.br">contato@compostagemterraorganica.com.br</a></li>
        <li><strong>Telefone:</strong> <a href="tel:+5548991474109">+55 (48) 9 9147-4109</a></li>
      </ul>
      <p>Para dúvidas, solicitações de acesso, correção, exclusão de conta ou exercício de direitos sobre seus dados, utilize o e-mail acima ou a página de <a href="/contato">Contato</a>.</p>

      <h2>2. Escopo</h2>
      <p>Esta política aplica-se ao:</p>
      <ul>
        <li>Aplicativo Android/iOS <strong>Terra Orgânica</strong>;</li>
        <li>Site e área administrativa da plataforma Terra Orgânica;</li>
        <li>APIs e serviços de backend que suportam o aplicativo e o site.</li>
      </ul>

      <h2>3. Dados que acessamos, coletamos e usamos</h2>
      <p>Coletamos apenas dados necessários para o funcionamento das funcionalidades esperadas pelos usuários. Os tipos incluem:</p>

      <h3>3.1 Dados de conta e autenticação</h3>
      <ul>
        <li>Nome (quando informado);</li>
        <li>Endereço de e-mail;</li>
        <li>Senha (armazenada de forma criptografada/hash; não armazenamos a senha em texto puro);</li>
        <li>Códigos de verificação enviados por e-mail para cadastro, definição ou redefinição de senha;</li>
        <li>Sessão de autenticação (cookies ou tokens de sessão no navegador/app).</li>
      </ul>

      <h3>3.2 Dados de perfil e vínculo com centrais</h3>
      <ul>
        <li>Associação do usuário a centrais de compostagem;</li>
        <li>Preferências locais no dispositivo (por exemplo, central selecionada recentemente, via armazenamento local).</li>
      </ul>

      <h3>3.3 Dados sensíveis do dispositivo (aplicativo)</h3>
      <p>Mediante permissão explícita em tempo de execução, o aplicativo pode acessar:</p>
      <ul>
        <li><strong>Câmera e microfone:</strong> para gravar vídeos das coletas/verificações de volume;</li>
        <li><strong>Localização (em uso / foreground):</strong> para associar coordenadas e endereço aproximado aos registros de coleta, quando o usuário autoriza;</li>
        <li><strong>Armazenamento / biblioteca de mídia:</strong> para salvar ou selecionar vídeos gravados no dispositivo.</li>
      </ul>
      <p>Esses dados são tratados como pessoais e sensíveis. O acesso ocorre apenas quando o usuário utiliza a funcionalidade correspondente e concede a permissão. Não vendemos esses dados.</p>

      <h3>3.4 Dados de verificações, volumes e conteúdo gerado pelo usuário</h3>
      <ul>
        <li>Informações de verificações de volume e registros de coleta;</li>
        <li>Links de vídeos e metadados associados (data, central, localização quando fornecida);</li>
        <li>Conteúdo enviado em formulários do site (contato, cadastro de centrais, apoiadores), como nome, e-mail, telefone e mensagem.</li>
      </ul>

      <h3>3.5 Dados técnicos</h3>
      <ul>
        <li>Logs técnicos de requisições à API (por exemplo, horário, rota, status e, quando autenticado, identificação do usuário), para segurança, diagnóstico e prevenção de abuso;</li>
        <li>Informações necessárias à comunicação segura (HTTPS).</li>
      </ul>
      <p>Não coletamos, de forma intencional, lista de aplicativos instalados, contatos da agenda, SMS, histórico de chamadas, dados financeiros ou documentos oficiais.</p>

      <h2>4. Finalidades do tratamento</h2>
      <p>Utilizamos os dados para:</p>
      <ul>
        <li>Autenticar usuários e manter sessões seguras;</li>
        <li>Permitir o registro e acompanhamento de coletas e verificações de volume nas centrais;</li>
        <li>Associar evidências audiovisuais e, quando autorizado, geolocalização às atividades do serviço;</li>
        <li>Operar o site, formulários de contato e cadastros públicos;</li>
        <li>Enviar comunicações operacionais (códigos de verificação, respostas a contatos);</li>
        <li>Garantir segurança, integridade, prevenção a fraude/abuso e cumprimento de obrigações legais;</li>
        <li>Melhorar a estabilidade e o suporte técnico da plataforma.</li>
      </ul>
      <p>Não utilizamos dados pessoais e sensíveis para venda a terceiros nem para publicidade comportamental baseada em venda de dados.</p>

      <h2>5. Compartilhamento com terceiros</h2>
      <p>Podemos compartilhar dados com provedores de serviço estritamente necessários à operação, sob obrigações de confidencialidade e segurança:</p>
      <ul>
        <li><strong>YouTube / Google:</strong> upload de vídeos de coleta quando o usuário utiliza essa funcionalidade;</li>
        <li><strong>Amazon Web Services (S3):</strong> armazenamento de mídias e arquivos;</li>
        <li><strong>Amazon SES:</strong> envio de e-mails transacionais (códigos e notificações);</li>
        <li><strong>Infraestrutura de hospedagem e banco de dados:</strong> armazenamento e processamento do backend.</li>
      </ul>
      <p>Também podemos divulgar dados quando exigido por lei, ordem judicial ou autoridade competente, ou em caso de reorganização institucional com aviso adequado aos usuários.</p>
      <p>Não vendemos dados pessoais e sensíveis. Transferências iniciadas pelo próprio usuário (por exemplo, publicação de vídeo no YouTube pela funcionalidade do app) não são consideradas venda.</p>

      <h2>6. Segurança no tratamento</h2>
      <ul>
        <li>Transmissão de dados por conexões criptografadas (HTTPS);</li>
        <li>Senhas armazenadas com hash seguro;</li>
        <li>Controles de autenticação e, quando aplicável, proteção CSRF em rotas sensíveis do site;</li>
        <li>Solicitação de permissões Android/iOS em tempo de execução antes do acesso a câmera, microfone, localização e mídia;</li>
        <li>Acesso administrativo restrito a usuários autorizados.</li>
      </ul>

      <h2>7. Retenção e exclusão de dados</h2>
      <p>Mantemos os dados pelo tempo necessário para cumprir as finalidades desta política, obrigações legais, segurança e resolução de disputas.</p>
      <ul>
        <li><strong>Conta de usuário:</strong> enquanto a conta estiver ativa e pelo período adicional eventualmente exigido por lei ou segurança;</li>
        <li><strong>Registros de coleta/verificação e mídias:</strong> enquanto forem necessários à operação das centrais e à prestação do serviço;</li>
        <li><strong>Mensagens de formulários:</strong> pelo tempo necessário para atendimento e arquivo operacional razoável;</li>
        <li><strong>Logs técnicos:</strong> por períodos limitados de diagnóstico e segurança.</li>
      </ul>
      <p>Quando excluímos uma conta a pedido do usuário, também excluímos ou anonimizamos os dados pessoais associados a essa conta, salvo retenção legítima (por exemplo, obrigação legal, prevenção a fraude ou segurança), hipótese em que informaremos a base da retenção.</p>

      <h2>8. Exclusão de conta (Google Play)</h2>
      <p>Se você criou uma conta no aplicativo Terra Orgânica, pode solicitar a exclusão da conta e dos dados associados:</p>
      <ul>
        <li><strong>Fora do app (web):</strong> envie um e-mail para <a href="mailto:contato@compostagemterraorganica.com.br">contato@compostagemterraorganica.com.br</a> com o assunto “Exclusão de conta” e o e-mail cadastrado; ou use a página de <a href="/contato">Contato</a>;</li>
        <li><strong>No app:</strong> solicite a exclusão pelo mesmo canal de contato institucional disponibilizado no aplicativo/site.</li>
      </ul>
      <p>A desativação temporária ou o simples logout não equivalem à exclusão da conta. Processaremos pedidos de exclusão em prazo razoável, observado o disposto na seção de retenção.</p>

      <h2>9. Direitos do titular</h2>
      <p>Nos termos da LGPD, você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade (quando aplicável), eliminação e informação sobre compartilhamentos. Envie sua solicitação ao contato de privacidade indicado nesta política.</p>

      <h2>10. Crianças e adolescentes</h2>
      <p>O aplicativo e a plataforma não são direcionados a crianças. Não coletamos intencionalmente dados de crianças. Se você acredita que houve coleta indevida, contate-nos para remoção.</p>

      <h2>11. SDKs e código de terceiros</h2>
      <p>O aplicativo utiliza componentes de terceiros (por exemplo, bibliotecas do ecossistema Expo/React Native e integrações com serviços Google/YouTube e AWS). Exigimos que o uso de dados por esses componentes esteja alinhado às finalidades desta política e às regras do Google Play. Não autorizamos a venda de dados pessoais e sensíveis obtidos por meio do nosso aplicativo.</p>

      <h2>12. Divulgação proeminente e consentimento no app</h2>
      <p>Quando o acesso a dados sensíveis (como localização, câmera ou microfone) puder não ser evidente apenas pelo contexto, o aplicativo solicita permissão em tempo de execução e informa a finalidade (por exemplo, gravar vídeos de coleta e anexar geolocalização). A navegação para fora da tela de permissão não é interpretada como consentimento.</p>

      <h2>13. Alterações desta política</h2>
      <p>Podemos atualizar esta Política de Privacidade para refletir mudanças no serviço ou na legislação. A versão vigente estará sempre disponível nesta URL pública. Em alterações relevantes, poderemos comunicar por meios razoáveis (site, e-mail ou aviso no aplicativo).</p>

      <h2>14. Como entrar em contato</h2>
      <p>Compostagem Terra Orgânica — Privacidade<br>
      E-mail: <a href="mailto:contato@compostagemterraorganica.com.br">contato@compostagemterraorganica.com.br</a><br>
      Telefone: <a href="tel:+5548991474109">+55 (48) 9 9147-4109</a><br>
      Página: <a href="/contato">/contato</a></p>
    </div>
  </div>
</section>
`.trim()

const pageCss = `
.to-privacidade .to-prose code {
  font-size: 0.9em;
  background: #f3f3f3;
  padding: 2px 6px;
  border-radius: 3px;
}
.to-privacidade .to-prose a {
  color: #0274be;
}
`.trim()

const cssSnapshot = `${baseCss}\n${pageCss}`

module.exports = {
  slug: 'politica-de-privacidade',
  title: 'Política de Privacidade - Terra Orgânica',
  htmlSnapshot,
  cssSnapshot,
  grapesProjectJson: {}
}
