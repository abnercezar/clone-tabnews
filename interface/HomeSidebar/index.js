import { Heading, Link, LinkButton, Text } from "@primer/react";
import {
  ArrowRightIcon,
  BeakerIcon,
  GraphIcon,
  MailIcon,
  QuestionIcon,
} from "@primer/octicons-react";
import AgroTabLogo from "interface/AgroTabLogo";
import NewsletterSignup from "interface/NewsletterSignup";
import { PUBLISH_TEMPLATES } from "interface/publishTemplates";
import classes from "./index.module.css";

const TEMPLATE_ICONS = {
  pergunta: QuestionIcon,
  relato: BeakerIcon,
  safra: GraphIcon,
};

export default function HomeSidebar({ showJoin = false }) {
  return (
    <aside className={classes.sidebar} aria-label="Comece por aqui">
      {showJoin && (
        <div className={classes.sideJoin}>
          <JoinCard />
        </div>
      )}
      <TemplatesCard />
      <NewsletterCard />
    </aside>
  );
}

function NewsletterCard() {
  return (
    <section className={classes.card} aria-labelledby="newsletter-card-title">
      <div className={classes.joinHeader}>
        <span className={classes.joinLogo}>
          <MailIcon size={20} />
        </span>
        <Heading
          as="h2"
          id="newsletter-card-title"
          className={classes.cardTitle}
        >
          Destaques da semana no seu e-mail
        </Heading>
      </div>
      <NewsletterSignup size="small" />
    </section>
  );
}

export function JoinCard() {
  return (
    <section className={`${classes.card} ${classes.joinCard}`}>
      <div className={classes.joinHeader}>
        <span className={classes.joinLogo}>
          <AgroTabLogo size={28} />
        </span>
        <Heading as="h2" className={classes.cardTitle}>
          Junte-se ao AgroTab
        </Heading>
      </div>
      <Text as="p" className={classes.cardText}>
        Cadastre-se de graça para perguntar, responder e compartilhar o que você
        aprendeu no campo.
      </Text>
      <LinkButton
        href="/cadastro"
        variant="primary"
        trailingVisual={ArrowRightIcon}
      >
        Criar minha conta
      </LinkButton>
      <Text as="p" className={classes.cardFootnote}>
        Produtor, técnico, consultor ou quem trabalha no setor: aqui o que
        importa é a sua experiência.
      </Text>
    </section>
  );
}

function TemplatesCard() {
  return (
    <section className={classes.card}>
      <Heading as="h2" className={classes.cardTitle}>
        Comece por um modelo
      </Heading>
      <ul className={classes.templateList}>
        {PUBLISH_TEMPLATES.map((template) => {
          const Icon = TEMPLATE_ICONS[template.id] || QuestionIcon;
          return (
            <li key={template.id}>
              <Link
                href={`/publicar?modelo=${template.id}`}
                className={classes.templateLink}
              >
                <span className={classes.templateIcon}>
                  <Icon size={16} />
                </span>
                <span className={classes.templateText}>
                  <span className={classes.templateLabel}>
                    {template.label}
                  </span>
                  <span className={classes.templateDescription}>
                    {template.description}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
