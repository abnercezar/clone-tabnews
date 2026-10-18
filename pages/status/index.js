import dynamic from "next/dynamic";
import useSWR from "swr";
import { Heading, Label, LabelGroup, Truncate } from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import { BarChart } from "interface/Charts";
import analytics from "models/analytics.js";
import classes from "./index.module.css";

const VotesGraph = dynamic(() => import("interface/VotesGraph"), {
  ssr: false,
});

async function fetchAPI(key) {
  const response = await fetch(key);
  if (!response.ok) {
    throw new Error(`Status ${response.status}`);
  }
  return response.json();
}

export default function StatusPage({
  usersCreated,
  rootContentPublished,
  childContentPublished,
  votesTaken,
  votesGraph,
}) {
  const votesAmount = (votesGraph?.edges || []).reduce(
    (acc, curr) => acc + (curr.value || 0),
    0,
  );

  const { data: statusObject, isLoading: statusObjectIsLoading } = useSWR(
    "/api/v1/status",
    fetchAPI,
    { refreshInterval: 1000 * 10 },
  );

  return (
    <DefaultLayout
      metadata={{
        title: "Estatísticas e Status do Site",
        description:
          "Estatísticas e status do AgroTab: cadastros, publicações, respostas, qualificações e dados técnicos do site.",
      }}
    >
      <div className={classes.Wrapper}>
        <Heading as="h1">Estatísticas e Status do Site</Heading>

        <BarChart
          title="Novos cadastros"
          data={usersCreated}
          yDataKey="cadastros"
        />

        <BarChart
          title="Novas publicações"
          data={rootContentPublished}
          yDataKey="conteudos"
          name="conteúdos"
        />

        <BarChart
          title="Novas respostas"
          data={childContentPublished}
          yDataKey="respostas"
        />

        <BarChart
          title="Novas qualificações"
          data={votesTaken}
          yDataKey="votos"
        />

        <VotesGraph
          title={`Rede de qualificações (últimas ${votesAmount})`}
          data={votesGraph}
        />

        <div>
          <h2>Banco de Dados</h2>

          {!statusObjectIsLoading && statusObject && (
            <div className={classes.Grid}>
              <div>
                Status:{" "}
                <Label
                  variant={
                    statusObject.dependencies.database.status
                      ? "success"
                      : "danger"
                  }
                >
                  {statusObject.dependencies.database.status}
                </Label>
              </div>
              <div>
                Conexões disponíveis:{" "}
                <Label
                  variant={
                    statusObject.dependencies.database.max_connections > 70
                      ? "success"
                      : "danger"
                  }
                >
                  {statusObject.dependencies.database.max_connections}
                </Label>
              </div>
              <div>
                Conexões abertas:{" "}
                <Label
                  variant={
                    statusObject.dependencies.database.opened_connections <
                    statusObject.dependencies.database.max_connections * 0.7
                      ? "success"
                      : "danger"
                  }
                >
                  {statusObject.dependencies.database.opened_connections}
                </Label>
              </div>
              <div>
                Latência:{" "}
                <LabelGroup>
                  <Label
                    variant={
                      statusObject.dependencies.database.latency.first_query <
                      200
                        ? "success"
                        : "danger"
                    }
                  >
                    {`${Math.round(statusObject.dependencies.database.latency.first_query)}ms`}
                  </Label>
                  <Label
                    variant={
                      statusObject.dependencies.database.latency.second_query <
                      200
                        ? "success"
                        : "danger"
                    }
                  >
                    {`${Math.round(statusObject.dependencies.database.latency.second_query)}ms`}
                  </Label>
                  <Label
                    variant={
                      statusObject.dependencies.database.latency.third_query <
                      200
                        ? "success"
                        : "danger"
                    }
                  >
                    {`${Math.round(statusObject.dependencies.database.latency.third_query)}ms`}
                  </Label>
                </LabelGroup>
              </div>
              <div>
                Versão do PostgreSQL:{" "}
                <Label
                  variant={
                    statusObject.dependencies.database.version
                      ? "success"
                      : "danger"
                  }
                >
                  {statusObject.dependencies.database.version}
                </Label>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2>Servidor Web</h2>

          {!statusObjectIsLoading && statusObject && (
            <div className={classes.Grid}>
              <div>
                Status:{" "}
                <Label
                  variant={
                    statusObject.dependencies.webserver.status
                      ? "success"
                      : "danger"
                  }
                >
                  {statusObject.dependencies.webserver.status}
                </Label>
              </div>
              <div>
                Provedor:{" "}
                <Label
                  variant={
                    statusObject.dependencies.webserver.provider
                      ? "success"
                      : "danger"
                  }
                >
                  {statusObject.dependencies.webserver.provider}
                </Label>
              </div>
              <div>
                Ambiente:{" "}
                <Label
                  variant={
                    statusObject.dependencies.webserver.environment
                      ? "success"
                      : "danger"
                  }
                >
                  {statusObject.dependencies.webserver.environment}
                </Label>
              </div>
              <div>
                Região na AWS:{" "}
                <Label
                  variant={
                    statusObject.dependencies.webserver.aws_region
                      ? "success"
                      : "danger"
                  }
                >
                  {statusObject.dependencies.webserver.aws_region || "—"}
                </Label>
              </div>
              <div>
                Região na Vercel:{" "}
                <Label
                  variant={
                    statusObject.dependencies.webserver.vercel_region
                      ? "success"
                      : "danger"
                  }
                >
                  {statusObject.dependencies.webserver.vercel_region || "—"}
                </Label>
              </div>
              <div>
                Timezone:{" "}
                <Label
                  variant={
                    statusObject.dependencies.webserver.timezone
                      ? "success"
                      : "danger"
                  }
                >
                  {statusObject.dependencies.webserver.timezone}
                </Label>
              </div>
              <div>
                Autor do último commit:{" "}
                <Label
                  variant={
                    statusObject.dependencies.webserver.last_commit_author
                      ? "success"
                      : "danger"
                  }
                >
                  <Truncate inline expandable className={classes.Truncate}>
                    {statusObject.dependencies.webserver.last_commit_author ||
                      "—"}
                  </Truncate>
                </Label>
              </div>
              <div>
                SHA do commit:{" "}
                <Label
                  variant={
                    statusObject.dependencies.webserver.last_commit_message_sha
                      ? "success"
                      : "danger"
                  }
                >
                  <Truncate inline expandable className={classes.Truncate}>
                    {statusObject.dependencies.webserver
                      .last_commit_message_sha || "—"}
                  </Truncate>
                </Label>
              </div>
              <div>
                Versão do Node.js:{" "}
                <Label
                  variant={
                    statusObject.dependencies.webserver.version
                      ? "success"
                      : "danger"
                  }
                >
                  {statusObject.dependencies.webserver.version}
                </Label>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2>Contribuidores</h2>

          <a
            href="https://github.com/abnercezar/clone-tabnews/graphs/contributors"
            className={classes.ContributorsLink}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={classes.ContributorsImage}
              src="https://contributors-img.web.app/image?repo=abnercezar/clone-tabnews&max=100"
              alt="Lista de contribuidores"
            />
          </a>
        </div>
      </div>
    </DefaultLayout>
  );
}

export async function getServerSideProps() {
  const [
    usersCreated,
    rootContentPublished,
    childContentPublished,
    votesTaken,
    votesGraph,
  ] = await Promise.all([
    analytics.getUsersCreated(),
    analytics.getRootContentsPublished(),
    analytics.getChildContentsPublished(),
    analytics.getVotesTaken(),
    analytics.getVotesGraph({ limit: 500 }),
  ]);

  return {
    props: {
      usersCreated,
      rootContentPublished,
      childContentPublished,
      votesTaken,
      votesGraph,
    },
  };
}
