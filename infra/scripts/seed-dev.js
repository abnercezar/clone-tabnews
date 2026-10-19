#!/usr/bin/env node
/**
 * Popula o banco de desenvolvimento com dados agro fictícios
 * (usuários ativados, publicações, comentários, TabCoins/TabCash, anúncio
 * e histórico dos últimos ~60 dias para a página /status).
 *
 * Uso:
 *   npm run seed:dev
 *   npm run seed:dev -- --reset   # limpa o schema e reaplica migrations antes
 *
 * Senha padrão de todas as contas: senha1234
 */
const dotenv = require("dotenv");
const dotenvExpand = require("dotenv-expand");
// override: true evita herdar POSTGRES_PORT de sessões de teste isoladas
dotenvExpand.expand(
  dotenv.config({ path: ".env.development", override: true }),
);

const { execSync } = require("node:child_process");
const { Client } = require("pg");
const bcryptjs = require("bcryptjs");

const DEFAULT_PASSWORD = "senha1234";
const shouldReset = process.argv.includes("--reset");

const ACTIVATED_FEATURES = [
  "create:session",
  "read:session",
  "update:user",
  "create:content",
  "read:content",
  "update:content",
  "delete:content",
  "create:sponsorship",
  "read:sponsorship",
  "read:recovery_token",
];

const ADMIN_FEATURES = [
  ...ACTIVATED_FEATURES,
  "update:user:others",
  "delete:content:others",
  "update:content:others",
  "create:migration",
  "read:migration",
  "read:status:all",
  "read:user:list",
  "ban:user",
];

const USERS = [
  {
    username: "admin",
    email: "admin@agrotab.local",
    tabcoins: 100,
    tabcash: 500,
    daysAgo: 60,
    features: ADMIN_FEATURES,
  },
  {
    username: "produtorsoja",
    email: "produtorsoja@agrotab.local",
    tabcoins: 24,
    tabcash: 150,
    daysAgo: 55,
  },
  {
    username: "tecnicoagrario",
    email: "tecnico@agrotab.local",
    tabcoins: 18,
    tabcash: 40,
    daysAgo: 50,
  },
  {
    username: "pecuaristago",
    email: "pecuaria@agrotab.local",
    tabcoins: 12,
    tabcash: 20,
    daysAgo: 42,
  },
  {
    username: "consultoramilho",
    email: "milho@agrotab.local",
    tabcoins: 8,
    tabcash: 10,
    daysAgo: 35,
  },
  {
    username: "jornaleirarural",
    email: "jornal@agrotab.local",
    tabcoins: 6,
    tabcash: 5,
    daysAgo: 28,
  },
  {
    username: "irrigantemg",
    email: "irrigante@agrotab.local",
    tabcoins: 14,
    tabcash: 30,
    daysAgo: 20,
  },
  {
    username: "apicultoraba",
    email: "apicultura@agrotab.local",
    tabcoins: 10,
    tabcash: 15,
    daysAgo: 12,
  },
  {
    username: "silvicultorpr",
    email: "silvicultura@agrotab.local",
    tabcoins: 9,
    tabcash: 12,
    daysAgo: 5,
  },
  // Contas “banidas” só para o grafo de status (❌), como no TabNews.
  {
    username: "spamagro01",
    email: "spam01@agrotab.local",
    tabcoins: 0,
    tabcash: 0,
    daysAgo: 30,
    nuked: true,
  },
  {
    username: "spamagro02",
    email: "spam02@agrotab.local",
    tabcoins: 0,
    tabcash: 0,
    daysAgo: 22,
    nuked: true,
  },
  {
    username: "spamagro03",
    email: "spam03@agrotab.local",
    tabcoins: 0,
    tabcash: 0,
    daysAgo: 15,
    nuked: true,
  },
];

