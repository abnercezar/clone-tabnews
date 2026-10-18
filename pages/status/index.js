import useSWR from "swr";
import { Flash, Heading, Stack, Text } from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import ui from "interface/styles.module.css";

// Função para buscar dados da API
async function fetchAPI(key) {
  const response = await fetch(key);

  if (!response.ok) {
    throw new Error(`Status ${response.status}`);
  }

  return response.json();
}

// Componente principal da página de status
export default function StatusPage() {
  const { isLoading, data, error } = useSWR("/api/v1/status", fetchAPI, {
    refreshInterval: 2000,
  });

  return (
    <DefaultLayout metadata={{ title: "Status" }}>
      <Stack gap="normal">
        <Heading as="h1">Status</Heading>

        {error && (
          <Flash variant="danger">
            Não foi possível consultar o status do sistema.
          </Flash>
        )}

        {isLoading && <Text as="p">Carregando...</Text>}

        {data && (
          <>
            <Text className={ui.muted}>
              Última atualização:{" "}
              {new Date(data.updated_at).toLocaleString("pt-BR")}
            </Text>

            <Stack gap="condensed">
              <Heading as="h2" variant="small">
                Banco de dados
              </Heading>
              {data.dependencies.database.version && (
                <Text>Versão: {data.dependencies.database.version}</Text>
              )}
              <Text>
                Conexões abertas:{" "}
                {data.dependencies.database.opened_connections}
              </Text>
              <Text>
                Conexões máximas: {data.dependencies.database.max_connections}
              </Text>
            </Stack>
          </>
        )}
      </Stack>
    </DefaultLayout>
  );
}
