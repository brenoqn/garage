# Ativação da Garage API na BQTECH

Roteiro para ligar a API em produção. Cada etapa é executada por quem opera o ambiente privado;
nada aqui roda automaticamente no CI. Siga na ordem e pare se uma verificação falhar.

Decisões já tomadas:

- **Barreira:** Cloudflare Access protegendo o domínio inteiro `garage.bqtech.com.br`. A API também
  valida o JWT do Access (`Cf-Access-Jwt-Assertion`) e recusa subir sem essa configuração.
- **Exposição:** mesma origem. O proxy encaminha `/api/*` para o container `garage-api`, que não
  publica porta no host. Somente a API acessa `bqtech-data`.
- **Usuário do banco:** `garage_user` em `garage_db`. Nunca `bqtech_admin`.
- **Modo do app:** o Angular continua local por padrão; o modo servidor é ligado explicitamente.

## 1. Cloudflare Access

1. Zero Trust → Access → Applications → **Add an application → Self-hosted**.
2. Domínio: `garage.bqtech.com.br` (sem caminho, para cobrir o app e a API).
3. Política **Allow** somente para o(s) seu(s) e-mail(s). Método de login: One-time PIN ou Google.
4. Anote o **Application Audience (AUD) Tag** e o domínio do time (`<time>.cloudflareaccess.com`).
5. Verifique em uma janela anônima: abrir `https://garage.bqtech.com.br` deve levar ao login do
   Access. Depois de entrar, o app abre normalmente.

O manifesto da PWA é pedido com `crossorigin="use-credentials"` para funcionar atrás do Access.
Se a instalação da PWA falhar, confira se o cookie `CF_Authorization` está presente.

## 2. Arquivo de ambiente da API (fora do repositório)

Crie no servidor, com permissão restrita (`chmod 600`), por exemplo `garage-api.env`:

```text
POSTGRES_HOST=bqtech-postgres
POSTGRES_PORT=5432
POSTGRES_DB=garage_db
POSTGRES_USER=garage_user
POSTGRES_PASSWORD=<senha do garage_user>
PORT=3001
CF_ACCESS_TEAM_DOMAIN=<time>.cloudflareaccess.com
CF_ACCESS_AUD=<AUD tag>
CF_ACCESS_ALLOWED_EMAILS=<seu e-mail>
```

Não copie esse arquivo para o repositório, para imagens nem para o GitHub Actions.

## 3. Verificação somente leitura antes da migration

```bash
docker run --rm --network bqtech-data --env-file garage-api.env postgres:17-alpine \
  sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc \
  "select current_user, current_database(), has_schema_privilege(current_user, '\''public'\'', '\''CREATE'\''), (select count(*) from information_schema.tables where table_schema = '\''public'\'')"'
```

Esperado: `garage_user|garage_db|t|0`. Se houver tabelas inesperadas ou faltar CREATE, pare.

## 4. Aplicar as migrations

Use a imagem publicada pelo CI com tag fixa (`sha-<commit>`), não `latest`:

```bash
docker run --rm --network bqtech-data --env-file garage-api.env \
  ghcr.io/brenoqn/garage-api:sha-<commit> node dist/garage-api/migrate-cli.mjs
```

Esperado: `Garage migrations applied: 2` na primeira vez e `0` se repetido. Confira:

```bash
... psql ... -Atc "select migration_id from schema_migrations order by 1"
# 001_initial.sql
# 002_user_maintenance_schedule.sql
```

## 5. Subir o container da API

Exemplo de serviço Compose (ajuste ao arquivo privado existente):

```yaml
garage-api:
  image: ghcr.io/brenoqn/garage-api:sha-<commit>
  container_name: bqtech-garage-api
  env_file: ./garage-api.env
  networks: [bqtech-proxy, bqtech-data]
  restart: unless-stopped
  read_only: true
  security_opt: ['no-new-privileges:true']
  # sem "ports": a API não é publicada no host
```

Verifique `docker logs bqtech-garage-api` (deve mostrar `Garage API listening on port 3001`) e,
de dentro da rede do proxy, `wget -qO- http://bqtech-garage-api:3001/ready` → `{"status":"ready"}`.

## 6. Rota `/api` no Caddy

Antes do bloco que serve o frontend:

```text
garage.bqtech.com.br {
  handle /api/* {
    reverse_proxy bqtech-garage-api:3001
  }
  handle {
    reverse_proxy bqtech-garage:80
  }
}
```

Adapte ao formato real (porta/listener que o `cloudflared` usa). O Caddy repassa o cabeçalho
`Cf-Access-Jwt-Assertion` por padrão; não o remova.

## 7. Verificações de segurança

1. Anônimo pela internet: `curl -sI https://garage.bqtech.com.br/api/garage` → redireciona ou
   nega pelo Access (302/403), nunca `200`.
2. Desvio da borda: de dentro da rede do proxy,
   `wget -qO- http://bqtech-garage-api:3001/api/garage` → `401 UNAUTHENTICATED`.
3. Autenticado no navegador: `https://garage.bqtech.com.br/api/garage` →
   `{"status":"not-configured",...}`.
4. Publique o frontend com a versão atual, abra **Ajustes → Onde ficam seus dados → Conectar ao
   servidor do Garage**. Com o servidor vazio, faça a importação (passo abaixo) ou a configuração
   inicial e registre um gasto de teste para confirmar escrita, releitura e revisão.

## 8. Rollback

- Parar o container `garage-api` e remover o `handle /api/*` do Caddy. O frontend continua
  funcionando no modo local.
- Migrations não são revertidas automaticamente; os dados no `garage_db` permanecem.
- Remover a aplicação do Access reabre o frontend ao público (sem expor dados, desde que a API
  esteja parada).

## Importação dos dados locais

Em **Ajustes**, com o modo servidor conectado e o servidor vazio, escolha **Usar dados deste
navegador** ou **Selecionar backup**. O servidor valida e mostra a prévia
(`POST /api/garage/import/preview`); só **Confirmar importação** grava (`POST /api/garage/import`),
em garagem vazia, preservando IDs, numa única transação conferida por releitura. Exporte um
backup local antes, por segurança. Os dados do navegador continuam guardados e o modo local pode
ser retomado a qualquer momento.
