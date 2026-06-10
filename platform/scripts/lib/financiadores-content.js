const { baseCss } = require('./shared-to-styles')

const htmlSnapshot = `
<section class="to-page to-financiadores">
  <header class="to-page-hero to-page-hero--brand">
    <div class="to-page-hero-inner">
      <h1 class="to-page-hero-heading">Seja um de nossos<br><strong>Financiadores</strong></h1>
      <p class="to-page-hero-lead">Conheça nossos benefícios e quem já financia esta causa.</p>
    </div>
  </header>

  <div class="to-section">
    <p class="to-section-lead">Nosso trabalho é conectar empresas com a comunidade através da compostagem comunitária. As marcas que nos apoiam mostram que tem consciência de um problema que atinge todo nosso país, posicionando-se como agentes de mudança socioambiental.</p>
  </div>

  <div class="to-section" style="padding-top: 0;">
    <h2 class="to-section-title">Conheça os benefícios de<br><strong>ser um Financiador</strong></h2>
    <ul class="to-benefits-list">
      <li>Selo Compostagem Terra Orgânica</li>
      <li>Logo na página dos apoiadores</li>
      <li>Adesivo nos pontos de entrega</li>
      <li>Post e Stories exclusivos no Instagram e Facebook</li>
      <li>Guest Post no blog</li>
      <li>Vídeo exclusivo</li>
      <li>Placa no pátio de compostagem</li>
      <li>Logo no uniforme da associação</li>
      <li>Sacola biodegradável com logo da empresa (a consultar)</li>
    </ul>
  </div>

  <div class="to-section">
    <h2 class="to-section-title">Nossos<br><strong>Financiadores</strong></h2>
    <p class="to-section-lead">Empresas que apoiam a transformação de resíduos orgânicos em vida.</p>
  </div>

  <div class="to-cta-banner">
    <h2>Quer envolver sua marca<br><strong>com a comunidade?</strong></h2>
    <p>Faça de sua empresa um agente de mudança na sociedade apoiando nossos projetos.</p>
  </div>
</section>
`.trim()

const pageCss = `
.to-financiadores .to-benefits-list { margin: 0 auto; }
`.trim()

const cssSnapshot = `${baseCss}\n${pageCss}`

module.exports = {
  slug: 'financiadores',
  title: 'Financiadores - Terra Orgânica',
  htmlSnapshot,
  cssSnapshot,
  grapesProjectJson: {}
}
