import { Button, Link, Stack } from "@primer/react";
import { CommentIcon } from "@primer/octicons-react";
import PastTime from "interface/PastTime";
import classes from "./index.module.css";

function excerpt(text, maxLength = 255) {
  const plain = String(text || "")
    .replace(/[#*_`>~[\]()!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) {
    return plain;
  }

  return `${plain.slice(0, maxLength).trimEnd()}…`;
}

export default function ContentList({ contentList, pagination }) {
  const listNumberStart = pagination
    ? pagination.perPage * (pagination.currentPage - 1) + 1
    : 1;

  return (
    <>
      <ol
        className={classes.list}
        start={listNumberStart}
        key={pagination ? `content-list-${listNumberStart}` : "content-list"}
      >
        {contentList.map((content) => (
          <ContentListItem key={content.id} content={content} />
        ))}
      </ol>

      {pagination?.lastPage > 1 && (
        <Stack
          direction="horizontal"
          gap="condensed"
          justify="center"
          sx={{ mt: 3 }}
        >
          <Button
            as="a"
            href={
              pagination.previousPage
                ? `${pagination.basePath}/${pagination.previousPage}`
                : undefined
            }
            disabled={!pagination.previousPage}
          >
            Anteriores
          </Button>
          <Button
            as="a"
            href={
              pagination.nextPage
                ? `${pagination.basePath}/${pagination.nextPage}`
                : undefined
            }
            disabled={!pagination.nextPage}
          >
            Próximos
          </Button>
        </Stack>
      )}
    </>
  );
}

function ContentListItem({ content }) {
  const href = `/${content.owner_username}/${content.slug}`;
  const isComment = Boolean(content.parent_id);
  const isAd = content.type === "ad";

  return (
    <li className={classes.item}>
      <article>
        <div className={classes.title}>
          {isComment ? (
            <Link className={classes.commentLink} href={href}>
              <CommentIcon verticalAlign="middle" size="small" />
              {` "${excerpt(content.body || content.title)}"`}
            </Link>
          ) : (
            <Link className={classes.titleLink} href={href}>
              {content.title}
            </Link>
          )}
        </div>
        <div className={classes.metadata}>
          {isAd ? (
            <span className={classes.sponsored}>Patrocinado</span>
          ) : (
            <span className={classes.tabcoins}>{content.tabcoins ?? 0}</span>
          )}
          {!isAd && " agrocoins · "}
          {isAd && " · "}
          <address className={classes.author}>
            <Link href={`/${content.owner_username}`}>
              {content.owner_username}
            </Link>
          </address>
          {" · "}
          <PastTime date={content.published_at} />
        </div>
      </article>
    </li>
  );
}
