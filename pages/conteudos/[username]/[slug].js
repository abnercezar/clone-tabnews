import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Heading, Stack, Text, Spinner, Flash } from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";

export default function ContentPage() {
  const router = useRouter();
  const { username, slug } = router.query;
  const [content, setContent] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (!username || !slug) {
      return;
    }

    async function loadContent() {
      try {
        const response = await fetch(`/api/v1/contents/${username}/${slug}`);
        if (response.status === 404) {
          setErrorMessage("Conteúdo não encontrado.");
          return;
        }
        if (!response.ok) {
          setErrorMessage("Não foi possível carregar o conteúdo.");
          return;
        }
        setContent(await response.json());
      } catch {
        setErrorMessage("Não foi possível conectar ao servidor.");
      }
    }
    loadContent();
  }, [username, slug]);

  return (
    <DefaultLayout
      contentWidth="large"
      metadata={{
        title: content ? content.title : "Conteúdo",
      }}
    >
      {errorMessage && <Flash variant="danger">{errorMessage}</Flash>}

      {!content && !errorMessage && <Spinner />}

      {content && (
        <Stack gap="normal">
          <Heading as="h1">{content.title}</Heading>
          <Text as="p" className="muted">
            por {content.owner_username}
          </Text>
          <Text as="p" style={{ whiteSpace: "pre-wrap" }}>
            {content.body}
          </Text>
        </Stack>
      )}
    </DefaultLayout>
  );
}
