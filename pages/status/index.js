import useSWR from "swr";

// Função para buscar dados da API
const fetchApi = async (key) => {
  const response = await fetch(key);
  return response.json();
};

// Componente principal da página de status
const StatusPage = () => (
  <>
    <h1>Status</h1>
    <UpdatedAt />
    <h1>DataBase</h1>
    <DatabaseStatus />
  </>
);

// Componente para exibir a última atualização
const UpdatedAt = () => {
  const { isLoading, data, error } = useSWR("/api/v1/status", fetchApi, {
    refreshInterval: 2000,
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar dados</div>;
  if (!data) return <div>Dados incompletos</div>;

  const updatedAtText = new Date(data.updated_at).toLocaleString("pt-BR");

  return (
    <div>
      <StatusItem label="Última atualização" value={updatedAtText} />
    </div>
  );
};

// Componente para exibir informações do banco de dados
const DatabaseStatus = () => {
  const { isLoading, data, error } = useSWR("/api/v1/status", fetchApi, {
    refreshInterval: 2000,
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar dados</div>;
  if (!data?.dependencies?.database) return <div>Dados incompletos</div>;

  const { version, max_connections, opened_connections } =
    data.dependencies.database;

  return (
    <div>
      <StatusItem label="Versão do banco de dados" value={version} />
      <StatusItem label="Máximo de conexões" value={max_connections} />
      <StatusItem label="Conexões abertas" value={opened_connections} />
    </div>
  );
};

// Componente para exibir um item de status com um rótulo e valor
const StatusItem = ({ label, value }) => (
  <div style={{ marginBottom: "10px" }}>
    {label}: {value}
  </div>
);

export default StatusPage;
