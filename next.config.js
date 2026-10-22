const nextConfig = {
  transpilePackages: ["@primer/react"],
  // O site não usa next/image. Desligar a otimização faz /_next/image
  // responder 404 e fecha as falhas da Image Optimization API do Next 14
  // (GHSA-2464-fhr4-w9xw, GHSA-2xp9-vwfh-vxw4) até o upgrade de major.
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/conteudos",
        destination: "/",
        permanent: false,
      },
      {
        source: "/conteudos/:username/:slug",
        destination: "/:username/:slug",
        permanent: true,
      },
      {
        source: "/rss",
        destination: "/recentes/rss",
        permanent: true,
      },
      {
        source: "/rss.xml",
        destination: "/recentes/rss",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/recentes/rss",
        destination: "/api/v1/contents/rss",
      },
    ];
  },
};

module.exports = nextConfig;
