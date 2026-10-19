import { useEffect } from "react";
import { useRouter } from "next/router";
import { Spinner } from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";

export default function RecentesIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/recentes/todos/1");
  }, [router]);

  return (
    <DefaultLayout
      metadata={{
        title: "Recentes",
        description: "Publicações no AgroTab ordenadas pelas mais recentes.",
      }}
    >
      <Spinner />
    </DefaultLayout>
  );
}
