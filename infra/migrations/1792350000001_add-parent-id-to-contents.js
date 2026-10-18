// Comentários são conteúdos com parent_id apontando para a publicação.
// Sem chave estrangeira, no mesmo padrão de sessions.user_id.
exports.up = (pgm) => {
  pgm.addColumn("contents", {
    parent_id: {
      type: "uuid",
    },
  });

  pgm.createIndex("contents", "parent_id");
};

exports.down = (pgm) => {
  pgm.dropIndex("contents", "parent_id");
  pgm.dropColumn("contents", "parent_id");
};
