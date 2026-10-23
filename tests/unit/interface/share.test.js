import { whatsappShareHref } from "interface/whatsappShare";
import {
  facebookShareHref,
  linkedinShareHref,
  xShareHref,
} from "interface/shareLinks";
import { siteJsonLd } from "interface/siteJsonLd";
import { countUploadedPhotos } from "interface/photoUpload";
import { weeklyQuestion } from "interface/weeklyQuestion";

describe("whatsappShareHref", () => {
  test("Monta o link wa.me com título e endereço", () => {
    expect(
      whatsappShareHref({
        title: "Percevejo na soja",
        url: "https://agrotab.com.br/joao/percevejo",
      }),
    ).toBe(
      "https://wa.me/?text=Percevejo%20na%20soja%0Ahttps%3A%2F%2Fagrotab.com.br%2Fjoao%2Fpercevejo",
    );
  });
});

describe("links de compartilhamento", () => {
  const url = "https://agrotab.com.br/joao/percevejo";

  test("Facebook, LinkedIn e X usam a URL pública", () => {
    expect(facebookShareHref(url)).toBe(
      "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fagrotab.com.br%2Fjoao%2Fpercevejo",
    );
    expect(linkedinShareHref(url)).toBe(
      "https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fagrotab.com.br%2Fjoao%2Fpercevejo",
    );
    expect(xShareHref({ title: "Percevejo na soja", url })).toBe(
      "https://twitter.com/intent/tweet?text=Percevejo+na+soja&url=https%3A%2F%2Fagrotab.com.br%2Fjoao%2Fpercevejo",
    );
  });
});

describe("siteJsonLd", () => {
  test("Identifica o AgroTab e a logo oficial", () => {
    const graph = siteJsonLd()["@graph"];
    const organization = graph.find((item) => item["@type"] === "Organization");
    const website = graph.find((item) => item["@type"] === "WebSite");

    expect(organization.name).toBe("AgroTab");
    expect(organization.logo.url).toMatch(/\/logo-agrotab\.png$/);
    expect(website.inLanguage).toBe("pt-BR");
    expect(website.publisher["@id"]).toBe(organization["@id"]);
  });
});

describe("countUploadedPhotos", () => {
  test("Conta só as fotos enviadas pelo AgroTab", () => {
    const body = [
      "![foto](https://fotos.agrotab.com.br/fotos/2026/10/a.webp)",
      "![foto](https://fotos.agrotab.com.br/fotos/2026/10/b.jpg)",
      "![externa](https://exemplo.com/imagem.png)",
    ].join("\n");
    expect(countUploadedPhotos(body)).toBe(2);
    expect(countUploadedPhotos("")).toBe(0);
  });
});

describe("weeklyQuestion", () => {
  test("Muda a cada semana e repete o ciclo", () => {
    const first = weeklyQuestion(new Date("2026-01-01T12:00:00Z"));
    const nextWeek = weeklyQuestion(new Date("2026-01-08T12:00:00Z"));
    expect(first.title).not.toBe(nextWeek.title);
    expect(first.tag).toBeTruthy();
  });
});
