const webserverOrigin = process.env.WEBSERVER_ORIGIN || "http://localhost:3000";
const statusUrl = `${webserverOrigin}/api/v1/status`;
const emailHttpUrl = `http://${process.env.EMAIL_HTTP_HOST || "localhost"}:${process.env.EMAIL_HTTP_PORT || "1080"}`;

const startedAt = Date.now();
const maxWaitMs = 120_000;

async function check(url) {
  try {
    const response = await fetch(url);
    return response.status === 200;
  } catch {
    return false;
  }
}

async function wait() {
  process.stdout.write(`\nAguardando webserver em ${statusUrl}...\n`);

  while (Date.now() - startedAt < maxWaitMs) {
    const webOk = await check(statusUrl);
    const emailOk = await check(emailHttpUrl);

    if (webOk && emailOk) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      process.stdout.write(
        `\x1b[32mWebserver e Mailcatcher prontos (${elapsed}s)\x1b[0m\n`,
      );
      return;
    }

    process.stdout.write(
      `\rAguardando... web=${webOk ? "ok" : "..."} email=${emailOk ? "ok" : "..."}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.error(
    `\nTimeout: webserver/mailcatcher não responderam 200 em ${maxWaitMs / 1000}s.`,
  );
  process.exit(1);
}

wait();
