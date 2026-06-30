# Deploy do painel web na Vercel

Este deploy publica apenas o painel web em Next.js.

## 1. Projeto

1. Acesse `https://vercel.com`.
2. Clique em `Add New` > `Project`.
3. Importe o repositório `MizaelDev/Plataforma-de-treinos`.
4. Mantenha o root directory na raiz do repositório.

O arquivo `vercel.json` já configura:

- install: `npm install`
- build: `npm run build -w @academia/shared && npm run build -w @academia/web`
- output: `apps/web/.next`

## 2. Variáveis

Configure na Vercel:

```env
NEXT_PUBLIC_API_URL=https://plataforma-de-treinos-production.up.railway.app
NEXT_PUBLIC_APP_NAME=Ronivon Treinamentos
NEXT_PUBLIC_APP_INITIALS=RT
NEXT_PUBLIC_APP_LOGO_URL=/brand/ronivon-logo.jpeg
NEXT_PUBLIC_APP_ADMIN_SUBTITLE=Gestão administrativa
NEXT_PUBLIC_APP_STUDENT_SUBTITLE=Área do aluno
```

## 3. Ajustar API depois do deploy

Depois que a Vercel gerar a URL do painel, atualize no Railway:

```env
CORS_ORIGIN=https://sua-url.vercel.app
PUBLIC_APP_URL=https://sua-url.vercel.app
```

`API_BASE_URL` deve continuar apontando para a API:

```env
API_BASE_URL=https://plataforma-de-treinos-production.up.railway.app
```

## 4. Teste

1. Abra a URL da Vercel.
2. Faça login.
3. Confirme que o painel consegue chamar a API Railway.
4. Teste login de admin/professor/aluno.
