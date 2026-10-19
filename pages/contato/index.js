import { Heading, Stack } from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import MarkdownViewer from "interface/MarkdownViewer";

const BODY = `Leia com atenção qual a melhor forma de entrar em contato:

## Anúncios, publicidade e patrocínio

1. O AgroTab é um projeto em que os anúncios são dos **próprios usuários** que criam conteúdos de valor concreto para o agronegócio e participam ativamente da comunidade.
2. Caso você seja um anunciante externo, pedimos que use o fluxo de [publicações patrocinadas](/publicar) quando disponível, em vez de contatar a equipe para veiculação comercial.

## Dúvidas, sugestões e reclamações

1. Nestes casos, pedimos que abra uma issue no [repositório do projeto](https://github.com/abnercezar/clone-tabnews), para que outras pessoas possam se beneficiar e participar.
2. Você também pode criar uma [nova publicação](/publicar) no próprio AgroTab para que a comunidade participe.

## Vulnerabilidades de segurança

1. Se descobrir ou esbarrar em alguma falha, brecha ou vulnerabilidade de segurança e encontrar **informações sensíveis** (por exemplo, dados privados de outros usuários ou acesso não autorizado), entre em contato de forma **privada** pelo e-mail \`contato@agrotab.com.br\`.
2. Após o fechamento da falha, o AgroTab se compromete a criar um **postmortem público** com o que for seguro compartilhar, protegendo dados sensíveis dos usuários.
3. Falhas sem informações sensíveis e que não prejudiquem outros usuários podem ser reportadas por issues no [repositório do projeto](https://github.com/abnercezar/clone-tabnews).

## Outros assuntos

1. Para assuntos que não se enquadrem nas categorias acima, escreva para \`contato@agrotab.com.br\`.
2. Em paralelo, vale ler os [Termos de Uso](/termos-de-uso), que esclarecem várias dúvidas comuns.
`;

export default function ContatoPage() {
  return (
    <DefaultLayout
      metadata={{
        title: "Contato",
        description:
          "Entre em contato com a equipe do AgroTab para reportar problemas, sugerir melhorias ou tirar dúvidas sobre a plataforma.",
      }}
    >
      <Stack gap="normal">
        <Heading as="h1">Contato</Heading>
        <MarkdownViewer value={BODY} />
      </Stack>
    </DefaultLayout>
  );
}
