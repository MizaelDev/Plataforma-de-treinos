# Checklist de lanÃ§amento

Use este checklist antes de apresentar ao cliente ou subir em ambiente pÃºblico.

## Ambiente

- [ ] Usar Node.js 20+.
- [ ] Configurar PostgreSQL com backup.
- [ ] Configurar `.env` real no servidor.
- [ ] Definir `NODE_ENV=production`.
- [ ] Definir `PUBLIC_APP_URL` com o domÃ­nio do painel.
- [ ] Definir `API_BASE_URL` com o domÃ­nio pÃºblico da API.
- [ ] Definir `CORS_ORIGIN` somente com os domÃ­nios permitidos.
- [ ] Usar `JWT_SECRET`, `CPF_HASH_SECRET` e `PAYMENT_WEBHOOK_SECRET` fortes.

## Banco

- [ ] Rodar `npm run db:generate`.
- [ ] Rodar migrations com `npm run db:migrate` ou `prisma migrate deploy`.
- [ ] Conferir `npx prisma migrate status --schema apps/api/prisma/schema.prisma`.
- [ ] Criar backup antes de migraÃ§Ãµes em produÃ§Ã£o.

## UsuÃ¡rios

- [ ] Criar usuÃ¡rio admin real do dono.
- [ ] Trocar senha das contas demo ou remover dados de seed.
- [ ] Validar login de `ADMIN`, `PROFESSOR` e `ALUNO`.
- [ ] Validar que aluno nÃ£o acessa painel administrativo.
- [ ] Validar que admin/professor nÃ£o acessam dados de outra organizaÃ§Ã£o.

## E-mail

- [ ] Configurar SMTP real.
- [ ] Testar `Esqueci minha senha`.
- [ ] Testar link de definiÃ§Ã£o de senha para aluno criado.
- [ ] Conferir remetente e domÃ­nio.

## Pix

- [ ] Manter `PAYMENT_PROVIDER=mock` somente em demonstração/teste.
- [ ] Para sandbox, configurar `MERCADO_PAGO_ACCESS_TOKEN` de teste.
- [ ] Para produÃ§Ã£o, validar credenciais reais e webhook com HTTPS.
- [ ] Confirmar que mensalidade sÃ³ muda para paga apÃ³s confirmaÃ§Ã£o segura.
- [ ] Manter pagamento manual funcionando.

## Interface

- [ ] Validar logo, nome da marca e favicon.
- [ ] Testar painel no desktop.
- [ ] Testar Ã¡rea do aluno no celular.
- [ ] Testar cadastro de matrÃ­cula completa.
- [ ] Testar alunos, planos, mensalidades, avaliaÃ§Ãµes, treinos e biblioteca.
- [ ] Conferir mensagens de sucesso/erro.

## SeguranÃ§a/LGPD

- [ ] NÃ£o versionar `.env`.
- [ ] NÃ£o expor CPF completo onde nÃ£o for necessÃ¡rio.
- [ ] NÃ£o expor tokens, hashes ou secrets no frontend.
- [ ] Conferir polÃ­tica de retenÃ§Ã£o de dados sensÃ­veis.
- [ ] Configurar HTTPS.
- [ ] Configurar logs sem dados sensÃ­veis.

## Comandos finais

```bash
npm run check
npx prisma validate --schema apps/api/prisma/schema.prisma
npx prisma migrate status --schema apps/api/prisma/schema.prisma
```
