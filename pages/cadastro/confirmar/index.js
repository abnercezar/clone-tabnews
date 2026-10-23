import { Banner } from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";

export default function ConfirmRegisterPage() {
  return (
    <DefaultLayout
      contentWidth="small"
      metadata={{
        title: "Confirme seu email",
        noIndex: true,
      }}
    >
      <Banner
        variant="warning"
        title="Falta só uma etapa!"
        description="Abra o email enviado pelo AgroTab e clique no link para ativar sua conta. O link vale por 15 minutos. Se não encontrar o email, confira a caixa de spam."
      />
    </DefaultLayout>
  );
}
