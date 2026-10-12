# Banco de dados

Scripts de **estrutura** do banco (DDL) — criação de tabelas, índices e
constraints. Não contém dados reais.

## Convenção

- Um arquivo por mudança de estrutura, numerado em ordem: `001_criacao_tabelas.sql`, `002_adiciona_coluna_x.sql`, etc.
- Cada script deve poder ser executado do zero, em ordem, para reconstruir o banco inteiro.
- Nunca commitar dump, backup ou export com dados reais de cliente/colaborador (o `.gitignore` já bloqueia `banco/dumps/` e `banco/backups/`).
- Se precisar de dados de exemplo para testar localmente, crie `banco/seeds/` com dados **fictícios** (nunca copiados de produção).

## Como aplicar no Supabase / Postgres local

Pelo painel do Supabase: **SQL Editor** → cole o conteúdo do script → Run.

Ou via `psql`, apontando para o host configurado no `.env`:

```bash
psql "$DATABASE_URL" -f banco/001_criacao_tabelas.sql
```
