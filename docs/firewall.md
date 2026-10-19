# Firewall de abuso (estilo TabNews)

Proteção Postgres-only contra spam de cadastro e de conteúdo. Conta eventos
por IP; ao estourar o limiar, desativa usuários recentes ou marca conteúdos
com `status = 'firewall'` e registra eventos para revisão de moderadores.

## Regras

| Regra                       | Limiar                  | Side effect                                                             |
| --------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| `create:user`               | ≥ 2 eventos no IP em 5s | Remove features de login/ativação dos `create:user` dos últimos 30 min  |
| `create:content:text_root`  | ≥ 2 em 5s               | Marca publicações dos últimos 10 min como `firewall` e reverte TabCoins |
| `create:content:text_child` | ≥ 2 em 5s               | Idem para comentários                                                   |

## Features

- `read:firewall` — `GET /api/v1/events/firewall/[id]`
- `review:firewall` — `POST /api/v1/moderations/review_firewall/[id]` com `{ "action": "confirm" \| "undo" }`

Ambas entram em `adminFeatures` (seed + `npm run admin:promote`).

## Integração

- `POST /api/v1/users` — após `canRequest("create:user")`, `firewall.canRequest("create:user")`; grava evento `create:user`.
- `POST /api/v1/contents` — escolhe `text_root` / `text_child` conforme `parent_id`.
- Rate-limit in-memory do `controller` continua existindo (camada separada).

## Variável `FIREWALL_ENABLED`

- Ausente ou qualquer valor ≠ `false`: firewall ativo (dev/produção).
- `FIREWALL_ENABLED=false`: middleware passa direto (usado no `npm test` porque o Next sobe em outro processo e as suítes criam vários usuários via HTTP).

## Como testar

```bash
# Suíte completa (firewall desligado no Next)
npm test

# Só os testes do firewall (model + APIs de leitura/revisão)
npx jest --runInBand tests/integration/api/v1/users/firewall.post.test.js \
  tests/integration/api/v1/contents/firewall.post.test.js \
  tests/integration/api/v1/events/firewall \
  tests/integration/api/v1/moderations/review_firewall

# Manual com firewall ligado
npm run dev
# Em outro terminal, cadastre 3 usuários rápidos no mesmo IP → 429 no terceiro
```

## Gaps vs TabNews

1. **Sem Redis** — o TN também é Postgres-only no firewall; o rate-limit do AgroTab continua in-process (não compartilhado entre instâncias).
2. **Sem `deleted_at`** — undo de conteúdo no firewall volta para `published` (TN usa `deleted_at` para distinguir).
3. **E-mails** — templates em texto/HTML simples; TN usa React Email (`firewall.jsx`).
4. **UI de moderação** — só API; TN tem telas de revisão de eventos.
5. **IP `inet`** — AgroTab usa `text`/`varchar` (schema de `events` já existente).
6. **`create:content` legado** — novos eventos usam `text_root` / `text_child`; `prestige` já aceita os três tipos.
7. **Testes HTTP de spam** — no `npm test` o Next sobe com `FIREWALL_ENABLED=false`; o spam é coberto chamando `firewall.canRequest` no processo Jest (funções SQL reais).
