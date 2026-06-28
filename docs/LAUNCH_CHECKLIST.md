# Checklist de lançamento

Use este checklist antes de apresentar ao cliente ou subir em ambiente público.

## Ambiente

- [ ] Usar Node.js 20+.
- [ ] Configurar PostgreSQL com backup.
- [ ] Configurar `.env` real no servidor.
- [ ] Definir `NODE_ENV=production`.
- [ ] Definir `PUBLIC_APP_URL` com o domínio do painel.
- [ ] Definir `API_BASE_URL` com o domínio público da API.
- [ ] Definir `CORS_ORIGIN` somente com os domínios permitidos.
- [ ] Usar `JWT_SECRET`, `CPF_HASH_SECRET` e `PAYMENT_WEBHOOK_SECRET` fortes.

## Banco

- [ ] Rodar `npm run db:generate`.
- [ ] Rodar migrations com `npm run db:migrate` ou `prisma migrate deploy`.
- [ ] Conferir `npx prisma migrate status --schema apps/api/prisma/schema.prisma`.
- [ ] Criar backup antes de migrações em produção.

## Usuários

- [ ] Criar usuário admin real do dono.
- [ ] Trocar senha das contas demo ou remover dados de seed.
- [ ] Validar login de `ADMIN`, `PROFESSOR` e `ALUNO`.
- [ ] Validar que aluno não acessa painel administrativo.
- [ ] Validar que admin/professor não acessam dados de outra organização.

## E-mail

- [ ] Configurar SMTP real.
- [ ] Testar `Esqueci minha senha`.
- [ ] Testar link de definição de senha para aluno criado.
- [ ] Conferir remetente e domínio.

## Pix

- [ ] Manter `PIX_PROVIDER_MODE=mock` somente em demonstração.
- [ ] Para sandbox, configurar `MERCADO_PAGO_ACCESS_TOKEN` de teste.
- [ ] Para produção, validar credenciais reais e webhook com HTTPS.
- [ ] Confirmar que mensalidade só muda para paga após confirmação segura.
- [ ] Manter pagamento manual funcionando.

## Interface

- [ ] Validar logo, nome da marca e favicon.
- [ ] Testar painel no desktop.
- [ ] Testar área do aluno no celular.
- [ ] Testar cadastro de matrícula completa.
- [ ] Testar alunos, planos, mensalidades, avaliações, treinos e biblioteca.
- [ ] Conferir mensagens de sucesso/erro.

## Segurança/LGPD

- [ ] Não versionar `.env`.
- [ ] Não expor CPF completo onde não for necessário.
- [ ] Não expor tokens, hashes ou secrets no frontend.
- [ ] Conferir política de retenção de dados sensíveis.
- [ ] Configurar HTTPS.
- [ ] Configurar logs sem dados sensíveis.

## Comandos finais

```bash
npm run check
npx prisma validate --schema apps/api/prisma/schema.prisma
npx prisma migrate status --schema apps/api/prisma/schema.prisma
```
