import useSWR from "swr";
async function fetchApi(key) {
  const response = await fetch(key);
  // Converte a resposta para JSON
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
  const { isLoading, data } = useSWR("/api/v1/status", fetchApi, {
    refreshInterval: 2000,
  });

  let updatedAtText = "Carregando...";

  let { version, max_connections, opened_connections } =
    data.dependencies.database;

  if (!isLoading && data) {
    updatedAtText = new Date(data.updated_at).toLocaleString("pt-BR");
  }
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
