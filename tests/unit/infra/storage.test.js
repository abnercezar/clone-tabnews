import storage from "infra/storage.js";

// Vetor do exemplo oficial da AWS (GET Object, SigV4):
// https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html
describe("infra/storage signRequest", () => {
  test("Gera a assinatura SigV4 igual à do exemplo da AWS", () => {
    const headers = storage.signRequest({
      config: {
        endpoint: "https://examplebucket.s3.amazonaws.com",
        region: "us-east-1",
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      },
      method: "GET",
      path: "/test.txt",
      headers: { range: "bytes=0-9" },
      payloadHash:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      now: new Date("2013-05-24T00:00:00Z"),
    });

    expect(headers.authorization).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
    );
  });

  test("Sem variáveis STORAGE_* o envio de fotos fica desligado", () => {
    expect(storage.isConfigured()).toBe(false);
  });
});
