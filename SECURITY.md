# Segurança — AgroTab

Relatos de vulnerabilidade: abra uma issue **privada** no GitHub (Security Advisories) ou escreva para o mantenedor do projeto. Não abra issue pública com PoC explorável.

## Controles atuais

Checklist operacional e escopo da auditoria focada: [docs/security-checklist.md](docs/security-checklist.md).

CI: workflow `Security` (npm audit de produção + checklist estrutural). Dependabot atualiza npm e Actions semanalmente.

## Expectativa

O AgroTab tem controles razoáveis para o estágio atual e regressões nos riscos já mapeados (authz/IDOR, economia, ausência de HTML cru no viewer). Isso **não** equivale a “à prova de hacker”.
