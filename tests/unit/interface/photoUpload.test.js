import { assertPhotoFile, MAX_PHOTO_BYTES } from "interface/photoUpload";

function file(name, type, size) {
  const blob = new File([new Uint8Array(size)], name, { type });
  return blob;
}

describe("assertPhotoFile", () => {
  test("aceita foto dentro do limite", () => {
    expect(() =>
      assertPhotoFile(file("lavoura.jpg", "image/jpeg", 200_000)),
    ).not.toThrow();
    expect(() =>
      assertPhotoFile(file("lavoura.png", "image/png", 1024)),
    ).not.toThrow();
  });

  test("recusa vídeo pelo tipo ou pela extensão", () => {
    expect(() => assertPhotoFile(file("campo.mp4", "video/mp4", 1000))).toThrow(
      "Vídeo não é aceito",
    );
    expect(() =>
      assertPhotoFile(file("campo.mov", "application/octet-stream", 1000)),
    ).toThrow("Vídeo não é aceito");
  });

  test("recusa foto acima de 8 MB", () => {
    expect(() =>
      assertPhotoFile(file("grande.jpg", "image/jpeg", MAX_PHOTO_BYTES + 1)),
    ).toThrow("até 8 MB");
  });

  test("recusa outro formato de imagem", () => {
    expect(() =>
      assertPhotoFile(file("icone.svg", "image/svg+xml", 100)),
    ).toThrow("JPEG, PNG ou WebP");
  });
});
