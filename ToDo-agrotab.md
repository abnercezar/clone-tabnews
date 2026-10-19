# AgroTab — Backlog de trabalho (rastreio)

> Mantido pelo agente principal. Documento de planejamento — não é código de produção.
> Última atualização: 2026-10-17. Fonte: relatório de auditoria (fase de diagnóstico).

## Legenda de status

- ✅ concluída (código + testes + revisão)
- 🟡 em andamento
- ⛔ bloqueada (aguarda aprovação/decisão do mantenedor)
- ⬜ não iniciada

---

## Resumo de estado

| Tarefa                                             | Prioridade          | Status                                         | Depende de              |
| -------------------------------------------------- | ------------------- | ---------------------------------------------- | ----------------------- |
| T1 — Corrigir IDOR do PATCH de usuário             | P0                  | ✅ (aguarda só aprovação p/ commit)            | —                       |
| T1a — Unit test da 2ª camada                       | P0                  | ✅ (revisado e aprovado)                       | T1                      |
| T3 — Página de login (UI)                          | **P0** (produto)    | ✅ (revisado e aprovado)                       | —                       |
| T2 — Validação de entrada (manual, não-quebradora) | P1                  | ✅ (revisado e aprovado)                       | T1                      |
| T2b — Anti-enumeração no cadastro (item 3)         | P1                  | ⛔ muda contrato/teste — proposta pendente     | T2                      |
| T4 — Rate limiting + anti-enumeração               | P1                  | ⛔ decisão de mecanismo + UX                   | T2                      |
| T6 — Base de conteúdo (posts+feed+ler)             | **P0/P1** (produto) | ✅ (revisado + ajustes aplicados)              | T1, T2                  |
| T7 — Comentários                                   | P1                  | ⛔ aprovação de escopo                         | T6                      |
| T8 — Recuperação de senha                          | P1                  | ✅ (fluxo TabNews: e-mail + token 15 min)      | T2                      |
| T5 — pg.Pool + UUID→400                            | P2                  | ⛔ aprovação (infra) — análise pronta: Opção B | análise do architect ✅ |
| T9 — Votos / busca                                 | P2                  | ⛔ validar com volume de conteúdo              | T6                      |
| T10 — Cotações/indicadores                         | P3                  | ⛔ **não construir agora** — validar interesse | —                       |

Testes globais no último run: **15 suítes / 63 testes — 100% verde** (containers isolados).

---

## Detalhe das tarefas

### ✅ T1 — Corrigir IDOR / account takeover no `PATCH /api/v1/users/[username]` (P0)

- **Justificativa:** usuário ativado conseguia sobrescrever qualquer conta injetando `id` no corpo.
- **Arquivos:** `pages/api/v1/users/[username]/index.js`, `models/user.js`, `models/authorization.js`, `tests/integration/api/v1/users/[username]/patch.test.js`, `tests/unit/models/user.test.js`.
- **Critérios de aceitação (atingidos):** corpo com `id`/campos extras → 400; UPDATE usa id do registro autorizado; `password` fora da resposta; testes de regressão provam o ataque bloqueado; suíte verde.
- **Revisão:** `agrotab-code-reviewer` aprovou o diff principal; unit test em revisão.
- **Pendente:** apenas autorização para commit isolado dos 5 arquivos.

### ⛔ T2 — Camada de validação de entrada (P1)

- **Justificativa:** sem validação de formato/limite (senha vazia aceita, username sem regra, email só por coluna). Reforça o T1.
- **Arquivos (previstos):** novo `models/validator.js` (ou validação no controller); uso em `POST /users`, `PATCH /users`, `POST /sessions`, `PATCH /activations/[token_id]`.
- **Dependências:** T1 (feito). **Bloqueio:** decisão Joi (nova dependência → requer autorização) vs. validação manual sem dep.
- **Testes necessários:** senha curta/vazia → 400; username inválido/reservado → 400; email malformado → 400; UUID malformado em activations → **400** (hoje é 500).
- **Risco de regressão:** médio — mexe em rotas usadas por toda a suíte; validar que entradas válidas atuais continuam 200/201.
- **Execução independente:** parcial (independe de T3/T4).

### ⛔ T3 — Página de login (P1)

- **Justificativa:** `/login` é linkado no `DefaultLayout` mas não existe — bloqueio de uso real.
- **Arquivos (previstos):** `pages/login/index.js` (consumindo `POST /api/v1/sessions`); possível ajuste de link no `interface/DefaultLayout`.
- **Dependências:** nenhuma técnica. **Bloqueio:** aprovação de escopo (nova feature de UI).
- **Critérios de aceitação:** login funcional, erro visível em credenciais inválidas, redireciona autenticado; teste de fluxo feliz.
- **Risco de regressão:** baixo (adição de página nova).
- **Execução independente:** sim.

### ⛔ T4 — Rate limiting + anti-enumeração (P1)

