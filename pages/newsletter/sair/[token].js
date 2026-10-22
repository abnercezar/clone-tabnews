import { useState } from "react";
import { useRouter } from "next/router";
import {
  Banner,
  Button,
  Heading,
  LinkButton,
  Stack,
  Text,
} from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";

// A saída pede um clique: leitores de e-mail que abrem links sozinhos
// não tiram ninguém da lista.
export default function UnsubscribeNewsletterPage() {
  const router = useRouter();
  const token = router.query.token;
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState(null);

  async function handleUnsubscribe() {
    setStatus("loading");
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/v1/newsletter/subscriptions/${encodeURIComponent(token)}`,
        { method: "DELETE" },
      );

      if (response.status === 200) {
        setStatus("success");
        return;
      }

      const responseBody = await response.json();
      setErrorMessage(responseBody.message);
      setStatus("error");
    } catch {
      setErrorMessage("Não foi possível conectar ao servidor.");
      setStatus("error");
    }
  }

  return (
    <DefaultLayout
      contentWidth="small"
      metadata={{ title: "Sair da newsletter" }}
    >
      {status === "success" ? (
        <Stack gap="normal">
          <Banner
            variant="success"
            title="Você saiu da newsletter"
            description="Não vamos mandar mais edições para este e-mail. Se mudar de ideia, é só se inscrever de novo."
          />
          <Stack.Item>
            <LinkButton href="/">Voltar para o AgroTab</LinkButton>
          </Stack.Item>
        </Stack>
      ) : (
        <Stack gap="normal">
          <Heading as="h1">Sair da newsletter</Heading>
          <Text as="p" sx={{ m: 0 }}>
            Ao confirmar, este e-mail deixa de receber os destaques da semana do
            AgroTab. Sua conta, se tiver uma, continua igual.
          </Text>

          {status === "error" && (
            <Banner
              variant="critical"
              title="Não foi possível sair da newsletter"
              description={
                errorMessage || "O link para sair da newsletter não é válido."
              }
            />
          )}

          <Stack.Item>
            <Button
              variant="danger"
              onClick={handleUnsubscribe}
              disabled={!token || status === "loading"}
            >
              {status === "loading" ? "Saindo..." : "Sair da newsletter"}
            </Button>
          </Stack.Item>
        </Stack>
      )}
    </DefaultLayout>
  );
}
