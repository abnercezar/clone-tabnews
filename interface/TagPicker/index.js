import { useEffect, useState } from "react";
import { Text } from "@primer/react";
import classes from "./index.module.css";

export const MAX_TAGS = 3;

const CATEGORY_LABELS = {
  cultura: "Cultura ou criação",
  tema: "Tema",
  regiao: "Região ou bioma",
};

// Lista de tags vinda da API; fica em memória entre os formulários da página.
let cachedTags = null;

export function useTags() {
  const [tags, setTags] = useState(cachedTags);

  useEffect(() => {
    if (cachedTags) {
      return;
    }
    let ignore = false;
    fetch("/api/v1/tags")
      .then((response) => (response.ok ? response.json() : []))
      .then((body) => {
        if (!ignore && Array.isArray(body)) {
          cachedTags = body;
          setTags(body);
        }
      })
      .catch(() => {
        if (!ignore) setTags([]);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return tags;
}

// Botões que ligam e desligam: no celular é mais fácil que um menu.
export default function TagPicker({ value, onChange, id }) {
  const tags = useTags();
  const isFull = value.length >= MAX_TAGS;

  function toggle(slug) {
    if (value.includes(slug)) {
      onChange(value.filter((item) => item !== slug));
      return;
    }
    if (!isFull) {
      onChange([...value, slug]);
    }
  }

  if (!tags) {
    return <Text className={classes.muted}>Carregando tags…</Text>;
  }

  return (
    <div id={id} className={classes.picker}>
      {Object.entries(CATEGORY_LABELS).map(([category, label]) => (
        <fieldset key={category} className={classes.group}>
          <legend className={classes.legend}>{label}</legend>
          <div className={classes.options}>
            {tags
              .filter((tag) => tag.category === category)
              .map((tag) => {
                const selected = value.includes(tag.slug);
                return (
                  <button
                    key={tag.slug}
                    type="button"
                    className={selected ? classes.selected : classes.option}
                    aria-pressed={selected}
                    disabled={!selected && isFull}
                    onClick={() => toggle(tag.slug)}
                  >
                    {tag.label}
                  </button>
                );
              })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
