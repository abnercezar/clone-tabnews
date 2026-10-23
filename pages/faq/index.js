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
- **Mande fotos** pelo botão **Foto** do editor, direto da câmera ou da galeria (até 6 por publicação, JPEG, PNG ou WebP, no máximo 8 MB). Vídeo não é aceito.
- **Use a barra do editor** para negrito, listas e links. Quem já conhece Markdown pode trocar para o modo avançado.
- **Use fontes** quando fizer sentido: credibilidade e contexto importam no agro.
- **Confirme os fatos:** se for opinião, deixe isso explícito.`,
  },
  {
    id: "util",
    question: "Para que servem os botões Útil 👍 e Não útil?",
    answer: `Depois de ler uma pergunta, resposta ou relato, toque em **Útil 👍** se aquilo ajudou ou **Não útil** se não ajudou. Os votos fazem as melhores respostas aparecerem primeiro.

Para votar é preciso ter conta e pelo menos **2 AgroCoins**. Cada voto, útil ou não útil, debita 2 AgroCoins de quem vota e credita **1 AgroCash** para essa pessoa. O autor e a publicação ganham 1 AgroCoin no útil, ou perdem 1 no não útil. Não dá para votar no próprio conteúdo.`,
  },
  {
    id: "agrocoin",
    question: "O que é o AgroCoin?",
    answer: `É a **moeda** do AgroTab. No cabeçalho e no perfil o saldo aparece com um círculo.

Publicar não cobra moeda. Um texto com substância começa com **1 AgroCoin** na publicação. O autor só recebe moedas a mais quando o prestígio das publicações recentes é positivo. Texto curto demais não coloca AgroCoin nem na publicação nem no autor. Responder o próprio conteúdo também não coloca AgroCoin na resposta nem no autor.

Dá para ganhar AgroCoin de três jeitos:

- **Publicando** um texto com substância, como descrito acima.
- **Recebendo útil** em um conteúdo seu: cada voto soma 1 AgroCoin para você e para a publicação.
- **Recompensa diária:** quem entra no site e já publicou pode receber AgroCoins uma vez por dia. Quanto melhor avaliados estiverem os conteúdos recentes e menor estiver o saldo, maior tende a ser essa recompensa.

O saldo desce ao votar (2 AgroCoins por voto) e ao receber **não útil**.

Se você apaga um conteúdo com saldo acima de zero, saem os AgroCoins que você ganhou na criação e nos votos úteis daquela publicação. Se o saldo estiver em zero ou negativo, sai só o crédito da criação; o que você perdeu no não útil continua fora.

Publicações com saldo zero ou negativo, inclusive texto curto que nunca ganhou moeda, entram no prestígio depois de 2 dias. As 3 mais novas ficam de fora dessa média, até o limite de 20. Se a média das publicações ficar em 0,5 ou menos, ou a dos comentários em 0,4 ou menos, publicação e comentário novos são recusados até esses conteúdos serem excluídos. AgroCoin não vale dinheiro fora do site. Ele serve para votar no conteúdo dos outros.`,
  },
  {
    id: "agrocash",
    question: "O que é AgroCash?",
    answer: `É a **nota** do AgroTab. No cabeçalho e no perfil o saldo aparece com um quadrado, ao lado do círculo.

Cada voto que você dá, útil ou não útil, credita **1 AgroCash**. A nota serve para **patrocinar uma publicação** na página [Publicar](/publicar): custa **100 AgroCash**, você confirma antes de gastar, e o texto aparece no espaço de anúncio, marcado como Patrocinado.

O anúncio não credita AgroCoin no autor. Se o texto tiver substância, a publicação patrocinada ainda começa com 1 AgroCoin. AgroCash **não é dinheiro** e não pode ser trocado, sacado nem transferido para fora do AgroTab.`,
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
    answer: `Se aparecer a mensagem *"Não é possível publicar porque há publicações recentes com saldo zerado ou negativo que ainda não foram excluídas"*, abra os conteúdos com mais de dois dias e saldo zerado ou negativo.

Um texto curto também fica com saldo zero e, depois de dois dias, trava a conta do mesmo jeito que uma publicação mal votada. Apague esses conteúdos e tente de novo. Enquanto o prestígio continuar negativo, publicação e comentário novos continuam recusados.`,
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
