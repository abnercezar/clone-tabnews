# Fotos nas publicações e login com Google

As duas funções já estão no código e ficam **desligadas** até as variáveis de
ambiente serem configuradas. Nenhuma dependência nova foi adicionada.

## Fotos (Cloudflare R2)

Fluxo: o navegador reduz a foto (lado maior até 1600 px, WebP ou JPEG ~80%),
envia para `POST /api/v1/uploads` (só contas que podem publicar, até 40 fotos
por hora por IP, até 4 MB, só JPEG/WebP conferidos pelos bytes) e a API grava
no bucket com assinatura AWS SigV4 (`infra/storage.js`). A foto entra no texto
como Markdown (`![foto](url)`), então o formato salvo continua o mesmo.
Limite de 6 fotos por publicação, contado no editor.

Configuração no Cloudflare:

1. Criar o bucket (ex.: `agrotab-fotos`).
2. Ligar um domínio público ao bucket (ex.: `fotos.agrotab.com.br`).
3. Criar um token de API R2 com permissão de escrita só nesse bucket.
4. Na Vercel, definir:
   - `STORAGE_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com`
   - `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`
   - `STORAGE_PUBLIC_URL=https://fotos.agrotab.com.br`

O envio passa pela API (e não direto do navegador ao bucket), então não é
preciso configurar CORS no R2.

## Login com Google

1. No Google Cloud Console, criar um "ID do cliente OAuth" do tipo Web.
2. URI de redirecionamento autorizado:
   `https://agrotab.com.br/api/v1/sessions/google/callback`
   (e `http://localhost:3000/...` para desenvolvimento).
3. Na Vercel, definir `NEXT_PUBLIC_GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.

Regras:

- Só e-mails verificados pelo Google são aceitos.
- Conta nova pelo Google já nasce ativada, com username gerado a partir do
  e-mail (pode ser trocado em `/perfil`).
- E-mail que já tem conta ativada: o login Google é ligado a ela.
- E-mail com cadastro pendente de ativação: o Google confirma o e-mail, a conta
  é ativada e a senha antiga é trocada por uma aleatória (quem criou o cadastro
  pendente pode não ser o dono do e-mail). A pessoa pode definir nova senha em
  "Recuperar a senha".
- Conta banida continua sem acesso.
