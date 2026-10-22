import { Heading, LinkButton, Text } from "@primer/react";
import { CommentDiscussionIcon } from "@primer/octicons-react";
import classes from "./index.module.css";

// Feed vazio: mostra o tipo de conversa esperada, deixando claro que é exemplo.
export default function FeedExample() {
  return (
    <section className={classes.wrapper} aria-labelledby="feed-example-title">
      <div className={classes.header}>
        <Heading as="h2" id="feed-example-title" className={classes.heading}>
          Uma pergunta que merece discussão
        </Heading>
        <CommentDiscussionIcon size={20} aria-hidden="true" />
      </div>

      <article className={classes.example}>
        <Text as="p" className={classes.label}>
          Exemplo de publicação
        </Text>
        <Heading as="h3" className={classes.title}>
          Como você decide o momento certo de entrar com fungicida na soja?
        </Heading>
        <Text as="p" className={classes.body}>
          Uma conversa sobre monitoramento, condições locais, orientação técnica
          e tomada de decisão — do jeito que acontece na lavoura.
        </Text>
        <Text as="p" className={classes.disclaimer}>
          Exemplo ilustrativo — não representa uma publicação real.
        </Text>
      </article>

      <div className={classes.actions}>
        <LinkButton href="/publicar" variant="primary">
          Fazer a primeira pergunta
        </LinkButton>
        <LinkButton href="/publicar">Compartilhar experiência</LinkButton>
      </div>
    </section>
  );
}
