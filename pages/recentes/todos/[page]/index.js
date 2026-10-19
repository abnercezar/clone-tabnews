import RecentesFeed from "interface/RecentesFeed";

export default function RecentesTodosPage() {
  return (
    <RecentesFeed
      basePath="/recentes/todos"
      title="Conteúdos Recentes"
      description="Publicações no AgroTab ordenadas pelas mais recentes."
      showSponsorship
    />
  );
}
