const ICON_HANDS = `<svg viewBox="0 0 640 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M488 192H336v56c0 39.7-32.3 72-72 72s-72-32.3-72-72V126.4l-64.9 39C107.8 176.9 96 197.8 96 220.2v47.3l-80 46.2C.7 322.5-4.6 342.1 4.3 357.4l80 138.6c8.8 15.3 28.4 20.5 43.7 11.7L231.4 448H368c35.3 0 64-28.7 64-64h16c17.7 0 32-14.3 32-32v-64h8c13.3 0 24-10.7 24-24v-48c0-13.3-10.7-24-24-24zm147.7-37.4L555.7 16C546.9.7 527.3-4.5 512 4.3L408.6 64H306.4c-12 0-23.7 3.4-33.9 9.7L239 94.6c-9.4 5.8-15 16.1-15 27.1V248c0 22.1 17.9 40 40 40s40-17.9 40-40v-88h184c30.9 0 56 25.1 56 56v28.5l80-46.2c15.3-8.9 20.5-28.4 11.7-43.7z"/></svg>`

const ICON_RECYCLE = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M184.561 261.903c3.232 13.997-12.123 24.635-24.068 17.168l-40.736-25.455-50.867 81.402C55.606 356.273 70.96 384 96.012 384H148c6.627 0 12 5.373 12 12v40c0 6.627-5.373 12-12 12H96.115c-75.334 0-121.302-83.048-81.408-146.88l50.822-81.388-40.725-25.448c-12.081-7.547-8.966-25.961 4.879-29.158l110.237-25.45c8.611-1.988 17.201 3.381 19.189 11.99l25.452 110.237zm98.561-182.915l41.289 66.076-40.74 25.457c-12.051 7.528-9 25.953 4.879 29.158l110.237 25.45c8.672 1.999 17.215-3.438 19.189-11.99l25.45-110.237c3.197-13.844-11.99-24.719-24.068-17.168l-40.687 25.424-41.263-66.082c-37.521-60.033-125.209-60.171-162.816 0l-17.963 28.766c-3.51 5.62-1.8 13.021 3.82 16.533l33.919 21.195c5.62 3.512 13.024 1.803 16.536-3.817l17.961-28.743c12.712-20.341 41.973-19.676 54.257-.022zM497.288 301.12l-27.515-44.065c-3.511-5.623-10.916-7.334-16.538-3.821l-33.861 21.159c-5.62 3.512-7.33 10.915-3.818 16.536l27.564 44.112c13.257 21.211-2.057 48.96-27.136 48.96H320V336.02c0-14.213-17.242-21.383-27.313-11.313l-80 79.981c-6.249 6.248-6.249 16.379 0 22.627l80 79.989C302.689 517.308 320 510.3 320 495.989V448h95.88c75.274 0 121.335-82.997 81.408-146.88z"/></svg>`

