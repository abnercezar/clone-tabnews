import database from "infra/database.js";
import password from "models/password.js";
import validator from "models/validator.js";
import balance from "models/balance.js";
import profile from "models/profile.js";
import tag from "models/tag.js";
import { ValidationError, NotFoundError } from "infra/errors.js";

// Busca um usuário pelo id
async function findOneById(id, options = {}) {
  const userFound = await runSelectQuery(id);

  if (options.withBalances) {
    const balances = await balance.getUserBalances(userFound.id, options);
    userFound.tabcoins = balances.tabcoins;
    userFound.tabcash = balances.tabcash;
  }

  return userFound;

  // Executa a consulta no banco de dados para buscar o usuário
  async function runSelectQuery(id) {
    const results = await database.query(
      {
        text: `
        SELECT
          *
        FROM
          users
        WHERE
          id = $1
        LIMIT 1
        ;`,
        values: [id],
      },
      options,
    );

    if (results.rowCount === 0) {
      // Lança erro se o id não for encontrado
      throw new NotFoundError({
        message: "O id informado não foi encontrado no sistema.",
        action: "Verifique se o id esta digitado corretamente.",
      });
    }

    return results.rows[0];
  }
}

// Busca um usuário pelo username
async function findOneByUsername(username, options = {}) {
  const userFound = await runSelectQuery(username);

  if (options.withBalances) {
    const balances = await balance.getUserBalances(userFound.id, options);
    userFound.tabcoins = balances.tabcoins;
    userFound.tabcash = balances.tabcash;
  }

  return userFound;

  // Executa a consulta no banco de dados para buscar o usuário
  async function runSelectQuery(username) {
    const results = await database.query(
      {
        text: `
        SELECT
          *
        FROM
          users
        WHERE
          LOWER(username) = LOWER($1)
        LIMIT 1
        ;`,
        values: [username],
      },
      options,
    );

    if (results.rowCount === 0) {
      // Lança erro se o usuário não for encontrado
      throw new NotFoundError({
        message: "O username informado não foi encontrado no sistema.",
        action: "Verifique se o username esta digitado corretamente.",
      });
    }

    return results.rows[0];
  }
}

async function findOneByEmail(email) {
  const userFound = await runSelectQuery(email);

  return userFound;

  // Executa a consulta no banco de dados para buscar o usuário
  async function runSelectQuery(email) {
    const results = await database.query({
      text: `
        SELECT
          *
        FROM
          users
        WHERE
          LOWER(email) = LOWER($1)
        LIMIT
          1
        ;`,
      values: [email],
    });

    if (results.rowCount === 0) {
      // Lança erro se o usuário não for encontrado
      throw new NotFoundError({
        message: "O email informado não foi encontrado no sistema.",
        action: "Verifique se o email esta digitado corretamente.",
      });
    }

    return results.rows[0];
  }
}

// Cria um novo usuário no banco de dados
async function create(userInputValues) {
  validator.username(userInputValues.username);
  validator.email(userInputValues.email);
  validator.password(userInputValues.password);

  await validateUniqueUsername(userInputValues.username);
  await validateUniqueEmail(userInputValues.email);
  await hashPasswordInObject(userInputValues);
  injectDefaultFeaturesInObject(userInputValues);

  const newUser = await runInsertQuery(userInputValues);
  return newUser;

  // Insere o novo usuário no banco de dados
  async function runInsertQuery(userInputValues) {
    const results = await database.query({
      text: `
        INSERT INTO
          users (username, email, password, features)
        VALUES
          ($1, $2, $3, $4)
        RETURNING
          *
        ;`,
      values: [
        userInputValues.username,
        userInputValues.email,
        userInputValues.password,
        userInputValues.features,
      ],
    });
    return results.rows[0];
  }

  function injectDefaultFeaturesInObject(userInputValues) {
    userInputValues.features = [
      "read:activation_token",
      "read:recovery_token",
      "read:email_confirmation_token",
    ];
  }
}

