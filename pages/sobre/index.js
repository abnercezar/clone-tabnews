import DefaultLayout from "interface/DefaultLayout";
import {
  Banner,
  Heading,
  Label,
  LabelGroup,
  LinkButton,
  Stack,
  Text,
  Timeline,
} from "@primer/react";
import {
  ArrowRightIcon,
  BeakerIcon,
  CommentDiscussionIcon,
  CpuIcon,
  LightBulbIcon,
  PeopleIcon,
  ProjectIcon,
  RocketIcon,
  RssIcon,
  StarIcon,
} from "@primer/octicons-react";

const FEATURES = [
  {
    title: "Feed de publicações",
    description:
      "Perguntas, relatos de campo e soluções práticas de quem vive o agronegócio brasileiro.",
    icon: RssIcon,
    tone: "green",
  },
  {
    title: "Discussões",
    description:
      "Comentários e respostas em cada publicação, com quem vive o campo e a agtech.",
    icon: CommentDiscussionIcon,
    tone: "blue",
  },
  {
    title: "Qualificação com AgroCoins",
    description:
      "A comunidade qualifica o que tem fundamento — o que ajuda de verdade sobe no feed.",
    icon: StarIcon,
    tone: "yellow",
  },
  {
    title: "Comunidade",
    description:
      "A troca acontece no feed e nas discussões — sem ser uma rede social à parte.",
    icon: PeopleIcon,
    tone: "green",
  },
];

const PILLARS = [
  {
    title: "Tecnologia",
    description:
      "Agtech, dados, automação e ferramentas digitais para o campo produzir com mais precisão e menos desperdício.",
    icon: CpuIcon,
    tone: "green",
  },
  {
    title: "Inovação",
    description:
      "Novos modelos de negócio, práticas e soluções criadas no Brasil para os desafios reais da produção rural.",
    icon: LightBulbIcon,
    tone: "yellow",
  },
  {
    title: "Ciência",
    description:
      "Pesquisa, evidências e conhecimento técnico traduzidos para quem decide na fazenda, na universidade e na indústria.",
    icon: BeakerIcon,
    tone: "blue",
  },
];

const MILESTONES = [
  {
    title: "Fundação",
    body: "Infraestrutura, contas e fluxo de cadastro.",
    variant: "success",
    done: true,
  },
  {
    title: "Feed de publicações",
    body: "Publicação e leitura de perguntas, relatos e soluções do agro.",
    variant: "success",
    done: true,
  },
  {
    title: "Discussões",
    body: "Comentários e respostas em cada publicação.",
    variant: "success",
    done: true,
  },
  {
    title: "Temas por cadeia produtiva",
    body: "Filtros como soja, café, pecuária e leite, conforme a comunidade crescer.",
    variant: "attention",
    done: false,
  },
  {
    title: "Perfis com credencial técnica",
    body: "Identificação de agrônomos, veterinários e técnicos na comunidade.",
    variant: "accent",
    done: false,
  },
];

