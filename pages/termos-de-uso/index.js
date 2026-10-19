import { Heading, Stack } from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import MarkdownViewer from "interface/MarkdownViewer";

const BODY = `Ao utilizar o AgroTab você concorda com os termos abaixo.

## AgroTab

1. O AgroTab existe para ser uma plataforma de **conteúdos de valor concreto** para quem vive e trabalha o **agronegócio brasileiro** — produção, pesquisa, tecnologia, inovação e ciência no campo.
2. Consideramos de valor concreto: notícias, artigos técnicos, tutoriais, indicações, relatos de campo, perguntas bem formuladas e outros formatos que ajudem outras pessoas a tomar decisões melhores no agro.
3. Preferimos **qualidade** a **quantidade**: o objetivo é que o tempo investido na leitura valha a pena.
4. Não adotamos práticas agressivas de engajamento, anúncios enganosos ou manipulação de atenção. O espaço deve ser previsível e seguro para leitura.
5. Não vendemos dados de usuários nem compartilhamos informações pessoais com terceiros para fins comerciais.
6. Coletamos apenas o mínimo necessário para operar e proteger o serviço.

## Usuário

1. Espere-se que as pessoas sejam **claras e respeitosas** ao mesmo tempo. O indicador prático: a conversa aproxima ou afasta a comunidade?
2. Ataques pessoais, agressividade gratuita, sarcasmo generalizado ou conduta que afaste outros usuários podem resultar em **bloqueio permanente** da conta e invalidação de publicações e saldos associados.
3. É proibido manipular qualificações (votos, republicações abusivas, contas coordenadas). O ecossistema precisa de avaliação espontânea.
4. São proibidos atos discriminatórios de qualquer tipo, incluindo discriminação por origem, raça, cor, sexo, identidade de gênero, orientação sexual, idade, deficiência, religião, classe social ou qualquer outra forma de segregação.
5. Publicações com foco **exclusivamente** comercial são proibidas. É bem-vindo um *pitch* de projeto em que você esteja **diretamente envolvido**, desde que devolva conhecimento útil à comunidade (especialmente o lado técnico ou prático no campo). Técnicas passivas de rastreamento (como pixel de tracking) sem interação consciente dos demais usuários não são permitidas.
6. Se descobrir uma falha de segurança com **informações sensíveis**, reporte em privado para \`contato@agrotab.com.br\`. Após a correção, o AgroTab pode publicar um postmortem com o que for seguro compartilhar. Falhas sem dados sensíveis podem ser discutidas na própria comunidade.

## Direitos autorais e propriedade intelectual

1. Você mantém os direitos sobre o que publica e se responsabiliza pelo conteúdo, declarando ter autorização de uso ou enquadramento legal adequado (incluindo limitações da legislação brasileira de direitos autorais).
2. A marca AgroTab, o serviço e o domínio \`agrotab.com.br\` são propriedades intelectuais do projeto AgroTab.
3. O código desta plataforma é uma reimplementação inspirada em comunidades abertas; contribuições e licenças específicas constam no repositório do projeto quando aplicável.

## Garantias

1. O AgroTab é um serviço em evolução e **não oferece garantia** de disponibilidade contínua nem de suporte comercial. A comunidade se esforça para manter o melhor serviço possível.
2. As moedas digitais **AgroCoins** e **AgroCash** têm validade somente dentro do AgroTab e **não possuem vínculo ou lastro** com ativos financeiros da economia real. Imprecisões no sistema de saldos podem ocorrer; corrigiremos o que for razoável, sem transformar essas moedas em direito creditício externo.

## Moderação

1. A moderação pode remover conteúdos e restringir contas que violem estes termos, inclusive de forma permanente quando houver abuso grave ou reiterado.
2. Decisões de moderação buscam proteger a qualidade da conversa e a segurança dos usuários.

## Alterações nestes termos

1. Os termos podem ser atualizados quando necessário. Mudanças relevantes serão comunicadas na própria plataforma, em linguagem simples.

## Histórico

* Documento inicial adaptado à comunidade AgroTab.
`;

export default function TermosDeUsoPage() {
  return (
    <DefaultLayout
      metadata={{
        title: "Termos de Uso",
        description:
          "Termos de Uso do AgroTab: conduta, privacidade, moderação e moedas internas da comunidade agro.",
      }}
    >
      <Stack gap="normal">
        <Heading as="h1">Termos de Uso</Heading>
        <MarkdownViewer value={BODY} />
      </Stack>
    </DefaultLayout>
  );
}
