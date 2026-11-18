import Anthropic from "@anthropic-ai/sdk";
import database from "infra/database.js";
import { NotFoundError, ServiceError, ValidationError } from "infra/errors.js";
import content from "models/content.js";
import tag, { MAX_TAGS_PER_CONTENT } from "models/tag.js";
import user from "models/user.js";
import validator from "models/validator.js";
import newsFeed from "models/news-feed.js";

// Curadoria diária de notícias do agro:
// 1. coleta os feeds RSS dos portais (models/news-feed.js);
// 2. descarta o que já está na fila;
// 3. escolhe as mais relevantes e escreve resumo próprio (Claude, ou modo
//    sem IA quando ANTHROPIC_API_KEY não está configurada);
// 4. guarda como `pending` em news_items;
// 5. um moderador aprova (vira publicação no feed) ou descarta.

const LOOKBACK_HOURS = 36;
const MAX_CANDIDATES_FOR_AI = 60;
const DEFAULT_DAILY_LIMIT = 8;
const FEED_TIMEOUT_MS = 10000;
const SUMMARY_MAX = 1200;
const QUESTION_MAX = 500;
const DEFAULT_MODEL = "claude-opus-5-5";
const USER_AGENT = "AgroTabBot/1.0 (+https://agrotab.com.br/sobre)";

const DEFAULT_QUESTION =
  "Como isso afeta a sua região ou a sua lavoura? Conte nos comentários.";

// Palavras que ajudam a escolher as tags no modo sem IA.
const TAG_KEYWORDS = {
  soja: /\bsoja\b/,
  milho: /\bmilho\b/,
  cafe: /\bcaf[eé]\b/,
  cana: /\bcana\b|etanol|a[cç][uú]car/,
  algodao: /algod[aã]o/,
  trigo: /\btrigo\b/,
  feijao: /feij[aã]o/,
  hortifruti: /hortali[cç]|hortifr|fruta|tomate|batata|laranja|citros/,
  "pecuaria-de-corte": /\bboi\b|bovin|arroba|pecu[aá]ria de corte|frigor/,
  "pecuaria-de-leite": /\bleite\b|l[aá]cteo/,
  aves: /\baves?\b|frango|\bovos?\b|avicul/,
  suinos: /su[ií]n|\bporco/,
  piscicultura: /pisci|peixe|til[aá]pia|aquicul/,
  "pragas-e-doencas":
    /praga|doen[cç]a|ferrugem|lagarta|percevejo|fungo|v[ií]rus|gripe avi/,
  "solo-e-nutricao": /\bsolo\b|fertiliz|aduba|calc[aá]rio|nutri[cç][aã]o/,
  maquinas: /m[aá]quina|trator|colheitadeira|implemento/,
  mercado: /pre[cç]o|cota[cç]|export|import|mercado|bolsa|safra|conab|usda/,
  gestao: /gest[aã]o|custo|seguro rural|sucess[aã]o/,
  "credito-rural": /cr[eé]dito|plano safra|financiamento|pronaf|juros/,
};

function dailyLimit() {
  const value = Number.parseInt(process.env.NEWS_DAILY_LIMIT, 10);
  if (Number.isInteger(value) && value >= 1 && value <= 20) {
    return value;
  }
  return DEFAULT_DAILY_LIMIT;
}

async function fetchFeed(feed) {
  try {
    const response = await fetch(feed.url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/rss+xml, application/atom+xml, application/xml",
      },
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { feed, items: [], error: `HTTP ${response.status}` };
    }

    const xml = await response.text();
    const items = newsFeed.parseFeed(xml, feed.name);
    return { feed, items, error: items.length ? null : "feed sem itens" };
  } catch (error) {
    return { feed, items: [], error: error?.name || "falha de rede" };
  }
}

async function collect({ feeds = newsFeed.feedsFromEnvironment(), now } = {}) {
  const currentTime = now || new Date();
  const since = new Date(currentTime.getTime() - LOOKBACK_HOURS * 3600 * 1000);
  const results = await Promise.all(feeds.map(fetchFeed));

  const allItems = results.flatMap((result) => result.items);
  const recent = newsFeed.selectRecent(allItems, { since, now: currentTime });
  const fresh = await removeAlreadyQueued(recent);

  return {
    candidates: fresh,
    report: results.map((result) => ({
      name: result.feed.name,
      items: result.items.length,
      error: result.error,
    })),
  };
}