const POSTS = [
  {
    owner: "produtorsoja",
    title: "Manejo de pragas no milho safrinha",
    daysAgo: 48,
    body: [
      "Monitoramento semanal da lagarta-do-cartucho.",
      "",
      "Use armadilhas de feromônio e faça a rotação de princípios ativos.",
      "Quem já testou o manejo integrado nesta safra? Compartilhem resultados práticos da lavoura.",
    ].join("\n"),
  },
  {
    owner: "tecnicoagrario",
    title: "Calagem e gessagem: quando fazer cada uma",
    daysAgo: 40,
    body: [
      "Calagem corrige acidez e eleva saturação por bases.",
      "Gessagem leva cálcio e enxofre às camadas mais profundas do perfil.",
      "Antes de aplicar, analise o solo em duas profundidades e planeje a dose com critério técnico.",
    ].join("\n"),
  },
  {
    owner: "pecuaristago",
    title: "Pasto degradado: recuperação com baixo custo",
    daysAgo: 33,
    body: [
      "Primeiro passo: avaliar cobertura e invasoras na área.",
      "Depois, ajustar lotação e fazer adubação estratégica de manutenção.",
      "Em casos graves, o overlap de sementes forrageiras pode acelerar a recuperação do pasto.",
    ].join("\n"),
  },
  {
    owner: "consultoramilho",
    title: "Irrigação por pivô: como evitar desperdício de água",
    daysAgo: 25,
    body: [
      "Sensores de umidade e curva de retenção ajudam a definir o momento certo de irrigar.",
      "Verifique uniformidade do pivô e perda por evaporação em horários de pico.",
      "Pequenos ajustes de lâmina e velocidade reduzem custo energético e preservam o recurso hídrico.",
    ].join("\n"),
  },
  {
    owner: "jornaleirarural",
    title: "Mercado de soja: o que observar nesta semana",
    daysAgo: 18,
    body: [
      "Acompanhe prêmios no porto, câmbio e clima nas regiões produtoras.",
      "Para quem guarda produção, o custo de armazenagem precisa entrar na conta do preço alvo.",
      "Compartilhem estratégias de comercialização que estão funcionando na prática.",
    ].join("\n"),
  },
  {
    owner: "irrigantemg",
    title: "Energia solar no pivô: payback na prática",
    daysAgo: 14,
    body: [
      "Instalei 40 kWp na fazenda e o pivô passou a trabalhar fora do horário de ponta.",
      "O payback estimado ficou em menos de cinco anos com a tarifa atual.",
      "Quem já negociou contrato de demanda com a concessionária?",
    ].join("\n"),
  },
  {
    owner: "apicultoraba",
    title: "Florada de angico e manejo das caixas",
    daysAgo: 9,
    body: [
      "A florada veio forte este ano no sertão.",
      "Dividi as colônias mais populosas e reforçei a alimentação proteica.",
      "Produção de mel e pólen subiu juntos — alguém usa melgueira europeia por aqui?",
    ].join("\n"),
  },
  {
    owner: "silvicultorpr",
    title: "Desbaste de eucalipto: quando antecipar",
    daysAgo: 3,
    body: [
      "Antecipei o segundo desbaste por causa do vento na região.",
      "O diâmetro médio melhorou e reduzi o risco de tombamento.",
      "Compartilho a planilha de estoque se alguém quiser adaptar.",
    ].join("\n"),
  },
];

const COMMENTS = [
  {
    postTitle: "Manejo de pragas no milho safrinha",
    owner: "tecnicoagrario",
    daysAgo: 47,
    body: "Na minha região a rotação de ativos fez diferença. Monitoramento semanal é obrigatório.",
  },
  {
    postTitle: "Manejo de pragas no milho safrinha",
    owner: "consultoramilho",
    daysAgo: 46,
    body: "Armadilha de feromônio ajudou a antecipar o pico. Vale combinar com amostragem de cartucho.",
  },
  {
    postTitle: "Calagem e gessagem: quando fazer cada uma",
    owner: "produtorsoja",
    daysAgo: 39,
    body: "Fiz análise em 0-20 e 20-40. A gessagem melhorou a raiz em anos secos.",
  },
  {
    postTitle: "Pasto degradado: recuperação com baixo custo",
    owner: "jornaleirarural",
    daysAgo: 32,
    body: "Bom roteiro. Falta falar de cercas e descanso do piquete no primeiro ciclo.",
  },
  {
    postTitle: "Energia solar no pivô: payback na prática",
    owner: "produtorsoja",
    daysAgo: 13,
    body: "Aqui o payback veio em 4,5 anos. O segredo foi negociar a demanda contratada.",
  },
  {
    postTitle: "Florada de angico e manejo das caixas",
    owner: "tecnicoagrario",
    daysAgo: 8,
    body: "Melgueira europeia funciona bem se a florada for intensa. Cuidado com a enxameação.",
  },
  {
    postTitle: "Desbaste de eucalipto: quando antecipar",
    owner: "irrigantemg",
    daysAgo: 2,
    body: "Mesma estratégia no cerrado. Vento e densidade alta pedem desbaste antecipado.",
  },
];

