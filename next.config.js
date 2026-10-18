const nextConfig = {
  transpilePackages: ["@primer/react"],
  async redirects() {
    return [
      {
        source: "/conteudos",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
