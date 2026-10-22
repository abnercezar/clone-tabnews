import newsletter from "models/newsletter.js";
import webserver from "infra/webserver.js";

const leaveLink = "https://agrotab.com.br/newsletter/sair/token";

const items = [
  {
    title: "Como recuperei o pasto degradado",
    author: "produtora",
    url: "https://agrotab.com.br/produtora/pasto",
    excerpt: "Calagem e rotação de piquetes.",
  },
  {
    title: "Milho safrinha <script>",
    author: "agronomo",
    url: "https://agrotab.com.br/agronomo/milho",
    excerpt: "",
  },
];

describe("`models/newsletter.js` renderEditionHtml", () => {
  test("puts the first publication as the highlight and the others in cards", () => {
    const html = newsletter.renderEditionHtml(items, leaveLink);

    expect(html).toContain("DESTAQUES DA SEMANA");
    expect(html).toContain(`src="${webserver.origin}/email/logo-agrotab.png"`);
    expect(html).toContain("Ler no AgroTab");
    expect(html).toContain("TAMBÉM EM ALTA NA SEMANA");
    expect(html.indexOf("Como recuperei o pasto degradado")).toBeLessThan(
      html.indexOf("Milho safrinha"),
    );
    expect(html).toContain(`href="${leaveLink}"`);
  });

  test("escapes publication data", () => {
    const html = newsletter.renderEditionHtml(items, leaveLink);

    expect(html).not.toContain("<script>");
    expect(html).toContain("Milho safrinha &lt;script&gt;");
  });

  test("omits the secondary section when there is only one publication", () => {
    const html = newsletter.renderEditionHtml([items[0]], leaveLink);

    expect(html).not.toContain("TAMBÉM EM ALTA NA SEMANA");
  });
});
