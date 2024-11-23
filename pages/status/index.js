import useSWR from "swr";

async function fetchApi(key) {
  const response = await fetch(key);
  const responseBody = await response.json();
  return responseBody;
}

export default function StatusPage() {
  return (
    <>
      <h1>Status</h1>
      <UpdatedAt />
    </>
  );
}

function UpdatedAt() {
  const { isLoading, data, error } = useSWR("/api/v1/status", fetchApi, {
    refreshInterval: 2000,
  });

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (error) {
    return <div>Erro ao carregar dados</div>;
  }

  if (!data || !data.dependencies || !data.dependencies.database) {
    return <div>Dados incompletos</div>;
  }

  const updatedAtText = new Date(data.updated_at).toLocaleString("pt-BR");
  const { version, max_connections, opened_connections } =
    data.dependencies.database;

  return (
    <div>
      <div style={{ marginBottom: "10px" }}>
        Última atualização: {updatedAtText}
      </div>
      <div style={{ marginBottom: "10px" }}>
        Versão do banco de dados: {version}
      </div>
      <div style={{ marginBottom: "10px" }}>
        Máximo de conexões: {max_connections}
      </div>
      <div style={{ marginBottom: "10px" }}>
        Conexões abertas: {opened_connections}
      </div>
    </div>
  );
}
