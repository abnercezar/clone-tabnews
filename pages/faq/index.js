import { Heading, Link, Stack, Text } from "@primer/react";
import DefaultLayout from "interface/DefaultLayout";
import MarkdownViewer from "interface/MarkdownViewer";

const FAQ_ITEMS = [
  {
    id: "agrotab",
    question: "O que é o AgroTab?",
    answer: `O AgroTab é uma plataforma comunitária focada no **agronegócio brasileiro**, para debates e troca de conhecimento por meio de publicações e comentários criados pelos próprios usuários.`,
  },
  {
    id: "proposito",
    question: "Qual é o propósito do AgroTab?",
    answer: `Queremos um espaço com **conteúdos de valor concreto** para quem produz, pesquisa, empreende ou trabalha com tecnologia, inovação e ciência no campo.

Publicações e comentários têm o mesmo peso: ambos são conteúdos. Um comentário também tem página própria (basta abrir o link do comentário).`,
  },
  {
    id: "conteudo",
    question: "Que tipo de conteúdo eu posso publicar?",
    answer: `Notícias, artigos, tutoriais, indicações, casos de manejo, dúvidas bem formuladas, experiências de campo e outros formatos — desde que o assunto seja [aceito no AgroTab](#assunto).`,
  },
  {
    id: "assunto",
    question: "Que tipo de assunto é aceito?",
    answer: `O conteúdo deve estar ligado ao agronegócio brasileiro: produção rural, pecuária, agricultura, agtech, dados no campo, pesquisa agropecuária, gestão da fazenda, mercado e políticas públicas vistas sob a ótica do agro.

Temas adjacentes (produtividade, empreendedorismo rural, educação no campo) também cabem quando tratados a partir dessa realidade.`,
  },
  {
    id: "qualidade",
    question: "Como criar um bom conteúdo?",
    answer: `Algumas práticas ajudam a comunidade a aproveitar melhor o que você publica:

- **Revise a escrita:** gramática e digitação claras facilitam a leitura.
- **Formate com Markdown:** títulos, listas, trechos destacados e links de referência.
- **Use fontes e imagens quando fizer sentido:** credibilidade e contexto importam no agro.
- **Confirme os fatos:** se for opinião, deixe isso explícito.`,
  },
  {
    id: "agrocash",
    question: "O que é AgroCash?",
    answer: `AgroCash é a moeda interna usada para recompensar quem qualifica conteúdos e para publicar em espaços de anúncio (por exemplo, publicações patrocinadas), sempre dentro das regras dos [Termos de Uso](/termos-de-uso).

**AgroCash não tem lastro** com dinheiro real nem com ativos financeiros externos: vale apenas dentro do ecossistema do AgroTab.`,
  },
  {
    id: "ganhar-agrocash",
    question: "Como ganhar AgroCash?",
    answer: `Ao qualificar conteúdos de outras pessoas você consome AgroCoins e, na mesma operação, recebe AgroCash — ajuda a comunidade a destacar o que tem valor.`,
  },
  {
    id: "utilizar-agrocash",
    question: "Como utilizar meu AgroCash?",
    answer: `Hoje o uso principal é criar **publicações patrocinadas** na página [Publicar](/publicar), marcando a opção correspondente. É preciso ter saldo suficiente de AgroCash; o valor é consumido na criação do anúncio.`,
  },
  {
    id: "publicacao-patrocinada",
    question: "Como funciona uma publicação patrocinada?",
    answer: `É um conteúdo do tipo anúncio (\`type=ad\`) exibido em espaços de destaque do feed. O título deve ser objetivo; se houver link de fonte externo, o domínio pode aparecer junto ao título.

O orçamento inicial consome AgroCash na publicação. Detalhes de consumo do orçamento podem evoluir com a plataforma.`,
  },
  {
    id: "agrocoin",
    question: "O que é AgroCoin?",
    answer: `AgroCoin (também chamada de AgroCoins no plural) é a moeda de qualificação de conteúdos. Você gasta AgroCoins para avaliar publicações e comentários de outras pessoas e ganha ou perde AgroCoins conforme a comunidade avalia os seus.

**AgroCoins não têm lastro** com a economia real: existem só dentro do AgroTab.`,
  },
  {
    id: "ganhar-agrocoins",
    question: "Como ganhar AgroCoins?",
    answer: `As formas principais são:

- **Criar conteúdo** com texto relevante (há um critério mínimo de qualidade).
- **Receber votos positivos** em suas publicações e comentários.
- **Participar da comunidade** ao longo do tempo — a plataforma pode ajustar recompensas conforme o uso.`,
  },
  {
    id: "perder-agrocoins",
    question: "É possível perder AgroCoins?",
    answer: `Sim. Você pode perder AgroCoins ao apagar um conteúdo (quando houver crédito associado), ao receber votos negativos ou se a moderação remover publicações suas por violação das regras.`,
  },
  {
    id: "utilizar-agrocoins",
    question: "Como utilizar meus AgroCoins?",
    answer: `Use AgroCoins para qualificar conteúdos de outros usuários. Em cada avaliação positiva ou negativa costumam ser consumidos AgroCoins e creditado AgroCash no seu saldo.`,
  },
  {
    id: "divulgar-projeto",
    question: "Posso divulgar projetos ou negócios em que estou envolvido?",
    answer: `Sim, desde que agregue valor: detalhe técnico, experiência de implantação, erros e aprendizados no campo.

Se for um pitch curto, prefira deixar isso claro no título (por exemplo: \`Pitch: nome do projeto\`). Publicações com foco **exclusivamente** comercial são proibidas — veja os [Termos de Uso](/termos-de-uso).`,
  },
  {
    id: "republicar",
    question: "Posso publicar o mesmo conteúdo várias vezes?",
    answer: `Não. Se for voltar ao mesmo tema, espere tempo razoável e traga algo substancialmente novo. Apagar conteúdo mal avaliado só para republicar e manipular qualificações pode levar a banimento.`,
  },
  {
    id: "bloqueio-publicacao",
    question: "Não consigo criar novas publicações. O que fazer?",
    answer: `Se a plataforma impedir novas publicações por causa de conteúdos recentes mal avaliados, revise e, se fizer sentido, remova os que estão zerados ou negativos. Isso protege a comunidade e dá espaço para você ajustar o tom antes de publicar de novo.`,
  },
  {
    id: "relevantes",
    question: 'Como funciona a página "Relevantes"?',
    answer: `A página [Relevantes](/) prioriza publicações recentes com boa avaliação e engajamento (comentários e AgroCoins), com decadência temporal — conteúdos bons, mas antigos, cedem espaço aos mais atuais.`,
  },
  {
    id: "recentes",
    question: 'O que há em "Recentes"?',
    answer: `Em [Recentes](/recentes) você encontra abas tipadas: **Todos** (publicações raiz por ordem cronológica), **Comentários** e **Classificados** (anúncios patrocinados).`,
  },
  {
    id: "moderacao",
    question: "Como funciona a moderação?",
    answer: `Conteúdos e contas que violem os [Termos de Uso](/termos-de-uso) — abusos, discriminação, spam comercial, manipulação de votos — podem ser removidos ou banidos por quem tem permissão de moderação.

Em caso de dúvida sobre uma publicação, use o canal de [contato](mailto:contato@agrotab.com.br).`,
  },
  {
    id: "sugestoes-bugs",
    question: "Onde posso fazer sugestões ou reportar bugs?",
    answer: `Para ideias e bugs que **não** envolvam dados sensíveis, escreva para [contato@agrotab.com.br](mailto:contato@agrotab.com.br) ou publique na própria comunidade quando fizer sentido.

Se encontrar **falha de segurança** com dados sensíveis, reporte **em privado** para o mesmo e-mail — não divulgue o problema em público antes da correção.`,
  },
  {
    id: "contribuir",
    question: "Como posso contribuir com o AgroTab?",
    answer: `Você contribui ao:

- **Publicar e comentar** com conteúdo útil para o agro.
- **Qualificar** com AgroCoins o que merece destaque (ou não).
- **Reportar problemas** e sugerir melhorias com respeito à comunidade.`,
  },
];

