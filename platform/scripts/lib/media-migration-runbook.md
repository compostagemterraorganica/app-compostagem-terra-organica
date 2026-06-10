# Runbook: migração de mídia → GCS

## Pré-requisitos

- `api/.env`: `GCS_BUCKET`, `GCS_PUBLIC_BASE`, `GOOGLE_APPLICATION_CREDENTIALS`
- `platform/.env`: `POSTGRES_URL`
- Bucket público para leitura em `media/*`
- `npm run test:gcs` na API com HTTP 200 na URL pública

## Ordem de execução

```bash
cd platform
npm run media:inventory      # Fase 0 — inventário
npm run media:migrate-gcs    # Fase 2 — upload canônicos + mappings
npm run media:rewrite-urls   # Fase 3 — reescreve URLs no banco e fontes
npm run seed:home-page       # republica home com URLs GCS
npm run media:purge-variants           # dry-run
npm run media:purge-variants -- --apply  # remove variantes WP locais
```

## Validação

- Home publicada: `html_snapshot` contém `storage.googleapis.com/terraorganica-media`
- Posts: `content_html` com URLs GCS
- `media_assets` ≈ 366 (únicos por sha256)
- `media_url_mappings` ≈ 4296

## Upload runtime

`POST /media/upload` (auth) → GCS + `media_assets`. Resposta: `publicUrl`, `url`.

## URLs não migradas (conhecidas)

Arquivos ausentes em `api/uploads/` no inventário Fase 0:

- `2022/07/20211106_120358-1-1024x576.jpg`
- PDFs (`NOTATECNICA_lei11645.pdf`, etc.)

Resolver manualmente ou ampliar fonte de migração.
