import Link from "next/link";
import { useTags } from "interface/TagPicker";
import classes from "./index.module.css";

// Atalhos do feed para as páginas de cultura/criação (/tag/soja...).
export default function TagFilter({ category = "cultura", current }) {
  const tags = useTags();

  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <nav className={classes.filter} aria-label="Filtrar por cultura ou criação">
      <ul className={classes.list}>
        {tags
          .filter((tag) => tag.category === category)
          .map((tag) => (
            <li key={tag.slug}>
              <Link
                href={`/tag/${tag.slug}`}
                className={tag.slug === current ? classes.current : classes.tag}
                aria-current={tag.slug === current ? "page" : undefined}
              >
                {tag.label}
              </Link>
            </li>
          ))}
      </ul>
    </nav>
  );
}
