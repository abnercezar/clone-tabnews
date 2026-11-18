# Curadoria diária de notícias

Todo dia às 5h (horário de Brasília) o AgroTab lê os feeds RSS de portais do
agro, escolhe as notícias mais úteis para quem está no campo e escreve um
resumo próprio de cada uma, com uma pergunta para puxar a conversa. Nada vai
ao ar sozinho: as notícias ficam numa fila e um moderador aprova ou descarta
em **/moderacao/noticias** (menu do usuário → "Curadoria de notícias").

Ao aprovar, a notícia vira uma publicação normal no feed, com as tags
escolhidas e o link para a fonte. O texto completo da fonte nunca é copiado:
só o resumo e o link, que manda leitor para quem produziu a notícia.

## Como funciona

1. **Agendamento:** o Vercel Cron (`vercel.json`) chama
   `GET /api/v1/news/curation` às 08:00 UTC, com o cabeçalho
   `Authorization: Bearer <CRON_SECRET>`. Quem tem a feature `review:news`
   também pode disparar na hora pelo botão **Coletar agora**
   (`POST /api/v1/news/curation`).
2. **Coleta:** `models/news-feed.js` baixa cada feed (10 s de limite por
   feed), lê RSS 2.0 e Atom, tira parâmetros de rastreio dos links e fica só
   com as notícias das últimas 36 horas, sem repetir link nem título. Feed
   fora do ar é ignorado e aparece no relatório da coleta.
3. **Curadoria:** `models/news.js` manda até 60 candidatas para o Claude, que
   devolve as melhores (8 por padrão) com título, resumo, pergunta, tags e
   nota de relevância, em JSON validado por schema. Sem `ANTHROPIC_API_KEY`,
   ou se a IA falhar, entra o **modo sem IA**: usa a descrição do próprio
   feed e escolhe as tags por palavras-chave. A tela avisa quando o resumo
   veio desse modo.
4. **Fila:** tudo entra em `news_items` com `status = 'pending'`. O link é
   único, então a mesma notícia nunca entra duas vezes.
5. **Moderação:** `PATCH /api/v1/news/[id]` com `{"action": "publish"}` (e,
   se quiser, `title`, `summary`, `discussion_question`, `tags` editados) ou
   `{"action": "reject"}`.

A publicação sai na conta definida em `NEWS_PUBLISHER_USERNAME` (padrão
`Agrotab`). Se essa conta não existir, sai na conta de quem aprovou.

## Variáveis de ambiente

| Variável                  | Para quê                                                      | Segredo? | Padrão                  |
| ------------------------- | ------------------------------------------------------------- | -------- | ----------------------- |
| `CRON_SECRET`             | Protege a rota do agendador. A Vercel envia no cabeçalho      | **sim**  | sem valor: cron off     |
| `ANTHROPIC_API_KEY`       | Liga os resumos com IA                                        | **sim**  | sem valor: modo sem IA  |
| `NEWS_AI_MODEL`           | Modelo do Claude usado na curadoria                           | não      | `claude-opus-5-5`       |
| `NEWS_DAILY_LIMIT`        | Quantas notícias entram na fila por dia (1 a 20)              | não      | `8`                     |
| `NEWS_PUBLISHER_USERNAME` | Conta que assina as notícias publicadas                       | não      | `Agrotab`               |
| `NEWS_FEEDS`              | Troca a lista de fontes. JSON: `[{"name":"...","url":"..."}]` | não      | lista em `news-feed.js` |

Na Vercel: **Settings → Environment Variables**, crie `CRON_SECRET` (um texto
aleatório longo) e `ANTHROPIC_API_KEY`, e faça o redeploy. Depois rode as
migrations de produção (`npm run migrations:up:production`), que criam a
tabela `news_items` e dão `review:news` a quem já é admin.

## Custo

Uma chamada por dia, com cerca de 60 títulos e descrições curtas de entrada
e 8 resumos de saída. Com o `claude-opus-5-5` (US$ 4 por milhão de tokens de
entrada e US$ 20 por milhão de saída) isso fica em centavos de dólar por dia.
Para gastar ainda menos, use `NEWS_AI_MODEL=claude-haiku-5-5`.

## Fontes padrão

Canal Rural, AgFeed, Notícias Agrícolas, Globo Rural, O Presente Rural,
Portal do Agronegócio, Ministério da Agricultura e Conab. Canal Rural e
AgFeed foram conferidos (RSS 2.0 válido). As outras devem ser conferidas
pelo relatório da primeira coleta (campo `feeds`, ou a mensagem depois de
**Coletar agora**): se alguma não responder, troque ou remova via
`NEWS_FEEDS`.