const htmlSnapshot = `
<section class="to-home">
  <header class="to-hero">
    <div class="to-hero-inner">
      <h2 class="to-hero-heading to-hero-heading--thin">Compostagem</h2>
      <h2 class="to-hero-heading to-hero-heading--bold to-hero-heading--underline">Comunitária</h2>
      <div class="to-hero-sub">
        <p>Impacto socioambiental</p>
        <p>através da compostagem de</p>
        <p>resíduos orgânicos</p>
      </div>
      <h2 class="to-hero-quem">Quem é você?</h2>
    </div>
  </header>

  <div class="to-cta-band">
    <div class="to-cta-grid">
      <a class="to-cta-card" href="/financiadores">
        <span class="to-cta-icon to-cta-icon--financiar">${ICON_HANDS}</span>
        <h3 class="to-cta-title">Quero Financiar</h3>
        <p class="to-cta-text">Mostre para seus clientes que sua empresa é consciente</p>
      </a>
      <a class="to-cta-card" href="/pontos-de-entrega">
        <span class="to-cta-icon to-cta-icon--separar">${ICON_RECYCLE}</span>
        <h3 class="to-cta-title">Quero Separar</h3>
        <p class="to-cta-text">Encontre o ponto de entrega mais próximo de você</p>
      </a>
      <a class="to-cta-card" href="/cadastro-de-centrais">
        <span class="to-cta-icon to-cta-icon--registrar">${ICON_HANDS}</span>
        <h3 class="to-cta-title">Quero Registrar</h3>
        <p class="to-cta-text">Registre os volumes compostados em seu território</p>
      </a>
    </div>
  </div>

  <section class="to-video-section">
    <div class="to-video-inner">
      <h2 class="to-video-heading">
        <strong class="to-video-heading-bold">Veja como</strong><br>
        funciona na prática!
      </h2>
      <div class="to-video-wrap">
        <iframe src="https://www.youtube.com/embed/u3d8Tskbaow" title="Compostagem Comunitária Terra Orgânica" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
    </div>
  </section>

  <section class="to-blog-section">
    <div class="to-blog-outer">
      <div class="elementor-shape elementor-shape-top" aria-hidden="true" data-negative="false">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 100" preserveAspectRatio="none">
          <path class="elementor-shape-fill" d="M500,98.9L0,6.1V0h1000v6.1L500,98.9z"/>
        </svg>
      </div>
      <div class="elementor-shape elementor-shape-bottom" aria-hidden="true" data-negative="false">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 100" preserveAspectRatio="none">
          <path class="elementor-shape-fill" d="M500,98.9L0,6.1V0h1000v6.1L500,98.9z"/>
        </svg>
      </div>
      <div class="to-blog-inner">
      <h2 class="to-blog-heading">
        Novidades<br>
        <strong class="to-blog-heading-bold">Terra Orgânica</strong>
      </h2>
      <div class="to-blog-divider" aria-hidden="true"></div>
      <p class="to-blog-lead">Fique por dentro das notícias e temas relevantes da Terra Orgânica.</p>
      <div class="to-card-grid">
      <article class="to-card">
        <a href="/blog/qualificacao-da-central-de-referencia-lto-fortalecimento-de-um-modelo-replicavel-voltado-a-construcao-coletiva/">
          <img src="https://storage.googleapis.com/terraorganica-media/media/873bbdf4-3d28-4c8e-9fc2-62261b39f999.jpg" alt="Qualificação da Central de Referência LTO"/>
          <h3>Qualificação da Central de Referência LTO: fortalecimento de um modelo replicável voltado à construção coletiva</h3>
          <p>O projeto contempla a instalação de leiras impermeabilizadas e com drenagem, a instalação do sistema ecológico de tratamento de água</p>
          <span class="to-card-more">Continue Lendo</span>
        </a>
      </article>
      <article class="to-card">
        <a href="/blog/compostagem-comunitaria-e-a-onu/">
          <img src="https://storage.googleapis.com/terraorganica-media/media/bd12b832-0253-428c-bf80-57ed5fe2d35f.jpg" alt="Compostagem e ODS da ONU"/>
          <h3>Compostagem Comunitária e os Objetivos de Desenvolvimento Sustentável da ONU</h3>
          <p>A Organização das Nações Unidas (ONU) definiu no ano de 2015 que fomentaria ações que estivessem de acordo com medidas</p>
          <span class="to-card-more">Continue Lendo</span>
        </a>
      </article>
      <article class="to-card">
        <a href="/blog/aterros-sanitarios-lixoes-e-o-papel-da-compostagem-comunitaria-na-gestao-de-residuos/">
          <img src="https://storage.googleapis.com/terraorganica-media/media/4a555528-7ddb-4fb5-87f0-5e70d7b92fa8.jpg" alt="Aterros sanitários e compostagem"/>
          <h3>Aterros sanitários, lixões e o papel da compostagem comunitária na gestão de resíduos</h3>
          <p>No Brasil, os aterros sanitários vêm sendo considerados como uma ótima alternativa para a destinação final dos resíduos sólidos urbanos.</p>
          <span class="to-card-more">Continue Lendo</span>
        </a>
      </article>
    </div>
    <p class="to-section-cta"><a class="to-btn to-btn-blog" href="/blog">Ver todas as novidades</a></p>
      </div>
    </div>
  </section>

  <section class="to-supporters">
    <div class="to-supporters-banner">
      <div class="to-supporters-banner-bg">
        <h2 class="to-supporters-banner-heading">Faça como nossos apoiadores<br><strong>e nos ajude a construir um</strong><br>mundo melhor!</h2>
      </div>
    </div>

    <div class="to-supporters-body">
      <div class="to-supporters-body-inner">
        <p class="to-supporters-lead">Com o <strong>Selo Terra Orgânica</strong> você mostra ao mundo o <strong>compromisso</strong> de sua empresa com a transformação de resíduos orgânicos em vida!<br><em>Seja um de nossos apoiadores.</em></p>
        <h2 class="to-supporters-title"><strong class="to-supporters-title-bold">Apoiadores</strong><br>da nossa causa</h2>
        <div class="to-supporters-logos">
          <img class="to-supporters-logo to-supporters-logo--sauva" src="https://storage.googleapis.com/terraorganica-media/media/17fe0d8c-0f48-4d20-ac54-ba82cf7c6c8f.png" alt="" width="1024" height="576"/>
          <img class="to-supporters-logo to-supporters-logo--partner" src="https://storage.googleapis.com/terraorganica-media/media/9aae62b8-cc4d-4309-a506-7c57cde1ca79.png" alt="" width="280" height="300"/>
          <img class="to-supporters-logo to-supporters-logo--muda" src="https://storage.googleapis.com/terraorganica-media/media/8a73ea2e-1381-4daa-8914-21e143a314de.png" alt="" width="1024" height="1024"/>
        </div>
        <p class="to-supporters-cta"><a class="to-btn to-btn-supporter" href="https://compostagemterraorganica.com.br/cadastro-de-apoiador/">QUERO SER UM APOIADOR</a></p>
      </div>
    </div>
  </section>

  <section class="to-impact-section">
    <div class="to-impact-outer">
      <div class="to-impact-wrap">
        <div class="to-impact-content">
          <h2 class="to-impact-heading">Impactos positivos da sua<br><strong class="to-impact-heading-bold">contribuição</strong></h2>
          <p class="to-impact-lead">Entenda os benefícios de separar e compostar<br>seus resíduos orgânicos.</p>
          <div class="to-impact-icons">
            <img src="https://storage.googleapis.com/terraorganica-media/media/0e6c774c-ceef-42ab-b209-68748a848ef6.png" alt="" width="410" height="278"/>
            <img src="https://storage.googleapis.com/terraorganica-media/media/0a7a8860-86e1-4743-b255-33961df6d274.png" alt="" width="410" height="278"/>
            <img src="https://storage.googleapis.com/terraorganica-media/media/e3e8f26f-4565-4bf6-a7ee-0b5c9c7cd804.png" alt="" width="407" height="276"/>
          </div>
          <div class="to-impact-cards">
            <div class="to-impact-card">
              <h3>Solo saudável, comida saudável</h3>
              <p>Onde há compostagem o solo é mais fértil e elimina a necessidade de agrotóxicos no plantio. A compostagem é uma forte aliada da agricultura orgânica que além de produzir alimentos saudáveis, ajuda a recuperar a vida no solo</p>
            </div>
            <div class="to-impact-card">
              <h3>Mais resíduos secos reciclados</h3>
              <p>Os resíduos orgânicos são os vilões da reciclagem de material seco. Quando descartados juntos, a reciclagem do material seco não pode acontecer, pois os resíduos são contaminados. Fazendo a separação para a compostagem, você evita a contaminação de mais materiais recicláveis</p>
            </div>
            <div class="to-impact-card">
              <h3>Menos aterros e gastos com transporte</h3>
              <p>Quanto mais pessoas fazem a compostagem dos resíduos orgânicos, menos áreas são necessárias para aterros sanitários e menor é a necessidade de transporte dos resíduos por grandes distâncias</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="to-participate-section">
    <div class="to-participate-outer">
      <div class="elementor-shape elementor-shape-top" aria-hidden="true" data-negative="false">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 100" preserveAspectRatio="none">
          <path class="elementor-shape-fill" d="M500,98.9L0,6.1V0h1000v6.1L500,98.9z"/>
        </svg>
      </div>
      <div class="elementor-shape elementor-shape-bottom" aria-hidden="true" data-negative="false">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 100" preserveAspectRatio="none">
          <path class="elementor-shape-fill" d="M500,98.9L0,6.1V0h1000v6.1L500,98.9z"/>
        </svg>
      </div>
      <div class="to-participate-overlay"></div>
      <div class="to-participate-inner">
        <h2 class="to-participate-heading">
          <span>Tem uma iniciativa</span><br>
          <span>de compostagem?</span><br>
          <strong class="to-participate-heading-bold">Participe!</strong>
        </h2>
        <a class="to-participate-btn" href="/cadastro-de-centrais">CADASTRAR</a>
        <p class="to-participate-lead">Conheço uma iniciativa<br>e quero indicar!</p>
      </div>
    </div>
  </section>

  <section class="to-centrals-section">
    <div class="to-centrals-inner">
      <h2 class="to-centrals-heading">
        ...E o trabalho nas centrais<br>
        <strong class="to-centrals-heading-bold">não para!</strong>
      </h2>
      <div class="to-centrals-divider" aria-hidden="true"></div>
      <p class="to-centrals-lead">Saiba o que vem sendo feito nas centrais parceiras.</p>
      <div class="to-card-grid to-centrals-grid">
      <article class="to-card">
        <a href="/blog/lab-terra-organica-tem-maior-volume-de-residuos-compostados-do-ano/">
          <img src="https://storage.googleapis.com/terraorganica-media/media/79a07d6c-65e2-4068-8c59-bfff16582d8e.jpg" alt="Lab Terra Orgânica"/>
          <h3>Lab. Terra Orgânica tem Maior Volume de Resíduos Compostados do Ano.</h3>
          <p>No manejo de Compostagem feito no dia 17/03/2023, a central modelo de compostagem comunitária e CSAA Laboratório Terra Orgânica, atingiu a maior marca do ano até então.</p>
        </a>
      </article>
      <article class="to-card">
        <a href="/blog/educacao-ambiental-na-horta-e-compostagem-comunitaria/">
          <img src="https://storage.googleapis.com/terraorganica-media/media/ce6740a1-1426-4304-adb1-13b3458645bb.jpg" alt="Educação Ambiental"/>
          <h3>Educação Ambiental na Horta e Compostagem Comunitária</h3>
          <p>Crianças do Núcleo de Educação Infantil Municipal tem manhã de experiências agroecológicas com direito a plantio e compostagem.</p>
        </a>
      </article>
      <article class="to-card">
        <a href="/blog/novidades-da-central-5/">
          <img src="https://storage.googleapis.com/terraorganica-media/media/aeaad988-dc13-417a-81d0-0f49705874bc.jpg" alt="Instituto Caeté"/>
          <h3>Cerimonia de Inauguração Instituto Caeté, Comuna Amarildo de Souza</h3>
          <p>Essa e outras atualizações, você encontra no nosso post semanal: Novidades da Central. Edição 5.</p>
        </a>
      </article>
    </div>
    </div>
  </section>
</section>
`.trim()

