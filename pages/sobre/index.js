import DefaultLayout from "interface/DefaultLayout";
import { Heading, Link, LinkButton, Stack, Text } from "@primer/react";
import {
  CommentDiscussionIcon,
  ClockIcon,
  MegaphoneIcon,
  QuestionIcon,
  StarFillIcon,
  StarIcon,
} from "@primer/octicons-react";

const FEATURES = [
  {
    title: "Relevantes",
    description:
      "A página inicial prioriza publicações recentes com boa avaliação e conversa. Conteúdo bom e antigo cede lugar ao que ainda está em uso.",
    icon: StarIcon,
    tone: "green",
    href: "/",
  },
  {
    title: "Recentes",
    description:
      "Tudo em ordem cronológica, em três abas: publicações, comentários e classificados.",
    icon: ClockIcon,
    tone: "blue",
    href: "/recentes",
  },
  {
    title: "Pergunta da comunidade",
    description:
      "Uma pergunta por vez na home. Quem já passou por aquilo no campo conta a experiência, com prazo para responder.",
    icon: QuestionIcon,
    tone: "yellow",
    href: "/",
  },
  {
    title: "Discussões",
    description:
      "Comentário também é conteúdo e tem página própria. A resposta vale tanto quanto a publicação que abriu o assunto.",
    icon: CommentDiscussionIcon,
    tone: "green",
    href: "/recentes/comentarios/1",
  },
  {
    title: "Útil 👍",
    description:
      "A comunidade marca o que ajudou de verdade. O que é útil sobe, e quem ajuda ganha reputação no perfil.",
    icon: StarFillIcon,
    tone: "yellow",
    href: "/faq#agrocoin",
  },
  {
    title: "Classificados",
    description:
      "Publicação patrocinada, paga com AgroCash, fica fora do feed de Relevantes e aparece na aba de classificados.",
    icon: MegaphoneIcon,
    tone: "blue",
    href: "/recentes/classificados/1",
  },
];

export default function SobrePage() {
  return (
    <DefaultLayout
      metadata={{
        title: "Sobre",
        description:
          "O AgroTab é a comunidade de perguntas, relatos de campo e resultados de safra do agronegócio brasileiro.",
      }}
    >
      <div className="page">
        <Stack gap="spacious" paddingBlock="normal">
          <section className="hero">
            <Text as="p" className="eyebrow">
              Comunidade do agronegócio
            </Text>
            <Heading as="h1" className="hero-title">
              Pergunte a quem já passou por isso no campo.
            </Heading>
            <Text as="p" className="hero-lead">
              Produtores, técnicos e consultores trocam perguntas, relatos e
              resultados de safra. A leitura é aberta. Para publicar e comentar,
              a conta é gratuita.
            </Text>
            <Stack
              direction={{ narrow: "vertical", regular: "horizontal" }}
              gap="condensed"
              align="center"
            >
              <LinkButton href="/" variant="primary" size="large">
                Ver discussões
              </LinkButton>
              <LinkButton href="/publicar" variant="default" size="large">
                Fazer uma pergunta
              </LinkButton>
              <LinkButton href="/cadastro" variant="invisible" size="large">
                Criar conta
              </LinkButton>
            </Stack>
          </section>

          <section className="section">
            <Heading as="h2" variant="medium">
              O que é o AgroTab
            </Heading>
            <Text as="p" className="muted">
              Uma plataforma comunitária do agronegócio brasileiro. O assunto
              cabe quando ajuda uma decisão no campo: produção, pecuária,
              agtech, pesquisa, gestão da fazenda e mercado. Menos ruído, mais
              fundamento — o que a comunidade qualifica sobe em{" "}
              <Link href="/">Relevantes</Link>. Dúvidas de uso estão no{" "}
              <Link href="/faq">FAQ</Link> e as regras, nos{" "}
              <Link href="/termos-de-uso">Termos de Uso</Link>.
            </Text>
          </section>

          <section className="section">
            <Heading as="h2" variant="medium">
              Como funciona
            </Heading>
            <Text as="p" className="muted">
              O que já está aberto para ler, publicar e qualificar.
            </Text>
            <div className="feature-grid">
              {FEATURES.map(
                ({ title, description, icon: Icon, tone, href }) => (
                  <article key={title} className={`feature-card tone-${tone}`}>
                    <span className={`feature-icon tone-${tone}`}>
                      <Icon size={20} />
                    </span>
                    <Heading as="h3" variant="small">
                      <Link href={href}>{title}</Link>
                    </Heading>
                    <Text as="p" className="muted">
                      {description}
                    </Text>
                  </article>
                ),
              )}
            </div>
          </section>
        </Stack>
      </div>

      <style jsx>{`
        .hero {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
        }

        .page :global(.eyebrow) {
          margin: 0;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--fgColor-success, #1a7f37);
        }

        .page :global(.hero-title) {
          max-width: 18ch;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .page :global(.hero-lead),
        .page :global(.muted) {
          max-width: 68ch;
          margin: 0;
          font-size: 16px;
          line-height: 1.6;
          color: var(--fgColor-muted, #656d76);
        }

        .page :global(.hero-lead) {
          font-size: 18px;
        }

        .section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-top: 8px;
        }

        .feature-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 20px;
          border: 1px solid var(--borderColor-default, #d0d7de);
          border-radius: 12px;
          background: var(--bgColor-muted, #f6f8fa);
        }

        .feature-card.tone-green {
          border-left: 4px solid var(--bgColor-success-emphasis, #1f883d);
        }

        .feature-card.tone-yellow {
          border-left: 4px solid #c69026;
        }

        .feature-card.tone-blue {
          border-left: 4px solid var(--fgColor-accent, #0969da);
        }

        .feature-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 8px;
        }

        .feature-icon.tone-green {
          color: var(--fgColor-success, #1a7f37);
          background: color-mix(in srgb, currentColor 14%, transparent);
        }

        .feature-icon.tone-yellow {
          color: #9a6700;
          background: color-mix(in srgb, currentColor 14%, transparent);
        }

        .feature-icon.tone-blue {
          color: var(--fgColor-accent, #0969da);
          background: color-mix(in srgb, currentColor 14%, transparent);
        }

        @media (min-width: 768px) {
          .feature-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </DefaultLayout>
  );
}
