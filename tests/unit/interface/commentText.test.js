import { splitComment } from "interface/commentText";

describe("`interface/commentText.js`", () => {
  test("Uses the first line as the title", () => {
    expect(splitComment("Uma linha só")).toEqual({
      title: "Uma linha só",
      body: "",
    });
  });

  test("Keeps the remaining lines as the body", () => {
    expect(splitComment("Título da resposta\n\nO restante do texto.")).toEqual({
      title: "Título da resposta",
      body: "O restante do texto.",
    });
  });

  test("Treats an empty comment as an empty title", () => {
    expect(splitComment("")).toEqual({ title: "", body: "" });
    expect(splitComment(null)).toEqual({ title: "", body: "" });
  });
});
