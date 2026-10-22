import { Heading, Link, LinkButton, Stack, Text } from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import ContentList from "interface/ContentList";
import ui from "interface/styles.module.css";
import controller from "infra/controller.js";
import { NotFoundError } from "infra/errors.js";
import authorization from "models/authorization.js";
import contentModel from "models/content.js";
import tagModel from "models/tag.js";

const PER_PAGE = 30;

const CATEGORY_INTRO = {
  cultura: (label) =>
    `Perguntas, relatos de campo e resultados de safra sobre ${label.toLowerCase()}, respondidos por produtores, agrônomos e técnicos.`,
  tema: (label) =>
    `Discussões sobre ${label.toLowerCase()} no agronegócio, com a experiência de quem está no campo.`,
  regiao: (label) =>
    `O que produtores e técnicos de ${label} estão perguntando e contando no AgroTab.`,
};

// Página indexável por tag (/tag/soja): HTML pronto no servidor, com título
// e descrição próprios para o Google.
export default function TagPage({ tag, contents, page, total }) {
  const intro = CATEGORY_INTRO[tag.category]?.(tag.label) || "";
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
  const basePath = `/tag/${tag.slug}`;

  return (
    <DefaultLayout
      contentWidth="large"
      metadata={{
        title: page > 1 ? `${tag.label} — página ${page}` : tag.label,
        description: intro,
        canonicalPath: page > 1 ? `${basePath}?pagina=${page}` : basePath,
      }}
    >
      <Stack gap="normal">
        <Stack gap="condensed">
          <Text as="p" className={ui.muted}>
            <Link href="/">AgroTab</Link> · Tag
          </Text>
          <Heading as="h1">{tag.label}</Heading>
          <Text as="p" className={ui.muted}>
            {intro}
          </Text>
        </Stack>

        {contents.length === 0 ? (
          <Stack gap="normal" align="start" className={ui.emptyState}>
            <Text as="p">
              Ainda não há publicações com a tag {tag.label}. Que tal começar?
            </Text>
            <LinkButton href={`/publicar?tag=${tag.slug}`} variant="primary">
              Fazer uma pergunta sobre {tag.label}
            </LinkButton>
          </Stack>
        ) : (
          <>
            <ContentList contentList={contents} variant="cards" />
            <nav aria-label="Páginas" className={ui.continueReading}>
              {page > 1 && (
                <Link
                  href={
                    page === 2 ? basePath : `${basePath}?pagina=${page - 1}`
                  }
                >
                  Anteriores
                </Link>
              )}
              {page < lastPage && (
                <Link href={`${basePath}?pagina=${page + 1}`}>Próximos</Link>
              )}
              <Link href={`/publicar?tag=${tag.slug}`}>
                Perguntar sobre {tag.label}
              </Link>
            </nav>
          </>
        )}
      </Stack>
    </DefaultLayout>
  );
}

export async function getServerSideProps({ params, query, res }) {
  const page = Number.parseInt(query.pagina, 10);
  const currentPage =
    Number.isInteger(page) && page > 0 ? Math.min(page, 10000) : 1;

  try {
    const tag = await tagModel.findOneBySlug(params.slug);
    const published = await contentModel.findPublished({
      page: currentPage,
      perPage: PER_PAGE,
      strategy: "new",
      tag: tag.slug,
    });
    const secureOutputValues = authorization.filterOutput(
      controller.createAnonymousUser(),
      "read:content",
      published.contents,
    );

    res.setHeader(
      "Cache-Control",
      process.env.NODE_ENV === "production"
        ? "public, s-maxage=60, stale-while-revalidate=300"
        : "no-store, no-cache, max-age=0, must-revalidate",
    );

    return {
      props: {
        tag,
        contents: JSON.parse(JSON.stringify(secureOutputValues)),
        page: currentPage,
        total: published.pagination.total,
      },
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      return { notFound: true };
    }
    throw error;
  }
}
