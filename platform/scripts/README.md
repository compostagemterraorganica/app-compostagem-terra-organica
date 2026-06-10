# Migracao de dados legados para Postgres

Este diretório contem scripts para migrar dados da API legada para Postgres, mantendo os IDs originais:

- `users.id`
- `centrals.id`
- `volume_verifications.id`
- `posts.id` (a partir de export XML do WordPress)

## Estrutura

- `../migrations/001_create_core_tables.sql`: cria tabelas principais
- `../migrations/002_create_indexes.sql`: cria indices
- `migrate-wordpress-to-postgres.js`: pipeline de migracao
- `lib/wp-client.js`: cliente HTTP legado com paginação (`per_page=100&page=n`)
- `lib/wp-xml-parser.js`: parser do XML WXR para posts (`wp:post_type=post`)
- `lib/pg-client.js`: acesso Postgres + upserts idempotentes
- `lib/transformers.js`: normalização de payloads
- `lib/validators.js`: validacoes de contagem/integridade

## Variáveis de ambiente

No `platform/.env`:

- `POSTGRES_URL` (obrigatório)
- `LEGACY_BASE_URL` (opcional; fallback para `WORDPRESS_SITE_URL`/`WORDPRESS_BASE_URL`)
- `WORDPRESS_EMAIL` e `WORDPRESS_APP_PASS`/`WORDPRESS_PASS` (opcional, para Basic Auth)
- `MIGRATION_PAGE_SIZE` (opcional, default `100`)
- `LEGACY_RELATION_ID` (opcional, default `13`)
- `MIGRATION_HTTP_TIMEOUT_MS` (opcional, default `30000`)
- `WP_EXPORT_XML_PATH` (opcional; caminho absoluto/relativo para XML WordPress. Default: `platform/scripts/terraorgnica.WordPress.2026-05-07.xml`)

## Execução

Na pasta `platform`:

```bash
npm install
npm run migrate:legacy-to-postgres
```

## Saída e relatório

O script gera relatório JSON em:

- `platform/scripts/reports/migration-report-<timestamp>.json`

Com os blocos:
- `sourceCounts` (contagem na origem)
- `dbCounts` (contagem no Postgres)
- `integrity` (pendências de FK e duplicidade)
- `postsByStatus` (contagem de posts por status, ex: publish/draft/private)
