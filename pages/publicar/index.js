import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Banner,
  Button,
  Checkbox,
  FormControl,
  LinkButton,
  TextInput,
  Spinner,
  Stack,
  Heading,
  Flash,
  Text,
} from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import useUser from "interface/useUser";

const CommentEditor = dynamic(() => import("interface/CommentEditor"), {
  ssr: false,
});

const MAX_BODY_LENGTH = 20000;

export default function PublishPage() {
  const { user, isLoading } = useUser();

  return (
    <DefaultLayout
      contentWidth="large"
      metadata={{
        title: "Publicar",
        description: "Publique um conteúdo no AgroTab.",
      }}
    >
      <Stack gap="spacious">
        <Heading as="h1">Publicar</Heading>

        {isLoading && <Spinner />}

        {!isLoading && !user && (
          <Stack gap="normal">
            <Banner
              variant="info"
              title="Entre para publicar"
              description="Só quem tem conta ativada pode publicar no AgroTab."
            />
            <Stack direction="horizontal" gap="condensed">
              <LinkButton href="/login" variant="primary">
                Entrar
              </LinkButton>
              <LinkButton href="/cadastro">Criar conta</LinkButton>
            </Stack>
          </Stack>
        )}

        {!isLoading && user && !user.features?.includes("create:content") && (
          <Banner
            variant="warning"
            title="Sua conta ainda não pode publicar"
            description="Sua conta não tem permissão para criar conteúdos. Entre em contato com a equipe do AgroTab."
          />
        )}

        {!isLoading && user && user.features?.includes("create:content") && (
          <PublishForm />
        )}
      </Stack>
    </DefaultLayout>
  );
}

function PublishForm() {
  const { user, mutate } = useUser();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isAd, setIsAd] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isTooLong = body.length > MAX_BODY_LENGTH;

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);

    if (isTooLong) {
      setErrorMessage(
        `O conteúdo ultrapassa o limite de ${MAX_BODY_LENGTH} caracteres.`,
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          type: isAd ? "ad" : "content",
        }),
      });

      const responseBody = await response.json();

      if (response.status === 201) {
        mutate();
        const params = new URLSearchParams({ publicado: "1" });
        if (responseBody.first_publication) {
          params.set("primeira", "1");
        }
        location.href = `/${responseBody.owner_username ?? ""}/${responseBody.slug}?${params}`;
        return;
      }

      if (response.status === 403) {
        setErrorMessage("Você precisa estar logado para publicar.");
        return;
      }

      setErrorMessage(
        responseBody.message || "Não foi possível publicar. Tente novamente.",
      );
    } catch {
      setErrorMessage("Não foi possível conectar ao servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="normal">
        {errorMessage && (
          <Flash variant="danger" role="alert">
            {errorMessage}
          </Flash>
        )}

        <FormControl required>
          <FormControl.Label>Título</FormControl.Label>
          <TextInput
            value={title}
            maxLength={256}
            onChange={(event) => setTitle(event.target.value)}
            block
          />
        </FormControl>
        <FormControl required>
          <FormControl.Label>Conteúdo</FormControl.Label>
          <CommentEditor
            value={body}
            onChange={setBody}
            initialHeight="45vh"
            isInvalid={isTooLong}
            autofocus={false}
          />
          <FormControl.Caption>
            Markdown no estilo TabNews. Para imagens hospedadas em outro lugar
            use ![descrição](https://url-da-imagem).
          </FormControl.Caption>
        </FormControl>

        <Text
          sx={{
            color: isTooLong ? "danger.fg" : "fg.muted",
            fontSize: 0,
          }}
          aria-live="polite"
        >
          {body.length}/{MAX_BODY_LENGTH}
        </Text>

        <FormControl>
          <FormControl.Label htmlFor="is-ad">
            Patrocinar publicação (100 AgroCash)
          </FormControl.Label>
          <Checkbox
            id="is-ad"
            checked={isAd}
            onChange={(event) => setIsAd(event.target.checked)}
          />
          <FormControl.Caption>
            Seu saldo atual: {user?.tabcash ?? 0} AgroCash. Publicações
            patrocinadas entram no espaço de anúncio (Revenue Share).
          </FormControl.Caption>
        </FormControl>

        <Stack.Item>
          <Button
            type="submit"
            variant="primary"
            disabled={
              isSubmitting || isTooLong || !title.trim() || !body.trim()
            }
          >
            {isSubmitting ? "Publicando..." : "Publicar"}
          </Button>
        </Stack.Item>
      </Stack>
    </form>
  );
}
