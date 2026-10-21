function getOrigin() {
  if (["test", "development"].includes(process.env.NODE_ENV)) {
    return "http://localhost:3000";
  }

  if (process.env.VERCEL_ENV === "preview") {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "https://agrotab.com.br";
}

// URL canônica: previews da Vercel apontam para produção (e o valor é o mesmo
// no servidor e no navegador, onde VERCEL_ENV não existe).
function getCanonicalOrigin() {
  if (["test", "development"].includes(process.env.NODE_ENV)) {
    return "http://localhost:3000";
  }

  return "https://agrotab.com.br";
}

const webserver = {
  origin: getOrigin(),
  canonicalOrigin: getCanonicalOrigin(),
};

export default webserver;
