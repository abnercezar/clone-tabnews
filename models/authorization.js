import { InternalServerError } from "infra/errors.js";

const availableFeatures = [
  // USER
  "create:user",
  "read:user",
  "read:user:self",
  "read:user:updated",
  "read:user:list",
  "update:user",
  "update:user:others",
  "ban:user",
  "nuked",

  // SESSION
  "create:session",
  "read:session",

  // CONTENT
  "create:content",
  "read:content",
  "read:content:tabcoins",
  "update:content",
  "delete:content",
  "delete:content:others",
  "update:content:others",
  "create:sponsorship",
  "read:sponsorship",

  // ACTIVATION_TOKEN
  "read:activation_token",

  // RECOVERY_TOKEN
  "read:recovery_token",

  // EMAIL_CONFIRMATION_TOKEN
  "read:email_confirmation_token",

  // MIGRATION
  "create:migration",
  "read:migration",

  // STATUS
  "read:status",
  "read:status:all",
];

// Conta ativada (paridade TabNews + features agro já usadas no AgroTab).
const defaultActivatedFeatures = [
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
  "read:email_confirmation_token",
];

// Privilegiado / admin (estilo seed admin do TabNews, adaptado ao AgroTab).
const adminFeatures = [
  ...defaultActivatedFeatures,
  "update:user:others",
  "delete:content:others",
  "update:content:others",
  "create:migration",
  "read:migration",
  "read:status:all",
  "read:user:list",
  "ban:user",
];

function can(user, feature, resource) {
  validateUser(user);
  validateFeature(feature);

  let authorized = false;

  if (user && user.features && user.features.includes(feature)) {
    authorized = true;
  }

  if (feature === "update:user" && resource) {
    authorized = false;

    if (user.id === resource.id || can(user, "update:user:others")) {
      authorized = true;
    }
  }

  return authorized;
}

