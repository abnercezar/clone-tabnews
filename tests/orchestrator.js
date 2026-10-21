import retry from "async-retry";
import { Faker, pt_BR } from "@faker-js/faker";
import database from "infra/database.js";
import webserver from "infra/webserver.js";
import migrator from "models/migrator.js";
import user from "models/user.js";
import activation from "models/activation.js";
import session from "models/session.js";
import content from "models/content.js";
import balance from "models/balance.js";
import communityQuestion from "models/community-question.js";

const emailHttpUrl = `http://${process.env.EMAIL_HTTP_HOST}:${process.env.EMAIL_HTTP_PORT}`;

// Instância do Faker para dados aleatórios
const faker = new Faker({ locale: pt_BR });

// Aguarda o serviço web estar disponível
async function waitForAllServices() {
  await waitForWebServer();
  await waitForEmailServer();

  async function waitForWebServer() {
    return retry(fetchStatusPage, {
      retries: 100,
      minTimeout: 100,
      maxTimeout: 1000,
    });

    async function fetchStatusPage() {
      const response = await fetch(`${webserver.origin}/api/v1/status`);
      if (response.status !== 200) {
        throw Error();
      }
    }
  }

  async function waitForEmailServer() {
    return retry(fetchEmailPage, {
      retries: 100,
      minTimeout: 100,
      maxTimeout: 1000,
    });

    async function fetchEmailPage() {
      const response = await fetch(emailHttpUrl);
      if (response.status !== 200) {
        throw Error();
      }
    }
  }
}

// A estrutura só é criada uma vez por execução do Jest. Nos arquivos seguintes
// basta esvaziar as tabelas: derrubar o schema e reaplicar as migrations em
// cada arquivo era o que deixava a suíte lenta.
let schemaReady = false;

function quoteIdentifier(name) {
  return `"${String(name).replaceAll('"', '""')}"`;
}

async function listPublicTables() {
  const tables = await database.query({
    text: `
      SELECT
        tablename
      FROM
        pg_tables
      WHERE
        schemaname = 'public'
    ;`,
  });

  return tables.rows.map((row) => row.tablename);
}

async function truncateApplicationTables(tableNames) {
  const truncable = tableNames.filter((name) => name !== "pgmigrations");
  if (truncable.length === 0) {
    return;
  }

  await database.query(
    `TRUNCATE TABLE ${truncable.map(quoteIdentifier).join(", ")} RESTART IDENTITY CASCADE;`,
  );
}

// Limpa os dados de teste. A tabela `pgmigrations` fica, para as migrations
// não rodarem de novo.
async function clearDatabase() {
  const tableNames = await listPublicTables();

  if (!tableNames.includes("pgmigrations")) {
    if (tableNames.length > 0) {
      await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    }
    schemaReady = false;
    return;
  }

  await truncateApplicationTables(tableNames);
}

// Executa as migrations pendentes. Depois da primeira vez na mesma execução,
// o schema já está em dia e a chamada seguinte não reabre o migrator.
async function runPendingMigrations() {
  if (schemaReady) {
    return [];
  }

  const migrated = await migrator.runPendingMigrations();
  schemaReady = true;
  return migrated;
}

// Cria um usuário de teste
async function createUser(userObject) {
  const newUser = await user.create({
    username:
      userObject?.username || faker.internet.username().replace(/[_.-]/g, ""),
    email: userObject?.email || faker.internet.email(),
    password: userObject?.password || "validpassword",
  });

  // Caso o teste solicite, ativa o usuário imediatamente (adiciona feature create:session)
  if (userObject?.activate) {
    const activatedUser = await activation.activateUserByUserId(newUser.id);
    return activatedUser;
  }

  return newUser;
}

// Cria uma sessão de teste
async function createSession(user) {
  return await session.create(user.id);
}

// Cria um conteúdo de teste
async function createContent(contentObject) {
  return await content.create({
    owner_id: contentObject.owner_id,
    title: contentObject?.title || faker.lorem.sentence(),
    body: contentObject?.body || faker.lorem.paragraphs(2),
    parent_id: contentObject?.parent_id,
    type: contentObject?.type,
  });
}

async function createBalance({
  balanceType,
  recipientId,
  amount,
  originatorType = "orchestrator",
  originatorId,
}) {
  return await balance.create({
    balanceType,
    recipientId,
    amount,
    originatorType,
    originatorId: originatorId || recipientId,
  });
}