// Valida se o user é válido
async function update(username, userInputValues, options = {}) {
  const currentUser = await findOneByUsername(username, options);
  const valuesToApply = { ...userInputValues };

  if ("username" in valuesToApply) {
    validator.username(valuesToApply.username);
    await validateUniqueUsername(valuesToApply.username, currentUser.id);
  }

  let pendingEmailConfirmation = null;

  if ("email" in valuesToApply) {
    validator.email(valuesToApply.email);

    const emailChanged =
      valuesToApply.email.toLowerCase() !== currentUser.email.toLowerCase();

    if (emailChanged) {
      await validateUniqueEmail(valuesToApply.email, currentUser.id);

      if (!options.skipEmailConfirmation) {
        // A rota dispara o e-mail; evita dependência circular user ↔ email-confirmation.
        pendingEmailConfirmation = valuesToApply.email;
        delete valuesToApply.email;
      }
    }
  }

  if ("password" in valuesToApply) {
    validator.password(valuesToApply.password);
    await hashPasswordInObject(valuesToApply);
  }

  if ("occupation" in valuesToApply) {
    valuesToApply.occupation = profile.validateOccupation(
      valuesToApply.occupation,
    );
  }

  if ("state" in valuesToApply) {
    valuesToApply.state = profile.validateState(valuesToApply.state);
  }

  if ("crops" in valuesToApply) {
    const cropSlugs = (await tag.findAll(options))
      .filter((item) => item.category === "cultura")
      .map((item) => item.slug);
    valuesToApply.crops = profile.validateCrops(valuesToApply.crops, cropSlugs);
  }

  if ("notify_replies" in valuesToApply) {
    valuesToApply.notify_replies = profile.validateBoolean(
      valuesToApply.notify_replies,
      "notify_replies",
    );
  }

  if ("founder" in valuesToApply) {
    valuesToApply.founder = profile.validateBoolean(
      valuesToApply.founder,
      "founder",
    );
  }

  const userWithNewValues = { ...currentUser, ...valuesToApply };

  // Segurança: o UPDATE sempre usa o id do registro carregado pelo username
  // autorizado, nunca um id que tenha vindo no corpo da requisição.
  userWithNewValues.id = currentUser.id;

  const updatedUser = await runUpdateQuery(userWithNewValues, options);

  if (pendingEmailConfirmation) {
    updatedUser.pending_email_confirmation = pendingEmailConfirmation;
  }

  return updatedUser;

  async function runUpdateQuery(userWithNewValues, options = {}) {
    const results = await database.query(
      {
        text: `
      UPDATE
      users
      SET
        username = $2,
        email = $3,
        password = $4,
        occupation = $5,
        crops = $6,
        state = $7,
        notify_replies = $8,
        founder = $9,
        updated_at = timezone('utc', now())
      WHERE
        id =$1
        RETURNING
          *
      `,
        values: [
          userWithNewValues.id,
          userWithNewValues.username,
          userWithNewValues.email,
          userWithNewValues.password,
          userWithNewValues.occupation,
          userWithNewValues.crops,
          userWithNewValues.state,
          userWithNewValues.notify_replies,
          userWithNewValues.founder,
        ],
      },
      options,
    );

    return results.rows[0];
  }
}

// Valida se o username já está em uso
async function validateUniqueUsername(username, ignoredUserId) {
  const values = [username];
  let excludeCurrentUser = "";

  if (ignoredUserId) {
    values.push(ignoredUserId);
    excludeCurrentUser = "AND id <> $2";
  }

  const results = await database.query({
    text: `
      SELECT
        username
      FROM
        users
      WHERE
        LOWER(username) = LOWER($1)
        ${excludeCurrentUser}
      ;`,
    values,
  });

  if (results.rowCount > 0) {
    throw new ValidationError({
      message: "O username informado já está sendo utilizado.",
      action: "Utilize outro username para realizar esta operação.",
    });
  }
}

// Valida se o email já está em uso
async function validateUniqueEmail(email, ignoredUserId) {
  const values = [email];
  let excludeCurrentUser = "";

  if (ignoredUserId) {
    values.push(ignoredUserId);
    excludeCurrentUser = "AND id <> $2";
  }

  const results = await database.query({
    text: `
        SELECT
          email
        FROM
          users
        WHERE
          LOWER(email) = LOWER($1)
          ${excludeCurrentUser}
        ;`,
    values,
  });

  if (results.rowCount > 0) {
    throw new ValidationError({
      message: "O email informado já está sendo utilizado.",
      action: "Utilize outro email para realizar esta operação.",
    });
  }
}

// Gera o hash da senha e atualiza o objeto do usuário
async function hashPasswordInObject(userInputValues) {
  const hashedPassword = await password.hash(userInputValues.password);
  userInputValues.password = hashedPassword;
}

async function setFeatures(userId, features, options = {}) {
  const results = await database.query(
    {
      text: `
        UPDATE
          users
        SET
          features = $2,
          updated_at = timezone('utc', now())
        WHERE
          id = $1
        RETURNING
          *
      `,
      values: [userId, features],
    },
    options,
  );

  return results.rows[0];
}

async function addFeatures(userId, features, options = {}) {
  const ids = Array.isArray(userId) ? userId : [userId];
  const updatedAtSql = options.ignoreUpdatedAt
    ? ""
    : "updated_at = timezone('utc', now()),";

  const results = await database.query(
    {
      text: `
        UPDATE
          users
        SET
          ${updatedAtSql}
          features = array_cat(features, $2)
        WHERE
          id = ANY($1)
        RETURNING
          *
      `,
      values: [ids, features],
    },
    options,
  );

  let rows = results.rows;

  if (options.withBalances) {
    rows = await Promise.all(
      rows.map(async (row) => {
        const balances = await balance.getUserBalances(row.id, options);
        return {
          ...row,
          tabcoins: balances.tabcoins,
          tabcash: balances.tabcash,
        };
      }),
    );
  }

  return Array.isArray(userId) ? rows : rows[0];
}

