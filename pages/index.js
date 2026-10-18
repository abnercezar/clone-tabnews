import { useEffect, useState } from "react";
import { useRouter } from "next/router";
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

export default function FeedPage() {
  const router = useRouter();
  const author =
    typeof router.query.usuario === "string" ? router.query.usuario : "";
  const searchQuery =
    typeof router.query.q === "string" ? router.query.q.trim() : "";
  const [contents, setContents] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sponsorship, setSponsorship] = useState(null);

  useEffect(() => {
    setPage(1);
  }, [author, searchQuery]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    async function loadFeed() {
      try {
        const params = new URLSearchParams({
          page: String(page),
          per_page: String(PER_PAGE),
          // Home = Relevantes; perfil/busca ficam cronológicos.
          strategy: author || searchQuery ? "new" : "relevant",
        });
        if (author) {
          params.set("username", author);
        }

        const response = await fetch(`/api/v1/contents?${params}`);
        if (!response.ok) {
          setErrorMessage("Não foi possível carregar os conteúdos.");
          setContents([]);
          return;
        }
        setErrorMessage(null);
        let items = await response.json();
        let itemTotal = Number(response.headers.get("X-Total-Count") || 0);

        if (searchQuery) {
          const needle = searchQuery.toLowerCase();
          items = items.filter(
            (item) =>
              item.title?.toLowerCase().includes(needle) ||
              item.body?.toLowerCase().includes(needle) ||
              item.owner_username?.toLowerCase().includes(needle),
          );
          itemTotal = items.length;
        }

        setTotal(itemTotal);
        setContents(items);

        if (!author && !searchQuery && page === 1) {
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
  }, [page, author, searchQuery, router.isReady]);

  return (
    <DefaultLayout
      metadata={{
        description:
          "Conteúdos sobre tecnologia, inovação e ciência no agronegócio brasileiro.",
      }}
    >
      {author && (
        <Heading as="h1" variant="medium">
          Publicações de {author}
        </Heading>
      )}

      {searchQuery && (
        <Heading as="h1" variant="medium">
          Resultados para “{searchQuery}”
        </Heading>
      )}

      {errorMessage && <Flash variant="danger">{errorMessage}</Flash>}

      {!contents && !errorMessage && <Spinner />}

      {contents && contents.length === 0 && (
        <Stack gap="normal" align="center" className={ui.emptyState}>
          <Heading as="h2" variant="small">
            Nenhum conteúdo encontrado
          </Heading>
          <Text as="p" className={ui.muted}>
            {searchQuery
              ? `Nada encontrado para “${searchQuery}”.`
              : author
                ? `${author} ainda não publicou.`
                : "Ainda não há publicações. Seja o primeiro a publicar!"}
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
