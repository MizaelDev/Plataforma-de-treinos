# Ronivon Treinamentos

Sistema para gestÃ£o de academia, personal trainer e artes marciais, com painel administrativo, Ã¡rea do aluno, mensalidades, avaliaÃ§Ãµes fÃ­sicas, treinos, biblioteca de exercÃ­cios, Pix em modo mock/sandbox e redefiniÃ§Ã£o de senha.

## Stack

- Monorepo com npm workspaces
- API: Node.js, Express, TypeScript, Prisma e PostgreSQL
- Web: Next.js, TypeScript e Tailwind CSS
- Mobile: Expo, React Native e TypeScript
- AutenticaÃ§Ã£o: JWT com perfis `ADMIN`, `PROFESSOR` e `ALUNO`

## Estrutura

```txt
apps/
  api/       API Express, Prisma, autenticaÃ§Ã£o, serviÃ§os e rotas
  web/       Painel administrativo e Ã¡rea do aluno
  mobile/    App Expo do aluno
packages/
  shared/    Schemas Zod, tipos e constantes compartilhadas
docs/
  LAUNCH_CHECKLIST.md
```

## SeguranÃ§a e LGPD

- Dados vinculados a `organizationId` para isolamento por organizaÃ§Ã£o.
- PermissÃµes validadas no backend por token e perfil.
- Aluno acessa apenas dados vinculados ao prÃ³prio usuÃ¡rio.
- CPF normalizado com `cpfHash` para evitar busca/unicidade usando CPF puro.
- Logs de auditoria para aÃ§Ãµes importantes.
- Soft delete/inativaÃ§Ã£o em cadastros principais.
- Segredos ficam em `.env`, fora do repositÃ³rio.

Antes de produÃ§Ã£o real, revise criptografia de campos sensÃ­veis, polÃ­tica de retenÃ§Ã£o LGPD, backup, logs, SMTP, domÃ­nio HTTPS e storage privado.

## Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL 14+ ou Docker

## InstalaÃ§Ã£o local

1. Instale dependÃªncias:

```bash
npm install
```

2. Configure variÃ¡veis:

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

## Contas de demonstraÃ§Ã£o

Senha de todas: `123456`

- Admin: `admin@academia.test`
- Professor: `professor@academia.test`
- Aluno: `aluno@academia.test`

Essas contas sÃ£o apenas para demonstraÃ§Ã£o local. Em entrega real, crie usuÃ¡rios prÃ³prios e troque/remova as credenciais de seed.

## Comandos Ãºteis

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
- `POST /dev/payments/:id/approve` somente em desenvolvimento com `PAYMENT_PROVIDER=mock`
- `POST /webhooks/mercadopago`
- `POST /webhooks/payments/:provider`

## Pix

O Pix está preparado com camada de provider. Em desenvolvimento, `PAYMENT_PROVIDER=mock` gera QR Code fictício e permite testar sem dinheiro real.

Fluxo de teste mock:

1. Configure `PAYMENT_PROVIDER=mock`.
2. Gere o Pix em uma mensalidade pendente.
3. Use o botão `Simular pagamento` no painel ou na área do aluno.
4. A API confirma a `PaymentTransaction` e marca a mensalidade como paga.

Para sandbox Mercado Pago:

1. Configure `PAYMENT_PROVIDER=mercado_pago`.
2. Configure `MERCADO_PAGO_ENV=sandbox`.
3. Configure `MERCADO_PAGO_ACCESS_TOKEN`.
4. Configure `API_BASE_URL` com URL pública da API.
5. Cadastre webhook no Mercado Pago para `/webhooks/mercadopago`.
6. Nunca exponha tokens no frontend.

O pagamento manual continua disponível para admin/professor.

## Mídias de exercícios e aulas

Vídeos, GIFs e imagens não devem ser armazenados no Railway nem no PostgreSQL. O banco salva apenas URLs e metadados, como tipo da mídia, provedor, thumbnail, duração, MIME type e tamanho.

Para demonstração, use:

- YouTube não listado
- Vimeo
- URL pública de imagem, GIF ou MP4

Para produção, recomenda-se:

- Bunny.net Stream para vídeos de aulas/cursos
- Cloudflare R2 ou S3 para arquivos
- Supabase Storage para começar com configuração simples
- Vimeo quando precisar de controle maior no player

Para cadastrar uma mídia na Biblioteca de Exercícios:

1. Acesse `Biblioteca`.
2. Escolha `Tipo da mídia`: imagem, GIF, vídeo, link externo ou embed.
3. Escolha o `Provedor`: YouTube, Vimeo, Bunny, R2, Supabase, URL externa ou nenhum.
4. Informe a `URL da mídia`.
5. Informe uma `Thumbnail URL` quando possível.
6. Salve e use o exercício na ficha de treino.

Para cadastrar vídeo de aula/curso pela API, use `POST /courses` com `lessons` contendo:

```json
{
  "title": "Curso de mobilidade",
  "description": "Aulas curtas de mobilidade",
  "lessons": [
    {
      "title": "Mobilidade de quadril",
      "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
      "thumbnailUrl": "https://cdn.exemplo.com/thumb.jpg",
      "videoProvider": "YOUTUBE",
      "durationSeconds": 180,
      "isPreview": true,
      "order": 1
    }
  ]
}
```

Alunos apenas visualizam as mídias vinculadas aos próprios treinos. Chaves de storage nunca devem ir para o frontend.

## RedefiniÃ§Ã£o de senha

O login possui `Esqueci minha senha`. O aluno tambÃ©m recebe link para definir a senha quando o acesso Ã© criado.

Em desenvolvimento, se `SMTP_HOST` estiver vazio, a API imprime o link no console com `[email:dev]`. Em produÃ§Ã£o, configure SMTP real:

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

Veja tambÃ©m [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md).
