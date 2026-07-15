# Backup API — Terra Organica

Servico que conecta no Postgres da API principal, gera dump SQL + JSON e envia ao S3.

## Setup

```bash
cd platform/api/backup
cp .env.example .env   # preencher POSTGRES_URL e AWS_*
npm install
```

## Comandos

```bash
npm run backup           # backup imediato
npm run backup:validate  # baixa do S3 e confere com o banco
npm start                # sobe HTTP + cron (sexta 22h America/Sao_Paulo)
```

Atalhos a partir de `platform/api`:

```bash
npm run backup:run
npm run backup:validate
npm run backup:start
```

Validacao:

```bash
npm run backup:validate
npm run backup:validate -- --folder 2026-07-15_151921
npm run backup:validate -- --list
```

## Saida no S3

```
s3://$S3_BUCKET/$S3_BACKUP_PREFIX/YYYY-MM-DD_HHmmss/
  database.sql
  database.json
  manifest.json
  tables/<tabela>.json
```

Restaurar SQL:

```bash
psql "$POSTGRES_URL" -f database.sql
```

## HTTP

- `GET /health`
- `POST /backup` — trigger manual (em producao exige `BACKUP_TRIGGER_TOKEN`)
