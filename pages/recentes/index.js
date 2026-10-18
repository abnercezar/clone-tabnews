import { useEffect, useState } from "react";
import {
  Button,
  Flash,
  Heading,
  LinkButton,
  Spinner,
  Stack,
  Text,
} from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import ContentList from "interface/ContentList";
import Sponsorship from "interface/Sponsorship";
import ui from "interface/styles.module.css";

const PER_PAGE = 30;

export default function RecentesPage() {
  const [contents, setContents] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sponsorship, setSponsorship] = useState(null);

  useEffect(() => {
    async function loadFeed() {
      try {
        const params = new URLSearchParams({
          page: String(page),
          per_page: String(PER_PAGE),
          strategy: "new",
        });

        const response = await fetch(`/api/v1/contents?${params}`);
        if (!response.ok) {
          setErrorMessage("Não foi possível carregar os conteúdos.");
          setContents([]);
          return;
        }

        setErrorMessage(null);
        setTotal(Number(response.headers.get("X-Total-Count") || 0));
        setContents(await response.json());

        if (page === 1) {
          const sponsorshipResponse = await fetch("/api/v1/sponsorships");
          if (sponsorshipResponse.ok) {
            const sponsorships = await sponsorshipResponse.json();
            setSponsorship(sponsorships[0] || null);
          }
        } else {
          setSponsorship(null);
        }
      } catch {
        setErrorMessage("Não foi possível conectar ao servidor.");
      }
    }

    loadFeed();
  }, [page]);

  return (
    <DefaultLayout
      metadata={{
        title: "Recentes",
        description: "Publicações no AgroTab ordenadas pelas mais recentes.",
      }}
    >
      {errorMessage && <Flash variant="danger">{errorMessage}</Flash>}

      {!contents && !errorMessage && <Spinner />}

      {contents && contents.length === 0 && (
        <Stack gap="normal" align="center" className={ui.emptyState}>
          <Heading as="h2" variant="small">
            Nenhum conteúdo encontrado
          </Heading>
          <Text as="p" className={ui.muted}>
            Ainda não há publicações. Seja o primeiro a publicar!
          </Text>
          <LinkButton href="/publicar" variant="primary">
            Publicar conteúdo
          </LinkButton>
        </Stack>
      )}

      {sponsorship && (
        <Sponsorship
          sponsorship={sponsorship}
          onRemoved={() => setSponsorship(null)}
        />
      )}

      {contents && contents.length > 0 && (
        <ContentList contentList={contents} />
      )}

      {total > PER_PAGE && (
        <Stack direction="horizontal" gap="condensed" justify="center">
          <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anteriores
          </Button>
          <Button
            disabled={page * PER_PAGE >= total}
            onClick={() => setPage(page + 1)}
          >
            Próximos
          </Button>
        </Stack>
      )}
    </DefaultLayout>
  );
}
