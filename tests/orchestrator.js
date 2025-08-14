import retry from "async-retry";
import { Faker, pt_BR } from "@faker-js/faker";
import database from "infra/database.js";
import migrator from "models/migrator.js";
import user from "models/user.js";
import session from "models/session";

// Instância do Faker para dados aleatórios
const faker = new Faker({ locale: pt_BR });

// Aguarda o serviço web estar disponível
async function waitForAllServices() {
  await waitForWebServer();

  async function waitForWebServer() {
    return retry(fetchStatusPage, {
      retries: 100,
      minTimeout: 100,
      maxTimeout: 1000,
    });

    async function fetchStatusPage() {
      const response = await fetch("http://localhost:3000/api/v1/status");
      if (response.status !== 200) {
        throw Error();
      }
    }
  }
}

// Limpa o banco de dados
async function clearDatabase() {
  await database.query("drop schema public cascade; create schema public;");
}

// Executa as migrations pendentes
async function runPendingMigrations() {
  await migrator.runPendingMigrations();
}

// Cria um usuário de teste
async function createUser(userObject) {
  return await user.create({
    username:
      userObject?.username || faker.internet.username().replace(/[_.-]/g, ""),
    email: userObject?.email || faker.internet.email(),
    password: userObject?.password || "validpassword",
  });
}

// Cria uma sessão de teste
async function createSession(userId) {
  return await session.create(userId);
}

// Exporta funções utilitárias para os testes
const orchestrator = {
  waitForAllServices,
  clearDatabase,
  runPendingMigrations,
  createUser,
  createSession,
};

export default orchestrator;
