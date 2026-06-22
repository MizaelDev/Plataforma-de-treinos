# Academia Platform

Base profissional para um sistema de gestao de academias, personal trainers e artes marciais.

## Stack

- Monorepo npm workspaces
- API: Node.js, Express, TypeScript, Prisma e PostgreSQL
- Web admin: Next.js, TypeScript e Tailwind CSS
- Mobile aluno: Expo, React Native e TypeScript
- Auth: JWT com RBAC por `ADMIN`, `PROFESSOR` e `ALUNO`

## Estrutura

```txt
apps/
  api/       API Express, Prisma, auth, servicos e rotas
  web/       Painel administrativo Next.js
  mobile/    App Expo do aluno
packages/
  shared/    Schemas Zod, tipos e constantes compartilhadas
```

## Seguranca e LGPD desde o MVP

- Dados operacionais sempre associados a `organizationId` para isolamento multi-tenant.
- RBAC no backend com middlewares de autenticacao e permissao.
- CPF normalizado e `cpfHash` com HMAC para unicidade/busca sem usar CPF puro como chave.
- `AuditLog` para rastrear criacao, edicao, exclusao logica e pagamentos.
- Soft delete em alunos e planos.
- `.env` separado do codigo para segredos de JWT, CPF e banco.
- Estrutura de storage preparada via `photoUrl`, `STORAGE_PROVIDER` e `STORAGE_BUCKET`.

Para producao, evoluir para criptografia de campos sensiveis em repouso, refresh tokens, politica de retencao, consentimento LGPD, logs imutaveis e storage privado com URLs assinadas.

## Requisitos

- Node.js 20+
- PostgreSQL 14+ ou Docker
- npm 10+

## Como rodar

1. Instale dependencias:

```bash
npm install
```

2. Configure ambiente:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Suba o PostgreSQL local:

```bash
docker compose up -d
```

Se preferir usar PostgreSQL ja instalado, crie o banco manualmente e ajuste `DATABASE_URL` no `.env`.

4. Gere Prisma, rode migrations e seed:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

5. Suba a API:

```bash
npm run dev:api
```

6. Suba o painel web:

```bash
npm run dev:web
```

7. Suba o app mobile:

```bash
npm run dev:mobile
```

## Contas de demonstracao

Senha de todas: `123456`

- Admin: `admin@academia.test`
- Professor: `professor@academia.test`
- Aluno: `aluno@academia.test`

## Rotas principais

- `POST /auth/login`
- `GET /auth/me`
- `GET /dashboard/admin`
- `GET /dashboard/student`
- `GET|POST|PATCH|DELETE /students`
- `GET|POST|PATCH|DELETE /plans`
- `GET|POST|PATCH|DELETE /invoices`
- `POST /invoices/:id/pay`
- `POST /invoices/student-plans`

## Fase 1 implementada

- Monorepo inicial.
- API com Prisma, PostgreSQL, JWT e RBAC.
- Modelos iniciais para usuarios, organizacao, alunos, planos, vinculo de plano, mensalidades, configuracoes financeiras e auditoria.
- CRUD inicial de alunos, planos e mensalidades.
- Dashboard administrativo.
- Dashboard do aluno no app mobile.
- Seed com dados de teste.

## Fora da Fase 1

Avaliacoes fisicas, treinos, frequencia, chat, IA de treino, certificados, assinatura digital, WhatsApp real, pagamento online real, videos, ranking avancado, graduacao/faixas e relatorios avancados.
