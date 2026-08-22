import {
  Banner,
  Header,
  Heading,
  Label,
  LabelGroup,
  LinkButton,
  PageLayout,
  Stack,
  Text,
  Timeline,
} from "@primer/react";
import {
  ArrowRightIcon,
  BeakerIcon,
  CommentDiscussionIcon,
  CpuIcon,
  GraphIcon,
  LightBulbIcon,
  PeopleIcon,
  ProjectIcon,
  RocketIcon,
  RssIcon,
} from "@primer/octicons-react";

const FEATURES = [
  {
    title: "Feed de conteúdo",
    description:
      "Curadoria de artigos, pesquisas e casos reais do agronegócio brasileiro.",
    icon: RssIcon,
    tone: "green",
  },
  {
    title: "Discussões",
    description:
      "Comentários e debates em cima do conteúdo, com quem vive o campo e a agtech.",
    icon: CommentDiscussionIcon,
    tone: "blue",
  },
  {
    title: "Cotações",
    description:
      "Acompanhamento de mercado para apoiar decisões no dia a dia da fazenda.",
    icon: GraphIcon,
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
    title: "Feed e discussões",
    body: "Conteúdo curado e conversas sobre tecnologia, inovação e ciência no agro.",
    variant: "attention",
    done: false,
  },
  {
    title: "Cotações e ferramentas",
    body: "Indicadores de mercado e recursos para a gestão rural.",
    variant: "accent",
    done: false,
  },
];

export default function Home() {
  return (
    <div className="page">
      <div className="flag-bar" aria-hidden />
      <Header>
        <Header.Item full>
          <Header.Link href="/" className="brand-link">
            <span className="brand-avatar">
              <img
                src="/logo-agrotab.png"
                alt="AgroTab"
                className="brand-logo"
              />
            </span>
          </Header.Link>
        </Header.Item>
        <Header.Item>
          <Header.Link href="/cadastro">Cadastro</Header.Link>
        </Header.Item>
      </Header>

      <PageLayout padding="normal" containerWidth="large">
        <PageLayout.Content>
          <Stack gap="spacious" paddingBlock="normal">
            <Banner
              variant="warning"
              className="build-banner"
              title="Aguarde, estamos construindo algo surpreendente"
              description="Em construção"
            />

            <section className="hero">
              <LabelGroup>
                <Label variant="success">AgroTab</Label>
                <Label variant="attention">Em construção</Label>
                <Label variant="accent">Brasil</Label>
              </LabelGroup>

              <Heading as="h1" variant="large" className="hero-title">
                Tecnologia, inovação e ciência para o campo crescer
              </Heading>

              <Text as="p" className="hero-lead">
                Curadoria e troca de conhecimento para o agronegócio: o que a
                pesquisa, a inovação e o mercado estão dizendo sobre o campo —
                do laboratório à lavoura.
              </Text>

              <Stack
                direction={{ narrow: "vertical", regular: "horizontal" }}
                gap="condensed"
                align="center"
              >
                <LinkButton
                  href="/cadastro"
                  variant="primary"
                  size="large"
                  trailingVisual={ArrowRightIcon}
                >
                  Quero ser avisado no lançamento
                </LinkButton>
                <LinkButton href="#o-que-vem" variant="default" size="large">
                  Ver o que está por vir
                </LinkButton>
              </Stack>
            </section>

            <section id="pilares" className="section">
              <Heading as="h2" variant="medium">
                Tecnologia, inovação e ciência
              </Heading>
              <Text as="p" className="muted">
                Três frentes que sustentam o AgroTab: o que já existe no campo
                brasileiro, o que ainda está nascendo e o que a pesquisa
                comprova.
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

            <section id="o-que-vem" className="section">
              <Heading as="h2" variant="medium">
                O que o AgroTab oferece
              </Heading>
              <Text as="p" className="muted">
                Conteúdo, discussões, cotações e comunidade para o agronegócio
                brasileiro.
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
                  Acompanhe o que está sendo construído até o lançamento.
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
        </PageLayout.Content>

        <PageLayout.Footer divider="line">
          <Text as="p" className="footer-copy">
            &copy; {new Date().getFullYear()} AgroTab. Todos os direitos
            reservados.
          </Text>
        </PageLayout.Footer>
      </PageLayout>

      <style jsx>{`
        .page {
          --br-green: #009c3b;
          --br-green-soft: #e8f8ee;
          --br-yellow: #ffdf00;
          --br-yellow-soft: #fff8cc;
          --br-blue: #002776;
          --br-blue-soft: #e8eefc;
          --br-white: #ffffff;
          min-height: 100dvh;
          background: linear-gradient(
            180deg,
            var(--br-white) 0%,
            #f4fbf6 42%,
            #f7f9ff 100%
          );
          color: var(--fgColor-default, #1f2328);
        }

        .page :global(.build-banner) {
          font-size: 16px;
        }

        .page :global(.build-banner h2) {
          font-size: clamp(18px, 2.4vw, 22px);
          font-weight: 700;
          line-height: 1.35;
        }
          height: 4px;
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

        .page :global(.brand-link) {
          display: inline-flex;
          align-items: center;
          line-height: 0;
        }

        .brand-avatar {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          background: var(--br-white, #ffffff);
          border: 1px solid var(--borderColor-default, #d0d7de);
          box-shadow: var(
            --shadow-resting-small,
            0 1px 0 rgba(31, 35, 40, 0.04)
          );
        }

        .brand-logo {
          width: 78%;
          height: 78%;
          object-fit: contain;
        }

        .hero {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
          padding: 24px 0 8px;
        }

        .page :global(.hero-title) {
          max-width: 18ch;
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

        .feature-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-top: 8px;
        }

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

        .page :global(.footer-copy) {
          margin: 0;
          font-size: 13px;
          color: var(--fgColor-muted, #656d76);
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
    </div>
  );
}
