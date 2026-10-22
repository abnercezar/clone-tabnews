import { useEffect, useState } from "react";
import {
  Button,
  Flash,
  Heading,
  Link,
  Spinner,
  Stack,
  Text,
} from "@primer/react";
import { useConfirmDialog } from "interface/ConfirmDialog";
import DefaultLayout from "interface/DefaultLayout";
import NewsletterSignup from "interface/NewsletterSignup";
import useUser from "interface/useUser";

export default function NewsletterPage() {
  const { user } = useUser();
  const canSend = Boolean(user?.features?.includes("send:newsletter"));

  return (
    <DefaultLayout
      contentWidth="medium"
      metadata={{
        title: "Newsletter",
        description:
          "Receba por e-mail, uma vez por semana, as publicações de destaque do AgroTab.",
      }}
    >
      <Stack gap="spacious">
        <Stack gap="condensed">
          <Heading as="h1">Newsletter do AgroTab</Heading>
          <Text as="p" sx={{ color: "fg.muted", m: 0 }}>
            Uma vez por semana, as publicações que a comunidade mais valorizou:
            perguntas, relatos de campo e resultados de safra. Sem propaganda e
            sem repassar o seu e-mail.
          </Text>
        </Stack>

        <NewsletterSignup size="large" showCaption={false} />

        <Text as="p" sx={{ color: "fg.muted", fontSize: 1, m: 0 }}>
          Para entrar na lista, confirme pelo link que chega no seu e-mail. Para
          sair, use o link no fim de qualquer edição.
        </Text>

        {canSend && <EditionPanel />}
      </Stack>
    </DefaultLayout>
  );
}

function EditionPanel() {
  const confirm = useConfirmDialog();
  const [preview, setPreview] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [result, setResult] = useState(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let ignore = false;

    fetch("/api/v1/newsletter/editions")
      .then(async (response) => {
        const body = await response.json();
        if (ignore) return;
        if (response.ok) {
          setPreview(body);
          return;
        }
        setErrorMessage(body.message || "Não foi possível carregar a edição.");
      })
      .catch(() => {
        if (!ignore) setErrorMessage("Não foi possível conectar ao servidor.");
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function handleSend() {
    const confirmed = await confirm({
      title: "Enviar a edição desta semana?",
      body: `Ela vai para ${preview.recipients} inscrito(s) com ${preview.contents.length} publicação(ões). O envio não pode ser desfeito.`,
      confirmLabel: "Enviar",
    });
    if (!confirmed) {
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/v1/newsletter/editions", {
        method: "POST",
      });
      const body = await response.json();

      if (response.status === 201) {
        setResult(body);
        return;
      }

      setErrorMessage(body.message || "Não foi possível enviar a edição.");
    } catch {
      setErrorMessage("Não foi possível conectar ao servidor.");
    } finally {
      setIsSending(false);
    }
  }

  const canSendNow =
    preview && preview.recipients > 0 && preview.contents.length > 0;

  return (
    <Stack as="section" gap="normal" aria-labelledby="edition-title">
      <Heading as="h2" id="edition-title" variant="medium">
        Enviar a edição da semana
      </Heading>

      {!preview && !errorMessage && <Spinner size="small" />}

      {errorMessage && (
        <Flash variant="danger" role="alert">
          {errorMessage}
        </Flash>
      )}

      {result && (
        <Flash variant="success" role="status">
          {`Edição enviada para ${result.sent} de ${result.recipients} inscrito(s).`}
          {result.failed > 0 && ` ${result.failed} envio(s) falharam.`}
        </Flash>
      )}

      {preview && (
        <>
          <Text as="p" sx={{ m: 0 }}>
            {preview.recipients} inscrito(s) confirmado(s).{" "}
            {preview.contents.length === 0
              ? "Não há publicações dos últimos 7 dias para enviar."
              : "Publicações dos últimos 7 dias, na ordem de Relevantes:"}
          </Text>

          {preview.contents.length > 0 && (
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {preview.contents.map((item) => (
                <li key={item.id}>
                  <Link href={`/${item.owner_username}/${item.slug}`}>
                    {item.title}
                  </Link>{" "}
                  <Text sx={{ color: "fg.muted", fontSize: 1 }}>
                    por {item.owner_username}
                  </Text>
                </li>
              ))}
            </ol>
          )}

          <Stack.Item>
            <Button
              variant="primary"
              onClick={handleSend}
              disabled={!canSendNow || isSending || Boolean(result)}
            >
              {isSending ? "Enviando..." : "Enviar edição"}
            </Button>
          </Stack.Item>
        </>
      )}
    </Stack>
  );
}
