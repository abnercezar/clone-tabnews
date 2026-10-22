import Link from "next/link";
import classes from "./index.module.css";

// Etiquetas da publicação; cada uma leva à página da tag.
export default function TagList({ tags, size = "medium" }) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return null;
  }

  return (
    <ul
      className={size === "small" ? classes.listSmall : classes.list}
      aria-label="Tags"
    >
      {tags.map((tag) => (
        <li key={tag.slug}>
          <Link className={classes.tag} href={`/tag/${tag.slug}`}>
            {tag.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
