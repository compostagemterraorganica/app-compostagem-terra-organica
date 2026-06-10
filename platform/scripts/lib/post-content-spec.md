# Spec: HTML canônico de posts (`content_html`)

Formato oficial do campo `content_html` no CMS Terra Orgânica. Usado pela migração WordPress, páginas públicas e editor futuro.

## Wrapper obrigatório

Todo post publicado deve ter o conteúdo envolvido em:

```html
<div class="to-post-body">
  ...
</div>
```

## Tags permitidas

| Tag | Uso |
|-----|-----|
| `p` | Parágrafos |
| `h2`, `h3` | Subtítulos (sem classes WP) |
| `ul`, `ol`, `li` | Listas |
| `figure` | Bloco de imagem (classe `to-post-figure`) |
| `img` | Imagem inline ou dentro de `figure` |
| `a` | Links |
| `strong`, `em` | Ênfase |
| `blockquote` | Citações |
| `br` | Quebra de linha |

## Proibido no HTML final

- Comentários Gutenberg: `<!-- wp:paragraph -->`, `<!-- /wp:paragraph -->`, etc.
- Classes WordPress: `wp-block-*`, `has-*-font-size`, `align*`, `size-*`
- Classes Elementor: `elementor-*`
- Wrappers aninhados duplicados: `<div class="to-post-body"><div class="to-post-body">`

## Exemplo válido

```html
<div class="to-post-body">
  <p>Primeiro parágrafo do artigo.</p>
  <h2>Subtítulo da seção</h2>
  <p>Texto com <strong>destaque</strong> e <a href="https://example.com">link</a>.</p>
  <figure class="to-post-figure">
    <img src="https://compostagemterraorganica.com.br/wp-content/uploads/2024/02/foto.jpg" alt="Descrição" />
  </figure>
</div>
```

## Imagens (v1)

- `src` pode apontar temporariamente para `compostagemterraorganica.com.br/wp-content/uploads/...`
- Fase futura: reescrita para URLs do módulo `media` interno

## CSS público

Estilos escopados em `.to-post-body` em `platform/web/src/styles/blog.css`.
