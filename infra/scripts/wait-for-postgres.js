const { exec } = require("node:child_process");

const messageWaiting = "Aguardando Postgres aceitar conexões";
const messageReady = "Postgres está pronto e aceitando conexões!";

const startedAt = Date.now();
function showElapsedTime() {
  return `${((Date.now() - startedAt) / 1000).toFixed(2)}s`;
}

function showSpinner() {
  const spinner = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const index = Math.floor(Date.now() / 100) % spinner.length;
  return spinner[index];
}

function checkPostgres() {
  exec("docker exec postgres-dev pg_isready --host localhost", handleReturn);

  function handleReturn(error, stdout) {
    if (stdout.search("accepting connections") === -1) {
      process.stdout.write(
        `\r🟡 ${messageWaiting} ${showSpinner()} (${showElapsedTime()})`,
      );
      setTimeout(checkPostgres, 5000); // Espera por 5 segundos antes de tentar novamente
      return;
    }
    process.stdout.write(
      `\r\x1b[32m🟢 ${messageReady} (${showElapsedTime()})\x1b[0m\n`,
    );
  }
}

process.stdout.write(`\n\n🔴 ${messageWaiting}`);
checkPostgres();
