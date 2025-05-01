import bcryptjs from "bcryptjs";
import "dotenv/config";

// Função para gerar o hash de uma senha com base no número de rounds
async function hash(password) {
  const rounds = getNumberOfRounds();
  return await bcryptjs.hash(password, rounds);
}

// Define o número de rounds para o hash, dependendo do ambiente (produção ou desenvolvimento)
function getNumberOfRounds() {
  return process.env.NODE_ENV === "production" ? 14 : 1;
}

// Compara uma senha fornecida com o hash armazenado
async function compare(providedPassword, storedPassword) {
  return await bcryptjs.compare(providedPassword, storedPassword);
}

// Exporta as funções hash e compare como parte do objeto password
const password = {
  hash,
  compare,
};

export default password;