export default function Home() {
  return (
    <DefaultLayout
      metadata={{
        title: "Sobre",
        description:
          "Menos ruído, mais fundamentos: perguntas e experiências de quem faz o agro acontecer, com fundamento técnico.",
      }}
    >
      <div className="page">
        <div className="flag-bar" aria-hidden />

        <Stack gap="spacious" paddingBlock="normal">
          <Banner
            variant="warning"
            className="build-banner"
            title="O AgroTab está em construção"
            description="O feed e as discussões já estão abertos. Novas funcionalidades chegam conforme a comunidade cresce."
          />

          <section className="hero">
            <LabelGroup>
              <Label variant="success">AgroTab</Label>
              <Label variant="attention">Em construção</Label>
              <Label variant="accent">Brasil</Label>
            </LabelGroup>

            <Heading as="h1" variant="large" className="hero-title">
              Menos ruído, mais fundamentos: um lugar para inteligência coletiva
              no agronegócio.
            </Heading>

            <Text as="p" className="hero-lead">
              Perguntas e experiências de quem faz o agro acontecer, com
              fundamento técnico — do laboratório à lavoura.
            </Text>

            <Stack
              direction={{ narrow: "vertical", regular: "horizontal" }}
              gap="condensed"
              align="center"
            >
              <LinkButton
                href="/"
                variant="primary"
                size="large"
                trailingVisual={ArrowRightIcon}
              >
                Ler os conteúdos
              </LinkButton>
              <LinkButton href="/cadastro" variant="default" size="large">
                Criar conta
              </LinkButton>
            </Stack>
          </section>

          <section id="pilares" className="section">
            <Heading as="h2" variant="medium">
              Tecnologia, inovação e ciência
            </Heading>
            <Text as="p" className="muted">
              Três frentes que dão fundamento às conversas do AgroTab: o que já
              existe no campo brasileiro, o que ainda está nascendo e o que a
              pesquisa comprova.
            </Text>

            <div className="pillar-grid">
              {PILLARS.map(({ title, description, icon: Icon, tone }) => (
                <article
                  key={title}
                  className={`feature-card pillar tone-${tone}`}
                >
                  <span className={`feature-icon tone-${tone}`}>
                    <Icon size={20} />
                  </span>
                  <Heading as="h3" variant="small">
                    {title}
                  </Heading>
                  <Text as="p" className="muted">
                    {description}
                  </Text>
                </article>
              ))}
            </div>
          </section>

          <section id="como-funciona" className="section">
            <Heading as="h2" variant="medium">
              Como funciona
            </Heading>
            <Text as="p" className="muted">
              Publicações, discussões e qualificação pela própria comunidade do
              agronegócio brasileiro — tudo isso já está aberto.
            </Text>

            <div className="feature-grid">
              {FEATURES.map(({ title, description, icon: Icon, tone }) => (
                <article key={title} className={`feature-card tone-${tone}`}>
                  <span className={`feature-icon tone-${tone}`}>
                    <Icon size={20} />
                  </span>
                  <Heading as="h3" variant="small">
                    {title}
                  </Heading>
                  <Text as="p" className="muted">
                    {description}
                  </Text>
                </article>
              ))}
            </div>
          </section>

          <section className="section split">
            <div>
              <Heading as="h2" variant="medium">
                Roadmap
              </Heading>
              <Text as="p" className="muted">
                O que já está pronto e o que vem a seguir.
              </Text>
            </div>

            <Timeline>
              {MILESTONES.map((item) => (
                <Timeline.Item key={item.title}>
                  <Timeline.Badge variant={item.variant}>
                    {item.done ? <ProjectIcon /> : <RocketIcon />}
                  </Timeline.Badge>
                  <Timeline.Body>
                    <Text as="strong">{item.title}</Text>
                    <Text as="p" className="muted">
                      {item.body}
                    </Text>
                  </Timeline.Body>
                </Timeline.Item>
              ))}
            </Timeline>
          </section>
        </Stack>
      </div>

      <style jsx>{`
        .page {
          --br-green: #009c3b;
          --br-green-soft: #e8f8ee;
          --br-yellow: #ffdf00;
          --br-yellow-soft: #fff8cc;
          --br-blue: #002776;
          --br-blue-soft: #e8eefc;
          --br-white: #ffffff;
        }

        .flag-bar {
          height: 4px;
          margin: 0 0 16px;
          background: linear-gradient(
            90deg,
            var(--br-green) 0%,
            var(--br-green) 33.3%,
            var(--br-yellow) 33.3%,
            var(--br-yellow) 66.6%,
            var(--br-blue) 66.6%,
            var(--br-blue) 100%
          );
        }

        .page :global(.build-banner) {
          font-size: 16px;
        }

        .page :global(.build-banner h2) {
          font-size: clamp(18px, 2.4vw, 22px);
          font-weight: 700;
          line-height: 1.35;
        }

        .hero {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
          padding: 8px 0;
        }

        .page :global(.hero-title) {
          max-width: 22ch;
          letter-spacing: -0.02em;
        }

        .page :global(.hero-lead) {
          max-width: 62ch;
          margin: 0;
          font-size: 18px;
          line-height: 1.6;
          color: var(--fgColor-muted, #656d76);
        }

        .section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .split {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 24px;
        }

        .page :global(.muted) {
          margin: 0;
          color: var(--fgColor-muted, #656d76);
        }

        .feature-grid,
        .pillar-grid {
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
          background: var(--br-white);
          box-shadow: var(
            --shadow-resting-small,
            0 1px 0 rgba(31, 35, 40, 0.04)
          );
        }

        .feature-card.tone-green {
          border-left: 6px solid var(--br-green);
        }

        .feature-card.tone-yellow {
          border-left: 6px solid var(--br-yellow);
        }

        .feature-card.tone-blue {
          border-left: 6px solid var(--br-blue);
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
          color: var(--br-green);
          background: var(--br-green-soft);
        }

        .feature-icon.tone-yellow {
          color: #8a7200;
          background: var(--br-yellow-soft);
        }

        .feature-icon.tone-blue {
          color: var(--br-blue);
          background: var(--br-blue-soft);
        }

        @media (min-width: 768px) {
          .pillar-grid {
            grid-template-columns: 1fr 1fr 1fr;
          }

          .feature-grid {
            grid-template-columns: 1fr 1fr;
          }

          .split {
            grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.2fr);
            align-items: start;
          }
        }
      `}</style>
    </DefaultLayout>
  );
}