const REPLIES = [
  {
    parentBodyIncludes: "rotação de ativos",
    owner: "produtorsoja",
    daysAgo: 45,
    body: "Concordo. Sem monitoramento a rotação sozinha não resolve.",
  },
  {
    parentBodyIncludes: "payback veio em 4,5",
    owner: "irrigantemg",
    daysAgo: 12,
    body: "Boa referência. Vou revisar o contrato de demanda este mês.",
  },
];

const AD_POST = {
  owner: "produtorsoja",
  title: "Curso prático de solo e fertilidade no AgroTab",
  body: [
    "Patrocinado: turma aberta para produtores e técnicos.",
    "Conteúdo aplicado sobre análise de solo, calagem, gessagem e adubação de sistemas.",
    "Vagas limitadas para a próxima turma presencial e online.",
  ].join("\n"),
  tabcashCost: 100,
};

const SPONSORSHIP = {
  owner: "jornaleirarural",
  title: "Pitch: ferramenta de cotações para o produtor rural",
  url: "https://agrotab.com.br/sobre",
};

function slugify(title) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}

function daysAgoDate(daysAgo, hour = 12) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - Number(daysAgo || 0));
  date.setUTCHours(hour, (Number(daysAgo) * 7) % 60, 0, 0);
  return date.toISOString();
}

function createClient() {
  return new Client({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
  });
}

async function resetDatabase() {
  console.log("Limpando schema e reaplicando migrations...");
  const client = createClient();
  await client.connect();
  try {
    await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  } finally {
    await client.end();
  }
  execSync("npm run migrations:up", { stdio: "inherit" });
}

async function findUser(client, username) {
  const result = await client.query(
    `SELECT * FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`,
    [username],
  );
  return result.rows[0] || null;
}

async function ensureUser(client, userSeed, passwordHash) {
  const features = userSeed.features
    ? userSeed.features
    : userSeed.nuked
      ? [...ACTIVATED_FEATURES, "nuked"]
      : ACTIVATED_FEATURES;
  const existing = await findUser(client, userSeed.username);
  if (existing) {
    if (userSeed.daysAgo != null) {
      await client.query(
        `
          UPDATE users
          SET
            created_at = $2,
            updated_at = $2,
            features = $3
          WHERE id = $1
        `,
        [existing.id, daysAgoDate(userSeed.daysAgo, 9), features],
      );
    }
    existing.features = features;
    console.log(`  · usuário já existe: ${userSeed.username}`);
    return existing;
  }

  const createdAt = daysAgoDate(userSeed.daysAgo ?? 0, 9);
  const result = await client.query(
    `
      INSERT INTO users
        (username, email, password, features, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $5)
      RETURNING *
    `,
    [userSeed.username, userSeed.email, passwordHash, features, createdAt],
  );

  console.log(
    `  + usuário criado: ${userSeed.username}${userSeed.nuked ? " (nuked)" : ""}`,
  );
  return result.rows[0];
}

async function grantBalance(client, table, recipientId, amount, originatorId) {
  if (!amount) {
    return;
  }

  await client.query(
    `
      INSERT INTO ${table} (recipient_id, amount, originator_type, originator_id)
      VALUES ($1, $2, 'seed', $3)
    `,
    [recipientId, amount, originatorId],
  );
}

async function findContentByTitle(client, title) {
  const result = await client.query(
    `
      SELECT contents.*, users.username AS owner_username
      FROM contents
      INNER JOIN users ON users.id = contents.owner_id
      WHERE contents.title = $1 AND contents.parent_id IS NULL
      LIMIT 1
    `,
    [title],
  );
  return result.rows[0] || null;
}