// Monta um histórico de conteúdos com TabCoins para calibrar o prestígio
// (espelha o helper do TabNews; sem fake timers — backdate via SQL).
async function createPrestige(
  userId,
  {
    rootPrestigeNumerator = 1,
    rootPrestigeDenominator = 4,
    childPrestigeNumerator = 0,
    childPrestigeDenominator = 1,
  } = {},
) {
  if (
    rootPrestigeDenominator < 0 ||
    childPrestigeDenominator < 0 ||
    rootPrestigeDenominator > 20 ||
    childPrestigeDenominator > 20
  ) {
    throw new Error(
      "rootPrestigeDenominator and childPrestigeDenominator must be between 0 and 20",
    );
  }

  const threeDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3);
  const rootContents = [];
  const childContents = [];

  for (let i = 0; i < rootPrestigeDenominator; i++) {
    const created = await createContent({
      owner_id: userId,
      title: faker.lorem.words(3),
      body: faker.lorem.paragraphs(1),
    });
    await backdateContent(
      created.id,
      new Date(threeDaysAgo.getTime() + i * 10),
    );
    rootContents.push(created);
  }

  let parentId = rootContents[0]?.id;

  if (childPrestigeDenominator && !parentId) {
    const parent = await createContent({
      owner_id: userId,
      title: faker.lorem.words(3),
      body: faker.lorem.paragraphs(1),
    });
    await backdateContent(parent.id, threeDaysAgo);
    parentId = parent.id;
  }

  for (let i = 0; i < childPrestigeDenominator; i++) {
    // Mesmo dono do pai: creditOrDebit não gera TabCoins (paridade TN).
    const created = await createContent({
      parent_id: parentId,
      owner_id: userId,
      body: faker.lorem.paragraphs(1),
    });
    await backdateContent(
      created.id,
      new Date(threeDaysAgo.getTime() + (rootPrestigeDenominator + i) * 10),
    );
    childContents.push(created);
  }

  if (rootContents.length) {
    await createBalance({
      balanceType:
        rootPrestigeNumerator > 0
          ? "content:tabcoin:credit"
          : "content:tabcoin:debit",
      recipientId: rootContents[0].id,
      amount: rootPrestigeNumerator,
      originatorType: "orchestrator",
      originatorId: rootContents[0].id,
    });
  }

  if (childContents.length) {
    await createBalance({
      balanceType:
        childPrestigeNumerator + childPrestigeDenominator > 0
          ? "content:tabcoin:credit"
          : "content:tabcoin:debit",
      recipientId: childContents[0].id,
      amount: childPrestigeNumerator + childPrestigeDenominator,
      originatorType: "orchestrator",
      originatorId: childContents[0].id,
    });
  }

  return [...rootContents, ...childContents];
}

async function backdateContent(contentId, publishedAt) {
  await database.query({
    text: `
      UPDATE
        contents
      SET
        published_at = $1,
        created_at = $1,
        updated_at = $1
      WHERE
        id = $2
    ;`,
    values: [publishedAt, contentId],
  });
}

async function updateRewardedAt(userId, rewardedAt) {
  const results = await database.query({
    text: `
      UPDATE
        users
      SET
        rewarded_at = $1
      WHERE
        id = $2
      RETURNING
        *
    ;`,
    values: [rewardedAt, userId],
  });

  return results.rows[0];
}

async function deleteAllEmails() {
  await fetch(`${emailHttpUrl}/messages`, {
    method: "DELETE",
  });
}

async function getEmails() {
  const emailListResponse = await fetch(`${emailHttpUrl}/messages`);
  return emailListResponse.json();
}

async function getLastEmail() {
  const emailListBody = await getEmails();
  const lastEmailItem = emailListBody.pop();

  if (!lastEmailItem) {
    return null;
  }

  const emailTextResponse = await fetch(
    `${emailHttpUrl}/messages/${lastEmailItem.id}.plain`,
  );

  const emailTextBody = await emailTextResponse.text();

  lastEmailItem.text = emailTextBody;

  const emailHtmlResponse = await fetch(
    `${emailHttpUrl}/messages/${lastEmailItem.id}.html`,
  );
  if (emailHtmlResponse.ok) {
    lastEmailItem.html = await emailHtmlResponse.text();
  }

  return lastEmailItem;
}

function extractUUID(text) {
  const match = text.match(/[0-9a-fA-F-]{36}/);
  return match ? match[0] : null;
}

async function activateUser(inactiveUser) {
  return await activation.activateUserByUserId(inactiveUser.id);
}

async function addFeaturesToUser(userObject, features) {
  const updatedUser = await user.addFeatures(userObject.id, features);
  return updatedUser;
}

// Cria uma Pergunta da Comunidade. `startsAt`/`endsAt` ajustam o período
// via SQL para simular perguntas futuras ou encerradas. O texto padrão é
// só do teste: a pergunta da home vem do banco, com início e fim.
async function createCommunityQuestion({
  ownerId,
  title = "Qual decisão da safra você quer comparar com a comunidade?",
  description = null,
  category = "lavoura",
  kind = "poll",
  options = kind === "poll"
    ? ["Mantive o plano", "Mudei no meio da safra", "Ainda vou decidir"]
    : [],
  resultsVisibility,
  startsAt,
  endsAt,
} = {}) {
  const created = await communityQuestion.create({
    owner_id: ownerId || faker.string.uuid(),
    title,
    description,
    category,
    kind,
    options,
    results_visibility: resultsVisibility,
  });

  if (startsAt || endsAt) {
    await database.query({
      text: `
        UPDATE community_questions
        SET
          starts_at = COALESCE($2, starts_at),
          ends_at = COALESCE($3, ends_at)
        WHERE id = $1
      ;`,
      values: [created.id, startsAt || null, endsAt || null],
    });
  }

  return created;
}

async function deleteAllCommunityQuestions() {
  await database.query("DELETE FROM community_questions;");
}

async function getLastEvent() {
  const results = await database.query(
    "SELECT * FROM events ORDER BY created_at DESC LIMIT 1;",
  );
  return results.rows[0];
}

// Exporta funções utilitárias para os testes
const orchestrator = {
  waitForAllServices,
  clearDatabase,
  runPendingMigrations,
  createUser,
  createSession,
  createContent,
  createBalance,
  createPrestige,
  updateRewardedAt,
  deleteAllEmails,
  getEmails,
  getLastEmail,
  getLastEvent,
  extractUUID,
  activateUser,
  addFeaturesToUser,
  createCommunityQuestion,
  deleteAllCommunityQuestions,
};

export default orchestrator;
