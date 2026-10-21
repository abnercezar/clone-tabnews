import { Button, Heading } from "@primer/react";
import communityQuestionCategories from "models/community-question-categories.js";
import communityQuestionTemplates from "models/community-question-templates.js";
import styles from "./index.module.css";

function categoryLabel(slug) {
  return (
    communityQuestionCategories.find((item) => item.slug === slug)?.label ??
    slug
  );
}

export default function QuestionTemplates({ selectedId, onPick }) {
  return (
    <section className={styles.section} aria-labelledby="templates-title">
      <Heading as="h2" id="templates-title" className={styles.title}>
        Modelos prontos
      </Heading>
      <p className={styles.hint}>
        Perguntas sobre o que mais pesa no bolso do produtor agora. O modelo
        preenche o formulário; revise e defina o encerramento antes de publicar.
      </p>
      <ul className={styles.list}>
        {communityQuestionTemplates.map((item) => {
          const isSelected = item.id === selectedId;
          return (
            <li
              key={item.id}
              className={`${styles.item} ${isSelected ? styles.selected : ""}`}
            >
              <div>
                <p className={styles.itemTitle}>{item.title}</p>
                <p className={styles.meta}>
                  {categoryLabel(item.category)} ·{" "}
                  {item.kind === "poll"
                    ? `Enquete com ${item.options.length} alternativas`
                    : "Só relatos abertos"}
                </p>
              </div>
              <Button
                size="small"
                onClick={() => onPick(item)}
                aria-pressed={isSelected}
              >
                {isSelected ? "No formulário" : "Usar este modelo"}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
