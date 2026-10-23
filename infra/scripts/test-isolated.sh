#!/bin/sh
# Roda a suíte Jest em containers descartáveis, sem tocar no banco do
# `npm run dev`.
#
# Por que existe: `clearDatabase()` do orchestrator apaga o banco para onde
# o `.env.development` aponta (localhost:5432), e o `jest.config.js` carrega
# esse arquivo com override — exportar outra porta não isola. Aqui Postgres,
# Mailcatcher, `next dev` e Jest dividem a mesma rede de um container, então
# localhost:5432/1080/3000 são os deles, não os seus.
#
# Uso:
#   npm run test:isolated                       # suíte inteira
#   npm run test:isolated -- tests/unit/models  # só um caminho
#   npm run test:isolated -- -t "nome do teste" # qualquer opção do Jest
set -eu

REPO=$(cd "$(dirname "$0")/../.." && pwd)
RUN_ID="agrotab-test-$$"
WORKDIR=$(mktemp -d "${TMPDIR:-/tmp}/agrotab-test-XXXXXX")

if ! command -v docker >/dev/null 2>&1; then
  echo "test:isolated precisa do Docker no PATH." >&2
  exit 1
fi

if [ ! -d "$REPO/node_modules" ]; then
  echo "Rode \`npm install\` antes: os containers usam o node_modules do projeto." >&2
  exit 1
fi

cleanup() {
  docker rm -f "$RUN_ID-pg" "$RUN_ID-mail" >/dev/null 2>&1 || true
  rm -rf "$WORKDIR"
}
trap cleanup EXIT INT TERM

# Cópia do projeto (com as alterações ainda não commitadas): o `next dev`
# do teste escreve .next e não pode disputar a pasta com o seu. Os `.env`
# com segredos ficam de fora: os testes contam só com o `.env.development`
# (com o `.env.development.local` o R2 ligaria e o teste enviaria fotos de
# verdade para o seu bucket).
rsync -a --exclude node_modules --exclude .next --exclude .git \
  --exclude '.env*.local' --exclude .env.production \
  "$REPO/" "$WORKDIR/app/"

docker run -d --name "$RUN_ID-pg" --env-file "$REPO/.env.development" \
  postgres:16.0-alpine3.18 >/dev/null
docker run -d --name "$RUN_ID-mail" --network "container:$RUN_ID-pg" \
  sj26/mailcatcher >/dev/null

until docker exec "$RUN_ID-pg" pg_isready -h localhost >/dev/null 2>&1; do
  sleep 1
done

# Sem `concurrently`: o `-k` dele precisa de `ps`, que a imagem slim não
# tem. O código de saída é o do Jest.
docker run --rm --network "container:$RUN_ID-pg" \
  -v "$WORKDIR/app:/app" -v "$REPO/node_modules:/app/node_modules:ro" \
  -w /app --user "$(id -u):$(id -g)" \
  -e HOME=/tmp -e NEXT_TELEMETRY_DISABLED=1 \
  node:24-bookworm-slim \
  sh -c '
    FIREWALL_ENABLED=false npx next dev >/tmp/next.log 2>&1 &
    NEXT_PID=$!
    node infra/scripts/wait-for-webserver.js
    set +e
    npx jest --runInBand "$@"
    STATUS=$?
    kill $NEXT_PID 2>/dev/null
    exit $STATUS
  ' sh "$@"
