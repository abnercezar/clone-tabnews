import { useState } from "react";
import {
  Button,
  FormControl,
  TextInput,
  Textarea,
  Stack,
  Heading,
  Flash,
} from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";

export default function PublishPage() {
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
        <PublishForm />
      </Stack>
    </DefaultLayout>
  );
}

function PublishForm() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/contents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });

      const responseBody = await response.json();

      if (response.status === 201) {
        location.href = `/conteudos/${responseBody.owner_username ?? ""}/${responseBody.slug}`;
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

        <FormControl>
          <FormControl.Label>Título</FormControl.Label>
          <TextInput
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            block
          />
        </FormControl>
        <FormControl>
          <FormControl.Label>Conteúdo</FormControl.Label>
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={12}
            block
          />
        </FormControl>

        <Stack.Item>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Publicando..." : "Publicar"}
          </Button>
        </Stack.Item>
      </Stack>
    </form>
  );
}
