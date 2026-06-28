# Ronivon Treinamentos

Sistema para gestão de academia, personal trainer e artes marciais, com painel administrativo, área do aluno, mensalidades, avaliações físicas, treinos, biblioteca de exercícios, Pix em modo mock/sandbox e redefinição de senha.

## Stack

- Monorepo com npm workspaces
- API: Node.js, Express, TypeScript, Prisma e PostgreSQL
- Web: Next.js, TypeScript e Tailwind CSS
- Mobile: Expo, React Native e TypeScript
- Autenticação: JWT com perfis `ADMIN`, `PROFESSOR` e `ALUNO`

## Estrutura

```txt
apps/
  api/       API Express, Prisma, autenticação, serviços e rotas
  web/       Painel administrativo e área do aluno
  mobile/    App Expo do aluno
packages/
  shared/    Schemas Zod, tipos e constantes compartilhadas
docs/
  LAUNCH_CHECKLIST.md
```

## Segurança e LGPD

- Dados vinculados a `organizationId` para isolamento por organização.
- Permissões validadas no backend por token e perfil.
- Aluno acessa apenas dados vinculados ao próprio usuário.
- CPF normalizado com `cpfHash` para evitar busca/unicidade usando CPF puro.
- Logs de auditoria para ações importantes.
- Soft delete/inativação em cadastros principais.
- Segredos ficam em `.env`, fora do repositório.

Antes de produção real, revise criptografia de campos sensíveis, política de retenção LGPD, backup, logs, SMTP, domínio HTTPS e storage privado.

## Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL 14+ ou Docker

## Instalação local

1. Instale dependências:

```bash
npm install
```

2. Configure variáveis:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Suba o banco com Docker:

```bash
docker compose up -d
```

4. Gere Prisma, rode migrations e seed:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

5. Rode API e web:

```bash
npm run dev:api
npm run dev:web
```

API: `http://localhost:3333`  
Web: `http://localhost:3000`

## Contas de demonstração

Senha de todas: `123456`

- Admin: `admin@academia.test`
- Professor: `professor@academia.test`
- Aluno: `aluno@academia.test`

Essas contas são apenas para demonstração local. Em entrega real, crie usuários próprios e troque/remova as credenciais de seed.

## Comandos úteis

```bash
npm run typecheck
npm run build
npm run check
npm run start:api
npm run start:web
```

## Rotas principais

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /dashboard/admin`
- `GET /dashboard/student`
- `GET|POST|PATCH|DELETE /students`
- `POST /enrollments`
- `GET|POST|PATCH|DELETE /plans`
- `GET|POST|PATCH|DELETE /invoices`
- `POST /invoices/:id/pay`
- `GET|POST /assessments`
- `GET|PUT|DELETE /assessments/:id`
- `GET|POST /workouts`
- `GET|PUT|DELETE /workouts/:id`
- `GET|POST /exercises`
- `GET|PUT|DELETE /exercises/:id`
- `POST /payments/pix`
- `GET /payments/:id/status`
- `POST /webhooks/mercadopago`
- `POST /webhooks/payments/:provider`

## Pix Mercado Pago

O Pix está preparado com camada de provider. Em desenvolvimento, `PIX_PROVIDER_MODE=mock` gera QR Code fictício e permite testar sem dinheiro real.

Para sandbox Mercado Pago:

1. Configure `PIX_PROVIDER_MODE=sandbox`.
2. Configure `MERCADO_PAGO_ACCESS_TOKEN`.
3. Configure `API_BASE_URL` com URL pública da API.
4. Cadastre webhook no Mercado Pago para `/webhooks/mercadopago`.
5. Nunca exponha tokens no frontend.

O pagamento manual continua disponível para admin/professor.

## Redefinição de senha

O login possui `Esqueci minha senha`. O aluno também recebe link para definir a senha quando o acesso é criado.

Em desenvolvimento, se `SMTP_HOST` estiver vazio, a API imprime o link no console com `[email:dev]`. Em produção, configure SMTP real:

```env
SMTP_HOST=""
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="Ronivon Treinamentos <no-reply@dominio.com>"
```

## Entrega

Antes de apresentar ou publicar, rode:

```bash
npm run check
npx prisma migrate status --schema apps/api/prisma/schema.prisma
```

Veja também [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md).