async function ensureContent(client, post, owner) {
  const existing = await findContentByTitle(client, post.title);
  const publishedAt = daysAgoDate(post.daysAgo ?? 0, 14);

  if (existing) {
    await client.query(
      `
        UPDATE contents
        SET
          created_at = $2,
          updated_at = $2,
          published_at = $2
        WHERE id = $1
      `,
      [existing.id, publishedAt],
    );
    console.log(`  · publicação já existe: ${post.title}`);
    return { ...existing, published_at: publishedAt };
  }

  let slug = slugify(post.title);
  let suffix = 2;
  let slugTaken = true;
  while (slugTaken) {
    const clash = await client.query(
      `SELECT 1 FROM contents WHERE owner_id = $1 AND slug = $2 LIMIT 1`,
      [owner.id, slug],
    );
    slugTaken = clash.rowCount > 0;
    if (slugTaken) {
      slug = `${slugify(post.title)}-${suffix}`;
      suffix += 1;
    }
  }

  const result = await client.query(
    `
      INSERT INTO contents
        (owner_id, parent_id, slug, title, body, type, status,
         published_at, created_at, updated_at)
      VALUES
        ($1, NULL, $2, $3, $4, 'content', 'published', $5, $5, $5)
      RETURNING *
    `,
    [owner.id, slug, post.title, post.body, publishedAt],
  );

  const created = result.rows[0];

  // Crédito inicial como no publish relevante (+1 conteúdo / +1 autor)
  await client.query(
    `
      INSERT INTO user_tabcoin_operations
        (recipient_id, amount, originator_type, originator_id, created_at)
      VALUES ($1, 1, 'content', $2, $3)
    `,
    [owner.id, created.id, publishedAt],
  );
  await client.query(
    `
      INSERT INTO content_tabcoin_operations
        (balance_type, recipient_id, amount, originator_type, originator_id, created_at)
      VALUES ('initial', $1, 1, 'user', $2, $3)
    `,
    [created.id, owner.id, publishedAt],
  );

  console.log(`  + publicação: ${post.title}`);
  return created;
}

async function ensureComment(client, comment, owner, parent) {
  const publishedAt = daysAgoDate(comment.daysAgo ?? 0, 16);
  const existing = await client.query(
    `
      SELECT *
      FROM contents
      WHERE owner_id = $1
        AND parent_id = $2
        AND body = $3
      LIMIT 1
    `,
    [owner.id, parent.id, comment.body],
  );

  if (existing.rowCount > 0) {
    await client.query(
      `
        UPDATE contents
        SET
          created_at = $2,
          updated_at = $2,
          published_at = $2
        WHERE id = $1
      `,
      [existing.rows[0].id, publishedAt],
    );
    console.log(`  · comentário já existe em: ${parent.title}`);
    return existing.rows[0];
  }

  const title = comment.body.slice(0, 80);
  let slug = slugify(title) || `comentario-${Date.now()}`;
  let suffix = 2;
  let slugTaken = true;
  while (slugTaken) {
    const clash = await client.query(
      `SELECT 1 FROM contents WHERE owner_id = $1 AND slug = $2 LIMIT 1`,
      [owner.id, slug],
    );
    slugTaken = clash.rowCount > 0;
    if (slugTaken) {
      slug = `${slugify(title)}-${suffix}`;
      suffix += 1;
    }
  }

  const result = await client.query(
    `
      INSERT INTO contents
        (owner_id, parent_id, slug, title, body, type, status,
         published_at, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, 'content', 'published', $6, $6, $6)
      RETURNING *
    `,
    [owner.id, parent.id, slug, title, comment.body, publishedAt],
  );

  console.log(`  + comentário de ${owner.username} em: ${parent.title}`);
  return result.rows[0];
}

async function ensureAd(client, usersByName) {
  const owner = usersByName[AD_POST.owner];
  const existing = await findContentByTitle(client, AD_POST.title);
  if (existing) {
    console.log(`  · anúncio já existe: ${AD_POST.title}`);
    return existing;
  }

  const slug = slugify(AD_POST.title);
  const result = await client.query(
    `
      INSERT INTO contents
        (owner_id, parent_id, slug, title, body, type, status, published_at)
      VALUES
        ($1, NULL, $2, $3, $4, 'ad', 'published', timezone('utc', now()))
      RETURNING *
    `,
    [owner.id, slug, AD_POST.title, AD_POST.body],
  );

  const created = result.rows[0];

  await client.query(
    `
      INSERT INTO user_tabcash_operations
        (recipient_id, amount, originator_type, originator_id)
      VALUES ($1, $2, 'content', $3)
    `,
    [owner.id, -AD_POST.tabcashCost, created.id],
  );
  await client.query(
    `
      INSERT INTO ad_tabcash_operations
        (balance_type, recipient_id, amount, originator_type, originator_id)
      VALUES ('budget', $1, $2, 'user', $3)
    `,
    [created.id, AD_POST.tabcashCost, owner.id],
  );

  console.log(`  + anúncio (type=ad): ${AD_POST.title}`);
  return created;
}

