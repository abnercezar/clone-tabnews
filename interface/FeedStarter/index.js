import Link from "next/link";
import { Heading, LinkButton, Text } from "@primer/react";
import { BeakerIcon, GraphIcon, QuestionIcon } from "@primer/octicons-react";
import { PUBLISH_TEMPLATES } from "interface/publishTemplates";
import { weeklyQuestion } from "interface/weeklyQuestion";
import classes from "./index.module.css";

const TEMPLATE_ICONS = {
  pergunta: QuestionIcon,
  relato: BeakerIcon,
  safra: GraphIcon,
};

// Destaque quando ainda não há pergunta aberta pela equipe.
export function WeeklyQuestion() {
  const question = weeklyQuestion();

  return (
    <section className={classes.weekly} aria-labelledby="pergunta-semana">
      <Text as="p" className={classes.eyebrow}>
        Pergunta da semana
      </Text>
      <Heading as="h2" id="pergunta-semana" className={classes.weeklyTitle}>
        {question.title}
      </Heading>
      <Text as="p" className={classes.muted}>
        Conte como é aí na sua região. Sua resposta ajuda quem está passando
        pelo mesmo agora.
      </Text>
      <div>
        <LinkButton href={`/publicar?tag=${question.tag}`} variant="primary">
          Responder com a minha experiência
        </LinkButton>
      </div>
    </section>
  );
}

// Com poucas publicações no feed: convida a começar por um dos modelos.
export default function FeedStarter() {
  return (
    <section className={classes.starter} aria-labelledby="feed-starter-title">
      <Heading as="h2" id="feed-starter-title" className={classes.heading}>
        Comece por um modelo
      </Heading>
      <Text as="p" className={classes.muted}>
        A comunidade está começando. Escolha o tipo de publicação e o AgroTab
        mostra o que vale contar.
      </Text>
      <ul className={classes.templates}>
        {PUBLISH_TEMPLATES.map((template) => {
          const Icon = TEMPLATE_ICONS[template.id] || QuestionIcon;
          return (
            <li key={template.id}>
              <Link
                href={`/publicar?modelo=${template.id}`}
                className={classes.template}
              >
                <span className={classes.icon} aria-hidden="true">
                  <Icon size={20} />
                </span>
                <span className={classes.templateLabel}>{template.label}</span>
                <span className={classes.templateDescription}>
                  {template.description}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
