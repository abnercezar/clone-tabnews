# Variáveis de ambiente: fotos e login com Google

Fotos nas publicações e login com Google só ligam quando as variáveis abaixo
existem. Sem elas o site funciona normalmente: o botão **Foto** avisa que o
envio ainda não está disponível e o botão **Entrar com Google** não aparece.

Como criar o bucket e as credenciais: [fotos-e-login-google.md](fotos-e-login-google.md).

## As variáveis

| Variável                       | Para quê                                  | Segredo? | Exemplo                                         |
| ------------------------------ | ----------------------------------------- | -------- | ----------------------------------------------- |
| `STORAGE_ENDPOINT`             | Endereço da API do R2                     | não      | `https://<account_id>.r2.cloudflarestorage.com` |
| `STORAGE_BUCKET`               | Nome do bucket                            | não      | `agrotab-fotos`                                 |
| `STORAGE_ACCESS_KEY_ID`        | Chave do token R2                         | **sim**  | `3f8c…`                                         |
| `STORAGE_SECRET_ACCESS_KEY`    | Segredo do token R2                       | **sim**  | `a91d…`                                         |
| `STORAGE_PUBLIC_URL`           | Domínio público das fotos, sem `/` no fim | não      | `https://fotos.agrotab.com.br`                  |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | ID do cliente OAuth                       | não      | `1234-abc.apps.googleusercontent.com`           |
| `GOOGLE_CLIENT_SECRET`         | Chave secreta do cliente OAuth            | **sim**  | `GOCSPX-…`                                      |

Regras:

- As 5 `STORAGE_*` precisam estar **todas** definidas; faltando uma, o envio de
  fotos fica desligado (`infra/storage.js`).
- O Google precisa das **duas** variáveis (`models/google-auth.js`).
- O prefixo `NEXT_PUBLIC_` faz a variável ir para o navegador (o botão do
  Google precisa saber se aparece). Por isso só o **ID** tem esse prefixo —
  nunca coloque `NEXT_PUBLIC_` num segredo.

## 1. No seu computador (desenvolvimento)

### 1.1 Proteja os arquivos locais antes de colocar segredos

O `.env.development` é rastreado pelo git: o que for escrito nele vai para o
próximo commit. Use um arquivo `.local`, e confirme que ele está no
`.gitignore`:

```bash
grep -q '^\.env\*\.local$' .gitignore || echo '.env*.local' >> .gitignore
```

### 1.2 Crie o arquivo `.env.development.local` na raiz do projeto

```bash
# Fotos (Cloudflare R2)
STORAGE_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
STORAGE_BUCKET=agrotab-fotos
STORAGE_ACCESS_KEY_ID=coloque-aqui
STORAGE_SECRET_ACCESS_KEY=coloque-aqui
STORAGE_PUBLIC_URL=https://fotos.agrotab.com.br

# Login com Google
NEXT_PUBLIC_GOOGLE_CLIENT_ID=coloque-aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=coloque-aqui
```

Sem aspas, sem espaço em volta do `=`.

O Next.js carrega, nesta ordem de prioridade: `.env.development.local` →
`.env.local` → `.env.development` → `.env`. O valor do arquivo de cima vence.

Dica: para desenvolvimento, use um bucket separado (ex.: `agrotab-fotos-dev`)
para não misturar fotos de teste com as de produção.

### 1.3 Reinicie o servidor

O Next.js só lê os arquivos `.env` na partida:

```bash
# Ctrl+C no terminal do next dev, depois:
npm run dev
```

### 1.4 Confira

- `/login` mostra **Entrar com Google**.
- Em `/publicar`, **Foto** → escolha uma imagem → aparece a barra de progresso
  e o texto ganha `![foto](https://fotos.agrotab.com.br/fotos/...)`.
- Para o Google funcionar local, o redirecionamento
  `http://localhost:3000/api/v1/sessions/google/callback` precisa estar
  cadastrado na credencial do Google Cloud.

> Os testes Jest leem só o `.env.development` (ver `jest.config.js`), então as
> variáveis do arquivo `.local` não ligam fotos nem Google durante os testes —
> é o comportamento esperado pelos testes de `uploads` e `sessions/google`.

## 2. Em produção (Vercel)

### Pelo painel

1. vercel.com → projeto do AgroTab → **Settings → Environment Variables**.
2. Para cada variável da tabela: **Key** = nome, **Value** = valor, e marque os
   ambientes:
   - **Production**: credenciais de produção.
   - **Preview**: deixe sem as `STORAGE_*` e sem o Google, ou use um bucket e
     uma credencial de teste. O endereço de preview muda a cada deploy e não
     estaria cadastrado no Google.
   - **Development**: não precisa (o local usa o arquivo `.local`).
3. Marque `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` e
   `GOOGLE_CLIENT_SECRET` como **Sensitive**: depois de salvas, ninguém
   consegue ler o valor pelo painel.
4. **Faça um novo deploy** (Deployments → último deploy → **Redeploy**).
   Variáveis novas só valem a partir do próximo deploy, e as `NEXT_PUBLIC_`
   são gravadas no código do navegador durante o build.

### Pela linha de comando (alternativa)

```bash
npm i -g vercel
vercel link                      # uma vez, na raiz do projeto
vercel env add STORAGE_ENDPOINT production
vercel env add STORAGE_BUCKET production
vercel env add STORAGE_ACCESS_KEY_ID production
vercel env add STORAGE_SECRET_ACCESS_KEY production
vercel env add STORAGE_PUBLIC_URL production
vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
vercel env ls                    # confere os nomes (os valores não aparecem)
```

Cada `env add` pede o valor no terminal, sem ficar no histórico do shell.
Depois, marque os três segredos como **Sensitive** no painel e faça o
redeploy.

### Confira em produção

- `https://agrotab.com.br/login` mostra **Entrar com Google**.
- Publique um post de teste com uma foto e apague em seguida.
- Se o envio falhar, veja **Vercel → Logs** filtrando por `/api/v1/uploads`
  (erro 503/500 costuma ser chave ou nome de bucket errado).

## 3. Segurança

- Nunca coloque segredos no `.env.development`, no código, em issue, PR ou
  print de tela.
- O token do R2 deve ter permissão **só** de leitura e escrita no bucket das
  fotos.
- Vazou uma chave? Revogue na hora (Cloudflare → R2 → API Tokens; Google Cloud
  → Credenciais → redefinir chave secreta), crie outra, troque na Vercel e
  faça o redeploy.
- Para trocar uma chave normalmente, siga a mesma ordem: crie a nova, troque
  na Vercel, faça o redeploy e só então revogue a antiga.

## 4. Problemas comuns

| Sintoma                                        | Causa provável                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| "O envio de fotos ainda não está disponível"   | Falta alguma `STORAGE_*`, ou o servidor não foi reiniciado / o deploy não foi refeito             |
| Foto envia, mas não aparece no post            | `STORAGE_PUBLIC_URL` errado, ou o acesso público do bucket está desligado                         |
| Erro ao enviar foto (500)                      | Chave, segredo ou nome do bucket errados; token sem permissão de escrita                          |
| Botão do Google não aparece                    | Falta `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, ou o deploy foi feito antes de criar a variável             |
| Google mostra `redirect_uri_mismatch`          | O endereço `/api/v1/sessions/google/callback` daquele domínio não está cadastrado no Google Cloud |
| Volta para `/login?erro=google`                | `GOOGLE_CLIENT_SECRET` errado, ou e-mail da conta Google não verificado                           |
| Só algumas pessoas conseguem entrar com Google | App OAuth ainda em modo "Teste" no Google Cloud: publique-o                                       |