async function findAllByIds(ids, options = {}) {
  if (!ids?.length) {
    return [];
  }

  const results = await database.query(
    {
      text: `
        SELECT
          users.*
          ${
            options.withBalances
              ? `,
          COALESCE(get_user_current_tabcoins(users.id), 0) AS tabcoins,
          COALESCE(get_user_current_tabcash(users.id), 0) AS tabcash`
              : ""
          }
        FROM
          users
        WHERE
          id = ANY($1)
        ORDER BY
          created_at ASC
      ;`,
      values: [ids],
    },
    options,
  );

  return results.rows;
}

// Requisições concorrentes bloqueiam no row lock e reavaliam o WHERE após o
// commit do vencedor, então só uma atualiza a linha e recompensa o usuário.
async function updateRewardedAtIfStale(userId, options = {}) {
  if (!userId) {
    throw new ValidationError({
      message: 'É necessário informar o "id" do usuário.',
      action: "Informe um id válido para atualizar a recompensa diária.",
    });
  }

  const results = await database.query(
    {
      text: `
        UPDATE
          users
        SET
          rewarded_at = timezone('utc', now())
        WHERE
          id = $1
          AND rewarded_at < date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
        RETURNING
          id
      ;`,
      values: [userId],
    },
    options,
  );

  return results.rowCount > 0;
}

async function findAllWithPagination({ page = 1, perPage = 30 } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePerPage = Math.min(100, Math.max(1, Number(perPage) || 30));
  const offset = (safePage - 1) * safePerPage;

  const countResults = await database.query({
    text: `
      SELECT
        COUNT(*)::INTEGER AS total
      FROM
        users
    ;`,
  });

  const results = await database.query({
    text: `
      SELECT
        users.*,
        COALESCE(get_user_current_tabcoins(users.id), 0) AS tabcoins,
        COALESCE(get_user_current_tabcash(users.id), 0) AS tabcash
      FROM
        users
      ORDER BY
        users.created_at DESC
      LIMIT
        $1
      OFFSET
        $2
    ;`,
    values: [safePerPage, offset],
  });

  const totalRows = countResults.rows[0].total;
  const lastPage = Math.max(1, Math.ceil(totalRows / safePerPage));

  return {
    rows: results.rows,
    pagination: {
      currentPage: safePage,
      perPage: safePerPage,
      totalRows,
      lastPage,
      previousPage: safePage > 1 ? safePage - 1 : null,
      nextPage: safePage < lastPage ? safePage + 1 : null,
    },
  };
}

// Conta ligada ao login com Google (`sub` do Google).
async function findOneByGoogleId(googleId, options = {}) {
  const results = await database.query(
    {
      text: `
        SELECT
          *
        FROM
          users
        WHERE
          google_id = $1
        LIMIT
          1
      ;`,
      values: [googleId],
    },
    options,
  );

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "Nenhuma conta ligada a este login do Google.",
      action: "Entre com e-mail e senha ou crie uma conta.",
    });
  }

  return results.rows[0];
}

async function linkGoogleAccount(userId, googleId, options = {}) {
  const results = await database.query(
    {
      text: `
        UPDATE
          users
        SET
          google_id = $2,
          updated_at = timezone('utc', now())
        WHERE
          id = $1
        RETURNING
          *
      ;`,
      values: [userId, googleId],
    },
    options,
  );

  return results.rows[0];
}

// Gera um username livre a partir de uma sugestão (ex.: parte do e-mail).
async function generateAvailableUsername(suggestion) {
  const base =
    String(suggestion || "")
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 24) || "produtor";
  const padded = base.length < 3 ? `${base}agro` : base;

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate =
      attempt === 0
        ? padded
        : `${padded.slice(0, 24)}${Math.floor(Math.random() * 9000) + 1000}`;

    try {
      validator.username(candidate);
      await validateUniqueUsername(candidate);
      return candidate;
    } catch (error) {
      if (!(error instanceof ValidationError)) {
        throw error;
      }
    }
  }

  throw new ValidationError({
    message: "Não foi possível gerar um nome de usuário.",
    action: "Crie sua conta com e-mail e senha.",
  });
}

// Exporta as funções do modelo de usuário
const user = {
  findOneByGoogleId,
  linkGoogleAccount,
  generateAvailableUsername,
  create,
  findOneById,
  findOneByUsername,
  findOneByEmail,
  findAllByIds,
  findAllWithPagination,
  update,
  setFeatures,
  addFeatures,
  updateRewardedAtIfStale,
};

export default user;