async function ensureSponsorship(client, usersByName) {
  const owner = usersByName[SPONSORSHIP.owner];
  const existing = await client.query(
    `
      SELECT 1
      FROM sponsorships
      WHERE owner_id = $1 AND title = $2 AND status = 'published'
      LIMIT 1
    `,
    [owner.id, SPONSORSHIP.title],
  );

  if (existing.rowCount > 0) {
    console.log(`  · patrocínio legado já existe`);
    return;
  }

  await client.query(
    `
      INSERT INTO sponsorships (owner_id, title, url, status)
      VALUES ($1, $2, $3, 'published')
    `,
    [owner.id, SPONSORSHIP.title, SPONSORSHIP.url],
  );
  console.log(`  + patrocínio legado: ${SPONSORSHIP.title}`);
}

function buildStatusVotes(posts, usersByName) {
  const votes = [];
  const activeNames = Object.keys(usersByName).filter(
    (name) => !usersByName[name].features?.includes("nuked"),
  );
  const nukedNames = Object.keys(usersByName).filter((name) =>
    usersByName[name].features?.includes("nuked"),
  );

  // IP único por usuário → sem nós 🌐 (layout orgânico como no TabNews).
  const ipByUser = {};
  Object.keys(usersByName).forEach((name, index) => {
    ipByUser[name] = `203.${40 + index}.${10 + (index % 50)}.${20 + index}`;
  });

  let dayCursor = 50;
  let sequence = 0;

  // Hub: muitos créditos no primeiro post (cluster denso).
  const hub = posts[0];
  if (hub) {
    for (const from of activeNames) {
      if (from === hub.owner_username) {
        continue;
      }
      votes.push({
        postId: hub.id,
        ownerId: hub.owner_id,
        from,
        type: "credit",
        daysAgo: Math.max(1, dayCursor - sequence),
        ip: ipByUser[from],
      });
      sequence += 1;
    }
  }

  // Demais posts: créditos misturados + alguns débitos.
  for (let index = 1; index < posts.length; index += 1) {
    const post = posts[index];
    const voters = activeNames.filter((name) => name !== post.owner_username);
    for (let voteIndex = 0; voteIndex < voters.length; voteIndex += 1) {
      const from = voters[voteIndex];
      votes.push({
        postId: post.id,
        ownerId: post.owner_id,
        from,
        type: voteIndex % 6 === 0 ? "debit" : "credit",
        daysAgo: Math.max(1, dayCursor - sequence - index),
        ip: ipByUser[from],
      });
      sequence += 1;
    }
  }

  // Banidos (❌): recebem vários débitos — como no grafo do TabNews.
  for (const nukedName of nukedNames) {
    const nukedUser = usersByName[nukedName];
    // Usa o hub como conteúdo “alvo” do evento (owner = nuked).
    if (!hub) {
      break;
    }
    for (const from of activeNames.slice(0, 5)) {
      votes.push({
        postId: hub.id,
        ownerId: nukedUser.id,
        from,
        type: "debit",
        daysAgo: Math.max(1, 12 - (sequence % 10)),
        ip: ipByUser[from],
      });
      sequence += 1;
    }
  }

  return votes;
}

