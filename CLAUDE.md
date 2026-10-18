# AgroTab — contexto do projeto

AgroTab (https://agrotab.com.br) é uma plataforma comunitária inspirada no TabNews,
voltada ao agronegócio brasileiro. O código **não** é um fork de `tabnews.com.br`: é uma
reimplementação feita acompanhando o curso curso.dev. Trate o TabNews como referência a
adaptar, nunca como fonte para copiar sem avaliar.

## Stack confirmada

- **Next.js 14 (Pages Router)** + React 18 — front-end e rotas de API em `pages/`.
- **PostgreSQL 16** (via `infra/compose.yaml`, imagem `postgres:16.0-alpine3.18`).
- **node-pg-migrate** para migrations em `infra/migrations/`.
- **pg** para acesso ao banco (`infra/database.js`).
- **nodemailer** + Mailcatcher (dev/test) para e-mail.
- **bcryptjs** para hash de senha; **@primer/react** para UI.
- **Jest** para testes (integração + unit), com `tests/orchestrator.js`.
- Node 24.

## Comandos

- `npm run dev` — sobe serviços (Docker), espera o Postgres, roda migrations e `next dev`.
- `npm test` — sobe serviços e roda a suíte Jest (`--runInBand`); `posttest` derruba os serviços.
- `npm run migrations:create -- <nome>` / `npm run migrations:up` / `...:up:dry`.
- `npm run lint:prettier:check` / `lint:prettier:fix` / `lint:eslint:check`.
- Commits via Conventional Commits (commitlint + husky). Opcional: `npm run commit` (commitizen).

> Para auditoria/testes sem colidir com os serviços locais, suba Postgres e Mailcatcher
> isolados em portas alternativas e aponte `POSTGRES_PORT` / `EMAIL_SMTP_PORT` /
> `EMAIL_HTTP_PORT` para elas. Sempre remova os containers de auditoria ao terminar.

## Estrutura

- `infra/` — execução e utilitários: `database.js` (wrapper `pg`), `controller.js`
  (middlewares next-connect + handlers de erro), `errors.js` (classes de erro),
  `email.js`, `webserver.js`, `migrations/`, `scripts/`.
- `models/` — domínio: `user`, `session`, `activation`, `authentication`,
  `authorization`, `password`, `migrator`.
- `pages/` — páginas (`index`, `cadastro/*`) e rotas de API em `pages/api/v1/*`.
- `interface/` — componentes de UI (`DefaultLayout`).
- `tests/` — `integration/`, `unit/` e `orchestrator.js`.

## Convenções obrigatórias

- **Imports absolutos a partir da raiz** (`jsconfig.json`): `infra/...`, `models/...`,
  `tests/...`. Nunca `../../`.
- **Erros de domínio** sempre via classes de `infra/errors.js` (`ValidationError`,
  `NotFoundError`, `ForbiddenError`, `UnauthorizedError`, `ServiceError`,
  `InternalServerError`, `MethodNotAllowedError`), com `message`/`action` em português.
  Nunca `throw new Error(...)` cru nem resposta de erro montada à mão.
- **Rotas de API**: `createRouter()` do next-connect →
  `.use(controller.injectAnonymousOrUser)` → handlers (com
  `controller.canRequest("feature")` quando exigem permissão) →
  `.handler(controller.errorHandlers)`. Toda `feature` nova usada em `canRequest` precisa
  existir em `models/authorization.js` (`availableFeatures`) e ser concedida em algum
  fluxo (`models/user.js`, `models/activation.js`, usuário anônimo em `controller.js`).
- **Saída de dados** passa por `authorization.filterOutput(user, feature, resource)` —
  nunca devolver o objeto do banco cru (evita vazar `password`, `email`, etc.).
- **Migrations**: nome `<timestamp>_descricao.js`. O TabNews usa `down` reversível;
  parte das migrations atuais do AgroTab tem `exports.down = false`. Para migrations novas,
  preferir `down` reversível salvo justificativa.
- **Testes de integração** usam `tests/orchestrator.js`: no `beforeAll`,
  `waitForAllServices()`, `clearDatabase()`, `runPendingMigrations()`. Arquivo espelha a
  rota: `tests/integration/api/v1/<recurso>/<metodo>.test.js`.
- Componentes React funcionais com hooks, sem classes. Textos em português; copy do
  universo do agronegócio.

## Regras de trabalho (do briefing do mantenedor)

- Antes de implementar: ler o código relacionado e preservar o comportamento atual, os
  dados e a compatibilidade. Fazer a menor mudança que resolve o problema.
- **Não** fazer `git push`, `merge`, deploy, nem rodar migrations destrutivas ou
  comandos de limpeza de dados sem autorização explícita.
- **Não** commitar sem autorização quando puder afetar o fluxo de trabalho.
- **Não** expor segredos, credenciais ou tokens; não usar credenciais de produção.
- **Não** declarar uma tarefa concluída se os testes relevantes falharam ou não puderam
  rodar. Não inventar resultados de teste.
- Preservar alterações locais do usuário (nunca apagar/reverter/sobrescrever).

## Equipe de agentes (`.claude/agents/`)

- `agrotab-feature-builder` — backend (migration + model + rota next-connect).
- `agrotab-ui-builder` — páginas/componentes `@primer/react`.
- `agrotab-test-writer` — testes Jest (orchestrator).
- `agrotab-qa-human-tester` — percorre as telas como um usuário e mantém a regressão Jest e o inventário em `tests/qa/inventario.md`. Não altera a aplicação ao achar um defeito.
- `agrotab-code-reviewer` — revisão contra estas convenções antes do commit (read-only).
- `agrotab-architect` — análise de arquitetura, dependências e riscos (read-only).
- `agrotab-product` — necessidades do público agro e priorização (read-only).
- `agrotab-tabnews-watcher` — compara o upstream TabNews e propõe oportunidades (read-only).

Para trabalho de escrita em paralelo, isolar por git worktree ou serializar, evitando que
dois agentes editem os mesmos arquivos. O `agrotab-code-reviewer` avalia de forma
independente.
