exports.up = (pgm) => {
  pgm.addColumns("users", {
    rewarded_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns("users", ["rewarded_at"]);
};
