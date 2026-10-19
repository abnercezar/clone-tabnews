# Admin e ativação (paridade TabNews)

## Ativação

- No cadastro, o AgroTab envia e-mail com link `/cadastro/ativar/{token}` (15 min).
- Se a conta não estiver ativada, o **login com senha correta** reenvia um novo e-mail (como no TabNews) e responde 403 pedindo para verificar a caixa de entrada.

## Admin

Não existe role “owner”. Privilegio = array `features` no usuário.

Conta ativada normal: publicar, editar/apagar o próprio conteúdo, etc.

Admin (estilo seed do TabNews) inclui ainda:

- `update:user:others`
- `delete:content:others`
- `update:content:others`
- `create:migration` / `read:migration`
- `read:status:all`
- `read:user:list` (painel `/moderacao/usuarios`)
- `ban:user` (nuke permanente via `DELETE /api/v1/users/[username]`)
- `read:firewall` / `review:firewall` (eventos de abuso e revisão)

### Promover em desenvolvimento

```bash
ADMIN_EMAIL=admin@agrotab.local npm run admin:promote
```

O `npm run seed:dev` cria `admin@agrotab.local` / senha `senha1234` já como admin.

### Promover em produção

```bash
ADMIN_EMAIL=seu@email.com ENV_PATH=.env.production npm run admin:promote
```

Ou no Neon SQL Editor (database `production`), atualize `features` do seu usuário para a lista em `models/authorization.js` → `adminFeatures`.

Painel de moderação: `/moderacao/usuarios/1` (aparece no menu para quem tem `read:user:list`).
Ban permanente (nuke): botão **Banir** na lista, ou `DELETE /api/v1/users/{username}` com `{ "ban_type": "nuke" }`.
