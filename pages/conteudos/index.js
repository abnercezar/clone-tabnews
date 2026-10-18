import { useEffect, useState } from "react";
import {
  Heading,
  Stack,
  Text,
  Link,
  Spinner,
  Flash,
  LinkButton,
} from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";

export default function FeedPage() {
  const [contents, setContents] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    async function loadFeed() {
      try {
        const response = await fetch("/api/v1/contents");
        if (!response.ok) {
          setErrorMessage("Não foi possível carregar o feed.");
          return;
        }
        setContents(await response.json());
      } catch {
        setErrorMessage("Não foi possível conectar ao servidor.");
      }
    }
    loadFeed();
  }, []);

  return (
    <DefaultLayout
      metadata={{
        title: "Conteúdos",
        description: "Publicações da comunidade AgroTab.",
      }}
    >
      <Stack gap="spacious">
        <Stack
          direction={{ narrow: "vertical", regular: "horizontal" }}
          justify="space-between"
          align="center"
        >
          <Heading as="h1">Conteúdos</Heading>
          <LinkButton href="/publicar" variant="primary">
            Publicar
          </LinkButton>
        </Stack>

        {errorMessage && <Flash variant="danger">{errorMessage}</Flash>}

        {!contents && !errorMessage && <Spinner />}

        {contents && contents.length === 0 && (
          <Text className="muted">
            Ainda não há publicações. Seja o primeiro a publicar!
          </Text>
        )}

        {contents && contents.length > 0 && (
          <Stack gap="normal">
            {contents.map((content) => (
              <ContentListItem key={content.id} content={content} />
            ))}
          </Stack>
        )}
      </Stack>
    </DefaultLayout>
  );
}

function ContentListItem({ content }) {
  const href = `/conteudos/${content.owner_username}/${content.slug}`;
  return (
    <article>
      <Heading as="h2" variant="small">
        <Link href={href}>{content.title}</Link>
      </Heading>
      <Text as="p" className="muted">
        por {content.owner_username}
      </Text>
    </article>
  );
}
