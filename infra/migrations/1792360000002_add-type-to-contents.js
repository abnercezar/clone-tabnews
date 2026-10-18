// Conteúdo comum (`content`) ou anúncio (`ad`), como no TabNews.
exports.up = (pgm) => {
  pgm.addColumn("contents", {
    type: {
      type: "varchar(30)",
      notNull: true,
      default: "content",
    },
  });

  pgm.createIndex("contents", ["type", "status", "published_at"]);
};

exports.down = (pgm) => {
  pgm.dropIndex("contents", ["type", "status", "published_at"]);
  pgm.dropColumn("contents", "type");
};
