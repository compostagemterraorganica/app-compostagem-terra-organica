const { baseCss } = require('./shared-to-styles')

const htmlSnapshot = `
<section class="to-page to-quem-somos">
  <header class="to-page-hero to-page-hero--brand">
    <div class="to-page-hero-inner">
      <h1 class="to-page-hero-heading">Quem nós<br><strong>Somos?</strong></h1>
      <p class="to-page-hero-lead">Conheça nossa história, missão, visão, valores, princípios e metodologia de atuação</p>
    </div>
  </header>

  <div class="to-section">
    <div class="to-prose">
      <p>Somos uma organização da sociedade civil que atua no fortalecimento de iniciativas comunitárias ligadas à gestão de resíduos orgânicos, à agroecologia e à educação ambiental, com foco na formação de redes territoriais, no protagonismo local e na construção coletiva de soluções socioambientais.</p>
      <p>Desde nosso nascimento desenvolvemos metodologias próprias de formação e acompanhamento de iniciativas, articulando saberes técnicos, científicos e populares, promovendo espaços de aprendizagem baseados na prática, na troca de experiências e na experimentação direta nos territórios.</p>
      <p>Entendemos a compostagem não apenas como uma técnica de manejo de resíduos, mas como uma ferramenta pedagógica e política, capaz de provocar reflexões sobre consumo, descarte, ciclos da natureza, relações comunitárias e formas alternativas de produção e reprodução da vida.</p>

      <h2>Missão</h2>
      <p>Promover a transformação socioambiental por meio da compostagem comunitária, da agroecologia e da educação popular, fortalecendo iniciativas territoriais e redes colaborativas que atuam na construção de sociedades mais justas, solidárias e sustentáveis.</p>

      <h2>Visão</h2>
      <p>Ser uma referência nacional na formação, articulação e acompanhamento de iniciativas comunitárias de gestão de resíduos orgânicos e agroecologia, contribuindo para a consolidação da compostagem como política pública e tecnologia social.</p>

      <h2>Valores</h2>
      <ul>
        <li>Educação como prática emancipadora</li>
        <li>Protagonismo comunitário</li>
        <li>Respeito aos saberes tradicionais e ancestrais</li>
        <li>Cuidado com a terra e com as pessoas</li>
        <li>Cooperação e economia solidária</li>
        <li>Autonomia, transparência e ética institucional</li>
      </ul>

      <h2>Breve histórico</h2>
      <p>A Compostagem Terra Orgânica surge a partir de experiências territoriais de compostagem comunitária e agricultura urbana em Florianópolis, construídas de forma coletiva por educadores, técnicos, agricultores urbanos, lideranças comunitárias e agentes culturais.</p>
      <p>Ao longo dos anos, essas experiências deram origem a uma metodologia própria, baseada na formação continuada, no acompanhamento próximo das iniciativas e na produção de materiais pedagógicos que sistematizam os aprendizados acumulados.</p>
      <p>Entre 2019 e 2024, a LTO consolidou sua atuação em Santa Catarina e ampliou sua presença em outros estados, como São Paulo, Rio de Janeiro, Goiás e Minas Gerais, articulando uma rede diversa de coletivos, escolas, territórios indígenas, centros culturais e projetos socioambientais.</p>
      <p>Em 2025, esse percurso é reconhecido nacionalmente com a conquista do Prêmio Periferia Viva, na categoria Assessoria Técnica, reforçando a relevância pública do trabalho desenvolvido e abrindo novas possibilidades de expansão e fortalecimento institucional.</p>

      <h2>Metodologia Terra Orgânica: princípios, práticas e processo</h2>
      <p>A metodologia da Compostagem Terra Orgânica se constrói a partir da prática territorial, da escuta ativa e da experimentação contínua. Não se trata de um modelo fechado ou de uma cartilha rígida, mas de um conjunto de princípios e dispositivos pedagógicos que se adaptam às realidades locais, respeitando contextos culturais, sociais e ambientais distintos.</p>
      <p>A base da metodologia é a compreensão da compostagem comunitária como tecnologia social, ou seja, como uma prática simples, acessível e de baixo custo, capaz de gerar impactos ambientais mensuráveis, mas também de produzir processos educativos, organizativos e políticos nos territórios.</p>
      <p>Nesse sentido, atuamos simultaneamente em três dimensões inseparáveis: técnica, pedagógica e relacional.</p>

      <h3>Compostagem comunitária como tecnologia social</h3>
      <p>Para nós, a compostagem é mais do que um procedimento técnico de decomposição da matéria orgânica. Ela é compreendida como um dispositivo de reorganização das relações entre pessoas, resíduos e território.</p>
      <p>Ao transformar restos de alimentos em adubo, o processo evidencia ciclos naturais frequentemente invisibilizados nas cidades, promove a redução de resíduos enviados a aterros, contribui para a mitigação de emissões de gases de efeito estufa e fortalece práticas de produção de alimentos em pequena escala.</p>
      <p>Mas, sobretudo, a compostagem comunitária cria espaços de encontro, cooperação e aprendizado coletivo, nos quais moradores, estudantes, educadores e lideranças comunitárias passam a compartilhar responsabilidades, saberes e decisões sobre o cuidado com o ambiente.</p>

      <h3>Formação como eixo estruturante</h3>
      <p>A formação é o eixo central da metodologia Terra Orgânica. Todas as ações da organização, desde a implementação de pátios de compostagem até oficinas pontuais, são concebidas como processos formativos.</p>
      <p>Trabalhamos com a ideia de educação pelo fazer, onde o aprendizado ocorre a partir da experiência prática, da observação direta dos processos naturais e da reflexão coletiva sobre os desafios encontrados no cotidiano.</p>

      <h3>Educação popular e agroecologia</h3>
      <p>A metodologia dialoga diretamente com os princípios da educação popular, inspirada em práticas pedagógicas que reconhecem o saber como uma construção coletiva e situada.</p>

      <h3>Cultura, território e ancestralidade</h3>
      <p>A agroecologia aparece como horizonte ético e prático, orientando a forma como se pensa o manejo dos resíduos, a produção de alimentos, o cuidado com o solo e a relação com a biodiversidade.</p>

      <h3>Comunicação e audiovisual como ferramenta pedagógica</h3>
      <p>A comunicação é entendida como parte constitutiva da metodologia, e não apenas como divulgação. A produção de vídeos, registros fotográficos, textos, guias e materiais educativos cumpre a função de sistematizar experiências, compartilhar aprendizados e ampliar o alcance das ações.</p>

      <h3>Acompanhamento, cuidado e rede</h3>
      <p>Por fim, a metodologia Terra Orgânica se fundamenta em uma lógica de acompanhamento contínuo. Diferentemente de ações pontuais, a Compostagem Terra Orgânica investe em processos de médio e longo prazo, mantendo vínculos com as iniciativas apoiadas, realizando visitas técnicas, encontros periódicos e espaços de escuta coletiva.</p>
      <p>Assim, mais do que implementar projetos, a Compostagem Terra Orgânica constrói redes de confiança, aprendizado e cooperação, nas quais cada iniciativa fortalece a outra e contribui para a consolidação de um ecossistema socioambiental diverso, resiliente e em permanente transformação.</p>
    </div>
  </div>
</section>
`.trim()

const pageCss = `
.to-quem-somos .to-prose,
.to-quem-somos .to-prose p,
.to-quem-somos .to-prose h2,
.to-quem-somos .to-prose h3,
.to-quem-somos .to-prose li { color: #000; }
`.trim()

const cssSnapshot = `${baseCss}\n${pageCss}`

module.exports = {
  slug: 'quem-somos',
  title: 'Quem Somos? - Terra Orgânica',
  htmlSnapshot,
  cssSnapshot,
  grapesProjectJson: {}
}
