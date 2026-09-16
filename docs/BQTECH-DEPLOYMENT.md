# Implantação BQTECH do Garage

Este documento descreve o contrato de implantação do Garage. Configurações privadas do servidor,
do proxy reverso e do provedor de borda são mantidas fora deste repositório.

## Aplicação

O Garage é uma PWA Angular frontend-only. Não possui backend, banco de dados, autenticação ou
sincronização remota. A produção pública está em:

```text
https://garage.bqtech.com.br
```

O estado do usuário é persistido no `LocalStorage`, na chave física `garage_state`, atualmente
com `schemaVersion: 4`. Como o armazenamento é isolado por origem, dados criados em outro domínio
devem ser exportados como backup JSON e importados na origem de produção.

## Container e cache

O `Dockerfile` compila o Angular com Node.js 24 e serve `dist/garage/browser` com Nginx. A imagem
publicada é:

```text
ghcr.io/brenoqn/garage
```

A configuração de produção preserva o funcionamento da PWA:

- `index.html`, `ngsw.json`, workers e arquivos sem hash exigem revalidação;
- bundles e assets com hash usam cache imutável de longa duração;
- rotas Angular usam fallback para `index.html`.

## CI e entrega

Pull requests para `main` executam validação. Pushes para `main`, depois de aprovados os checks,
publicam no GHCR as tags `latest` e `sha-<commit-curto>`. O GitHub Actions não acessa o ambiente
privado nem recebe credenciais do servidor.

O deploy é iniciado pelo próprio servidor por polling controlado. O processo de produção
reportado baixa a imagem, faz health check e preserva rollback. Compose, timer, script de update,
proxy e túnel ficam fora do repositório e devem ser validados diretamente no ambiente privado.

## Fontes de verdade e configuração local

- O repositório é a fonte de verdade para aplicação, schema e migrações locais, PWA, Dockerfile,
  Nginx e CI.
- O ambiente privado é a fonte de verdade para a imagem atualmente executada, health checks,
  rollback e roteamento público.
- `.openai/hosting.json` é metadado versionado do fluxo opcional de Sites; ele não contém o
  runtime do Garage e não é copiado para a imagem Nginx final.
- Secrets, tokens, chaves SSH e credenciais de infraestrutura não pertencem ao repositório nem
  ao GitHub Actions.

## Validação antes de publicar

```bash
npm ci
npm run format:check
npm run lint
npm run test:ci
npm run validate:content
npm run build
npm run build:sites
```

Após uma atualização de produção, valide a home, uma rota interna, instalação/atualização da PWA,
headers de cache e importação de um backup em ambiente controlado. A presença do container não
prova que dados de outra origem foram migrados.
