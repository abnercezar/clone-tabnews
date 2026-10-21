import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import {
  Button,
  Flash,
  Heading,
  LinkButton,
  Spinner,
  Stack,
  Text,
  UnderlineNav,
} from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import CommunityQuestion from "interface/CommunityQuestion";
import ContentList from "interface/ContentList";
import FeedExample from "interface/FeedExample";
import HomeIntro from "interface/HomeIntro";
import TractorScene from "interface/TractorScene";
import HomeSidebar from "interface/HomeSidebar";
import Sponsorship from "interface/Sponsorship";
import useUser from "interface/useUser";
import ui from "interface/styles.module.css";
import classes from "./index.module.css";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import contentModel from "models/content.js";

const PER_PAGE = 30;
// Com poucas publicações, o feed termina com um convite em vez de espaço vazio.
const FEW_CONTENTS = 5;

export default function FeedPage({ initialContents = null, initialTotal = 0 }) {
  const router = useRouter();
  const { user, isLoading: isLoadingUser } = useUser();
  const author =
    typeof router.query.usuario === "string" ? router.query.usuario : "";
  const [contents, setContents] = useState(initialContents);
  const [errorMessage, setErrorMessage] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  // Primeira página da home já veio do servidor: evita baixar o feed de novo.
  const skipNextFeedFetch = useRef(Boolean(initialContents));
  const [sponsorship, setSponsorship] = useState(null);
  const [feedVersion, setFeedVersion] = useState(0);

  const isHomeFeed = !author;
  // Só decide intro depois do /api/v1/user — evita flash e crash de layout.
  const sessionReady = !isLoadingUser;
  const showIntro = isHomeFeed && sessionReady;

  useEffect(() => {
    setPage(1);
  }, [author]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    async function loadFeed() {
      try {
        if (skipNextFeedFetch.current && !author && page === 1) {
          skipNextFeedFetch.current = false;
          await loadSponsorship();
          return;
        }
        skipNextFeedFetch.current = false;

        const params = new URLSearchParams({
          page: String(page),
          per_page: String(PER_PAGE),
          // Home = Relevantes; perfil fica cronológico.
          strategy: author ? "new" : "relevant",
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
        setTotal(Number(response.headers.get("X-Total-Count") || 0));
        const payload = await response.json().catch(() => null);
        setContents(Array.isArray(payload) ? payload : []);

        if (!author && page === 1) {
          await loadSponsorship();
        } else {
          setSponsorship(null);
        }
      } catch {
        setErrorMessage("Não foi possível conectar ao servidor.");
      }
    }

    async function loadSponsorship() {
      const sponsorshipResponse = await fetch("/api/v1/sponsorships");
      if (sponsorshipResponse.ok) {
        const sponsorships = await sponsorshipResponse.json();
        setSponsorship(sponsorships[0] || null);
      }
    }
    loadFeed();
  }, [page, author, router.isReady, feedVersion]);

  const canPublish = Boolean(user?.features?.includes("create:content"));

  const feedBody = (
    <>
      {!contents && !errorMessage && (
        <div className={classes.feedStatus}>
          <Spinner />
        </div>
      )}

      {contents && contents.length === 0 && isHomeFeed && <FeedExample />}

      {contents && contents.length === 0 && !isHomeFeed && (
        <Stack gap="normal" align="center" className={ui.emptyState}>
          <Heading as="h2" variant="small">
            Nenhuma publicação neste perfil
          </Heading>
          <Text as="p" className={ui.muted}>
            {`${author} ainda não publicou no AgroTab.`}
          </Text>
          <LinkButton href="/publicar" variant="primary">
            Publicar conteúdo
          </LinkButton>
        </Stack>
      )}

      {sponsorship && (
        <div className={isHomeFeed ? classes.feedSponsorship : undefined}>
          <Sponsorship
            sponsorship={sponsorship}
            onRemoved={() => setSponsorship(null)}
          />
        </div>
      )}

      {contents && contents.length > 0 && (
        <ContentList
          contentList={contents}
          variant={isHomeFeed ? "cards" : "list"}
        />
      )}

      {isHomeFeed &&
        contents &&
        contents.length > 0 &&
        contents.length < FEW_CONTENTS && (
          <div className={classes.feedInvite}>
            <Text as="p" className={classes.feedInviteText}>
              Seja um dos primeiros a contar como foi sua safra. Sua experiência
              ajuda quem está começando.
            </Text>
            <LinkButton href="/publicar?modelo=relato">
              Contar minha experiência
            </LinkButton>
          </div>
        )}

      {total > PER_PAGE && (
        <Stack
          direction="horizontal"
          gap="condensed"
          justify="center"
          className={classes.pagination}
        >
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
    </>
  );

  return (
    <DefaultLayout
      contentWidth="wide"
      metadata={{
        description:
          "Comunidade de perguntas, experiências e soluções práticas do agronegócio brasileiro.",
      }}
    >
      {isHomeFeed && <TractorScene />}

      {showIntro && <HomeIntro />}

      {author && (
        <Heading as="h1" variant="medium">
          Publicações de {author}
        </Heading>
      )}

      {errorMessage && <Flash variant="danger">{errorMessage}</Flash>}

      {isHomeFeed ? (
        <div className={classes.homeLayout}>
          <div className={classes.mainColumn}>
            {sessionReady && (
              <CommunityQuestion
                onPublished={() => setFeedVersion((version) => version + 1)}
              />
            )}
            <section
              id="publicacoes"
              className={`${classes.feedPanel} ${classes.feedAnchor}`}
              aria-labelledby="feed-title"
            >
              <h1 id="feed-title" className={classes.visuallyHidden}>
                Publicações relevantes
              </h1>
              <div className={classes.feedPanelHeader}>
                <UnderlineNav aria-label="Ordem do feed" variant="flush">
                  <UnderlineNav.Item href="/" aria-current="page">
                    Relevantes
                  </UnderlineNav.Item>
                  <UnderlineNav.Item href="/recentes">
                    Recentes
                  </UnderlineNav.Item>
                </UnderlineNav>
                {canPublish && (
                  <LinkButton href="/publicar" variant="primary" size="small">
                    Publicar
                  </LinkButton>
                )}
              </div>
              {feedBody}
            </section>
          </div>

          <HomeSidebar showJoin={sessionReady && !user} />
        </div>
      ) : (
        <div id="publicacoes" className={classes.feedAnchor}>
          {feedBody}
        </div>
      )}
    </DefaultLayout>
  );
}

// Primeira página de Relevantes vem pronta do servidor (buscadores e conexões
// lentas no campo). Perfil (?usuario=) e paginação continuam no cliente.
export async function getServerSideProps({ query, res }) {
  if (query.usuario) {
    return { props: {} };
  }

  try {
    const published = await contentModel.findPublished({
      page: 1,
      perPage: PER_PAGE,
      strategy: "relevant",
    });
    const secureOutputValues = authorization.filterOutput(
      controller.createAnonymousUser(),
      "read:content",
      published.contents,
    );

    // Em produção o HTML é o mesmo para todos e pode ficar no CDN.
    // No ambiente local o navegador precisa ver a página nova a cada recarregamento.
    res.setHeader(
      "Cache-Control",
      process.env.NODE_ENV === "production"
        ? "public, s-maxage=30, stale-while-revalidate=60"
        : "no-store, no-cache, max-age=0, must-revalidate",
    );

    return {
      props: {
        initialContents: JSON.parse(JSON.stringify(secureOutputValues)),
        initialTotal: published.pagination.total,
      },
    };
  } catch (error) {
    // Falha no servidor não derruba a home: o cliente tenta pela API.
    console.error(error);
    return { props: {} };
  }
}
