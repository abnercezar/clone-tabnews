import { Heading, LinkButton, Stack, Text } from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import ui from "interface/styles.module.css";

// Endereço que não existe: mesma moldura do site e caminhos de volta.
export default function NotFoundPage() {
  return (
    <DefaultLayout
      metadata={{
        title: "Página não encontrada",
        description: "Este endereço não existe no AgroTab.",
        noIndex: true,
      }}
    >
      <Stack gap="normal" align="center" className={ui.emptyState}>
        <Heading as="h1" variant="medium">
          Página não encontrada
        </Heading>
        <Text as="p" className={ui.muted}>
          O endereço pode ter mudado ou a publicação foi removida.
        </Text>
        <Stack direction="horizontal" gap="condensed" wrap="wrap">
          <LinkButton href="/" variant="primary">
            Voltar para o feed
          </LinkButton>
          <LinkButton href="/recentes">Ver publicações recentes</LinkButton>
        </Stack>
      </Stack>
    </DefaultLayout>
  );
}
