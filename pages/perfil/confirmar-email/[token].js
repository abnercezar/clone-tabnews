import { Banner, LinkButton, Spinner, Stack, Text } from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import Confetti from "interface/Confetti";
import useUser from "interface/useUser";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function ConfirmEmailPage() {
  const router = useRouter();
  const token = router.query.token;
  const { mutate } = useUser();
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    confirmEmail();

    async function confirmEmail() {
      try {
        const response = await fetch("/api/v1/email-confirmation", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token_id: token,
          }),
        });

        if (response.status === 200) {
          setStatus("success");
          await mutate();
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
  }, [token, mutate]);

  return (
    <>
      {status === "success" && <Confetti />}
      <DefaultLayout
        contentWidth="small"
        metadata={{
          title: "Confirmar alteração de email",
        }}
      >
        {status === "loading" && (
          <Stack direction="horizontal" align="center" gap="condensed">
            <Spinner size="small" />
            <Text>Verificando token de alteração de email...</Text>
          </Stack>
        )}

        {status === "success" && (
          <Stack gap="normal">
            <Banner
              variant="success"
              title="Email alterado!"
              description="Seu novo endereço de email foi confirmado com sucesso."
            />
            <Stack.Item>
              <LinkButton href="/perfil" variant="primary">
                Voltar ao perfil
              </LinkButton>
            </Stack.Item>
          </Stack>
        )}

        {status === "error" && (
          <Stack gap="normal">
            <Banner
              variant="critical"
              title="Não foi possível confirmar o email"
              description={`${errorMessage || "O link de confirmação é inválido."} Solicite uma nova alteração de email no perfil.`}
            />
            <Stack.Item>
              <LinkButton href="/perfil" variant="primary">
                Ir ao perfil
              </LinkButton>
            </Stack.Item>
          </Stack>
        )}
      </DefaultLayout>
    </>
  );
}