- **Justificativa:** sem proteção contra brute-force em `POST /sessions` e `/users`; cadastro revela e-mail existente (400).
- **Dependências:** T2. **Bloqueio:** decisão de mecanismo (em memória simples por IP vs. infra dedicada) + decisão de UX (esconder e-mail existente como o TabNews).
- **Testes necessários:** N falhas → 429; cadastro não revela e-mail existente (se aprovado).
- **Risco de regressão:** médio.
- **Execução independente:** depende de T2.

### ⛔ T5 — Robustez: `pg.Pool` + UUID malformado → 400 (P2)

- **Justificativa:** `pg.Client` por query não escala sob carga/serverless; UUID inválido vira 500 (deveria ser 400).
- **Arquivos (previstos):** `infra/database.js`; parte do UUID junto do T2.
- **Dependências:** análise do `agrotab-architect` (em andamento). **Bloqueio:** aprovação (mudança de infra).
- **Testes necessários:** suíte completa verde com pool; `GET /status` reflete conexões.
- **Risco de regressão:** médio/alto — regressão completa obrigatória.
- **Execução independente:** sim (mas sensível).

### ⛔ T6 — Base de conteúdo (posts/comentários) (P1/P2 — depende da decisão de produto)

- **Justificativa:** núcleo do produto; sem conteúdo o site é só landing.
- **Dependências:** T1, T2. **Bloqueio:** aprovação de escopo de produto (ver análise do `agrotab-product`).
- **Observação:** NÃO copiar o modelo completo de TabCoins/firewall do TabNews nesta fase.

---

## Análises concluídas (read-only) — insumos para decisão

- **Produto (`agrotab-product`):** caminho mínimo de valor = login (UI) → publicar conteúdo → feed → comentar. Login é o gargalo mais barato (backend pronto, falta só a página). Cotações: **não construir agora** — validar interesse via e-mail de ativação (nodemailer já existe). Levantou cold-start (seed editorial), moderação mínima manual e sincronizar a copy da landing (hoje promete 4 pilares sem entrega).
- **Arquitetura (`agrotab-architect`):** recomenda **Opção B** para o T5 — migrar só `query()` para `pg.Pool` (max:3, idleTimeout 30s, connTimeout 10s) + `async-retry` (já é dependência) + `checkForTooManyConnections`, **mantendo `getNewClient()` como Client dedicado** (migrator depende disso). Esforço P-M, reversão trivial (`git checkout infra/database.js`). **Condição antes do go:** revisar assertivas de `tests/integration/api/v1/status/` e o `clearDatabase` (drop schema) com Pool.

## Decisões que exigem aprovação do mantenedor

1. Commit isolado dos 5 arquivos do T1 (sem incluir alterações locais preexistentes).
2. T2: usar **Joi** (instalar dependência) ou validação manual sem dependência nova.
3. T4/UX: cadastro deve **esconder** que o e-mail já existe (como o TabNews) ou manter mensagem clara?
4. T5: autoriza migrar `infra/database.js` para `pg.Pool` (Opção B)?
5. Escopo de produto: confirmar foco (segurança → login → base de conteúdo), adiando cotações.
6. Cold-start: haverá **seed editorial** (mantenedor/convidados publicam os primeiros conteúdos) antes de abrir cadastro em massa?
7. Landing: ajustar a copy para "em construção" honesto enquanto o conteúdo não existe?

## Dívida técnica / notas registradas (não bloqueiam, para depois)

- **TOCTOU no slug** (`models/content.js:buildUniqueSlug`): check-then-insert; sob concorrência do mesmo autor com o mesmo título, o índice único protege a integridade, mas o erro viraria `InternalServerError` 500 em vez de erro de domínio. Aceitável para MVP; depois capturar unique-violation e re-tentar.
- **Import relativo preexistente** em `models/activation.js:6` (`"./authorization.js"`) — fora do padrão de imports absolutos; **não** introduzido pela T6.
- **Bloqueio de CI (lint) em arquivos preexistentes SEUS** (não toquei): `infra/scripts/fetch-curso-lessons.mjs` (`'Map' is not defined`), `pages/cadastro/ativar/[activationTokenId].js` e `pages/cadastro/index.js` (imports não usados). Precisam ser corrigidos antes de um PR passar no CI.

## Estado das tarefas desta rodada

- ✅ T1 (commit `9fddc54`), ✅ T3 (login), ✅ T2 (validação), ✅ T6 (conteúdo + feed) — todas revisadas.
- ⛔ Não autorizadas/bloqueadas: T2b (anti-enumeração), T4, T5, T7 (comentários), T8, T9, T10.

## Prontidão para produção (2026-10-17)