async function removeAlreadyQueued(items) {
  if (items.length === 0) return [];

  const results = await database.query({
    text: `
      SELECT
        source_url
      FROM
        news_items
      WHERE
        source_url = ANY($1::varchar[])
    ;`,
    values: [items.map((item) => item.url)],
  });

  const known = new Set(results.rows.map((row) => row.source_url));
  return items.filter((item) => !known.has(item.url));
}

function guessTags(text, allowedSlugs) {
  const lower = text.toLowerCase();
  const tags = [];
  for (const [slug, pattern] of Object.entries(TAG_KEYWORDS)) {
    if (allowedSlugs.has(slug) && pattern.test(lower)) {
      tags.push(slug);
    }
    if (tags.length >= MAX_TAGS_PER_CONTENT) break;
  }
  return tags;
}

function truncate(text, max) {
  const value = String(text || "").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

// Modo sem IA: usa a descrição do próprio feed e marca para revisão.
function curateWithoutAi(candidates, { limit, allowedSlugs }) {
  return candidates
    .map((item) => {
      const tags = guessTags(`${item.title} ${item.description}`, allowedSlugs);
      return {
        item,
        title: truncate(item.title, 256),
        summary: truncate(item.description || item.title, 600),
        discussion_question: DEFAULT_QUESTION,
        tags,
        relevance: Math.min(10, 3 + tags.length * 2),
        ai_curated: false,
      };
    })
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

const SYSTEM_PROMPT = `Você é o editor da curadoria diária do AgroTab, uma comunidade brasileira de perguntas e respostas para produtores rurais, agrônomos e técnicos.

Você recebe uma lista numerada de notícias recentes de portais do agro. Escolha as mais úteis para quem trabalha no campo: mercado e preços, safra e clima, pragas e doenças, manejo, crédito rural, políticas públicas, pesquisa aplicada. Deixe de fora notícias repetidas, institucionais sem impacto prático, eventos sociais, publicidade e política partidária.

Para cada notícia escolhida:
- title: título claro em português, com no máximo 120 caracteres, sem caixa alta e sem clickbait.
- summary: resumo de 2 a 4 frases com palavras próprias, a partir do título e da descrição fornecidos. Não copie frases da fonte e não invente números, nomes ou fatos que não estejam no texto recebido.
- discussion_question: uma pergunta curta e concreta para puxar a conversa entre produtores (por exemplo, sobre o que estão vendo na lavoura ou na região).
- tags: de 1 a 3 slugs da lista permitida que melhor descrevem a notícia.
- relevance: de 1 a 10, o quanto a notícia importa para quem produz.

Responda só com o JSON pedido.`;

function buildSchema(allowedTagSlugs) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["selected"],
    properties: {
      selected: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "index",
            "title",
            "summary",
            "discussion_question",
            "tags",
            "relevance",
          ],
          properties: {
            index: { type: "integer" },
            title: { type: "string" },
            summary: { type: "string" },
            discussion_question: { type: "string" },
            tags: {
              type: "array",
              items: { type: "string", enum: allowedTagSlugs },
            },
            relevance: { type: "integer" },
          },
        },
      },
    },
  };
}

