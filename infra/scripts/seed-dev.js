#!/usr/bin/env node
/**
 * Popula o banco de desenvolvimento com dados agro fictícios
 * (usuários ativados, publicações, comentários, TabCoins/TabCash e um anúncio).
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
];

const USERS = [
  {
    username: "produtorsoja",
    email: "produtorsoja@agrotab.local",
    tabcoins: 24,
    tabcash: 150,
  },
  {
    username: "tecnicoagrario",
    email: "tecnico@agrotab.local",
    tabcoins: 18,
    tabcash: 40,
  },
  {
    username: "pecuaristago",
    email: "pecuaria@agrotab.local",
    tabcoins: 12,
    tabcash: 20,
  },
  {
    username: "consultoramilho",
    email: "milho@agrotab.local",
    tabcoins: 8,
    tabcash: 10,
  },
  {
    username: "jornaleirarural",
    email: "jornal@agrotab.local",
    tabcoins: 6,
    tabcash: 5,
  },
];

const POSTS = [
  {
    owner: "produtorsoja",
    title: "Manejo de pragas no milho safrinha",
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
    body: [
      "Calagem corrige acidez e eleva saturação por bases.",
      "Gessagem leva cálcio e enxofre às camadas mais profundas do perfil.",
      "Antes de aplicar, analise o solo em duas profundidades e planeje a dose com critério técnico.",
    ].join("\n"),
  },
  {
    owner: "pecuaristago",
    title: "Pasto degradado: recuperação com baixo custo",
    body: [
      "Primeiro passo: avaliar cobertura e invasoras na área.",
      "Depois, ajustar lotação e fazer adubação estratégica de manutenção.",
      "Em casos graves, o overlap de sementes forrageiras pode acelerar a recuperação do pasto.",
    ].join("\n"),
  },
  {
    owner: "consultoramilho",
    title: "Irrigação por pivô: como evitar desperdício de água",
    body: [
      "Sensores de umidade e curva de retenção ajudam a definir o momento certo de irrigar.",
      "Verifique uniformidade do pivô e perda por evaporação em horários de pico.",
      "Pequenos ajustes de lâmina e velocidade reduzem custo energético e preservam o recurso hídrico.",
    ].join("\n"),
  },
  {
    owner: "jornaleirarural",
    title: "Mercado de soja: o que observar nesta semana",
    body: [
      "Acompanhe prêmios no porto, câmbio e clima nas regiões produtoras.",
      "Para quem guarda produção, o custo de armazenagem precisa entrar na conta do preço alvo.",
      "Compartilhem estratégias de comercialização que estão funcionando na prática.",
    ].join("\n"),
  },
];

const COMMENTS = [
  {
    postTitle: "Manejo de pragas no milho safrinha",
    owner: "tecnicoagrario",
    body: "Na minha região a rotação de ativos fez diferença. Monitoramento semanal é obrigatório.",
  },
  {
    postTitle: "Manejo de pragas no milho safrinha",
    owner: "consultoramilho",
    body: "Armadilha de feromônio ajudou a antecipar o pico. Vale combinar com amostragem de cartucho.",
  },
  {
    postTitle: "Calagem e gessagem: quando fazer cada uma",
    owner: "produtorsoja",
    body: "Fiz análise em 0-20 e 20-40. A gessagem melhorou a raiz em anos secos.",
  },
  {
    postTitle: "Pasto degradado: recuperação com baixo custo",
    owner: "jornaleirarural",
    body: "Bom roteiro. Falta falar de cercas e descanso do piquete no primeiro ciclo.",
  },
];

const REPLIES = [
  {
    parentBodyIncludes: "rotação de ativos",
    owner: "produtorsoja",
    body: "Concordo. Sem monitoramento a rotação sozinha não resolve.",
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
  const existing = await findUser(client, userSeed.username);
  if (existing) {
    console.log(`  · usuário já existe: ${userSeed.username}`);
    return existing;
  }

  const result = await client.query(
    `
      INSERT INTO users (username, email, password, features)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [userSeed.username, userSeed.email, passwordHash, ACTIVATED_FEATURES],
  );

  console.log(`  + usuário criado: ${userSeed.username}`);
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
  if (existing) {
    console.log(`  · publicação já existe: ${post.title}`);
    return existing;
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
        (owner_id, parent_id, slug, title, body, type, status, published_at)
      VALUES
        ($1, NULL, $2, $3, $4, 'content', 'published', timezone('utc', now()))
      RETURNING *
    `,
    [owner.id, slug, post.title, post.body],
  );

  const created = result.rows[0];

  // Crédito inicial como no publish relevante (+1 conteúdo / +1 autor)
  await client.query(
    `
      INSERT INTO user_tabcoin_operations
        (recipient_id, amount, originator_type, originator_id)
      VALUES ($1, 1, 'content', $2)
    `,
    [owner.id, created.id],
  );
  await client.query(
    `
      INSERT INTO content_tabcoin_operations
        (balance_type, recipient_id, amount, originator_type, originator_id)
      VALUES ('initial', $1, 1, 'user', $2)
    `,
    [created.id, owner.id],
  );

  console.log(`  + publicação: ${post.title}`);
  return created;
}

async function ensureComment(client, comment, owner, parent) {
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
        (owner_id, parent_id, slug, title, body, type, status, published_at)
      VALUES
        ($1, $2, $3, $4, $5, 'content', 'published', timezone('utc', now()))
      RETURNING *
    `,
    [owner.id, parent.id, slug, title, comment.body],
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

async function seedVotes(client, posts, usersByName) {
  // Alguns créditos/débitos para deixar o feed com TabCoins variados
  const votes = [
    {
      postTitle: "Manejo de pragas no milho safrinha",
      from: "tecnicoagrario",
      type: "credit",
    },
    {
      postTitle: "Manejo de pragas no milho safrinha",
      from: "pecuaristago",
      type: "credit",
    },
    {
      postTitle: "Calagem e gessagem: quando fazer cada uma",
      from: "produtorsoja",
      type: "credit",
    },
    {
      postTitle: "Pasto degradado: recuperação com baixo custo",
      from: "consultoramilho",
      type: "debit",
    },
  ];

  for (const vote of votes) {
    const post = posts.find((item) => item.title === vote.postTitle);
    const voter = usersByName[vote.from];
    if (!post || !voter) {
      continue;
    }

    const already = await client.query(
      `
        SELECT 1
        FROM events
        WHERE type = 'update:content:tabcoins'
          AND originator_user_id = $1
          AND metadata->>'content_id' = $2
        LIMIT 1
      `,
      [voter.id, post.id],
    );

    if (already.rowCount > 0) {
      continue;
    }

    const amount = vote.type === "credit" ? 1 : -1;
    const event = await client.query(
      `
        INSERT INTO events (type, originator_user_id, originator_ip, metadata)
        VALUES (
          'update:content:tabcoins',
          $1,
          '127.0.0.1',
          $2::jsonb
        )
        RETURNING id
      `,
      [
        voter.id,
        JSON.stringify({
          transaction_type: vote.type,
          from_user_id: voter.id,
          content_owner_id: post.owner_id,
          content_id: post.id,
          amount: 2,
          seed: true,
        }),
      ],
    );

    await client.query(
      `
        INSERT INTO user_tabcoin_operations
          (recipient_id, amount, originator_type, originator_id)
        VALUES
          ($1, -2, 'event', $3),
          ($2, $4, 'event', $3)
      `,
      [voter.id, post.owner_id, event.rows[0].id, amount],
    );
    await client.query(
      `
        INSERT INTO user_tabcash_operations
          (recipient_id, amount, originator_type, originator_id)
        VALUES ($1, 1, 'event', $2)
      `,
      [voter.id, event.rows[0].id],
    );
    await client.query(
      `
        INSERT INTO content_tabcoin_operations
          (balance_type, recipient_id, amount, originator_type, originator_id)
        VALUES ($1, $2, $3, 'user', $4)
      `,
      [vote.type, post.id, amount, voter.id],
    );

    console.log(`  + voto ${vote.type} de ${vote.from} em "${vote.postTitle}"`);
  }
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
    console.log("");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("\nFalha no seed:", error.message);
  process.exit(1);
});
