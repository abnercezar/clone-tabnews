const nextConfig = {
  transpilePackages: ["@primer/react"],
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
