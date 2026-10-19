# Inventário de telas — AgroTab

Mantido pelo agente QA Human Tester. Só entra rota que existe no código.
Última revisão do inventário: 2026-10-18. A coluna "Última execução" registra a suíte Jest, não uma passagem manual posterior.

Funcionalidades ausentes (não testar, não marcar como aprovadas): editar publicação, perfil público, filtros avançados, preferências de notificação (opt-out), painel de moderação e pagamento. Recuperação de senha: `/cadastro/recuperar` + e-mail com link. Comentário/resposta disparam e-mail best-effort ao autor do pai (`docs/email-notifications.md`); não há fila/worker. `/perfil` edita a própria conta. O tema (claro, escuro, automático) fica só no navegador.

## Rotas de tela

| Rota                          | Acesso                                                                                                      | Campos e ações                                      | Estados                                            | Teste automatizado                                        | Última execução       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------- | --------------------- |
| `/`                           | Público (feed). Logado vê publicar e menu.                                                                  | Lista, paginação quando passa de 30                 | Vazio, erro de carga, lista                        | `contents/get.test.js`, jornada                           | Jest, 2026-10-18      |
| `/conteudos`                  | Público                                                                                                     | Redireciona para `/`                                | —                                                  | `content-journey.test.js`                                 | Jest, 2026-10-18      |
| `/[username]/[slug]`          | Público para ler. Dono exclui. Conta com `create:content` comenta. Redirect permanente de `/conteudos/...`. | Excluir, comentário, Markdown/imagens `![](url)`    | Carregando, 404, sucesso, comentário vazio         | jornada, `delete.test.js`, `comments.test.js`, `markdown-images.test.js` | Jest, 2026-10-19      |
| `/publicar`                   | Conta com `create:content`. Anônimo vê convite para entrar.                                                 | Título, ByteMD, Publicar, imagens via Markdown      | Carregando, sem sessão, sem permissão, erro da API | API + `markdown-images.test.js`; UI no navegador          | Jest, 2026-10-19      |
| `/perfil`                     | Conta com `update:user`. Sem sessão, vai para `/login`.                                                     | Usuário, e-mail, nova senha, Salvar                 | Sucesso, erro da API, enviando                     | `users/[username]/patch.test.js` (mesmo usuário e e-mail) | Jest, 2026-10-18      |
| `/patrocinar`                 | Conta com `create:sponsorship`. Sem sessão, vai para `/login`.                                              | Título, link, Publicar                              | Sucesso, link inválido                             | `sponsorships/post.test.js`                               | Jest, 2026-10-18      |
| `/login`                      | Público                                                                                                     | E-mail, senha, mostrar senha, Login, link recuperar | Erro de credencial, conta não ativada, enviando    | `sessions/post.test.js`                                   | Jest, 2026-10-18      |
| `/cadastro`                   | Público                                                                                                     | Usuário, e-mail, senha, Criar cadastro              | Erro da API, enviando                              | `users/post.test.js`, jornada de cadastro                 | Jest, 2026-10-18      |
| `/cadastro/confirmar`         | Público                                                                                                     | Nenhum envio                                        | Texto de orientação                                | Não há teste de tela                                      | Não executado         |
| `/cadastro/ativar/[token]`    | Público, token válido                                                                                       | Entrar após ativar                                  | Carregando, sucesso, token inválido ou usado       | `activations/.../patch.test.js` cobre a API               | API apenas            |
| `/cadastro/recuperar`         | Público                                                                                                     | E-mail, Recuperar                                   | Sucesso (anti-enumeração), erro da API             | `recovery/post.test.js`                                   | Jest, 2026-10-19      |
| `/cadastro/recuperar/[token]` | Público, token no e-mail                                                                                    | Senha, confirmação, Alterar senha                   | Sucesso, token inválido/expirado                   | `recovery/patch.test.js`                                  | Jest, 2026-10-19      |
| `/cadastro/recuperar/sucesso` | Público                                                                                                     | Link para Login                                     | Banner de sucesso                                  | Não há teste de tela                                      | Não executado         |
| `/sobre`                      | Público                                                                                                     | Links da landing                                    | —                                                  | Não há teste de tela                                      | Não executado         |
| `/status`                     | Público. Gráficos, rede de votos, DB+webserver (como TabNews).                                              | Nenhum envio                                        | Carregando, erro, dados                            | `status/get.test.js`, `analytics/get.test.js`             | Jest, 2026-10-18      |
| Rota inexistente              | Público                                                                                                     | —                                                   | 404 padrão do Next, em inglês e sem o layout       | Exploração no navegador: reprovado (médio)                | Navegador, 2026-10-18 |

