import { Banner, LinkButton, Spinner, Stack, Text } from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function ConfirmNewsletterPage() {
  const router = useRouter();
  const token = router.query.token;
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    sendConfirmation();

    async function sendConfirmation() {
      try {
        const response = await fetch(
          `/api/v1/newsletter/subscriptions/${encodeURIComponent(token)}`,
          { method: "PATCH" },
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
  }, [token]);

  return (
    <DefaultLayout
      contentWidth="small"
      metadata={{ title: "Confirmar newsletter", noIndex: true }}
    >
      {status === "loading" && (
        <Stack direction="horizontal" align="center" gap="condensed">
          <Spinner size="small" />
          <Text>Confirmando sua inscrição...</Text>
        </Stack>
      )}

      {status === "success" && (
        <Stack gap="normal">
          <Banner
            variant="success"
            title="Inscrição confirmada"
            description="Você vai receber os destaques da semana do AgroTab. Para sair, use o link no fim de qualquer edição."
          />
          <Stack.Item>
            <LinkButton href="/" variant="primary">
              Ver as publicações
            </LinkButton>
          </Stack.Item>
        </Stack>
      )}

      {status === "error" && (
        <Stack gap="normal">
          <Banner
            variant="critical"
            title="Não foi possível confirmar a inscrição"
            description={
              errorMessage || "O link de confirmação não é válido ou expirou."
            }
          />
          <Stack.Item>
            <LinkButton href="/newsletter" variant="primary">
              Pedir um novo link
            </LinkButton>
          </Stack.Item>
        </Stack>
      )}
    </DefaultLayout>
  );
}
