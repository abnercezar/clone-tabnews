import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Flash,
  Heading,
  LinkButton,
  Spinner,
  Stack,
  Text,
} from "@primer/react";
import ContentList from "interface/ContentList";
import DefaultLayout from "interface/DefaultLayout";
import RecentTabNav from "interface/RecentTabNav";
import Sponsorship from "interface/Sponsorship";
import ui from "interface/styles.module.css";

const PER_PAGE = 30;

export default function RecentesFeed({
  basePath,
  title,
  description,
  withChildren = false,
  type,
  showSponsorship = false,
}) {
  const router = useRouter();
  const { page } = router.query;

  const [contents, setContents] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    previousPage: null,
    nextPage: null,
    perPage: PER_PAGE,
    basePath,
  });
  const [sponsorship, setSponsorship] = useState(null);

  const pageReady = router.isReady && page;

  useEffect(() => {
    if (!pageReady) {
      return;
    }

    const currentPage = Number(page);
    if (!Number.isInteger(currentPage) || currentPage < 1) {
      router.replace(`${basePath}/1`);
      return;
    }

    let cancelled = false;

    async function loadFeed() {
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          per_page: String(PER_PAGE),
          strategy: "new",
        });

        if (withChildren) {
          params.set("with_children", "true");
        }

        if (type) {
          params.set("type", type);
        }

        const response = await fetch(`/api/v1/contents?${params}`);
        if (!response.ok) {
          if (!cancelled) {
            setErrorMessage("Não foi possível carregar os conteúdos.");
            setContents([]);
          }
          return;
        }

        const body = await response.json();
        const total = Number(response.headers.get("X-Total-Count") || 0);
        const perPage = Number(response.headers.get("X-Per-Page") || PER_PAGE);
        const lastPage = Math.max(1, Math.ceil(total / perPage));

        if (body.length === 0 && currentPage > 1) {
          router.replace(`${basePath}/${lastPage}`);
          return;
        }

        if (cancelled) {
          return;
        }

        setErrorMessage(null);
        setContents(body);
        setPagination({
          currentPage,
          lastPage,
          previousPage: currentPage > 1 ? currentPage - 1 : null,
          nextPage: currentPage < lastPage ? currentPage + 1 : null,
          perPage,
          basePath,
        });

        if (showSponsorship && currentPage === 1) {
          const sponsorshipResponse = await fetch("/api/v1/sponsorships");
          if (sponsorshipResponse.ok) {
            const sponsorships = await sponsorshipResponse.json();
            if (!cancelled) {
              setSponsorship(sponsorships[0] || null);
            }
          }
        } else if (!cancelled) {
          setSponsorship(null);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Não foi possível conectar ao servidor.");
          setContents([]);
        }
      }
    }

    loadFeed();

    return () => {
      cancelled = true;
    };
  }, [pageReady, page, basePath, router, showSponsorship, withChildren, type]);

  const pageLabel = pagination.currentPage || page || 1;

  return (
    <DefaultLayout
      metadata={{
        title: `Página ${pageLabel} · ${title}`,
        description,
      }}
    >
      <RecentTabNav />

      {errorMessage && <Flash variant="danger">{errorMessage}</Flash>}

      {!contents && !errorMessage && <Spinner />}

      {contents && contents.length === 0 && (
        <Stack gap="normal" align="center" className={ui.emptyState}>
          <Heading as="h2" variant="small">
            Nenhum conteúdo encontrado
          </Heading>
          <Text as="p" className={ui.muted}>
            Ainda não há itens nesta lista.
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
        <ContentList contentList={contents} pagination={pagination} />
      )}
    </DefaultLayout>
  );
}
