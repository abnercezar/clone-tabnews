import RecentesFeed from "interface/RecentesFeed";

export default function RecentesComentariosPage() {
  return (
    <RecentesFeed
      basePath="/recentes/comentarios"
      title="Comentários Recentes"
      description="Comentários no AgroTab ordenados pelos mais recentes."
      withChildren
    />
  );
}
