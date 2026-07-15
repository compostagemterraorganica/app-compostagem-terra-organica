---
name: migrate-page-to-grapesjs
description: >-
  Migra paginas do site WordPress compostagemterraorganica.com.br para formato
  GrapesJS editavel no CMS Terra Organica. Use quando migrar paginas do site
  legado, criar seed de paginas CMS, converter HTML do WordPress para GrapesJS,
  ou configurar slug home como pagina principal.
---

# Migrar pagina para GrapesJS

Workflow para mapear paginas do site ao vivo e salvar no CMS com HTML/CSS limpos e 100% editaveis no GrapesJS.

## Restricoes

- Referenciar **apenas** o site ao vivo: `https://compostagemterraorganica.com.br/`
- Imagens: URLs diretas `https://compostagemterraorganica.com.br/wp-content/uploads/...` — **nunca** `/uploads/` local
- **Nao** incluir header, footer ou nav — `AppLayout` ja fornece navegacao
- Sem classes Elementor/WordPress (`elementor-*`, `wp-*`) no HTML final
- Escopo: uma pagina por vez; home (`slug=home`) e o primeiro exemplo

## Arquitetura do projeto

| Componente | Caminho |
|------------|---------|
| Editor GrapesJS | `platform/web/src/pages/admin-editor/EditorPageBuilder.jsx` |
| Export/config GrapesJS | `platform/web/src/pages/admin-editor/grapesjs-page-export.js` |
| Render publico | `platform/web/src/pages/public/PublicPage.jsx` (slug `home` = `/`) |
| API pages | `platform/api/src/modules/pages/` |
| Seed home | `platform/scripts/seed-home-page-grapesjs.js` |
| Conteudo home | `platform/scripts/lib/home-page-content.js` |

## Workflow

```
Task Progress:
- [ ] 1. Fetch/analisar URL ao vivo
- [ ] 2. Mapear secoes (conteudo, imagens WP, links)
- [ ] 3. Gerar HTML/CSS semanticos (classes `to-*`)
- [ ] 4. Validar URLs de imagem (wp-content/uploads)
- [ ] 5. Salvar via seed script ou API
- [ ] 6. Publicar com slug correto
- [ ] 7. Validar em PublicPage e EditorPageBuilder
```

### 1. Fetch e analise

```bash
curl -sL "https://compostagemterraorganica.com.br/" | rg -o 'https://compostagemterraorganica.com.br/wp-content/uploads/[^"'\'' ]+' | sort -u
curl -sL "https://compostagemterraorganica.com.br/" | rg 'href="https://compostagemterraorganica[^"]+"'
```

Extrair: titulos, paragrafos, links de CTA, embeds (YouTube), thumbnails de blog.

### 2. Mapear secoes (pular header/footer)

Para cada secao registrar: id logico, titulo, texto, imagens (URL WP completa), links.

### 3. Gerar HTML/CSS limpos

- Classes prefixadas `to-` (ex: `to-hero`, `to-cta-card`, `to-card-grid`)
- Cores: `#0274be` (primaria), `#3CAA59` (verde), fonte Raleway
- HTML sem wrapper de pagina completa — apenas `<section class="to-home">...</section>`
- CSS scoped com prefixo `.to-*`

### 4. Formato GrapesJS

O editor carrega nesta ordem (`EditorPageBuilder.jsx`):

1. `grapes_project_json` nao vazio → `editor.loadProjectData()`
2. Senao `html_snapshot` → `editor.setComponents()` + `editor.setStyle(css_snapshot)`

Para migracao inicial, basta `html_snapshot` + `css_snapshot` com `grapes_project_json: {}`. O JSON GrapesJS e gerado ao salvar no editor.

**Breakpoints alinhados ao site** (`grapesjs-page-export.js`):

| Device GrapesJS | widthMedia | Uso |
|-----------------|------------|-----|
| Desktop | — | estilos base |
| Tablet | 992px | ajustes tablet |
| Mobile landscape | 768px | landscape |
| Mobile portrait | **767px** | mobile principal (nao usar 480px) |