async function seedVotes(client, posts, usersByName) {
  const votes = buildStatusVotes(
    posts.map((post) => ({
      ...post,
      owner_username:
        post.owner_username ||
        Object.values(usersByName).find((user) => user.id === post.owner_id)
          ?.username,
    })),
    usersByName,
  );

  let createdCount = 0;

  for (const vote of votes) {
    const voter = usersByName[vote.from];
    if (!voter || voter.id === vote.ownerId) {
      continue;
    }

    const already = await client.query(
      `
        SELECT 1
        FROM events
        WHERE type = 'update:content:tabcoins'
          AND originator_user_id = $1
          AND metadata->>'content_id' = $2
          AND metadata->>'content_owner_id' = $3
          AND metadata->>'transaction_type' = $4
          AND metadata->>'seed' = 'true'
        LIMIT 1
      `,
      [voter.id, vote.postId, vote.ownerId, vote.type],
    );

    if (already.rowCount > 0) {
      continue;
    }

    const amount = vote.type === "credit" ? 1 : -1;
    const createdAt = daysAgoDate(vote.daysAgo, 18);
    const event = await client.query(
      `
        INSERT INTO events
          (type, originator_user_id, originator_ip, metadata, created_at)
        VALUES (
          'update:content:tabcoins',
          $1,
          $2,
          $3::jsonb,
          $4
        )
        RETURNING id
      `,
      [
        voter.id,
        vote.ip,
        JSON.stringify({
          transaction_type: vote.type,
          from_user_id: voter.id,
          content_owner_id: vote.ownerId,
          content_id: vote.postId,
          amount: 2,
          seed: true,
        }),
        createdAt,
      ],
    );

    await client.query(
      `
        INSERT INTO user_tabcoin_operations
          (recipient_id, amount, originator_type, originator_id, created_at)
        VALUES
          ($1, -2, 'event', $3, $5),
          ($2, $4, 'event', $3, $5)
      `,
      [voter.id, vote.ownerId, event.rows[0].id, amount, createdAt],
    );
    await client.query(
      `
        INSERT INTO user_tabcash_operations
          (recipient_id, amount, originator_type, originator_id, created_at)
        VALUES ($1, 1, 'event', $2, $3)
      `,
      [voter.id, event.rows[0].id, createdAt],
    );
    await client.query(
      `
        INSERT INTO content_tabcoin_operations
          (balance_type, recipient_id, amount, originator_type, originator_id, created_at)
        VALUES ($1, $2, $3, 'user', $4, $5)
      `,
      [vote.type, vote.postId, amount, voter.id, createdAt],
    );

    createdCount += 1;
  }

  console.log(`  + ${createdCount} votos espalhados no histórico (/status)`);
}

async function main() {
  if (shouldReset) {
    await resetDatabase();
  }

  const client = createClient();
  await client.connect();

  try {
    console.log("\nSeeding AgroTab (desenvolvimento)...\n");

    const passwordHash = await bcryptjs.hash(DEFAULT_PASSWORD, 8);
    const usersByName = {};

    console.log("Usuários");
    for (const userSeed of USERS) {
      const user = await ensureUser(client, userSeed, passwordHash);
      usersByName[user.username] = user;

      // Saldos base (idempotente: só se o usuário ainda não tem operações de seed)
      const hasSeedBalance = await client.query(
        `
          SELECT 1
          FROM user_tabcoin_operations
          WHERE recipient_id = $1 AND originator_type = 'seed'
          LIMIT 1
        `,
        [user.id],
      );

      if (hasSeedBalance.rowCount === 0) {
        await grantBalance(
          client,
          "user_tabcoin_operations",
          user.id,
          userSeed.tabcoins,
          user.id,
        );
        await grantBalance(
          client,
          "user_tabcash_operations",
          user.id,
          userSeed.tabcash,
          user.id,
        );
        console.log(
          `    saldos: ${userSeed.tabcoins} tabcoins, ${userSeed.tabcash} tabcash`,
        );
      }
    }

    console.log("\nPublicações");
    const posts = [];
    for (const post of POSTS) {
      const created = await ensureContent(
        client,
        post,
        usersByName[post.owner],
      );
      posts.push(created);
    }

    console.log("\nComentários");
    const comments = [];
    for (const comment of COMMENTS) {
      const parent = posts.find((item) => item.title === comment.postTitle);
      const created = await ensureComment(
        client,
        comment,
        usersByName[comment.owner],
        parent,
      );
      comments.push(created);
    }

    console.log("\nRespostas");
    for (const reply of REPLIES) {
      const parent = comments.find((item) =>
        item.body.includes(reply.parentBodyIncludes),
      );
      if (!parent) {
        continue;
      }
      await ensureComment(client, reply, usersByName[reply.owner], parent);
    }

    console.log("\nVotos TabCoins");
    await seedVotes(client, posts, usersByName);

    console.log("\nAnúncio (Revenue Share / type=ad)");
    await ensureAd(client, usersByName);

    console.log("\nPatrocínio legado");
    await ensureSponsorship(client, usersByName);

    console.log("\nPronto.\n");
    console.log("Contas para login (senha de todas: senha1234):");
    for (const userSeed of USERS) {
      console.log(`  - ${userSeed.username} <${userSeed.email}>`);
    }
    console.log("\nAbra http://localhost:3000/status para ver os gráficos.");
    console.log("");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("\nFalha no seed:", error.message);
  process.exit(1);
});
