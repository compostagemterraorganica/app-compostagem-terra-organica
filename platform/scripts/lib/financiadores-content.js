const { baseCss } = require('./shared-to-styles')

const FORM_PHOTO_URL =
  'https://compostagemterraorganica.com.br/wp-content/uploads/2020/12/pexels-eva-elijas-5503338-scaled.jpg'

const LOGO_SAUVA =
  'https://terraorganica.s3.sa-east-1.amazonaws.com/media/17fe0d8c-0f48-4d20-ac54-ba82cf7c6c8f.png'
const LOGO_MUDA =
  'https://terraorganica.s3.sa-east-1.amazonaws.com/media/8a73ea2e-1381-4daa-8914-21e143a314de.png'

const ICON_MEDAL = `<svg aria-hidden="true" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M223.75 130.75L154.62 15.54A31.997 31.997 0 0 0 127.18 0H16.03C3.08 0-4.5 14.57 2.92 25.18l111.27 158.96c29.72-27.77 67.52-46.83 109.56-53.39zM495.97 0H384.82c-11.24 0-21.66 5.9-27.44 15.54l-69.13 115.21c42.04 6.56 79.84 25.62 109.56 53.38L509.08 25.18C516.5 14.57 508.92 0 495.97 0zM256 160c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm92.52 157.26l-37.93 36.96 8.97 52.22c1.6 9.36-8.26 16.51-16.65 12.09L256 393.88l-46.9 24.65c-8.4 4.45-18.25-2.74-16.65-12.09l8.97-52.22-37.93-36.96c-6.82-6.64-3.05-18.23 6.35-19.59l52.43-7.64 23.43-47.52c2.11-4.28 6.19-6.39 10.28-6.39 4.11 0 8.22 2.14 10.33 6.39l23.43 47.52 52.43 7.64c9.4 1.36 13.17 12.95 6.35 19.59z"/></svg>`
const ICON_FACEBOOK = `<svg aria-hidden="true" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M504 256C504 119 393 8 256 8S8 119 8 256c0 123.78 90.69 226.38 209.25 245V327.69h-63V256h63v-54.64c0-62.15 37-96.48 93.67-96.48 27.14 0 55.52 4.84 55.52 4.84v61h-31.28c-30.8 0-40.41 19.12-40.41 38.73V256h68.78l-11 71.69h-57.78V501C413.31 482.38 504 379.78 504 256z"/></svg>`
const ICON_BLOG = `<svg aria-hidden="true" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M172.2 226.8c-14.6-2.9-28.2 8.9-28.2 23.8V301c0 10.2 7.1 18.4 16.7 22 18.2 6.8 31.3 24.4 31.3 45 0 26.5-21.5 48-48 48s-48-21.5-48-48V120c0-13.3-10.7-24-24-24H24c-13.3 0-24 10.7-24 24v248c0 89.5 82.1 160.2 175 140.7 54.4-11.4 98.3-55.4 109.7-109.7 17.4-82.9-37-157.2-112.5-172.2zM209 0c-9.2-.5-17 6.8-17 16v31.6c0 8.5 6.6 15.5 15 15.9 129.4 7 233.4 112 240.9 241.5.5 8.4 7.5 15 15.9 15h32.1c9.2 0 16.5-7.8 16-17C503.4 139.8 372.2 8.6 209 0zm.3 96c-9.3-.7-17.3 6.7-17.3 16.1v32.1c0 8.4 6.5 15.3 14.8 15.9 76.8 6.3 138 68.2 144.9 145.2.8 8.3 7.6 14.7 15.9 14.7h32.2c9.3 0 16.8-8 16.1-17.3-8.4-110.1-96.5-198.2-206.6-206.7z"/></svg>`
const ICON_VIDEO = `<svg aria-hidden="true" viewBox="0 0 576 512" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M336.2 64H47.8C21.4 64 0 85.4 0 111.8v288.4C0 426.6 21.4 448 47.8 448h288.4c26.4 0 47.8-21.4 47.8-47.8V111.8c0-26.4-21.4-47.8-47.8-47.8zm189.4 37.7L416 177.3v157.4l109.6 75.5c21.2 14.6 50.4-.3 50.4-25.8V127.5c0-25.4-29.1-40.4-50.4-25.8z"/></svg>`
const ICON_SIGN = `<svg aria-hidden="true" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M496 64H128V16c0-8.8-7.2-16-16-16H80c-8.8 0-16 7.2-16 16v48H16C7.2 64 0 71.2 0 80v32c0 8.8 7.2 16 16 16h48v368c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V128h368c8.8 0 16-7.2 16-16V80c0-8.8-7.2-16-16-16zM160 384h320V160H160v224z"/></svg>`
const ICON_TSHIRT = `<svg aria-hidden="true" viewBox="0 0 640 512" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M631.2 96.5L436.5 0C416.4 27.8 371.9 47.2 320 47.2S223.6 27.8 203.5 0L8.8 96.5c-7.9 4-11.1 13.6-7.2 21.5l57.2 114.5c4 7.9 13.6 11.1 21.5 7.2l56.6-27.7c10.6-5.2 23 2.5 23 14.4V480c0 17.7 14.3 32 32 32h256c17.7 0 32-14.3 32-32V226.3c0-11.8 12.4-19.6 23-14.4l56.6 27.7c7.9 4 17.5.8 21.5-7.2L638.3 118c4-7.9.8-17.6-7.1-21.5z"/></svg>`
const ICON_BAG = `<svg aria-hidden="true" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M352 160v-32C352 57.42 294.579 0 224 0 153.42 0 96 57.42 96 128v32H0v272c0 44.183 35.817 80 80 80h288c44.183 0 80-35.817 80-80V160h-96zm-192-32c0-35.29 28.71-64 64-64s64 28.71 64 64v32H160v-32zm160 120c-13.255 0-24-10.745-24-24s10.745-24 24-24 24 10.745 24 24-10.745 24-24 24zm-192 0c-13.255 0-24-10.745-24-24s10.745-24 24-24 24 10.745 24 24-10.745 24-24 24z"/></svg>`

