import { Banner, Link } from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";

export default function RecoverPasswordSuccessPage() {
  return (
    <DefaultLayout
      contentWidth="small"
      metadata={{
        title: "Nova senha definida",
      }}
    >
      <Banner
        variant="success"
        title="Nova senha definida com sucesso!"
        description={
          <>
            Você já pode entrar com a nova senha.{" "}
            <Link href="/login">Ir para o Login</Link>
          </>
        }
      />
    </DefaultLayout>
  );
}
