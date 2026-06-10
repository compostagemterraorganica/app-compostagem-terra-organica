const { baseCss } = require('./shared-to-styles')

const htmlSnapshot = `
<section class="to-page to-contato">
  <header class="to-page-hero to-page-hero--brand">
    <div class="to-page-hero-inner">
      <h1 class="to-page-hero-heading">Entre em contato<br><strong>conosco!</strong></h1>
      <p class="to-page-hero-lead">Tem alguma dúvida, sugestão ou propostas para ampliar nosso alcance e impacto socioambiental? Preencha o formulário abaixo!</p>
    </div>
  </header>
</section>
`.trim()

const cssSnapshot = baseCss

module.exports = {
  slug: 'contato',
  title: 'Contato - Terra Orgânica',
  htmlSnapshot,
  cssSnapshot,
  grapesProjectJson: {}
}
