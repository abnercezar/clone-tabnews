# Notificações por e-mail (comentários e respostas)

## Comportamento

Após `POST /api/v1/contents` com `parent_id` (comentário ou resposta), o AgroTab tenta avisar o **autor do conteúdo pai**:

| Situação                 | Destinatário           |
| ------------------------ | ---------------------- |
| Comentário em publicação | Autor da publicação    |
| Resposta a um comentário | Autor desse comentário |

Não notifica:

- o próprio autor da ação;
- toda a thread (só o pai direto);
- criação de publicação raiz (`parent_id` nulo);
- exclusão ou votação.

Preferências de opt-out ainda **não** existem; e-mails de ativação/segurança são independentes.

## Confiabilidade

- O comentário é persistido **antes** do envio (após o `COMMIT` da transação).
- Falha de SMTP é best-effort: a API continua `201`; o erro é logado sem senha/token.
- Não há fila/worker nativo (Vercel serverless). Retry automático exigiria outbox + cron (não implementado).

## Variáveis de ambiente

As mesmas da ativação (`infra/email.js`):

| Variável                                  | Uso                                              |
| ----------------------------------------- | ------------------------------------------------ |
| `EMAIL_SMTP_HOST`                         | Host SMTP                                        |
| `EMAIL_SMTP_PORT`                         | Porta (`465` = TLS implícito; demais = STARTTLS) |
| `EMAIL_SMTP_USER` / `EMAIL_SMTP_PASSWORD` | Autenticação SMTP                                |
| `EMAIL_HTTP_HOST` / `EMAIL_HTTP_PORT`     | Mailcatcher (dev/test)                           |

Links usam `infra/webserver.js` (`http://localhost:3000` em dev/test; preview Vercel; produção `https://agrotab.com.br`).

## Produção

1. SMTP de produção configurado na Vercel (sem commit de segredos).
2. Confirmar `contato@agrotab.com.br` autorizado no provedor.
3. Não há worker separado: o envio ocorre na própria request da API.
4. Homologação: comentar/responder no Mailcatcher ou caixa real e conferir destinatário, assunto e link `#comentario-{id}`.

## Testes

```bash
npm test
# ou foco:
./node_modules/.bin/jest tests/integration/api/v1/contents/notifications.test.js --runInBand
./node_modules/.bin/jest tests/unit/models/notification.test.js --runInBand
```
