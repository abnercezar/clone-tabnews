import { useEffect, useState } from "react";
import { Heading, LinkButton, Text, useTheme } from "@primer/react";
import {
  ArrowDownIcon,
  CommentDiscussionIcon,
  QuestionIcon,
} from "@primer/octicons-react";
import classes from "./index.module.css";

// Exemplos do tipo de conversa que cabe aqui (não são publicações reais).
const EXAMPLE_QUESTIONS = [
  "Como você suplementa o gado na seca?",
  "Quanto rendeu o milho safrinha na sua região?",
  "Vale a pena travar o preço da soja antes do plantio?",
  "Qual pastagem aguentou melhor a última seca?",
];

const INTRO_SEEN_KEY = "agrotab-home-intro";

function handleExplore(event) {
  const feed = document.getElementById("publicacoes");
  if (!feed) {
    return;
  }

  event.preventDefault();
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  feed.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "start",
  });

  feed.setAttribute("data-spotlight", "true");
  window.setTimeout(() => {
    feed.removeAttribute("data-spotlight");
  }, 1700);
}

export default function HomeIntro() {
  const { resolvedColorMode } = useTheme();
  const [playIntro, setPlayIntro] = useState(false);
  // O servidor não sabe o tema: começa no dia e ajusta depois de montar,
  // sem divergir do HTML que veio pronto.
  const [period, setPeriod] = useState("day");

  useEffect(() => {
    setPeriod(resolvedColorMode === "night" ? "night" : "day");
  }, [resolvedColorMode]);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion || sessionStorage.getItem(INTRO_SEEN_KEY)) {
      return;
    }

    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    setPlayIntro(true);
  }, []);

  const heroClass = [
    classes.hero,
    classes[period],
    playIntro ? classes.reveal : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={heroClass} aria-labelledby="home-intro-title">
      <div className={classes.content}>
        <div className={classes.text}>
          <Text as="p" className={classes.eyebrow}>
            Comunidade do agronegócio
          </Text>
          <Heading as="h1" id="home-intro-title" className={classes.title}>
            Tire sua dúvida do campo com quem é do campo.
          </Heading>
          <Text as="p" className={classes.subtitle}>
            Uma comunidade nova, aberta a produtores, agrônomos e técnicos. Faça
            a primeira pergunta ou ajude quem está começando.
          </Text>
          <div className={classes.actions}>
            <LinkButton
              href="/publicar"
              variant="primary"
              size="large"
              leadingVisual={QuestionIcon}
            >
              Fazer uma pergunta
            </LinkButton>
            <LinkButton
              href="#publicacoes"
              size="large"
              leadingVisual={ArrowDownIcon}
              onClick={handleExplore}
            >
              Ver discussões
            </LinkButton>
          </div>
        </div>

        <div className={classes.examples}>
          <Text as="p" className={classes.examplesLabel}>
            <CommentDiscussionIcon size={16} aria-hidden="true" />
            Perguntas que cabem aqui
          </Text>
          <ul className={classes.benefits}>
            {EXAMPLE_QUESTIONS.map((question) => (
              <li key={question} className={classes.benefit}>
                “{question}”
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
