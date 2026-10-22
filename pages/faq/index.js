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
- **Escreva o título como você buscaria no Google:** por exemplo, "Como controlar percevejo na soja após o R5?".
- **Escolha as tags** da cultura ou criação, do tema e da região: assim quem vive o mesmo problema encontra sua pergunta.
- **Mande fotos** pelo botão **Foto** do editor, direto da câmera ou da galeria (até 6 por publicação).
- **Use a barra do editor** para negrito, listas e links. Quem já conhece Markdown pode trocar para o modo avançado.
- **Use fontes** quando fizer sentido: credibilidade e contexto importam no agro.
- **Confirme os fatos:** se for opinião, deixe isso explícito.`,
  },
  {
    id: "util",
    question: "Para que servem os botões Útil 👍 e Não útil?",
    answer: `Depois de ler uma pergunta, resposta ou relato, toque em **Útil 👍** se aquilo ajudou ou **Não útil** se não ajudou. Os votos fazem as melhores respostas aparecerem primeiro e mostram quem está ajudando a comunidade.

Para votar é preciso ter conta. O número ao lado dos botões é o saldo de votos daquele conteúdo.`,
  },
  {
    id: "agrocoin",
    question: "O que é a reputação no perfil?",
    answer: `É um número só, que cresce quando a comunidade marca seus conteúdos como **úteis** e diminui com votos de **não útil** ou quando um conteúdo seu é removido por quebrar as regras. Publicar com frequência e participar também ajudam.

Ela não vale dinheiro: serve para mostrar, no AgroTab, quem costuma ajudar. (Por dentro, o sistema ainda chama essa pontuação de AgroCoin.)`,
  },
  {
    id: "agrocash",
    question: "O que é AgroCash?",
    answer: `É um saldo que você acumula ao votar em conteúdos de outras pessoas. Hoje ele serve só para uma coisa: **patrocinar uma publicação** na página [Publicar](/publicar), que passa a aparecer no espaço de anúncio, marcada como Patrocinado.

AgroCash **não é dinheiro** e não pode ser trocado por nada fora do AgroTab. Se você não pretende patrocinar nada, pode ignorá-lo.`,
  },
  {
    id: "publicacao-patrocinada",
    question: "Como funciona uma publicação patrocinada?",
    answer: `Ao publicar, marque a opção de patrocínio (é preciso ter AgroCash suficiente; você confirma antes de gastar). A publicação aparece no espaço de anúncio, sempre marcada como **Patrocinado**, e fica fora da lista de Relevantes.`,
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
    answer: `A página [Relevantes](/) prioriza publicações recentes com boa avaliação e engajamento (comentários e votos de útil), com decadência temporal — conteúdos bons, mas antigos, cedem espaço aos mais atuais.`,
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
- **Votar Útil 👍** no que ajudou (e Não útil no que não ajudou).
- **Compartilhar no WhatsApp** as discussões que podem ajudar alguém.
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
