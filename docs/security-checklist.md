# Checklist de segurança — AgroTab

Auditoria focada no estágio atual (authz/IDOR, economia TabCoins/TabCash, Markdown/XSS).
Não é certificação nem garantia “à prova de hacker”.

Automatizado no CI: `npm run security:checklist` + `npm run security:audit`
(workflow `.github/workflows/security.yaml`). Dependabot: `.github/dependabot.yml`.

## Authz / IDOR

- [x] Rotas mutáveis usam `controller.canRequest("feature")`.
- [x] Respostas de domínio passam por `authorization.filterOutput` (nunca objeto cru do banco).
- [x] `PATCH /users/[username]`: rejeita `id` e campos desconhecidos no corpo (regressão P0).
- [x] `DELETE` de conteúdo/patrocínio só pelo dono.
- [x] `GET /users/[username]` público não vaza `email` nem `password`.
- [x] `GET /api/v1/user` (self) inclui `email`/saldos, nunca `password`.
- [ ] Revisar rotas novas neste checklist antes do merge.

## Economia (TabCoins / TabCash)

- [x] Anônimo e sem `update:content` não votam.
- [x] Auto-voto bloqueado (autor ≠ votante).
- [x] Saldo insuficiente → 422; ledger append-only.
- [x] Transação `SERIALIZABLE` no voto + retry de serialização.
- [x] Teto 3 votos / 72h por IP e por usuário no mesmo conteúdo.
- [x] Publicação `type=ad` consome TabCash (Revenue Share básico).
- [ ] Prestige/reverter saldo no delete (dívida P1, se ainda aberta).

## Markdown / XSS

- [x] Corpo de conteúdo/comentário renderizado como texto React (sem `dangerouslySetInnerHTML`).
- [x] Editor ByteMD é write-only; preview do viewer ainda não injeta HTML.
- [ ] Ao adicionar viewer Markdown HTML: usar sanitizer (`rehype-sanitize` ou equivalente) e teste de regressão XSS.
- [ ] KaTeX/Mermaid no viewer: só após sanitização e CSP revisada.

## Dependências e CI

- [x] Dependabot semanal (npm + GitHub Actions).
- [x] `npm audit --omit=dev` no CI; **critical** bloqueia salvo allowlist documentada.
- [x] Allowlist em `.github/security-audit-allowlist.json` com `expires` (hoje: Next 14 / Windows+AVIF).
- [ ] Planejar upgrade de Next (15/16) e nodemailer major para limpar high/critical.
- [ ] Confirmar em produção: sem `next/image` remota com AVIF não confiável; deploy Linux (não Windows self-host).

## Notificações sociais (e-mail)

- [x] Destinatário só do banco (`owner_id` do `parent_id`); nunca do body.
- [x] Sem auto-notificação; só o pai direto (não fan-out da thread).
- [x] HTML do e-mail com escape de conteúdo do usuário.
- [x] Falha de SMTP não impede o `201` do comentário (após COMMIT).
- [ ] Preferências de opt-out (ainda não existem).
- [ ] Outbox/cron se retry automático for necessário.

## Operação

- [ ] Segredos só em env (Vercel); nunca commitados.
- [ ] SMTP de produção com TLS adequado à porta (465 vs 587).
- [ ] Após merge: `migrations:up:production` antes de confiar na economia em prod.

## Como rodar localmente

```bash
npm run security:checklist
npm run security:audit
npm test   # inclui p0 de segurança e economia
```