O site publico renderiza **somente** `html_snapshot` + `css_snapshot`. O editor recarrega via `grapes_project_json`. Ao salvar, o export usa `getCss({ keepUnusedStyles: true })` e `avoidInlineStyle: true` para paridade editor/site.

**CSS seedado:** preferir `@media (max-width: 767px)` para mobile e `@media (max-width: 900px)` para grids quando aplicavel.

### 5. Salvar no banco

**Opcao A — Seed script (recomendado para home e paginas estaticas)**

1. Criar/atualizar `platform/scripts/lib/<pagina>-content.js` com `htmlSnapshot`, `cssSnapshot`, `grapesProjectJson`
2. Adaptar ou criar script em `platform/scripts/seed-<pagina>-grapesjs.js`
3. Executar:

```bash
cd platform
npm run seed:home-page
```

Requer `POSTGRES_URL` em `platform/.env`.

**Opcao B — API (paginas ja existentes no CMS)**

```bash
# Criar pagina
POST /pages  { "slug": "home", "title": "Home - Terra Orgânica", "status": "draft" }

# Salvar versao
POST /pages/:id/versions  {
  "grapesProjectJson": {},
  "htmlSnapshot": "...",
  "cssSnapshot": "..."
}

# Publicar
POST /pages/:id/publish
```

### 6. Slug e rotas

| Slug | Rota publica |
|------|--------------|
| `home` | `/` |
| outro | `/pagina/:slug` |

### 7. Validacao

- `GET /pages/public/home` retorna `html_snapshot` e `css_snapshot`
- Abrir editor admin em `/admin/editor/:id` — conteudo carrega automaticamente
- Verificar imagens carregam de `compostagemterraorganica.com.br/wp-content/uploads/`

**Responsivo (editor vs site publico):**

```bash
cd platform
npm run validate:grapes-css-export
npm run test:grapes-mobile-export
```

Checklist apos editar no modo Mobile do GrapesJS:

- [ ] Salvar rascunho + publicar
- [ ] `css_snapshot` contem `@media (max-width: 767px)` com a propriedade alterada (nao `480px`)
- [ ] Site em viewport ~600px mostra a alteracao
- [ ] Site em viewport ~900px nao aplica estilo mobile
- [ ] Recarregar editor no modo Mobile — alteracao persiste

Se existirem regras legadas em `480px` no banco:

```bash
cd platform
npm run migrate:grapes-breakpoint        # dry-run
npm run migrate:grapes-breakpoint:apply  # gravar
```

## Exemplo: Home Page

Fonte: `https://compostagemterraorganica.com.br/`

| Secao | Conteudo | Imagens WP |
|-------|----------|------------|
| Hero | Compostagem Comunitária + subtitulo impacto | `.../2021/01/site-principal-red.jpg` (background) |
| CTAs | Quero Financiar / Separar / Registrar | — |
| Video | YouTube `u3d8Tskbaow` | iframe embed |
| Blog | 3 cards estaticos | `IMG_7056-1`, `desenv-sust-red`, `aterro-red` |
| Apoiadores CTA | Selo + botao cadastro | `Sauva-1024x576.png` |
| Logos | 3 apoiadores | `LOGO_CTO_HORIZ`, `logo-transp`, `Muda-Logo-Vertical` |
| Impactos | 3 icon boxes | `fertility`, `recycle`, `ok` |
| Participar | Indicar iniciativa | — |
| Centrais | 3 cards noticias | `IMG_2876`, `IMG_2420`, `20230304_172615` |

Links CTA:
- Financiar → `/financiadores/`
- Separar → `/pontos-de-entrega/`
- Registrar → `/cadastrar-central/`
- Apoiador → `/cadastro-de-apoiador/`

Implementacao de referencia: `platform/scripts/lib/home-page-content.js`

## Checklist de qualidade

- [ ] Nenhuma classe `elementor-*` ou `wp-*` no HTML
- [ ] Todas as imagens usam URL absoluta WP
- [ ] Header/footer/nav omitidos
- [ ] Slug correto e pagina publicada (`is_published=true` na versao)
- [ ] Editor carrega e permite editar todas as secoes
