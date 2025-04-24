import bcryptjs from "bcryptjs";
import "dotenv/config";

// Recupera o valor do PEPPER a partir das variáveis de ambiente
const PEPPER = process.env.PEPPER || "";

// Função para gerar o hash de uma senha com base no número de rounds e PEPPER
async function hash(password) {
  const rounds = getNumberOfRounds();
  const pepperedPassword = password + PEPPER;
  return await bcryptjs.hash(pepperedPassword, rounds);
}

// Define o número de rounds para o hash, dependendo do ambiente (produção ou desenvolvimento)
function getNumberOfRounds() {
  return process.env.NODE_ENV === "production" ? 14 : 1;
}

// Compara uma senha fornecida com o hash armazenado (aplicando o PEPPER antes)
async function compare(providedPassword, storedPassword) {
  const pepperedPassword = providedPassword + PEPPER;
  return await bcryptjs.compare(pepperedPassword, storedPassword);
}

// Exporta as funções hash e compare como parte do objeto password
const password = {
  hash,
  compare,
};

export default password;