function filterOutput(user, feature, resource) {
  validateUser(user);
  validateFeature(feature);
  validateResource(resource);

  if (feature === "read:user") {
    const filteredUser = {
      id: resource.id,
      username: resource.username,
      features: resource.features,
      created_at: resource.created_at,
      updated_at: resource.updated_at,
    };

    // Saldos só entram quando o model carregou `withBalances` (perfil público).
    if (resource.tabcoins !== undefined) {
      filteredUser.tabcoins = Number(resource.tabcoins);
    }
    if (resource.tabcash !== undefined) {
      filteredUser.tabcash = Number(resource.tabcash);
    }

    return filteredUser;
  }

  if (feature === "read:user:list") {
    const filterListedUser = (listedUser) => ({
      id: listedUser.id,
      username: listedUser.username,
      features: listedUser.features,
      tabcoins: Number(listedUser.tabcoins ?? 0),
      tabcash: Number(listedUser.tabcash ?? 0),
      created_at: listedUser.created_at,
      updated_at: listedUser.updated_at,
    });

    if (Array.isArray(resource)) {
      return resource.map(filterListedUser);
    }

    return filterListedUser(resource);
  }

  if (feature === "read:user:self") {
    if (user && user.id === resource.id) {
      return {
        id: resource.id,
        username: resource.username,
        email: resource.email,
        features: resource.features,
        tabcoins: resource.tabcoins,
        tabcash: resource.tabcash,
        created_at: resource.created_at,
        updated_at: resource.updated_at,
      };
    }
  }

  if (feature === "read:user:updated") {
    if (
      user &&
      (user.id === resource.id || can(user, "update:user", resource))
    ) {
      return {
        id: resource.id,
        username: resource.username,
        email: resource.email,
        features: resource.features,
        created_at: resource.created_at,
        updated_at: resource.updated_at,
      };
    }
  }

  if (feature === "read:session") {
    if (user && user.id === resource.user_id) {
      return {
        id: resource.id,
        token: resource.token,
        user_id: resource.user_id,
        created_at: resource.created_at,
        updated_at: resource.updated_at,
        expires_at: resource.expires_at,
      };
    }
  }

  if (feature === "read:content") {
    const filterContent = (content) => ({
      id: content.id,
      owner_id: content.owner_id,
      owner_username: content.owner_username,
      parent_id: content.parent_id,
      slug: content.slug,
      title: content.title,
      body: content.body,
      status: content.status,
      type: content.type || "content",
      tabcoins: Number(content.tabcoins ?? 0),
      tabcoins_credit: Number(content.tabcoins_credit ?? 0),
      tabcoins_debit: Number(content.tabcoins_debit ?? 0),
      published_at: content.published_at,
      created_at: content.created_at,
      updated_at: content.updated_at,
    });

    if (Array.isArray(resource)) {
      return resource.map(filterContent);
    }

    return filterContent(resource);
  }

  if (feature === "read:content:tabcoins") {
    return {
      tabcoins: Number(resource.tabcoins ?? 0),
      tabcoins_credit: Number(resource.tabcoins_credit ?? 0),
      tabcoins_debit: Number(resource.tabcoins_debit ?? 0),
    };
  }

  if (feature === "read:sponsorship") {
    const filterSponsorship = (sponsorship) => ({
      id: sponsorship.id,
      owner_id: sponsorship.owner_id,
      owner_username: sponsorship.owner_username,
      title: sponsorship.title,
      url: sponsorship.url,
      status: sponsorship.status,
      created_at: sponsorship.created_at,
    });

    if (Array.isArray(resource)) {
      return resource.map(filterSponsorship);
    }

    return filterSponsorship(resource);
  }

  if (feature === "read:activation_token") {
    return {
      id: resource.id,
      user_id: resource.user_id,
      created_at: resource.created_at,
      updated_at: resource.updated_at,
      expires_at: resource.expires_at,
      used_at: resource.used_at,
    };
  }

  if (feature === "read:recovery_token") {
    // Anti-enumeração: nunca expor id / user_id do token de recuperação.
    return {
      used_at: resource.used_at,
      expires_at: resource.expires_at,
      created_at: resource.created_at,
      updated_at: resource.updated_at,
    };
  }

  if (feature === "read:email_confirmation_token") {
    return {
      id: resource.id,
      used_at: resource.used_at,
      expires_at: resource.expires_at,
      created_at: resource.created_at,
      updated_at: resource.updated_at,
    };
  }

  if (feature === "read:migration") {
    return resource.map((migration) => {
      return {
        path: migration.path,
        name: migration.name,
        timestamp: migration.timestamp,
      };
    });
  }

  if (feature === "read:status") {
    // Público como no TabNews: health completo (DB + webserver).
    // `read:status:all` mantém o espelho legado em `database` no topo.
    const database = resource.dependencies?.database || {};
    const webserver = resource.dependencies?.webserver || {};

    const output = {
      updated_at: resource.updated_at,
      dependencies: {
        database: {
          status: database.status,
          max_connections: database.max_connections,
          opened_connections: database.opened_connections,
          latency: database.latency,
          version: database.version,
        },
        webserver: {
          status: webserver.status,
          provider: webserver.provider,
          environment: webserver.environment,
          aws_region: webserver.aws_region,
          vercel_region: webserver.vercel_region,
          timezone: webserver.timezone,
          last_commit_author: webserver.last_commit_author,
          last_commit_message: webserver.last_commit_message,
          last_commit_message_sha: webserver.last_commit_message_sha,
          version: webserver.version,
        },
      },
    };

    if (can(user, "read:status:all")) {
      output.database = {
        version: database.version,
        max_connections: database.max_connections,
        opened_connections: database.opened_connections,
        status: database.status,
        latency: database.latency,
      };
    }

    return output;
  }
}

function validateUser(user) {
  if (!user || !user.features) {
    throw new InternalServerError({
      cause: "É necessário fornecer `user` no model `authorization`.",
    });
  }
}

function validateFeature(feature) {
  if (!feature || !availableFeatures.includes(feature)) {
    throw new InternalServerError({
      cause:
        "É necessário fornecer uma `feature` conhecida no model `authorization`.",
    });
  }
}

function validateResource(resource) {
  if (!resource) {
    throw new InternalServerError({
      cause:
        "É necessário fornecer uma `resource` em `authorization.filterOutput()`.",
    });
  }
}

const authorization = {
  can,
  filterOutput,
  availableFeatures,
  defaultActivatedFeatures,
  adminFeatures,
};

export default authorization;
