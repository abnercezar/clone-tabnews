# Auditoria de UX/UI — AgroTab

Data: 2026-10-21. Escopo: site público (https://agrotab.com.br) e código local (branch `feat/agrotab-mvp`).
Etapa 1: só diagnóstico. Fora este relatório, nenhum arquivo do projeto foi alterado.

Legenda de evidência:

- **[E]**: comprovado por código, requisição HTTP ou navegação automatizada. A fonte está citada.
- **[H]**: hipótese. Precisa de pesquisa com usuários ou de medição em aparelho real.

As medições de navegador foram feitas com Playwright (Chromium em contêiner, WebGL por software/SwiftShader), sem aparelho real. Os números de LCP/CLS são de laboratório e servem só para comparar telas entre si.

---

## 1. Resumo executivo

### Os cinco problemas mais importantes

1. **A home pública mostra um erro para todo visitante.** [E] `GET https://agrotab.com.br/api/v1/community-questions/active` responde `500 InternalServerError`. Por isso o card "Pergunta da Comunidade" aparece como "Não conseguimos carregar a pergunta agora. Tentar novamente", logo abaixo da apresentação. Isso pesa na confiança justamente na primeira visita. (P0)
2. **A proposta de valor e a ação principal ficam abaixo da primeira dobra.** [E] Em 1366×768 a cena 3D ocupa a dobra inteira. O H1 "Quem vive o agro tem muito a compartilhar." começa em y≈640, e o botão "Fazer uma pergunta" fica fora da tela. No celular (360×740) a primeira publicação do feed começa em y≈1157 no site público e em y≈1948 no código local. Além disso, há dois slogans concorrendo: "AGRO para quem produz de verdade." (cena) e "Quem vive o agro…" (H1). (P1)
3. **A home "pula" enquanto carrega.** [E] CLS de laboratório de **0,469** no celular (site público; acima de 0,25 a classificação é "ruim"). A causa está no código: `HomeIntro` e `CommunityQuestion` só aparecem depois de `/api/v1/user` responder (`pages/index.js`, `showIntro = isHomeFeed && sessionReady`). Assim o H1 e a proposta de valor nem estão no HTML do servidor. (P1)
4. **Depois de entrar, a pessoa perde o que estava fazendo.** [E] `pages/login/index.js` sempre manda para `/` (`location.href = "/"`). Isso acontece mesmo quando `TabCoinButtons` envia `/login?redirect=…`. "Responder" (página da publicação), "Compartilhar minha experiência", o voto na Pergunta da Comunidade e `/publicar` também levam para `/login` sem caminho de volta. (P1)
5. **Falhas de acessibilidade e confiança fáceis de corrigir.** [E]
   - `<html lang="">` vazio em todas as páginas (não existe `pages/_document.js`): o leitor de tela lê o português com regras do inglês.
   - A home tem dois `h1` e um `h2` antes deles.
   - O espaço de patrocínio (`interface/Sponsorship`) não diz "Patrocinado". Só mostra "Contribuindo com {usuário}", embora os cards de anúncio no feed tragam o rótulo.
   - Em `/publicar`, a caixa "Patrocinar publicação (100 AgroCash)" fica colada ao botão Publicar e não pede confirmação.

   (P1)

### Os cinco pontos fortes a preservar

1. **Modelos de publicação com roteiro agro** (`interface/publishTemplates.js`): Pergunta técnica, Relato de campo e Resultado de safra. Os campos são os que importam (cultura, região, o que já tentei, números), sem formulário longo.
2. **Feed da home renderizado no servidor**, com cache no CDN e fallback para o cliente (`pages/index.js`, `getServerSideProps`). Bom para conexão lenta no campo e para buscadores.
3. **Pergunta da Comunidade bem resolvida no detalhe:**
   - rascunho salvo (`results.js`, `readDraft`/`writeDraft`);
   - `aria-live` no resultado;
   - estados de carregando, vazio e erro;
   - respeito a `prefers-reduced-motion`.
4. **Cena 3D tecnicamente cuidadosa:**
   - pausa fora da tela e com a aba oculta (IntersectionObserver e `visibilitychange`);
   - quadro estático quando o usuário pede movimento reduzido;
   - imagem `cena-trator.jpg` como fundo e fallback;
   - `aria-label` descritivo;
   - descarte completo de recursos.
5. **Tom de voz e estados vazios honestos:**
   - "Exemplo ilustrativo — não representa uma publicação real." (`FeedExample`);
   - exemplos de perguntas reais do setor;
   - filtragem de saída via `authorization.filterOutput` nas telas que leem do banco.

---

## 2. Inventário de telas e fluxos

### Estado do código e da versão publicada

- [E] **Branch e mudanças locais:** `feat/agrotab-mvp`. Há 12 arquivos já preparados para commit (`git status`): `HomeIntro`, `QuestionTemplates`, `TractorScene/*`, modelos e rota de `community-questions`, `moderacao/perguntas`, `public/cena-trator.jpg`, testes e `tests/orchestrator.js`. Os arquivos de `interface/TractorScene/three/*` estão versionados e no índice. Nada foi descartado nem alterado.
- [E] **O site público não é igual ao código local.** Sinais de que a produção está no commit `ec1f9df` ou perto dele:
  - os exemplos do hero são outros (produção: "Como você controla carrapato no verão?"; local: "Como você decide a hora de vender o boi gordo?");
  - a cena 3D de produção tem os bois antigos;
  - a produção tem só uma publicação no feed ("Tentando construir um espaço melhor…", de `Agrotab`);
  - o `buildId` de produção é `d3YQM48r1CXYw817Epq8g`.
- [E] **Stack confirmada:**
  - Next.js 14.2 (Pages Router), React 18.3;
  - `@primer/react` 38 com `@primer/primitives`, ícones `@primer/octicons-react`;
  - CSS Modules;
  - ByteMD para o editor e o visualizador de Markdown;
  - `three` 0.186 (cena da home);
  - `recharts` e `vis-network` (status);
  - `react-confetti` e `react-rewards`;
  - busca pelo Google CSE (`interface/SearchBox`, quando há `searchId`), com alternativa pela API.

### O que foi inspecionado e como

| Tela / fluxo                                   | Código lido                                 | Navegador local (dev)                                | Site público (produção, só leitura) |
| ---------------------------------------------- | ------------------------------------------- | ---------------------------------------------------- | ----------------------------------- |
| Home (`/`): cena, intro, pergunta, feed, aside | sim                                         | desktop 1366 e celular 360, teclado, posições        | desktop e celular, LCP/CLS, JS      |
| `/recentes`                                    | parcial                                     | sim                                                  | sim (overflow medido)               |
| Publicação `/[username]/[slug]`                | sim                                         | sim (leitura, cabeçalhos, "Responder" deslogado)     | não                                 |
| Comentários e respostas                        | sim (`CommentForm`, `ReplyBox`)             | só o estado deslogado                                | não                                 |
| `/login`, `/cadastro`, `/cadastro/recuperar`   | sim                                         | sim (envio vazio e dados inválidos, sem criar conta) | só carregamento                     |
| `/publicar`                                    | sim                                         | só o estado deslogado                                | só carregamento                     |
| `/sobre`, `/faq`                               | parcial                                     | sim                                                  | sim                                 |
| Rota inexistente                               | sim                                         | sim                                                  | sim                                 |
| Perfil, moderação, patrocinar, status          | parcial                                     | não                                                  | não                                 |
| Moedas (AgroCoins/AgroCash)                    | parcial (`TabCoinButtons`, `AgroCoinCount`) | voto deslogado                                       | não                                 |

### O que não pôde ser validado

- Publicar, comentar, votar e editar perfil com conta ativa. Não foram feitas operações de escrita: nem em produção (proibido) nem no banco de desenvolvimento do usuário.
- Experiência com leitor de tela real (NVDA/VoiceOver/TalkBack).
- Aparelho Android de entrada e rede 3G/4G real.
- Lighthouse e Core Web Vitals de campo (CrUX).
- A causa do erro 500 em produção: logs e banco de produção não foram acessados.

---

## 3. Auditoria visual

### Hierarquia

- **V1 [E]: dois títulos-slogan disputam a atenção.** A cena tem o `h2` "AGRO / para quem produz de verdade." em amarelo, com 18–42 px de fonte e a palavra "AGRO" com o dobro do tamanho. Logo abaixo vem o `h1` "Quem vive o agro tem muito a compartilhar.". O visitante lê primeiro o slogan da cena, que não diz o que o site é.
- **V2 [E]: a cena domina a primeira dobra.** `.stage { height: clamp(280px, 38vw, 480px) }`. Em 1366 px isso dá 480 px dos 706 px úteis abaixo do cabeçalho. A captura de produção (`public-desk-home-dobra.png`) mostra a cena inteira e só o começo do H1.
- **V3 [E]: no celular a cena fica pequena (≈250 px) e o subtítulo amarelo sobre o céu perde leitura.** O texto "para quem produz de verdade." tem cerca de 18 px de fonte sobre um céu claro, e o contraste depende só de `text-shadow` (`public-mob-home.png`).

### Cores e tema

- **V4 [E]: muitas cores fixas fora dos tokens do Primer.** São 161 ocorrências de hexadecimal fixo nos CSS Modules. As maiores concentrações:
  - `CommunityQuestion` (18);
  - `HomeIntro` (17);
  - `DefaultLayout` (17);
  - `CommentEditor` (15);
  - `HomeSidebar` (13);
  - `ContentList` (12).

  Os tokens (`var(--…)`) aparecem 322 vezes. Usar os dois sistemas ao mesmo tempo aumenta o risco de inconsistência no tema escuro.

- **V5 [H]: possível conflito de tema.** `HomeIntro/index.module.css` reage tanto a `@media (prefers-color-scheme: dark)` quanto a `[data-color-mode="dark"]`. Se alguém escolhe "claro" no menu com o sistema em modo escuro, o hero pode ficar escuro enquanto o resto fica claro. Verificar no navegador alternando o tema manualmente.

### Componentes e consistência

- **V6 [E]: o mesmo conteúdo aparece em dois formatos de lista.** A home usa cards com resumo e votos (`ContentList variant="cards"`). `/recentes` e o perfil usam a lista numerada estilo TabNews. Não está errado, mas o visitante que troca de aba vê dois produtos diferentes.
- **V7 [E]: o texto dos botões e links varia muito para a mesma ação:**
  - "Login" / "Entrar";
  - "Cadastrar" / "Criar conta" / "Criar cadastro" / "Criar minha conta";
  - "Deslogar";
  - "Seu Email";
  - "Clique aqui.".

### Responsividade

- **V8 [E]: rolagem horizontal de 200 px em `/recentes` no desktop**, tanto local quanto em produção (`scrollWidth` 1566 para 1366). O elemento responsável é o `h2` interno, visualmente oculto, do `UnderlineNav` do Primer (`prc-src-InternalVisuallyHidden`), dentro de `interface/RecentTabNav`. No celular não acontece.
- **V9 [E]: áreas de toque pequenas.** No cabeçalho, "Login" e "Cadastrar" têm 21 px de altura. Em `/recentes`, os nomes de autor têm 14 px de altura no celular. A WCAG 2.2 (critério 2.5.8) pede 24×24 px ou espaçamento equivalente.

---

## 4. Auditoria de UX

### Primeira visita (home)

- **U1 [E]:** Para entender o produto, o visitante precisa rolar a página no desktop e rolar bastante no celular. Veja o item 2 do resumo executivo e a seção 6.
- **U2 [E]: o convite para criar conta fica no fim da página no celular.** O card "Junte-se ao AgroTab" é a barra lateral, que no celular desce para depois do feed: y≈1545 em produção e y≈8007 no local, com contribuições de exemplo carregadas.
- **U3 [E]: o card de erro da Pergunta da Comunidade aparece para o público.** O código já esconde o card quando não há pergunta (`EmptyQuestion` retorna `null` para quem não pode criar). Em caso de erro, porém, mostra a falha (`status === "error"`). Para quem só visita, esconder o card seria mais adequado do que pedir "Tentar novamente".

### Participação e retorno ao contexto

- **U4 [E]: o login sempre manda para a home.** `pages/login/index.js` ignora `?redirect`. Fluxos afetados:
  - voto de relevância deslogado (`TabCoinButtons` já envia `redirect`, que é descartado);
  - "Responder" na publicação (`ReplyBox`, `router.push("/login")`);
  - "Compartilhar minha experiência" na Pergunta da Comunidade (`Composer`, `LinkButton href="/login"`);
  - voto na Pergunta da Comunidade (mostra uma dica de login; depois de entrar a escolha está perdida);
  - `/publicar?modelo=pergunta`: o modelo escolhido se perde.
- **U5 [H]: o voto da enquete pode estar travando a participação.** A pessoa vê cinco alternativas, clica e descobre que precisa de conta e de ativação por e-mail. Testar com usuários: quantos desistem entre o clique na alternativa e a confirmação do e-mail. Métrica proposta: votos ÷ cliques em alternativa por visitantes deslogados.

### Publicação

- **U6 [E]: `/publicar` não guarda rascunho.** A Pergunta da Comunidade guarda (`writeDraft`), mas o formulário principal não. Fechar a aba, sair da página ou ter a sessão expirada apaga o texto.
- **U7 [E]: o botão "Publicar" fica desabilitado sem dizer por quê.** Ele só habilita com título e corpo preenchidos, e não há mensagem explicando o que falta.
- **U8 [E]: o modelo pode ir para o ar com os textos-guia.** Os colchetes do roteiro ("[Descreva o que está acontecendo…]") podem ser publicados sem edição. Não há aviso.
- **U9 [E]: texto técnico ou estrangeiro para o público agro:**
  - "Markdown no estilo TabNews";
  - "Revenue Share";
  - a sintaxe `![descrição](https://url-da-imagem)` na legenda.
- **U10 [E]: o gasto com patrocínio não pede confirmação.** "Patrocinar publicação (100 AgroCash)" é uma caixa de seleção comum, logo acima do botão Publicar. O projeto já tem `useConfirmDialog`.
- **U11 [H]: falta escolher o tipo de publicação.** Hoje não existe um campo para marcar se é pergunta, relato ou resultado; o modelo só preenche o corpo. Por isso o feed não consegue distinguir os tipos (ver D2). Avaliar com usuários antes de criar o campo, porque isso muda o banco (ver seção 9).

### Formulários de conta

- **U12 [E]: campos marcados como obrigatórios não têm `required`.** Login, cadastro e recuperação mostram o asterisco, mas o input não tem o atributo (`required:false` medido). O envio vazio chega ao servidor, e os erros aparecem num `Flash` geral, sem `aria-invalid` nem `aria-describedby` no campo. Isso confirma o registro de 2026-10-18 em `tests/qa/inventario.md`.
- **U13 [E]: o cadastro não explica as regras do nome de usuário.** Não diz quais caracteres são aceitos, que o nome é público nem que aparece na URL das publicações. Também não há link para os Termos de Uso no momento do aceite.

### Leitura

- **U14 [E]: a página da publicação é um beco sem saída.** O autor aparece como `span`, sem link para o perfil (`ui.authorLabel`). Não há caminho de volta ao feed nem publicações relacionadas; a navegação medida dentro de `main` não tinha nenhum link.
- **U15 [E]: rota inexistente devolve 200.** `/rota-que-nao-existe` responde HTTP 200 com "Perfil não encontrado", porque cai em `[username]` (um soft 404). Rotas profundas, como `/a/b/c/d`, mostram o 404 padrão do Next, em inglês e sem o layout. Não existe `pages/404.js`.

### Confiança

- **U16 [E]: o espaço de patrocínio não se identifica como anúncio.** Ele não diz "Patrocinado" nem "Anúncio". Para conteúdo pago, a identificação explícita é uma exigência de transparência (o CONAR pede identificação publicitária).
- **U17 [E]: a página Sobre se apresenta como "em construção".** O destaque "O AgroTab está em construção" e o roadmap são honestos. [H] Pode reduzir a confiança de quem chega pela primeira vez; testar a percepção.

---

## 5. Auditoria técnica de interface

### Componentes da home

`pages/index.js` monta, nesta ordem:

1. `TractorScene` (cena 3D);
2. `HomeIntro`;
3. `CommunityQuestion`;
4. feed (`UnderlineNav` com `ContentList`);
5. `HomeSidebar` (`JoinCard` e `TemplatesCard`);
6. `Sponsorship`.

### Acessibilidade

- **T1 [E]: `lang` vazio.** Sem `pages/_document.js`, o `<html>` sai sem idioma em todas as páginas (medido local e em produção).
- **T2 [E]: cabeçalhos fora de ordem na home.** Ordem atual: `h2` da cena → `h1` intro → `h2` pergunta → `h1` (oculto) "Publicações relevantes". Na página da publicação a ordem é correta: um único `h1` e depois `h2 Comentários`. `/recentes` não tem `h1`.
- **T3 [E]: foco por teclado.** A sequência de Tab é lógica (logo → busca → tema → Login → Cadastrar → ações do hero) e o canvas fica fora da ordem de Tab, o que é correto porque é decorativo. Os inputs do Primer mostram o foco no contêiner; a medição automática não confirmou o anel visível nos campos de texto, então é preciso validar visualmente.
- **T4 [E]: "Clique na cena para largar de novo" só funciona com mouse ou toque.** O texto está com `aria-hidden` e a ação é decorativa. Aceitável, mas a dica pode sair.

### Desempenho

Medições em produção, de laboratório:

| Página      | JS transferido | JS descomprimido |
| ----------- | -------------- | ---------------- |
| Home        | 458 KB         | 1,66 MB          |
| `/login`    | ≈241 KB        | —                |
| `/sobre`    | ≈211 KB        | —                |
| `/recentes` | ≈216 KB        | —                |

- **T5 [E]: a cena 3D pesa quanto o resto da página.** Ela acrescenta cerca de 220 KB comprimidos de JavaScript (three.js e pós-processamento), além da imagem `cena-trator.jpg` (140 KB).
- **T6 [E]: a cena não se adapta ao aparelho.**
  - Usa WebGL com sombras (mapa 2048), bloom, pós-processamento próprio e `pixelRatio` de até 1,5.
  - A malha do gado é gerada num Web Worker em tempo de execução: cerca de 0,75–3,7 s no SwiftShader.
  - Não lê `navigator.deviceMemory`, `hardwareConcurrency` nem `connection.saveData`.

  [H] Em celulares de entrada é provável que aqueça e gaste bateria. Medir num Android de entrada com o Chrome DevTools remoto.

- **T7 [E]: LCP de laboratório alto na home.** Em produção: 6,3 s no desktop (o elemento é o título da cena) e 5,4 s no celular (subtítulo do hero). As outras páginas ficam entre 0,7 e 2,6 s. Ambiente SwiftShader, sem aparelho real.
- **T8 [E]: CLS de laboratório.** Home no celular em produção: 0,469. Home no desktop: 0,095 em produção e 0,139 no local. As demais páginas ficam perto de 0.
- **T9 [E]: o FAQ carrega um bloco grande de JS** (`3486-…js`, 186 KB) para exibir texto estático. É provavelmente o ByteMD/Markdown. Avaliar renderização no servidor.

### Testes relacionados à interface

- Os testes Jest cobrem as APIs e utilitários de interface (`tests/unit/interface`: tema, data relativa, tempo de leitura, Markdown, resultados da enquete).
- Não há teste de componente nem E2E versionado; o E2E com Playwright fica fora do repositório.
- Nenhum teste cobre a home, o redirect do login, a página 404 ou o `lang`.

### Duplicações

- O resumo do texto é calculado de dois jeitos diferentes: `excerpt()` dentro de `ContentList` e `createExcerpt` em `interface/excerpt`.
- O rascunho existe só na Pergunta da Comunidade.
- O texto dos botões de entrar e cadastrar está espalhado por cinco componentes.

---

## 6. Proposta de nova página inicial

### Diagnóstico das perguntas da etapa C

- **O visitante entende o que é o AgroTab em cinco segundos?** No desktop, parcialmente: a primeira dobra mostra só a cena e o slogan "AGRO para quem produz de verdade.", que é atitude, não explicação. No celular, sim, depois de uma rolagem curta.
- **Fica claro quem pode participar?** Só na barra lateral ("Produtor, técnico, consultor…"), que no celular fica no fim da página.
- **A proposta de valor descreve um benefício concreto?** "Perguntas, experiências e soluções práticas" descreve o formato. O benefício ("resolver um problema com quem já passou por ele") fica implícito.
- **O título e o subtítulo cumprem funções diferentes?** Sim, mas o slogan da cena repete a função do título.
- **A ação principal é evidente?** "Fazer uma pergunta" é clara, mas fica abaixo da dobra no desktop.
- **Dá para explorar o conteúdo antes de criar conta?** Sim. O feed é público e renderizado no servidor, um ponto forte.

### Estrutura recomendada (wireframe textual)

```
[Cabeçalho] logo · Relevantes/Recentes · busca · tema · Entrar · Criar conta

[Hero — 1 bloco, cabe na 1ª dobra em 1366×768 e 360×740]
  ┌ texto (esq.) ─────────────────────────┐ ┌ visual (dir.) ─────────────┐
  │ eyebrow: Comunidade do agronegócio    │ │ cena (desktop capaz)       │
  │ H1 (benefício)                        │ │ ou imagem estática         │
  │ subtítulo (quem + como + custo)       │ │ altura ≤ 320 px            │
  │ [Fazer uma pergunta] [Ver discussões] │ └────────────────────────────┘
  │ 3 exemplos curtos de pergunta         │
  └───────────────────────────────────────┘
  (celular: texto primeiro; imagem estática de ~160 px ou nenhuma)

[Feed] Relevantes | Recentes          [Lateral: Junte-se (deslogado) · Modelos]
  card: tipo? · título · resumo · autor · data · nº de comentários
  (celular: "Junte-se" depois do 3º card, não no fim)

[Pergunta da Comunidade] — só quando carregou com sucesso; depois dos
  primeiros cards no celular, ao lado do feed no desktop.

[Rodapé]
```

### Textos sugeridos

Título (H1), escolher um:

- **"Pergunte a quem já passou por isso no campo."** Resolve a falta de um benefício concreto: diz o que a pessoa ganha (resposta de quem viveu o problema).
- **"Dúvidas do campo, respondidas por quem produz."** Mesmo objetivo, com mais peso em "produz", ligado à identidade atual.

Subtítulo:

- "Produtores, técnicos e consultores trocam perguntas, relatos de campo e resultados de safra. Leia à vontade; para publicar, a conta é gratuita."
  - Resolve "quem pode participar" e "preciso pagar ou me cadastrar para ler?", hoje respondidos só na barra lateral.

Ações:

- Primária: "Fazer uma pergunta" (mantém).
- Secundária: "Ver discussões". É mais curto que "Ver o que a comunidade está discutindo", cabe numa linha no celular e não compete com a primária.

Slogan da cena: tirar "AGRO para quem produz de verdade." do `h2` (virar `aria-hidden` ou sair) ou usá-lo como eyebrow. Assim fica uma única mensagem principal.

---

## 7. Backlog priorizado

Complexidade: B (baixa), M (média), A (alta).

| ID  | Sev. | Tela/componente                         | Evidência                                                                                                         | Problema para o usuário                                                            | Recomendação                                                                                                                                                                                                               | Compl.             | Arquivos                                                                                                                               | Risco de regressão                                                                          | Validação                                                                                     |
| --- | ---- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| A01 | P0   | Home, Pergunta da Comunidade (produção) | [E] `GET /api/v1/community-questions/active` → 500 em produção                                                    | Erro visível para todo visitante na primeira dobra                                 | (1) Investigar em produção se as migrations da pergunta foram aplicadas (**exige autorização**: infra). (2) Na interface: com `status === "error"`, deslogado não vê o card; o aviso fica só para quem pode criar pergunta | B (UI) / ? (infra) | `interface/CommunityQuestion/index.js`; produção                                                                                       | Esconder um erro real dos admins → manter o aviso para quem tem `create:community_question` | Endpoint 200 em produção; captura da home deslogada sem card de erro                          |
| A02 | P1   | Login                                   | [E] `pages/login/index.js` sempre faz `location.href="/"`                                                         | Perde o contexto (voto, resposta, modelo)                                          | Aceitar `?redirect=` só com caminho relativo (começa com `/` e não com `//`), senão `/`; enviar `redirect` de `ReplyBox`, `Composer`, voto da enquete, `/publicar` e do link "Login" do cabeçalho                          | B                  | `pages/login/index.js`, `pages/[username]/[slug]/index.js`, `interface/CommunityQuestion`, `pages/publicar`, `interface/DefaultLayout` | **Open redirect** se a validação falhar                                                     | Teste unitário da função de validação; E2E: votar deslogado → login → volta à publicação      |
| A03 | P1   | Home, primeira dobra                    | [E] H1 em y≈640 e CTA fora da tela em 1366×768; feed em y≈1157 no celular                                         | Não entende o produto nem vê a ação sem rolar                                      | Cena com no máximo ~320 px no desktop e imagem/faixa curta no celular; um único slogan; textos da seção 6                                                                                                                  | M                  | `interface/TractorScene/index.module.css`, `interface/HomeIntro`, `pages/index.js`                                                     | Identidade visual (aprovação)                                                               | Capturas 1366×768 e 360×740 com H1 e CTA visíveis; teste de 5 segundos com 5 pessoas do setor |
| A04 | P1   | Home, carregamento                      | [E] CLS 0,469 no celular; intro fora do HTML do servidor                                                          | A página "pula", clique no lugar errado; buscadores não leem o H1                  | Renderizar `HomeIntro` no servidor (não depende da sessão); reservar altura para a Pergunta da Comunidade (o esqueleto já existe)                                                                                          | B                  | `pages/index.js`, `interface/HomeIntro`                                                                                                | Intro aparecendo para logado (hoje já aparece)                                              | CLS < 0,1 no mesmo roteiro; H1 presente no `curl /`                                           |
| A05 | P1   | Todas                                   | [E] `<html lang="">`                                                                                              | Leitor de tela com pronúncia errada; tradutor automático oferecido sem necessidade | Criar `pages/_document.js` com `<Html lang="pt-BR">`                                                                                                                                                                       | B                  | `pages/_document.js` (novo)                                                                                                            | Baixo                                                                                       | `curl / \| grep 'lang="pt-BR"'`                                                               |
| A06 | P1   | Home, `/recentes`                       | [E] dois `h1` na home; `/recentes` sem `h1`                                                                       | Navegação por títulos confusa no leitor de tela                                    | Um `h1` por página; o título da cena vira `p`/`aria-hidden`; `h1` visualmente oculto em `/recentes`                                                                                                                        | B                  | `interface/TractorScene/index.js`, `pages/index.js`, `pages/recentes/*`                                                                | Estilos ligados a `h1`/`h2`                                                                 | Lista de cabeçalhos (script de auditoria)                                                     |
| A07 | P1   | Patrocínio                              | [E] `Sponsorship` sem "Patrocinado"                                                                               | Não distingue anúncio de recomendação                                              | Rótulo visível "Patrocinado" no espaço, como já acontece no card                                                                                                                                                           | B                  | `interface/Sponsorship`                                                                                                                | Baixo                                                                                       | Captura; teste de leitura com usuário                                                         |
| A08 | P1   | `/publicar`                             | [E] caixa de 100 AgroCash sem confirmação                                                                         | Gasto de moeda por engano                                                          | `useConfirmDialog` ao publicar com patrocínio ("Vai usar 100 AgroCash dos seus {saldo}") e mover a opção para uma seção "Opções" separada                                                                                  | B                  | `pages/publicar/index.js`                                                                                                              | Não altera regra de negócio, só a confirmação                                               | E2E com conta de teste: cancelar não publica                                                  |
| A09 | P1   | `/publicar`                             | [E] sem rascunho                                                                                                  | Perde texto longo                                                                  | Reaproveitar o padrão `readDraft`/`writeDraft` da Pergunta da Comunidade, com chave por usuário                                                                                                                            | M                  | `pages/publicar/index.js`, possível extração de `interface/CommunityQuestion/results.js`                                               | Rascunho antigo reaparecendo → botão "Descartar rascunho"                                   | E2E: digitar, recarregar, texto restaurado                                                    |
| A10 | P2   | `/publicar`                             | [E] botão desabilitado sem motivo; textos-guia publicáveis; jargão                                                | Hesitação e publicação com "[…]"                                                   | Dizer o que falta; avisar (sem bloquear) se o corpo ainda tem `[` `]` do modelo; trocar "Markdown no estilo TabNews" e "Revenue Share" por linguagem simples                                                               | B                  | `pages/publicar/index.js`                                                                                                              | Baixo                                                                                       | Revisão de texto; teste com 3 usuários                                                        |
| A11 | P2   | Login/cadastro/recuperar                | [E] sem `required`, `aria-invalid` e `aria-describedby`; regras de usuário não explicadas; sem Termos no cadastro | Erro só depois do envio, sem apontar o campo                                       | `required` nos inputs; `FormControl.Validation` do Primer no campo certo; legenda com regras do usuário; "Ao criar a conta você aceita os Termos de Uso"                                                                   | B                  | `pages/login`, `pages/cadastro`, `pages/cadastro/recuperar`                                                                            | Mensagens da API continuam aparecendo                                                       | Envio vazio barrado no cliente; leitor de tela anuncia o erro do campo                        |
| A12 | P2   | Rota inexistente                        | [E] 200 "Perfil não encontrado"; 404 do Next em inglês                                                            | Página falsa indexada; experiência sem layout                                      | `pages/404.js` com o layout e links úteis; perfil inexistente devolvendo 404 de verdade (quando houver SSR) ou `noindex`                                                                                                   | B/M                | `pages/404.js`, `pages/[username]/index.js`                                                                                            | Rotas reservadas                                                                            | `curl -I` retorna 404                                                                         |
| A13 | P2   | `/recentes`                             | [E] rolagem horizontal de 200 px no desktop                                                                       | Barra de rolagem lateral, layout "solto"                                           | Investigar o `h2` oculto do `UnderlineNav` (posicionamento) e corrigir no CSS do `RecentTabNav`                                                                                                                            | B                  | `interface/RecentTabNav`                                                                                                               | Baixo                                                                                       | `scrollWidth === clientWidth`                                                                 |
| A14 | P2   | Publicação                              | [E] autor sem link; sem caminho de saída                                                                          | Beco sem saída, não descobre mais conteúdo do autor                                | Autor como link para o perfil; "Mais publicações" (do autor ou relevantes) no fim                                                                                                                                          | B/M                | `pages/[username]/[slug]/index.js`                                                                                                     | Baixo                                                                                       | Cliques no autor (se houver analytics) / teste de tarefa                                      |
| A15 | P2   | Feed (cards)                            | [E] card sem número de comentários                                                                                | Não sabe onde há conversa                                                          | Mostrar a contagem de comentários quando a API já fornecer; se não fornecer, **decisão** (seção 9)                                                                                                                         | M                  | `interface/ContentList`, API de contents                                                                                               | Consulta mais pesada                                                                        | Comparar tempo da API antes e depois                                                          |
| A16 | P2   | Cena 3D                                 | [E] +220 KB de JS; sem adaptação ao aparelho                                                                      | Bateria, aquecimento e atraso em celular de entrada [H]                            | Carregar a cena só com `requestIdleCallback` e quando visível; usar a imagem estática quando `saveData`, `deviceMemory ≤ 4` ou tela < 768 px; `pixelRatio` 1 no celular                                                    | M                  | `interface/TractorScene/*`                                                                                                             | Diferença visual entre aparelhos                                                            | Perfil de CPU/GPU em Android de entrada; JS da home ≤ 260 KB no celular                       |
| A17 | P2   | Cabeçalho, listas                       | [E] alvos de 14–21 px                                                                                             | Toque errado no celular                                                            | Altura mínima de 24 px (ideal 44 px) nos links do cabeçalho e de autor                                                                                                                                                     | B                  | `interface/DefaultLayout`, `interface/ContentList`                                                                                     | Layout do cabeçalho                                                                         | Script de alvos pequenos                                                                      |
| A18 | P2   | Home, celular                           | [E] "Junte-se" no fim da página                                                                                   | O convite para criar conta não é visto                                             | No celular, mostrar o convite depois do 3º card (deslogado)                                                                                                                                                                | B                  | `pages/index.js`, `interface/HomeSidebar`                                                                                              | Duplicar o card no desktop                                                                  | Posição do card < 2 telas                                                                     |
| A19 | P3   | Textos                                  | [E] Login/Entrar, Cadastrar/Criar conta/Criar cadastro, "Deslogar", "Clique aqui"                                 | Pequenas hesitações                                                                | Padronizar em "Entrar", "Criar conta" e "Sair"; links com destino descrito                                                                                                                                                 | B                  | vários                                                                                                                                 | Testes que buscam o texto do botão                                                          | Busca no código pelos termos antigos                                                          |
| A20 | P3   | Cena (celular)                          | [E] subtítulo amarelo pequeno sobre o céu                                                                         | Leitura ruim                                                                       | Fundo/gradiente atrás do texto ou remover o slogan da cena (ver A03)                                                                                                                                                       | B                  | `interface/TractorScene/index.module.css`                                                                                              | Baixo                                                                                       | Contraste ≥ 4,5:1 medido                                                                      |
| A21 | P3   | Tema                                    | [H] `prefers-color-scheme` e `data-color-mode` juntos                                                             | Hero escuro com o site claro                                                       | Usar só `data-color-mode` (o Primer já resolve o "auto")                                                                                                                                                                   | B                  | `interface/HomeIntro/index.module.css`                                                                                                 | Tema automático                                                                             | Alternar o tema manualmente com o sistema escuro                                              |
| A22 | P3   | Tipos no feed                           | [H] o feed não distingue pergunta, relato e resultado                                                             | Dificulta achar o que interessa                                                    | Pesquisar antes; se confirmado, guardar o modelo escolhido (**muda o banco**, seção 9)                                                                                                                                     | A                  | modelo de conteúdo, migration, publicar, ContentList                                                                                   | Dados existentes sem tipo                                                                   | Entrevistas; cliques em filtro por tipo                                                       |

---

## 8. Plano de execução

Cada etapa é um commit pequeno, com `npm run lint:eslint:check` e `npm run lint:prettier:check`. Os testes Jest rodam **só no ambiente isolado** (Postgres e Mailcatcher em portas alternativas), porque a suíte limpa o banco de desenvolvimento.

1. **Base de acessibilidade (A05, A06).** `_document.js` com `pt-BR` e um `h1` por página.
   - Aceite: `lang="pt-BR"` em todas as rotas; um único `h1` em `/`, `/recentes` e na publicação.
   - Teste: unitário do `_document` não é necessário; registrar no inventário de QA.
2. **Pergunta da Comunidade sem erro público (A01, parte da interface).**
   - Aceite: deslogado com API 500 não vê o card; admin vê o aviso.
   - Teste: unitário do componente (estado `error` × permissão) ou E2E com a API simulada.
3. **Redirect após o login (A02).**
   - Aceite: o voto deslogado volta à mesma publicação; `?redirect=//evil.com` e `?redirect=https://…` caem em `/`.
   - Teste: unitário da validação, incluindo casos de open redirect.
4. **Home sem pulo e com a mensagem na dobra (A04, A03, A20).**
   - Aceite: H1 no HTML do servidor; CLS de laboratório < 0,1 no celular; H1 e CTA visíveis em 1366×768.
   - Teste: script de auditoria (Playwright) versionado ou rodado no CI.
5. **Patrocínio e moedas (A07, A08).**
   - Aceite: "Patrocinado" visível; publicar com patrocínio pede confirmação.
   - Teste: E2E com conta de teste no ambiente isolado.
6. **Publicar sem perder texto (A09, A10).**
   - Aceite: o rascunho sobrevive a recarregar; há aviso para o texto-guia; o botão explica o que falta.
7. **Formulários de conta (A11, A19).**
   - Aceite: `required` e erro associado ao campo; textos padronizados.
   - Teste: atualizar os testes que procuram "Login" ou "Criar cadastro".
8. **404 e saída da publicação (A12, A14).**
   - Aceite: rota inexistente retorna 404 com layout; o autor tem link.
9. **Cena 3D adaptativa (A16).**
   - Aceite: celular, `saveData` ou pouca memória usam a imagem estática; JS da home no celular ≈ ao das outras páginas.
   - Teste: medição em aparelho real.
10. **Refinamentos (A13, A17, A18, A21).**

Regressão geral a cada etapa:

- suíte Jest isolada;
- capturas da home (desktop, celular, tema escuro);
- fluxo cadastro → ativação → publicar → comentar → votar com contas de teste;
- verificação de que `filterOutput` continua em todas as leituras.

---

## 9. Decisões que precisam de aprovação

1. **Produção:** investigar o 500 de `community-questions` (logs da Vercel e estado das migrations em produção). Envolve infraestrutura e banco de produção, por isso não foi feito.
2. **Identidade da home:**
   - reduzir a cena 3D e trocar o slogan "AGRO para quem produz de verdade.";
   - adotar um dos títulos da seção 6;
   - no celular, trocar o 3D por imagem estática.

   Alternativas comparadas para a etapa G:
   - **A. Hero estático** (texto + imagem `cena-trator.jpg` otimizada). Menor custo e melhor LCP; perde o efeito de "largada".
   - **B. Animação leve** (vídeo curto em loop sem som, com pôster, ou ilustração animada em CSS). Custo médio; o vídeo pesa tanto quanto o JS, mas não usa GPU contínua.
   - **C. Cena 3D atual**, com carga adiada e só em aparelhos capazes. Mais memorável; maior custo.

   **Recomendação:** C no desktop capaz e A no celular ou em economia de dados. Medir LCP e CLS antes e depois. Se a medição em aparelho real mostrar custo alto também no desktop, ficar com A.

3. **Parâmetro `redirect` no login:** decisão de segurança (lista de caminhos permitidos).
4. **Contagem de comentários e tipo de publicação no feed (A15, A22):** podem exigir mudança na API e migration (campo de tipo). Fora do escopo sem aprovação.
5. **Padronização de textos (A19):** "Entrar", "Criar conta" e "Sair" substituem termos atuais e mexem em testes.
6. **Confirmação de gasto de AgroCash (A08):** não altera a regra, mas acrescenta uma etapa ao fluxo pago.
7. **Nenhuma dependência nova é proposta.** Tudo cabe em Next, Primer e three, que já estão no projeto.

---

## 10. Limitações

- **Ambiente de medição:**
  - sem aparelho real nem leitor de tela real;
  - WebGL por software (SwiftShader) num contêiner, o que **exagera** o custo da cena e o LCP da home;
  - sem Lighthouse e sem dados de campo (CrUX);
  - os números de LCP/CLS são de laboratório e úteis só para comparar telas.
- **Código local:** medido em `next dev`. Tamanhos de JS em desenvolvimento não representam produção, por isso os números de JS deste relatório vêm do site público.
- **Escrita:** não foram executados publicar, comentar, votar, patrocinar nem editar perfil com conta ativa, nem localmente (para não alterar o banco de desenvolvimento) nem em produção. Esses fluxos foram avaliados pelo código.
- **Testes em produção:** só navegação e GET. A causa do 500 em produção não foi investigada.
- **Contraste:** observado nas capturas, não medido com ferramenta.
- **Perfil, moderação, status, patrocinar e recuperação por token:** só leitura parcial do código.
- **Instruções recebidas:** o texto da etapa G (alternativas A/B/C) e o início da etapa H chegaram cortados. A comparação A/B/C da seção 9 segue a interpretação mais provável (estático × animação leve × 3D).
- **Capturas** (fora do repositório, no diretório temporário da sessão):
  - `…/scratchpad/e2e/shots/audit/public-desk-home-dobra.png`
  - `…/scratchpad/e2e/shots/audit/public-mob-home.png`
  - `…/scratchpad/e2e/shots/audit/local-*.png`

---

## 11. Status da implementação (2026-10-21)

Validado com:

- testes unitários novos (`tests/unit/interface/loginRedirect.test.js` e `publishTemplates.test.js`);
- suíte Jest completa em ambiente isolado: 61 suítes, 321 testes passando;
- ESLint e Prettier;
- 30 verificações E2E com Playwright, em pilha isolada (script fora do repositório).

| ID       | Situação   | O que mudou                                                                                                                                                                                                                                                                                        |
| -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 (UI) | Feito      | Deslogado não vê mais o card de erro da Pergunta da Comunidade; quem cria pergunta continua vendo. **O 500 em produção não foi investigado** (precisa de autorização de infra).                                                                                                                    |
| A02      | Feito      | `interface/loginRedirect.js` aceita só caminho interno. Login, voto, "Responder", Pergunta da Comunidade, `/publicar` e o link "Entrar" do cabeçalho levam o caminho de volta.                                                                                                                     |
| A03      | Feito      | Faixa da cena com no máximo 300 px; novo H1, subtítulo e "Ver discussões"; slogan da cena virou decorativo (`aria-hidden`) e some no celular. CTA em y=751 em 1366×768.                                                                                                                            |
| A04      | Feito      | `HomeIntro` e o esqueleto da Pergunta vêm no HTML do servidor; sem a animação de entrada que escondia o texto. CLS de laboratório 0 (desktop e celular, `next dev`).                                                                                                                               |
| A05      | Feito      | `pages/_document.js` com `lang="pt-BR"`.                                                                                                                                                                                                                                                           |
| A06      | Feito      | Um único `h1` na home; `h1` oculto em `/recentes`.                                                                                                                                                                                                                                                 |
| A07      | Feito      | "Patrocinado" no espaço de patrocínio.                                                                                                                                                                                                                                                             |
| A08      | Feito      | Confirmação antes de gastar AgroCash; opção desabilitada, com explicação, quando o saldo é menor que 100. Rótulo da caixa agora ligado ao campo (o id fixo era sobrescrito pelo FormControl).                                                                                                      |
| A09      | Feito      | Rascunho de `/publicar` por usuário, com "Descartar rascunho".                                                                                                                                                                                                                                     |
| A10      | Feito      | Diz o que falta para publicar; avisa trechos-guia do modelo; legenda do editor e do patrocínio sem jargão.                                                                                                                                                                                         |
| A11      | Feito      | Campo vazio barrado antes do envio (o Primer usa `aria-required`, não `required` nativo). Erro do servidor no campo certo do cadastro (`aria-invalid` e `aria-describedby`). `PasswordInput` passa a receber legenda e erro do FormControl. Regras do nome de usuário e Termos de Uso no cadastro. |
| A12      | Parcial    | `pages/404.js` com o layout. Perfil inexistente ganhou `noindex`, mas ainda responde 200 (a página é renderizada no cliente).                                                                                                                                                                      |
| A13      | Feito      | `RecentTabNav` envolve as abas: o `h2` oculto do Primer não herda mais `width: 100%` do `main`.                                                                                                                                                                                                    |
| A14      | Feito      | Autor com link para o perfil (publicação e comentários); "Mais publicações de…" e "Voltar para o feed".                                                                                                                                                                                            |
| A15      | Não feito  | A API de conteúdos não devolve contagem de comentários. Precisa de decisão (seção 9).                                                                                                                                                                                                              |
| A16      | Feito      | Three.js só carrega com tela ≥ 768 px, sem economia de dados e com `deviceMemory` ≥ 4, depois que a página fica ociosa. Nos outros casos fica a imagem estática.                                                                                                                                   |
| A17      | Feito      | "Entrar", "Criar conta" e "Mais publicações" com no mínimo 32 px de altura.                                                                                                                                                                                                                        |
| A18      | Feito      | No celular, o convite "Junte-se" aparece depois do 3º card.                                                                                                                                                                                                                                        |
| A19      | Feito      | "Entrar", "Criar conta" e "Sair" padronizados no cabeçalho, no login e no cadastro. A mensagem do servidor ainda diz "TabCash" (fora do escopo de interface).                                                                                                                                      |
| A20      | Feito      | Slogan oculto no celular.                                                                                                                                                                                                                                                                          |
| A21      | Descartado | Hipótese falsa: o bloco `prefers-color-scheme` só vale com `data-color-mode="auto"`. A classe `.night` redundante foi removida.                                                                                                                                                                    |
| A22      | Não feito  | Exige migration e pesquisa (seção 9).                                                                                                                                                                                                                                                              |

**Ajuste extra:** o cabeçalho voltou a mostrar "Relevantes/Recentes" na home (alteração feita fora desta implementação) e, no celular, ficava mais largo que a tela. Abaixo de 544 px os espaçamentos ficaram compactos, e abaixo de 420 px "Criar conta" sai do topo (o convite continua no feed e em Entrar).
