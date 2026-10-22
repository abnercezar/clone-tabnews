import { whatsappShareHref } from "interface/whatsappShare";
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