const cssSnapshot = `
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&family=Raleway:wght@200;300;400;600;700&display=swap');
.to-home { font-family: "Raleway", sans-serif; color: #3a3a3a; width: 100%; max-width: none; margin: 0; padding: 0; }
.to-section { max-width: 1200px; margin: 0 auto; padding: 48px 20px; }
.to-section-title { color: #0274be; font-size: 2rem; margin: 0 0 16px; text-align: center; }
.to-section-lead { text-align: center; margin: 0 0 32px; max-width: 720px; margin-left: auto; margin-right: auto; }
.to-section-cta { text-align: center; margin-top: 24px; }
.to-hero { background-color: #99420e; background-image: url('https://storage.googleapis.com/terraorganica-media/media/9f167e03-9191-4bc9-9028-146b60dee0b6.jpg'); background-position: center center; background-repeat: no-repeat; background-size: cover; min-height: 571px; display: flex; align-items: center; justify-content: flex-start; text-align: left; padding: 0 0 20px; }
.to-hero-inner { width: 100%; max-width: 1140px; margin: 0 auto; padding: 0 20px; box-sizing: border-box; }
.to-hero-heading { font-family: "Raleway", sans-serif; color: #fff; margin: 0; line-height: 1.1; }
.to-hero-heading--thin { font-size: 53px; font-weight: 200; }
.to-hero-heading--bold { font-size: 62px; font-weight: 700; margin-top: -15px; position: relative; display: inline-block; }
.to-hero-heading--underline::after { content: ''; position: absolute; left: 0; width: 100%; top: 110%; border-top: 2px solid #fff; }
.to-hero-sub { margin: 0; padding: 40px 0; text-align: left; font-family: "Raleway", sans-serif; font-size: 28px; font-weight: 400; line-height: 33px; letter-spacing: 0.03px; color: #fff; }
.to-hero-sub p { margin: 0; }
.to-hero-quem { margin: 24px 0 0; font-family: "Raleway", sans-serif; font-size: 36px; font-weight: 700; color: #fff; text-align: left; border-radius: 8px; }
.to-cta-band { max-width: 1140px; margin: -70px auto 0; padding: 0 20px 60px; position: relative; z-index: 2; box-sizing: border-box; }
.to-cta-grid { display: flex; flex-direction: row; flex-wrap: wrap; justify-content: center; align-items: stretch; gap: 50px; }
.to-cta-card { flex: 1 1 280px; max-width: 340px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: #fff; color: #54595f; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.24); text-decoration: none; box-sizing: border-box; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.to-cta-card:hover { transform: translateY(-4px); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2); }
.to-cta-icon { display: inline-flex; align-items: center; justify-content: center; margin: 0 0 40px; padding: 20px 20px 10px; border-radius: 500px; line-height: 0; }
.to-cta-icon svg { width: 48px; height: 48px; display: block; }
.to-cta-icon--financiar { background-color: #ffe6d8; }
.to-cta-icon--financiar svg { fill: #ff5c00; }
.to-cta-icon--separar { background-color: #ffe0b8; }
.to-cta-icon--separar svg { fill: #9d7b4e; }
.to-cta-icon--registrar { background-color: #cfffd0; }
.to-cta-icon--registrar svg { fill: #53b854; }
.to-cta-title { margin: 0 0 12px; font-family: "Raleway", sans-serif; font-size: 24px; font-weight: 600; text-transform: uppercase; color: #54595f; line-height: 1.2; }
.to-cta-text { margin: 0; font-family: "Raleway", sans-serif; font-size: 20px; font-weight: 400; color: #54595f; line-height: 1.4; }
.to-video-section { max-width: none; padding: 100px 20px; background: #fff; box-sizing: border-box; }
.to-video-inner { max-width: 1140px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 50px; }
.to-video-heading { margin: 0 auto; position: relative; text-align: center; font-family: "Raleway", sans-serif; font-size: 28px; font-weight: 300; line-height: 1.3; color: #54595f; }
.to-video-heading-bold { font-size: 34px; font-weight: 700; letter-spacing: 0.02em; }
.to-video-heading::after { content: ''; position: absolute; left: 0; top: 108%; width: 100%; border-top: 1px solid #ccc; }
.to-video-wrap { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 20px; width: 100%; max-width: 900px; margin: 0 auto; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12); }
.to-video-wrap iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
.to-blog-section { max-width: none; margin: 0; padding: 0; background: transparent; box-sizing: border-box; }
.to-blog-outer { position: relative; background-color: #9d7b4e; padding: 60px 0 10px; overflow: hidden; box-sizing: border-box; }
.to-blog-outer .elementor-shape { overflow: hidden; position: absolute; left: 0; width: 100%; line-height: 0; direction: ltr; pointer-events: none; z-index: 1; }
.to-blog-outer .elementor-shape-top { top: -1px; }
.to-blog-outer .elementor-shape-bottom { bottom: -1px; transform: rotate(180deg); }
.to-blog-outer .elementor-shape svg { display: block; width: calc(100% + 1.3px); position: relative; left: 50%; transform: translateX(-50%); }
.to-blog-outer .elementor-shape-top svg { height: 50px; }
.to-blog-outer .elementor-shape-bottom svg { height: 30px; }
.to-blog-outer .elementor-shape-fill { fill: #fff; }
.to-blog-inner { position: relative; z-index: 2; max-width: 1140px; margin: 0 auto; padding: 0 20px 50px; box-sizing: border-box; }
.to-blog-heading { margin: 0 auto; position: relative; text-align: center; font-family: "Raleway", sans-serif; font-size: 55px; font-weight: 300; line-height: 0.8em; letter-spacing: 1.6px; color: #fff; }
.to-blog-heading-bold { font-size: 40px; font-weight: 700; letter-spacing: 0; }
.to-blog-divider { width: min(100%, 420px); height: 2px; margin: 28px auto 40px; background: rgba(255, 255, 255, 0.85); border: none; }
.to-blog-lead { margin: 0 auto 40px; max-width: 720px; text-align: center; font-family: "Raleway", sans-serif; font-size: 18px; font-weight: 400; line-height: 30px; letter-spacing: 0.1px; color: #fff; padding: 0 20px; box-sizing: border-box; }
.to-card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 50px 50px; }
.to-card { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15); display: flex; flex-direction: column; }
.to-card a { text-decoration: none; color: inherit; display: flex; flex-direction: column; flex: 1; }
.to-card img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; display: block; }
.to-card h3 { font-family: "Raleway", sans-serif; font-size: 20px; font-weight: 700; color: #404040; margin: 0; padding: 20px 30px 8px; text-decoration: underline; line-height: 1.35; }
.to-card p { margin: 0; padding: 0 30px 16px; font-family: "Raleway", sans-serif; font-size: 15px; line-height: 1.5; color: #54595f; flex: 1; }
.to-card .to-card-more { display: inline-block; margin: auto 30px 24px; font-family: "Raleway", sans-serif; font-size: 14px; font-weight: 400; text-transform: uppercase; text-decoration: underline; color: #404040; letter-spacing: 0; }
.to-section-cta { text-align: center; margin-top: 32px; }
.to-btn { display: inline-block; background: #0274be; color: #fff; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-weight: 600; transition: background 0.2s; }
.to-btn:hover { background: #3a3a3a; color: #fff; }
.to-btn-blog { background: transparent; border: 2px solid #fff; color: #fff; }
.to-btn-blog:hover { background: #fff; color: #9d7b4e; }
.to-supporters { width: 100%; }
.to-supporters-banner { max-width: 1140px; margin: 80px auto 60px; padding: 0 20px; box-sizing: border-box; }
.to-supporters-banner-bg { min-height: 430px; display: flex; align-items: center; justify-content: flex-end; padding: 40px 48px; border-radius: 8px; background-color: #99420e; background-image: url('https://storage.googleapis.com/terraorganica-media/media/1eea73ef-bb68-4abd-a0e3-e07eb2a1b99f.jpg'); background-position: center center; background-repeat: no-repeat; background-size: cover; box-sizing: border-box; }
.to-supporters-banner-heading { margin: 0; text-align: right; font-family: "Raleway", sans-serif; font-size: 32px; font-weight: 400; line-height: 1.3em; letter-spacing: 1.3px; color: #fff; }
.to-supporters-banner-heading strong { font-weight: 700; }
.to-supporters-body { width: 100%; background-color: #99420e; padding: 60px 0; box-sizing: border-box; }
.to-supporters-body-inner { max-width: 733px; margin: 0 auto; padding: 0 20px; text-align: center; box-sizing: border-box; }
.to-supporters-lead { margin: 0 0 40px; font-family: "Raleway", sans-serif; font-size: 22px; font-weight: 400; line-height: 30px; letter-spacing: 0.1px; color: #f5f5f5; }
.to-supporters-title { position: relative; display: inline-block; margin: 0 auto; font-family: "Raleway", sans-serif; font-size: 28px; font-weight: 300; line-height: 1.3; color: #f5f5f5; }
.to-supporters-title::after { content: ''; position: absolute; left: 0; top: 108%; width: 100%; border-top: 1px solid #fff; }
.to-supporters-title-bold { font-size: 34px; font-weight: 700; letter-spacing: 0.02em; }
.to-supporters-logos { display: flex; flex-direction: row; flex-wrap: wrap; justify-content: center; align-items: center; margin: 50px 0; padding: 0; background-color: #fff; border-radius: 25px; }
.to-supporters-logo { display: block; height: auto; object-fit: contain; }
.to-supporters-logo--sauva { width: 250px; max-width: 100%; }
.to-supporters-logo--partner { width: 193px; max-width: 100%; margin: 8px; }
.to-supporters-logo--muda { width: 250px; max-width: 100%; }
.to-supporters-cta { margin: 0; text-align: center; }
.to-btn-supporter { background: #3CAA59; border-radius: 50px; font-family: "Roboto", sans-serif; font-weight: 600; text-transform: uppercase; }
.to-btn-supporter:hover { background: #2d8a45; }
.to-impact-section { max-width: none; margin: 0; padding: 0; }
.to-impact-outer { width: 100%; padding: 80px 0; background-color: #9d7b4e; background-image: url('https://storage.googleapis.com/terraorganica-media/media/d27e2d7c-5e7d-4c39-88d9-db31e478354f.jpg'); background-position: center left; background-repeat: no-repeat; background-size: 550px auto; box-sizing: border-box; }
.to-impact-wrap { max-width: 1140px; margin: 0 auto; padding: 0 20px; box-sizing: border-box; }
.to-impact-content { width: 70%; box-sizing: border-box; }
.to-impact-heading { margin: 0 0 16px; text-align: right; font-family: "Raleway", sans-serif; font-size: 40px; font-weight: 300; line-height: 1.3; color: #fff; }
.to-impact-heading-bold { font-size: 50px; font-weight: 700; }
.to-impact-lead { margin: 0 0 32px; text-align: right; font-family: "Open Sans", sans-serif; font-size: 20px; font-weight: 400; line-height: 30px; letter-spacing: 0.1px; color: #fff; }
.to-impact-icons { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
.to-impact-icons img { width: 50%; max-width: 205px; height: auto; display: block; margin: 0 auto; object-fit: contain; }
.to-impact-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
.to-impact-card { background: #fff; border-radius: 8px; box-shadow: 2px 2px 13px 3px rgba(0, 0, 0, 0.15); margin-top: 50px; padding: 30px; text-align: left; }
.to-impact-card h3 { margin: 0 0 12px; font-family: "Raleway", sans-serif; font-size: 20px; font-weight: 600; color: #404040; }
.to-impact-card p { margin: 0; font-family: "Open Sans", sans-serif; font-size: 18px; font-weight: 400; line-height: 1.5; color: #404040; }
.to-participate-section { max-width: none; margin: 0; padding: 0; }
.to-participate-outer { position: relative; min-height: 645px; display: flex; align-items: center; background-image: url('https://storage.googleapis.com/terraorganica-media/media/218c3a3e-2045-4ef8-a087-34bb257a1d3e.jpg'); background-position: bottom right; background-repeat: no-repeat; background-size: cover; background-attachment: fixed; overflow: hidden; }
.to-participate-overlay { position: absolute; inset: 0; z-index: 1; background: linear-gradient(90deg, #fff 40%, rgba(255, 255, 255, 0) 80%); opacity: 0.92; pointer-events: none; }
.to-participate-outer .elementor-shape { overflow: hidden; position: absolute; left: 0; width: 100%; line-height: 0; direction: ltr; pointer-events: none; z-index: 2; }
.to-participate-outer .elementor-shape-top { top: -1px; }
.to-participate-outer .elementor-shape-bottom { bottom: -1px; transform: rotate(180deg); }
.to-participate-outer .elementor-shape svg { display: block; width: calc(100% + 1.3px); position: relative; left: 50%; transform: translateX(-50%); }
.to-participate-outer .elementor-shape-top svg { height: 50px; }
.to-participate-outer .elementor-shape-bottom svg { height: 40px; }
.to-participate-outer .elementor-shape-top .elementor-shape-fill { fill: #9d7b4e; }
.to-participate-outer .elementor-shape-bottom .elementor-shape-fill { fill: #fff; }
.to-participate-inner { position: relative; z-index: 3; display: flex; flex-wrap: wrap; align-items: center; max-width: 1048px; width: 75%; margin: 0 auto; padding: 80px 20px; box-sizing: border-box; }
.to-participate-heading { margin: 0; position: relative; flex: 0 0 auto; text-align: start; font-family: "Raleway", sans-serif; font-size: 41px; font-weight: 300; line-height: 48px; letter-spacing: 1.17px; color: #404040; }
.to-participate-heading-bold { font-size: 41px; font-weight: 700; letter-spacing: 0.06em; line-height: 48px; }
.to-participate-heading::after { content: ''; position: absolute; left: 0; top: 105%; width: 207px; border-top: 2px solid #404040; }
.to-participate-btn { display: inline-block; flex: 0 0 auto; margin: 30px 0 0; padding: 14px 32px; background: #3caa59; color: #fff; font-family: "Roboto", sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 50px; transition: background 0.2s ease; }
.to-participate-btn:hover { background: #2d8a45; color: #fff; }
.to-participate-lead { margin: 0 0 0 10px; flex: 0 0 auto; text-align: center; font-family: "Raleway", sans-serif; font-size: 18px; font-weight: 400; line-height: 24px; letter-spacing: 1.1px; color: #404040; }
.to-centrals-section { max-width: none; margin: 0; padding: 60px 0; box-sizing: border-box; }
.to-centrals-inner { max-width: 1140px; margin: 0 auto; padding: 0 20px; box-sizing: border-box; }
.to-centrals-heading { margin: 0 auto; text-align: center; font-family: "Raleway", sans-serif; font-size: 30px; font-weight: 300; line-height: 1.3; color: #404040; }
.to-centrals-heading-bold { font-size: 40px; font-weight: 700; letter-spacing: 0.02em; }
.to-centrals-divider { width: min(100%, 420px); height: 2px; margin: 28px auto 0; background: #404040; border: none; }
.to-centrals-lead { margin: 40px auto 25px; max-width: 720px; text-align: center; font-family: "Raleway", sans-serif; font-size: 18px; font-weight: 400; line-height: 30px; letter-spacing: 0.1px; color: #404040; padding: 0 20px; box-sizing: border-box; }
.to-centrals-grid { margin: 25px; gap: 45px 50px; }
@media (max-width: 767px) {
  .to-hero { min-height: 50vh; background-image: url('https://storage.googleapis.com/terraorganica-media/media/c1cc9e5e-b0b7-4201-a341-a81b0a74e409.jpg'); }
  .to-hero-heading--thin { font-size: 28px; }
  .to-hero-heading--bold { font-size: 32.5px; margin-top: -17px; }
  .to-hero-sub { font-size: 20px; line-height: 22px; letter-spacing: 1.3px; padding-top: 30px; max-width: 145px; }
  .to-hero-quem { font-size: 26px; }
  .to-cta-band { margin-top: -40px; padding-bottom: 40px; }
  .to-cta-grid { flex-direction: column; align-items: center; gap: 24px; }
  .to-cta-card { max-width: 100%; width: 100%; }
  .to-video-section { padding: 60px 16px; }
  .to-video-inner { gap: 32px; }
  .to-video-heading { font-size: 22px; }
  .to-video-heading-bold { font-size: 28px; }
  .to-blog-outer .elementor-shape-top svg,
  .to-blog-outer .elementor-shape-bottom svg { height: 0; }
  .to-blog-heading { font-size: 41px; letter-spacing: 1.4px; }
  .to-blog-heading-bold { font-size: 30px; }
  .to-blog-lead { font-size: 16px; }
  .to-supporters-banner { margin-top: 40px; margin-bottom: 40px; }
  .to-supporters-banner-bg { min-height: 280px; padding: 32px 24px; }
  .to-supporters-banner-heading { font-size: 28px; }
  .to-supporters-body { padding: 40px 0; }
  .to-supporters-lead { font-size: 16px; }
  .to-supporters-logos { flex-direction: column; gap: 16px; padding: 16px 0; }
  .to-impact-outer { background-image: none; padding: 50px 0; }
  .to-impact-content { width: 70%; }
  .to-impact-lead { font-size: 16px; }
  .to-impact-icons, .to-impact-cards { grid-template-columns: 1fr; gap: 24px; }
  .to-impact-card { margin-top: 24px; text-align: center; }
  .to-impact-card h3 { font-size: 16px; line-height: 19px; letter-spacing: 0.075px; }
  .to-impact-card p { font-size: 14px; letter-spacing: 0.1px; }
  .to-participate-outer { background-attachment: scroll; background-position: center center; margin-top: 80px; }
  .to-participate-overlay { background: #fff; opacity: 0.85; }
  .to-participate-outer .elementor-shape-top svg,
  .to-participate-outer .elementor-shape-bottom svg { height: 0; }
  .to-participate-inner { flex-direction: column; width: 100%; align-items: center; text-align: center; padding: 60px 20px; }
  .to-participate-heading { font-size: 24px; line-height: 28px; letter-spacing: 0.6px; text-align: center; }
  .to-participate-heading-bold { font-size: 41px; letter-spacing: 0.06em; line-height: 48px; }
  .to-participate-btn { display: none; }
  .to-participate-lead { margin: 16px 0 0; text-align: center; }
  .to-centrals-section { padding: 40px 0; }
  .to-centrals-lead { font-size: 16px; margin-top: 32px; }
  .to-centrals-grid { margin: 16px 0; gap: 32px; }
}
@media (max-width: 360px) {
  .to-participate-heading::after { width: 100%; }
}
@media (max-width: 900px) {
  .to-card-grid, .to-impact-icons, .to-impact-cards { grid-template-columns: 1fr; }
}
`.trim()

module.exports = { htmlSnapshot, cssSnapshot, grapesProjectJson: {} }