function benefitItem(icon, text) {
  return `<li class="to-fin-benefit-item"><span class="to-fin-benefit-icon">${icon}</span><span class="to-fin-benefit-text">${text}</span></li>`
}

const htmlSnapshot = `
<section class="to-page to-financiadores">
  <header class="to-page-hero to-page-hero--brand">
    <div class="to-page-hero-inner">
      <h1 class="to-page-hero-heading">Seja um de nossos<br><strong>Financiadores</strong></h1>
      <p class="to-page-hero-lead">Conheça nossos benefícios e quem já financia esta causa.</p>
    </div>
  </header>

  <div class="to-section to-fin-intro">
    <p class="to-fin-intro-text">Nosso trabalho é conectar empresas com a comunidade através da compostagem comunitária.</p>
    <p class="to-fin-intro-text">As marcas que nos apoiam mostram que tem consciência de um problema que atinge todo nosso país. Se posicionando como um agente de mudança socioambiental, deixando claro seu interesse em fazer a diferença e mostrando seu valor.</p>
    <p class="to-fin-intro-cta"><a class="to-btn to-btn--green" href="#form-empresa">CADASTRE SUA EMPRESA</a></p>
  </div>

  <div class="to-section to-fin-benefits">
    <h2 class="to-fin-heading">Conheça os benefícios de<br><strong>ser um Financiador</strong></h2>
    <ul class="to-fin-benefits-list">
      ${benefitItem(ICON_MEDAL, 'Selo Compostagem Terra Orgânica')}
      ${benefitItem(ICON_MEDAL, 'Logo na página dos apoiadores')}
      ${benefitItem(ICON_MEDAL, 'Adesivo nos pontos de entrega')}
      ${benefitItem(ICON_FACEBOOK, 'Post e Stories exclusivos no Instagram e Facebook')}
      ${benefitItem(ICON_BLOG, 'Guest Post no blog')}
      ${benefitItem(ICON_VIDEO, 'Vídeo exclusivo')}
      ${benefitItem(ICON_SIGN, 'Placa no pátio de compostagem')}
      ${benefitItem(ICON_TSHIRT, 'Logo no uniforme da associação')}
      ${benefitItem(ICON_BAG, 'Sacola biodegradável com logo da empresa (a consultar)')}
    </ul>
  </div>

  <div class="to-section to-fin-partners">
    <h2 class="to-fin-heading">Nossos<br><strong>Financiadores</strong></h2>
    <div class="to-fin-partners-logos">
      <img class="to-fin-partners-logo to-fin-partners-logo--sauva" src="${LOGO_SAUVA}" alt="" width="1024" height="576"/>
      <img class="to-fin-partners-logo to-fin-partners-logo--muda" src="${LOGO_MUDA}" alt="" width="1024" height="1024"/>
    </div>
  </div>

  <section class="to-fin-form-section" id="form-empresa">
    <div class="to-fin-form-wrap">
      <div class="to-fin-form-card">
        <div class="to-fin-form-photo" aria-hidden="true"></div>
        <div class="to-fin-form-panel">
          <h2 class="to-fin-form-heading">Quer envolver sua marca<br><strong>com a comunidade?</strong></h2>
          <p class="to-fin-form-lead">Faça de sua empresa um agente de mudança na sociedade apoiando nossos projetos.</p>
          <div id="to-financiador-form-mount"></div>
        </div>
      </div>
    </div>
  </section>
</section>
`.trim()