- ✅ `infra/email.js`: `secure` agora segue a porta (`465` = TLS implícito; `587` e demais = STARTTLS). Antes, `NODE_ENV=production` forçava TLS implícito e quebrava SMTP na 587.
- ✅ `package.json`: `build`, `start`, `migrations:up:production` e `migrations:up:production:dry` (leem `.env.production`, já no `.gitignore`; sem o arquivo, usam `DATABASE_URL` do ambiente).
- A primeira migration em produção precisa ser pela CLI: `POST /api/v1/migrations` exige `create:migration`, e nenhum usuário tem essa feature antes de a tabela `users` existir.
- Verificado: `next build` ok, ESLint/Prettier ok, 19 suítes / 90 testes verdes (containers isolados).
- ⛔ Pendente do mantenedor: provisionar Postgres de produção e SMTP com `contato@agrotab.com.br` autorizado; escolher provedor de deploy.
- Diferença vs. TabNews: o TabNews usa Resend em produção; o AgroTab mantém SMTP via nodemailer (sem dependência nova).
- Produção (Vercel) roda `origin/main`, sem o fix do IDOR, sem `/login`, `/cadastro` e `/conteudos`. Branch `fix/patch-user-idor` enviado ao GitHub com os commits pendentes; HEAD verificado (Prettier, ESLint, commitlint, `next build`).
- ⛔ Antes do merge: rodar `npm run migrations:up:production` (cria `contents` e aplica `1792289755375_grant-content-features-to-activated-users`). Depois: PR → CI verde → merge pelo mantenedor.
- ✅ Bug corrigido (não commitado): usuário logado recebia 403 no feed e na leitura, porque `read:content` só existia para o anônimo. A ativação agora concede `read:content` e `create:content`; a migration `1792289755375` concede as duas às contas já ativadas (com `down` reversível). Testes de feed e leitura logados adicionados; 19 suítes / 92 testes verdes.
- ✅ UI alinhada ao TabNews (não commitado), conferida em `interface/components/{Header,ContentList,DefaultLayout,Footer,PastTime}` do upstream: `/` é o feed em lista numerada (grid `min-content 1fr`), metadado "autor · X atrás", cabeçalho com marca + "Recentes" sublinhado, "+" e menu ☰ (usuário, Novo conteúdo, Deslogar), `main` centralizado em 1012px e rodapé com links. A landing antiga foi para `/sobre`; `/conteudos` redireciona para `/` (temporário, em `next.config.js`).
- Diferenças vs. TabNews: sem aba "Relevantes" (feed ainda só por data), sem busca; `PastTime` usa cálculo próprio em vez de `date-fns` (sem dependência nova); posts continuam em `/conteudos/[username]/[slug]` (o TabNews usa `/[username]/[slug]`). O tema usa o `colorMode` do Primer (`auto`/`day`/`night`, gravado em `localStorage`), sem `next-themes`. `/perfil` altera usuário, e-mail e senha pela API que já existia; trocar o e-mail não pede nova ativação.
- ✅ Login e cadastro no layout de `pages/login` e `pages/cadastro` do TabNews (coluna 544px, "Seu Email", placeholders, mostrar/esconder senha, botão largo, links centralizados); rodapé centralizado com `wrap-reverse`. Faltam, por não existirem no AgroTab: aceite de Termos de Uso (não há página de termos), "Esqueceu sua senha?" (não há recuperação de senha) e as abas Publicações/Comentários/Classificados em Recentes.
- ✅ Aplicado o recorte da auditoria de pontuação (não commitado), sem moeda: transação em `infra/database.js` (`withTransaction`), tabela `events`, limite em memória (30/10 min em login e publicação, 20/10 min em cadastro; por processo, não vale entre instâncias da Vercel), exclusão da própria publicação (`delete:content`, status `deleted`), comentários de um nível (`parent_id`, fora do feed), paginação do feed (array + cabeçalhos `X-Total-Count`) e confirmação/primeira publicação só visual.
- ✅ Economia TabCoins/TabCash como no TabNews (não commitado): ledger append-only (`user_tabcoin_operations`, `user_tabcash_operations`, `content_tabcoin_operations`, `ad_tabcash_operations`), crédito na publicação relevante (+1 conteúdo/+1 autor), voto `POST .../tabcoins` (2 TabCoins → 1 TabCash, ±1 no autor/conteúdo, SERIALIZABLE, teto 3 votos/72h por IP e usuário, sem auto-voto), feature `update:content`, saldos no header e em `/api/v1/user`. Patrocínio pago: checkbox em `/publicar` com `type=ad` cobrando 100 TabCash (Revenue Share). Menu "Patrocinar" removido.
- Ainda falta vs. TabNews (ordem do architect): **P1** prestige completo + reverter saldo no delete; **P2** daily reward (`rewarded_at`) + feed Relevantes; **P3** banner aleatório de ads, sunset de `sponsorships`/`/patrocinar`, FAQ/termos (“sem lastro”, Revenue Share em desenvolvimento). Compra com dinheiro real: fora de escopo (igual FAQ do TabNews).
- ✅ Patrocínio gratuito legado (não commitado): tabela `sponsorships` continua existindo para o slot "Contribuindo com". Resposta a comentário em um nível; o editor de comentário usa bytemd.
- Pendente: não há reenvio do e-mail de ativação; com o token expirado, o e-mail fica preso (o TabNews reenvia no login).

## Próxima tarefa recomendada

Depende de você: (a) autorizar o **commit** da economia (P0 + ads básicos) e do restante não commitado; (b) P1 prestige/delete; (c) termos/FAQ antes de falar “moeda” em produção.
