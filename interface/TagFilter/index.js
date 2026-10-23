import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@primer/octicons-react";
import { useTags } from "interface/TagPicker";
import classes from "./index.module.css";

const SCROLL_STEP = 220;

// Atalhos do feed para as páginas de cultura/criação (/tag/soja...).
export default function TagFilter({ category = "cultura", current }) {
  const tags = useTags();
  const scrollerRef = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const element = scrollerRef.current;
    if (!element) {
      return undefined;
    }

    function updateEdges() {
      const hidden = element.scrollWidth - element.clientWidth;
      setEdges({
        left: element.scrollLeft > 8,
        right: hidden - element.scrollLeft > 8,
      });
    }

    function onWheel(event) {
      if (element.scrollWidth <= element.clientWidth) {
        return;
      }
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        return;
      }
      element.scrollLeft += event.deltaY;
      event.preventDefault();
    }

    updateEdges();
    element.addEventListener("scroll", updateEdges, { passive: true });
    element.addEventListener("wheel", onWheel, { passive: false });
    const observer = new ResizeObserver(updateEdges);
    observer.observe(element);

    return () => {
      element.removeEventListener("scroll", updateEdges);
      element.removeEventListener("wheel", onWheel);
      observer.disconnect();
    };
  }, [tags]);

  if (!tags || tags.length === 0) {
    return null;
  }

  function scrollBy(direction) {
    scrollerRef.current?.scrollBy({
      left: direction * SCROLL_STEP,
      behavior: "smooth",
    });
  }

  return (
    <div className={classes.wrap}>
      {edges.left && (
        <div className={classes.controlLeft}>
          <button
            type="button"
            className={classes.arrow}
            aria-label="Culturas anteriores"
            onClick={() => scrollBy(-1)}
          >
            <ChevronLeftIcon />
          </button>
        </div>
      )}
      <nav
        ref={scrollerRef}
        className={classes.filter}
        aria-label="Filtrar por cultura ou criação"
      >
        <ul className={classes.list}>
          {tags
            .filter((tag) => tag.category === category)
            .map((tag) => (
              <li key={tag.slug}>
                <Link
                  href={`/tag/${tag.slug}`}
                  className={
                    tag.slug === current ? classes.current : classes.tag
                  }
                  aria-current={tag.slug === current ? "page" : undefined}
                >
                  {tag.label}
                </Link>
              </li>
            ))}
        </ul>
      </nav>
      {edges.right && (
        <div className={classes.controlRight}>
          <button
            type="button"
            className={classes.arrow}
            aria-label="Mais culturas"
            onClick={() => scrollBy(1)}
          >
            <ChevronRightIcon />
          </button>
        </div>
      )}
    </div>
  );
}