## API usada pelas telas

| Rota                                     | Quem chama                                                                                       | Regressão                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `GET /api/v1/contents`                   | Feed. Exige `read:content` (anônimo e conta ativada).                                            | Feed logado não pode voltar a 403. Paginação e total. Comentário fora da lista.       |
| `POST /api/v1/contents`                  | Publicar e comentar. Exige `create:content`. Limite de 30 por 10 minutos por IP, neste processo. | Dono ignorado no corpo, primeira publicação, comentário, limites de campo.            |
| `GET /api/v1/contents/[username]/[slug]` | Leitura                                                                                          | 404 depois de excluir                                                                 |
| `DELETE` na mesma rota                   | Dono, com `delete:content`                                                                       | Outra conta recebe 403                                                                |
| `GET .../children`                       | Comentários e respostas                                                                          | Ordem, autor, resposta em um nível, 404 se a publicação não existe                    |
| `GET` e `POST /api/v1/sponsorships`      | Feed, publicação e `/patrocinar`                                                                 | Lista o mais recente, recusa link inválido, só o dono exclui                          |
| Tempo de leitura, tema e data relativa   | Página da publicação e menu                                                                      | `readingTime.test.js`, `colorMode.test.js`, `pastTime.test.js`, `commentText.test.js` |
| Plugins Markdown (GFM/imagens)           | Editor ByteMD e `MarkdownViewer`                                                                 | `markdownPlugins.test.js`, `markdown-images.test.js`                                  |
| `POST /api/v1/sessions` e `DELETE`       | Login e sair                                                                                     | Credencial inválida e conta sem ativar                                                |
| `POST /api/v1/users`                     | Cadastro                                                                                         | Validação e limite de 20 por 10 minutos                                               |
| `PATCH /api/v1/activations/[token]`      | Ativação                                                                                         | Concede `read:content`, `create:content` e `delete:content`                           |

## Achados da primeira passagem (2026-10-18, localhost)

- O menu da conta tem o nome, "Novo conteúdo", "Meus conteúdos", "Patrocinar", "Editar perfil" (`/perfil`) e o tema (escuro, Auto, claro). Não há busca nem saldo.
- A publicação tem "Responder" e "Compartilhar". Ao responder, o formulário fica logo abaixo (Seu comentário, barra Markdown, 0/20000, Cancelar e Publicar), no padrão do TabNews. Dá para responder um comentário; não dá para responder essa resposta. O patrocínio mais recente aparece no feed e na publicação.
- Médio: `/rota-que-nao-existe` mostra o 404 padrão do Next, em inglês ("This page could not be found") e sem o cabeçalho do AgroTab.
- Baixo: no login e no cadastro o asterisco de obrigatório aparece, mas o input não tem `required`. O envio vazio chega ao servidor. No login a API responde "Email e senha são obrigatórios." e a tela mostra essa frase. Não grava dado indevido.

## Pendente de exploração no navegador

- Cadastro com só espaços, usuário inválido e e-mail malformado, conferindo a mensagem na tela e o 400 da API.
- Duplo clique em Publicar e em Criar cadastro.
- Menu aberto e fechado, login e cadastro em largura de celular.
- Foco e rótulo dos campos de senha.
- `/sobre` sem rolagem horizontal.

## Critério para candidata a publicação

Bloqueia se falhar cadastro, ativação, login, leitura do feed logado, publicar, comentar, excluir o próprio conteúdo, ou se uma conta alterar conteúdo de outra. Suíte verde não cobre as linhas "Não executado" desta tabela.
