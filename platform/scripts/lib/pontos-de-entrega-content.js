const { baseCss } = require('./shared-to-styles')

const htmlSnapshot = `
<section class="to-page to-pontos-de-entrega">
  <header class="to-page-hero to-page-hero--brand">
    <div class="to-page-hero-inner">
      <h1 class="to-page-hero-heading"><strong>Onde entregar</strong><br>meu resíduo?</h1>
      <p class="to-page-hero-lead">Conheça nossas centrais parceiras e encontre a mais próxima da sua casa.</p>
    </div>
  </header>

  <div id="to-centrals-mount"></div>

  <div class="to-map-section">
    <h2>Não encontrou uma central Terra Orgânica perto da sua casa?</h2>
    <p class="to-section-lead">Confira no mapa abaixo outros parceiros que podem receber seus resíduos.</p>
    <div class="to-map-wrap">
      <iframe src="https://www.google.com/maps/d/embed?mid=15w2UUYt45VVQBRt2_5wtvn6OzJ89M0pi&amp;ehbc=2E312F" title="Mapa de pontos de entrega" allowfullscreen loading="lazy"></iframe>
    </div>
  </div>
</section>
`.trim()

const pageCss = `
.to-pontos-de-entrega .to-centrals-grid-section { max-width: 1140px; margin: 0 auto; padding: 48px 20px; }
.to-pontos-de-entrega .to-centrals-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
.to-pontos-de-entrega .to-central-card { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.12); }
.to-pontos-de-entrega .to-central-card img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
.to-pontos-de-entrega .to-central-card-body { padding: 20px 24px 24px; }
.to-pontos-de-entrega .to-central-card h3 { margin: 0 0 8px; font-size: 20px; color: #404040; }
.to-pontos-de-entrega .to-central-card p { margin: 0 0 8px; font-size: 15px; color: #54595f; line-height: 1.5; }
.to-pontos-de-entrega .to-central-meta { font-size: 14px; color: #0274be; margin: 12px 0; }
.to-pontos-de-entrega .to-central-volumes { display: flex; gap: 24px; margin: 16px 0; }
.to-pontos-de-entrega .to-central-vol { text-align: center; }
.to-pontos-de-entrega .to-central-vol span { display: block; font-size: 12px; text-transform: uppercase; color: #888; }
.to-pontos-de-entrega .to-central-vol strong { font-size: 24px; color: #3CAA59; }
.to-pontos-de-entrega .to-central-link { display: inline-block; margin-top: 8px; color: #0274be; text-decoration: underline; font-weight: 600; font-size: 14px; text-transform: uppercase; }
@media (max-width: 900px) {
  .to-pontos-de-entrega .to-centrals-grid { grid-template-columns: 1fr; }
}
`.trim()

const cssSnapshot = `${baseCss}\n${pageCss}`

module.exports = {
  slug: 'pontos-de-entrega',
  title: 'Pontos de entrega - Terra Orgânica',
  htmlSnapshot,
  cssSnapshot,
  grapesProjectJson: {}
}
