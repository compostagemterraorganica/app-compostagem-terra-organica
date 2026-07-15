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

## Backup e clonagem do banco

Copia o banco inteiro de `POSTGRES_URL` para `NEW_POSTGRES_URL` via `pg_dump` + `pg_restore`. Requer [cliente PostgreSQL](https://www.postgresql.org/download/) (`pg_dump`, `pg_restore`) no PATH.

```bash
cd platform/api
# Preencha POSTGRES_URL (origem) e NEW_POSTGRES_URL (destino) no .env
npm run db:backup-restore -- --yes
```

O dump fica em `scripts/backups/postgres-backup-<timestamp>.dump`.

```bash
# Apenas backup (sem restaurar)
npm run db:backup-restore -- --backup-only --yes

# Restaurar um dump existente
npm run db:backup-restore -- --restore-only scripts/backups/arquivo.dump --yes

# Caminho customizado do dump
npm run db:backup-restore -- --output /tmp/meu-backup.dump --yes
```

A restauracao usa `--clean --if-exists`: objetos existentes no destino sao substituidos. O banco de destino ja deve existir (o script nao cria o database).

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

## Amazon S3 (mídia — runtime)

Variáveis em [`.env.example`](.env.example) (seção S3). Credencial: usuário IAM com `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` no bucket.

```bash
cd api
# Preencha S3_BUCKET, S3_PUBLIC_BASE, AWS_REGION e credenciais AWS no .env
npm run test:s3
```

O script valida credenciais, acesso ao bucket, upload de PNG 1x1 em `media/_test/` e leitura pública da URL. Use `S3_TEST_CLEANUP=false` para manter o arquivo de teste.

### Upload de mídia (`POST /media/upload`)

Requer autenticação. Envia imagem direto ao S3; resposta inclui `publicUrl` e `url` (mesmo valor).

```bash
curl -X POST http://localhost:3000/media/upload \
  -H "Cookie: ..." -H "x-csrf-token: ..." \
  -F "image=@foto.jpg"
```

## Amazon SES (e-mail transacional)

Variáveis em [`.env.example`](.env.example): `AWS_REGION`, credenciais AWS (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) e `SES_FROM` (domínio verificado no SES).

```bash
cd api
npm run test:ses
npm run test:ses -- --to destinatario@email.com
```

Usado para códigos de verificação (`POST /auth/send-code`) e convites de usuário. Requer IAM com `ses:SendEmail`.

## Segurança

- Sessão por cookie HttpOnly
- CSRF token (cookie + header `x-csrf-token`)
- Rate limit global
- Nunca commitar chaves AWS ou outros secrets no git

## Logs

Cada requisição gera logs JSON no stdout (Railway: **Deployments → Logs**).

Variáveis:

```env
LOG_LEVEL=debug          # debug | info | warn | error
REQUEST_LOG_BODY=true    # false = não logar corpo JSON
```

Eventos:

| Evento | Quando |
|--------|--------|
| `request.start` | Requisição recebida (method, path, auth, body sanitizado) |
| `request.finish` | Resposta enviada (status, duração, usuário) |
| `request.error` | Erro tratado (stack em 5xx ou com `LOG_LEVEL=debug`) |
| `server.start` | API subiu |

Erros na resposta incluem `requestId` para cruzar com os logs.

Senhas, tokens e códigos são mascarados como `[REDACTED]`.
