const { baseCss } = require('./shared-to-styles')

const htmlSnapshot = `
<section class="to-page to-pontos-de-entrega">
  <header class="to-page-hero to-page-hero--brand">
    <div class="to-page-hero-inner">
      <h1 class="to-page-hero-heading"><strong>Onde entregar<br>meu resíduo?</strong></h1>
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
.to-pontos-de-entrega .to-central-volumes { display: flex; flex-direction: column; align-items: center; gap: 0; margin: 12px 0; }
.to-pontos-de-entrega .to-central-vol { flex: 0 1 40px; width: 100%; text-align: center; margin-top: 17px !important; }
.to-pontos-de-entrega .to-central-vol span { display: block; font-size: 12px; text-transform: uppercase; color: #888; margin: 0 0 2px; line-height: 1.2; }
.to-pontos-de-entrega .to-central-vol strong { display: block; font-size: clamp(13px, 1.6vw, 18px); color: #3CAA59; white-space: nowrap; line-height: 1.2; margin: 0; }
.to-pontos-de-entrega .to-central-card-cta { margin-top: 32px; text-align: center; }
.to-pontos-de-entrega .to-central-link { display: inline-block; padding: 12px 32px; background: #3CAA59; color: #fff; text-decoration: none; border-radius: 50px; font-family: "DM Sans", sans-serif; font-weight: 600; font-size: 14px; text-transform: uppercase; transition: background 0.2s ease; }
.to-pontos-de-entrega .to-central-link:hover { background: #2d8a45; color: #fff; }
.to-pontos-de-entrega .to-map-section { max-width: none; width: 100%; margin: 0; padding: 48px 0 0; box-sizing: border-box; }
.to-pontos-de-entrega .to-map-section h2,
.to-pontos-de-entrega .to-map-section .to-section-lead { max-width: 900px; margin-left: auto; margin-right: auto; padding: 0 20px; }
.to-pontos-de-entrega .to-map-section h2 { margin-bottom: 16px; }
.to-pontos-de-entrega .to-map-section .to-section-lead { margin-bottom: 32px; }
.to-pontos-de-entrega .to-map-wrap { max-width: none; width: 80%; margin: 0 auto; padding-bottom: 0; height: clamp(360px, 40vw, 640px); border-radius: 8px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12); overflow: hidden; }
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
