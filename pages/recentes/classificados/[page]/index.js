import RecentesFeed from "interface/RecentesFeed";

export default function RecentesClassificadosPage() {
  return (
    <RecentesFeed
      basePath="/recentes/classificados"
      title="Classificados Recentes"
      description="Publicações patrocinadas no AgroTab ordenadas pelas mais recentes."
      type="ad"
    />
  );
}