const pageCss = `
.to-financiadores .to-fin-intro { text-align: center; padding-bottom: 0; }
.to-financiadores .to-fin-intro-text { margin: 0 auto 20px; max-width: 720px; font-family: "DM Sans", sans-serif; font-size: 17px; line-height: 1.7; color: #54595f; }
.to-financiadores .to-fin-intro-cta { margin: 32px 0 0; }
.to-financiadores .to-fin-benefits { padding-top: 0; }
.to-fin-heading { margin: 40px auto 30px; text-align: center; font-family: "DM Sans", sans-serif; font-size: 25px; font-weight: 300; line-height: 1.1; letter-spacing: -0.2px; color: #404040; }
.to-fin-heading strong { font-size: 32px; font-weight: 700; }
.to-fin-benefits-list { list-style: none; margin: 0 auto; padding: 0 20px; max-width: 617px; }
.to-fin-benefit-item { display: flex; align-items: flex-start; gap: 12px; padding: 7.5px 0; font-family: "DM Sans", sans-serif; font-size: 17px; line-height: 1.5; color: #404040; }
.to-fin-benefit-icon { flex: 0 0 20px; width: 20px; height: 20px; margin-top: 2px; color: #404040; }
.to-fin-benefit-icon svg { display: block; width: 20px; height: 20px; }
.to-fin-benefit-text { flex: 1; }
.to-fin-partners { text-align: center; padding-top: 0; }
.to-fin-partners-logos { display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; justify-content: center; gap: 40px; margin: 0 auto; }
.to-fin-partners-logo { display: block; width: 150px; max-width: 100%; height: auto; object-fit: contain; }
.to-fin-partners-logo--muda { width: 150px; }
.to-fin-form-section { max-width: none; padding: 0 20px 80px; box-sizing: border-box; }
.to-fin-form-wrap { max-width: 920px; margin: 0 auto; }
.to-fin-form-card { display: flex; flex-direction: row; align-items: stretch; background: #fff; border-radius: 8px; box-shadow: 2px 2px 13px 3px rgba(0, 0, 0, 0.15); overflow: hidden; margin: 50px 0; }
.to-fin-form-photo { flex: 0 0 40%; min-height: 420px; background-image: url('${FORM_PHOTO_URL}'); background-position: bottom center; background-repeat: no-repeat; background-size: cover; border-radius: 8px 0 0 8px; }
.to-fin-form-panel { flex: 1; min-width: 0; padding: 30px; box-sizing: border-box; }
.to-fin-form-heading { margin: 0 0 50px; text-align: center; font-family: "DM Sans", sans-serif; font-size: 41px; font-weight: 300; line-height: 1.3; color: #404040; }
.to-fin-form-heading strong { font-size: 34px; font-weight: 700; }
.to-fin-form-lead { margin: 0 0 50px; font-family: "DM Sans", sans-serif; font-size: 17px; font-weight: 400; line-height: 1.6; color: #404040; }
.to-fin-form-subtitle { margin: 0 0 24px; text-align: center; font-family: "DM Sans", sans-serif; font-size: 1.17rem; font-weight: 600; color: #404040; }
.to-financiadores .to-fin-form-panel .to-form { max-width: none; margin: 0; padding: 0; }
.to-financiadores .to-fin-form-panel .to-form input,
.to-financiadores .to-fin-form-panel .to-form textarea { background-color: #f2f2f2; border-radius: 8px; }
@media (max-width: 767px) {
  .to-fin-heading { font-size: 22px; }
  .to-fin-heading strong { font-size: 28px; }
  .to-fin-form-heading { font-size: 30px; margin-bottom: 32px; }
  .to-fin-form-heading strong { font-size: 25px; }
  .to-fin-form-card { flex-direction: column; margin: 32px 0; }
  .to-fin-form-photo { display: none; }
  .to-fin-form-lead { margin-bottom: 32px; text-align: center; }
  .to-fin-partners-logos { gap: 24px; }
}
`.trim()

const cssSnapshot = `${baseCss}\n${pageCss}`

module.exports = {
  slug: 'financiadores',
  title: 'Financiadores - Terra Orgânica',
  htmlSnapshot,
  cssSnapshot,
  grapesProjectJson: {}
}
