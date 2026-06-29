# Deploy da API no Railway

Este guia sobe somente a API. O painel web pode ficar em outro serviço depois, como Vercel, Render ou outro projeto Railway.

## 1. Pré-requisitos

- Código publicado em um repositório GitHub.
- Conta no Railway.
- Conta Mercado Pago Developers.
- PostgreSQL criado no Railway.

## 2. Criar projeto

1. Acesse `https://railway.com`.
2. Clique em `New Project`.
3. Escolha `Deploy from GitHub repo`.
4. Selecione o repositório `academia-platform`.
5. Crie também um serviço `PostgreSQL` no mesmo projeto.

## 3. Variáveis da API

No serviço da API, configure:

```env
NODE_ENV=production
JWT_SECRET=gere-um-segredo-forte-com-32-caracteres-ou-mais
CPF_HASH_SECRET=gere-outro-segredo-forte-com-32-caracteres-ou-mais
CORS_ORIGIN=https://seu-painel.com
PUBLIC_APP_URL=https://seu-painel.com
API_BASE_URL=https://sua-api.up.railway.app

PAYMENT_PROVIDER=mercado_pago
MERCADO_PAGO_ENV=sandbox
MERCADO_PAGO_ACCESS_TOKEN=seu_access_token
MERCADO_PAGO_WEBHOOK_SECRET=segredo_do_webhook

SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_USER=usuario
SMTP_PASS=senha
SMTP_FROM=Ronivon Treinamentos <no-reply@seudominio.com>
```

O Railway fornece `DATABASE_URL` automaticamente quando o serviço da API está ligado ao PostgreSQL.

## 4. Build, migration e start

O arquivo `railway.json` já configura:

- build: `npm run railway:build`
- migration antes do deploy: `npm run db:deploy`
- start: `npm run railway:start`
- healthcheck: `/health`

## 5. Domínio

Para teste, use o domínio gerado pelo Railway.

Para domínio próprio:

1. No serviço da API, vá em `Settings` > `Networking`.
2. Adicione um domínio, por exemplo `api.ronivontreinamentos.com`.
3. No DNS do domínio, crie o registro indicado pelo Railway.
4. Atualize `API_BASE_URL` com o domínio final.

## 6. Webhook Mercado Pago

Cadastre no Mercado Pago:

```txt
https://sua-api.up.railway.app/webhooks/mercadopago
```

ou, com domínio próprio:

```txt
https://api.ronivontreinamentos.com/webhooks/mercadopago
```

Evento: `Pagamentos`.

Depois copie o segredo do webhook para `MERCADO_PAGO_WEBHOOK_SECRET`.

## 7. Teste final

1. Abra `https://sua-api/health`.
2. Confirme resposta `{ "status": "ok" }`.
3. Faça login no painel.
4. Crie uma mensalidade pendente.
5. Gere Pix.
6. Pague/teste no Mercado Pago.
7. Verifique se a mensalidade muda para paga.