async function curateWithAi(candidates, { limit, allowedSlugs }) {
  const pool = candidates.slice(0, MAX_CANDIDATES_FOR_AI);
  const allowedTagSlugs = [...allowedSlugs];

  const listing = pool
    .map(
      (item, index) =>
        `[${index}] Fonte: ${item.source_name}\nTítulo: ${item.title}\nDescrição: ${truncate(item.description, 500) || "(sem descrição)"}`,
    )
    .join("\n\n");

  const client = new Anthropic({ timeout: 100000, maxRetries: 1 });

  const response = await client.beta.messages.create({
    model: process.env.NEWS_AI_MODEL || DEFAULT_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: buildSchema(allowedTagSlugs) },
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Escolha até ${limit} notícias.\n\nTags permitidas: ${allowedTagSlugs.join(", ")}\n\n${listing}`,
      },
    ],
  });

  if (
    response.stop_reason === "refusal" ||
    response.stop_reason === "max_tokens"
  ) {
    throw new ServiceError({
      message: "A curadoria com IA não terminou a resposta.",
      action: "A coleta segue no modo sem IA.",
      context: { stop_reason: response.stop_reason },
    });
  }

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  const parsed = JSON.parse(text);

  const used = new Set();
  const curated = [];

  for (const choice of parsed.selected || []) {
    const item = pool[choice.index];
    if (!item || used.has(choice.index)) continue;
    used.add(choice.index);

    const tags = [...new Set(choice.tags || [])]
      .filter((slug) => allowedSlugs.has(slug))
      .slice(0, MAX_TAGS_PER_CONTENT);

    curated.push({
      item,
      title: truncate(choice.title || item.title, 256),
      summary: truncate(choice.summary, SUMMARY_MAX),
      discussion_question: truncate(
        choice.discussion_question || DEFAULT_QUESTION,
        QUESTION_MAX,
      ),
      tags,
      relevance: Math.max(1, Math.min(10, Number(choice.relevance) || 5)),
      ai_curated: true,
    });

    if (curated.length >= limit) break;
  }

  return curated;
}

async function curate(candidates, { limit = dailyLimit() } = {}) {
  const allTags = await tag.findAll();
  const allowedSlugs = new Set(allTags.map((item) => item.slug));

  if (candidates.length === 0) {
    return { curated: [], mode: "none" };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      curated: curateWithoutAi(candidates, { limit, allowedSlugs }),
      mode: "sem_ia",
    };
  }

  try {
    return {
      curated: await curateWithAi(candidates, { limit, allowedSlugs }),
      mode: "ia",
    };
  } catch (error) {
    // Uma falha da IA não pode deixar o dia sem curadoria.
    console.error("[news] curadoria com IA falhou, usando modo sem IA", error);
    return {
      curated: curateWithoutAi(candidates, { limit, allowedSlugs }),
      mode: "sem_ia_fallback",
    };
  }
}

async function enqueue(curatedItems) {
  const created = [];

  for (const curated of curatedItems) {
    const results = await database.query({
      text: `
        INSERT INTO
          news_items (source_name, source_url, original_title, title, summary,
                      discussion_question, tags, relevance, ai_curated,
                      source_published_at)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (source_url) DO NOTHING
        RETURNING
          *
      ;`,
      values: [
        truncate(curated.item.source_name, 120),
        curated.item.url,
        truncate(curated.item.title, 512),
        curated.title,
        curated.summary,
        curated.discussion_question,
        curated.tags,
        curated.relevance,
        curated.ai_curated,
        curated.item.published_at,
      ],
    });

    if (results.rowCount > 0) {
      created.push(results.rows[0]);
    }
  }

  return created;
}

async function runDailyCuration(options = {}) {
  const { candidates, report } = await collect(options);
  const { curated, mode } = await curate(candidates, options);
  const created = await enqueue(curated);

  return {
    mode,
    feeds: report,
    candidates: candidates.length,
    created: created.length,
    items: created,
  };
}

async function findByStatus(status = "pending", { limit = 50 } = {}) {
  if (!["pending", "published", "rejected"].includes(status)) {
    throw new ValidationError({
      message: "Status de notícia inválido.",
      action: "Use pending, published ou rejected.",
    });
  }

  const results = await database.query({
    text: `
      SELECT
        *
      FROM
        news_items
      WHERE
        status = $1
      ORDER BY
        ${status === "pending" ? "relevance DESC, created_at DESC" : "reviewed_at DESC NULLS LAST"}
      LIMIT
        $2
    ;`,
    values: [status, limit],
  });

  return results.rows;
}

async function findPendingForUpdate(id, transaction) {
  validator.uuid(id);

  const results = await database.query(
    {
      text: `
        SELECT
          *
        FROM
          news_items
        WHERE
          id = $1
        FOR UPDATE
      ;`,
      values: [id],
    },
    { transaction },
  );

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "Notícia não encontrada na curadoria.",
      action: "Atualize a lista de notícias pendentes.",
    });
  }

  const item = results.rows[0];
  if (item.status !== "pending") {
    throw new ValidationError({
      message: "Esta notícia já foi revisada.",
      action: "Atualize a lista de notícias pendentes.",
    });
  }

  return item;
}

function buildBody({ summary, discussion_question, source_name, source_url }) {
  const parts = [summary.trim()];
  if (discussion_question && discussion_question.trim()) {
    parts.push(`**Para debater:** ${discussion_question.trim()}`);
  }
  parts.push(`Fonte: [${source_name}](${source_url})`);
  parts.push(
    "_Resumo da curadoria do AgroTab. Leia a notícia completa na fonte._",
  );
  return parts.join("\n\n");
}

async function resolvePublisher(reviewer) {
  const username = process.env.NEWS_PUBLISHER_USERNAME || "Agrotab";
  try {
    return await user.findOneByUsername(username);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return reviewer;
    }
    throw error;
  }
}

function readEdits(input = {}) {
  const edits = {};

  if (input.title !== undefined) {
    validator.title(input.title);
    edits.title = input.title.trim();
  }

  if (input.summary !== undefined) {
    if (typeof input.summary !== "string" || !input.summary.trim()) {
      throw new ValidationError({
        message: "O resumo da notícia é obrigatório.",
        action: "Escreva um resumo antes de publicar.",
      });
    }
    if (input.summary.length > SUMMARY_MAX * 2) {
      throw new ValidationError({
        message: `O resumo deve ter no máximo ${SUMMARY_MAX * 2} caracteres.`,
        action: "Encurte o resumo.",
      });
    }
    edits.summary = input.summary.trim();
  }

  if (input.discussion_question !== undefined) {
    if (
      typeof input.discussion_question !== "string" ||
      input.discussion_question.length > QUESTION_MAX
    ) {
      throw new ValidationError({
        message: `A pergunta deve ter no máximo ${QUESTION_MAX} caracteres.`,
        action: "Encurte a pergunta para o debate.",
      });
    }
    edits.discussion_question = input.discussion_question.trim();
  }

  if (input.tags !== undefined) {
    edits.tags = input.tags;
  }

  return edits;
}

async function publish(id, input, reviewer) {
  const edits = readEdits(input);
  const publisher = await resolvePublisher(reviewer);

  return database.withTransaction(async (transaction) => {
    const item = await findPendingForUpdate(id, transaction);
    const merged = { ...item, ...edits };
    const tags = await tag.parseSlugs(merged.tags, { transaction });

    const newContent = await content.create(
      {
        owner_id: publisher.id,
        title: merged.title,
        body: buildBody(merged),
        tags,
      },
      { transaction },
    );

    const results = await database.query(
      {
        text: `
          UPDATE
            news_items
          SET
            title = $2,
            summary = $3,
            discussion_question = $4,
            tags = $5,
            status = 'published',
            content_id = $6,
            reviewed_by = $7,
            reviewed_at = timezone('utc', now()),
            updated_at = timezone('utc', now())
          WHERE
            id = $1
          RETURNING
            *
        ;`,
        values: [
          item.id,
          merged.title,
          merged.summary,
          merged.discussion_question,
          tags,
          newContent.id,
          reviewer.id,
        ],
      },
      { transaction },
    );

    return {
      ...results.rows[0],
      content: {
        id: newContent.id,
        slug: newContent.slug,
        owner_username: publisher.username,
      },
    };
  });
}

async function reject(id, reviewer) {
  return database.withTransaction(async (transaction) => {
    const item = await findPendingForUpdate(id, transaction);

    const results = await database.query(
      {
        text: `
          UPDATE
            news_items
          SET
            status = 'rejected',
            reviewed_by = $2,
            reviewed_at = timezone('utc', now()),
            updated_at = timezone('utc', now())
          WHERE
            id = $1
          RETURNING
            *
        ;`,
        values: [item.id, reviewer.id],
      },
      { transaction },
    );

    return results.rows[0];
  });
}

const news = {
  collect,
  curate,
  enqueue,
  runDailyCuration,
  findByStatus,
  publish,
  reject,
  buildBody,
};

export default news;
