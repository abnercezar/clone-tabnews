import { Link } from "@primer/react";
import PastTime from "interface/PastTime";
import classes from "./index.module.css";

export default function ContentList({ contentList }) {
  return (
    <ol className={classes.list}>
      {contentList.map((content) => (
        <li key={content.id} className={classes.item}>
          <article>
            <div className={classes.title}>
              <Link
                className={classes.titleLink}
                href={`/conteudos/${content.owner_username}/${content.slug}`}
              >
                {content.title}
              </Link>
            </div>
            <div className={classes.metadata}>
              <span className={classes.tabcoins}>{content.tabcoins ?? 0}</span>
              {" agrocoins · "}
              <address className={classes.author}>
                {content.owner_username}
              </address>
              {" · "}
              <PastTime date={content.published_at} />
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}
