const dotenv = require("dotenv");

// override: true — se o shell tiver POSTGRES_PORT/EMAIL_* de outra sessão
// (ex.: auditoria em 5433/1081), o .env.development precisa ganhar.
dotenv.config({
  path: ".env.development",
  override: true,
});

// Firewall dispara com 2 cadastros/publicações no mesmo IP em 5s (estilo TN).
// Nos testes gerais fica desligado para não colidir com suítes que criam
// vários usuários via HTTP; os testes de firewall reativam com FIREWALL_ENABLED=true.
if (process.env.FIREWALL_ENABLED === undefined) {
  process.env.FIREWALL_ENABLED = "false";
}

const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: ".",
});
const jestConfig = createJestConfig({
  moduleDirectories: ["node_modules", "<rootDir>"],
  testTimeout: 60000,
  maxWorkers: 4,
  cache: true,
});

module.exports = jestConfig;
