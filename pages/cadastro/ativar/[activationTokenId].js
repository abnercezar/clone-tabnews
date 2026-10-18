import { Banner, LinkButton, Spinner, Stack, Text } from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function ActivateUserPage() {
  const router = useRouter();
  const activationTokenId = router.query.activationTokenId;
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (!activationTokenId) {
      return;
    }

    sendActivationRequest();

    async function sendActivationRequest() {
      try {
        const response = await fetch(
          `/api/v1/activations/${activationTokenId}`,
          {
            method: "PATCH",
          },
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
  }, [activationTokenId]);

  return (
    <DefaultLayout
      contentWidth="small"
      metadata={{
        title: "Ativar cadastro",
      }}
    >
      {status === "loading" && (
        <Stack direction="horizontal" align="center" gap="condensed">
          <Spinner size="small" />
          <Text>Ativando sua conta...</Text>
        </Stack>
      )}

      {status === "success" && (
        <Stack gap="normal">
          <Banner
            variant="success"
            title="Conta ativada!"
            description="Seu cadastro no AgroTab está pronto. Entre para publicar e acompanhar os conteúdos."
          />
          <Stack.Item>
            <LinkButton href="/login" variant="primary">
              Entrar
            </LinkButton>
          </Stack.Item>
        </Stack>
      )}

      {status === "error" && (
        <Stack gap="normal">
          <Banner
            variant="critical"
            title="Não foi possível ativar a conta"
            description={`${errorMessage || "O link de ativação é inválido."} Se você já ativou a conta, basta entrar. Se o link expirou, entre em contato com a equipe do AgroTab pelo contato@agrotab.com.br.`}
          />
          <Stack.Item>
            <LinkButton href="/login" variant="primary">
              Entrar
            </LinkButton>
          </Stack.Item>
        </Stack>
      )}
    </DefaultLayout>
  );
}
