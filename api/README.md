# Nova API Postgres

API da Terra Organica baseada em Postgres, sem dependência de OAuth/rotas do WordPress.

## Requisitos

- Node 18+
- Postgres acessível via `POSTGRES_URL`

## Setup

```bash
cd api
npm install
cp .env.example .env
npm run dev
```

## Rotas principais

- `POST /auth/login`
- `POST /auth/password` (pública, define/troca senha por `userId` ou `email`)
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET/POST/PUT /users`
- `GET/POST/PUT /centrals`
- `GET/PUT /centrals/:id/users`
- `GET/POST/PUT/DELETE /volume-verifications`
- `GET/POST /youtube/*`
- `GET /posts/public` (listagem pública paginada, `?page=1&limit=12&excludeCategory=central`)
- `GET /posts/public/recent` (posts recentes, `?limit=5&excludeSlug=...`)
- `GET /posts/public/:slug` (post publicado por slug)
- `GET/POST/PUT/DELETE /posts` (admin, requer auth)

## Google Cloud Storage (mídia)

Variáveis em [`.env.example`](.env.example) (seção GCS). Credencial: **Service Account com chave JSON** e papel **Storage Object Admin** no bucket.

```bash
cd api
# Preencha GCS_BUCKET, GCS_PUBLIC_BASE e GOOGLE_APPLICATION_CREDENTIALS no .env
npm run test:gcs
```

O script valida credenciais, acesso ao bucket, upload de PNG 1x1 em `media/_test/` e leitura pública da URL. Use `GCS_TEST_CLEANUP=false` para manter o arquivo de teste.

### Migração de mídia local → GCS

Migration `003_media_gcs_mappings.sql` adiciona `storage_key`, `public_url`, `sha256`, `source` em `media_assets` e cria `media_url_mappings`.

```bash
cd platform
npm run media:migrate-gcs
```

Requer `POSTGRES_URL` em `platform/.env` e variáveis GCS em `api/.env`. Idempotente via `sha256`.

```bash
cd platform
npm run media:rewrite-urls   # posts, páginas CMS, home, footer → URLs GCS
npm run seed:home-page
npm run media:purge-variants           # dry-run
npm run media:purge-variants -- --apply  # remove variantes WP locais
```

### Upload de mídia (`POST /media/upload`)

Requer autenticação. Envia imagem direto ao GCS; resposta inclui `publicUrl` e `url` (mesmo valor).

```bash
curl -X POST http://localhost:3000/media/upload \
  -H "Cookie: ..." -H "x-csrf-token: ..." \
  -F "image=@foto.jpg"
```

## Segurança

- Sessão por cookie HttpOnly
- CSRF token (cookie + header `x-csrf-token`)
- Rate limit global
- Nunca commitar o JSON da service account (`GOOGLE_APPLICATION_CREDENTIALS`)