export default function FaqPage() {
  return (
    <DefaultLayout
      metadata={{
        title: "FAQ - Perguntas frequentes",
        description:
          "Perguntas frequentes sobre o AgroTab — comunidade de conteúdos para o agronegócio brasileiro.",
      }}
    >
      <Stack gap="spacious">
        <Stack gap="condensed">
          <Heading as="h1">FAQ - Perguntas Frequentes</Heading>
          <Text as="p" sx={{ color: "fg.muted", m: 0 }}>
            Dúvidas comuns sobre a plataforma. Também vale ler os{" "}
            <Link href="/termos-de-uso">Termos de Uso</Link>.
          </Text>
        </Stack>

        <Stack as="nav" aria-label="Sumário do FAQ" gap="none">
          {FAQ_ITEMS.map((item) => (
            <Text as="div" key={item.id} sx={{ py: 1 }}>
              <Link href={`#${item.id}`}>{item.question}</Link>
            </Text>
          ))}
        </Stack>

        <Stack gap="spacious">
          {FAQ_ITEMS.map((item) => (
            <Stack as="section" key={item.id} id={item.id} gap="condensed">
              <Heading as="h2" variant="medium">
                {item.question}
              </Heading>
              <MarkdownViewer value={item.answer} />
            </Stack>
          ))}
        </Stack>
      </Stack>
    </DefaultLayout>
  );
}
