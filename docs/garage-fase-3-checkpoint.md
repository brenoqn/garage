# Garage — checkpoint da Fase 3

Estado em 4 de outubro de 2026: backend implementado e validado em PostgreSQL descartável.
O Angular continua no modo LocalStorage. Nenhuma migration foi aplicada no `garage_db` e a
API não foi publicada.

## Arquivos criados

- `shared/garage.ts` e `shared/validation.ts`: contratos schema 4, DTO de snapshot,
  erros e validações de comandos;
- `shared/odometer-policy.ts`, `shared/service-chronology.ts`,
  `shared/fuel-consumption.ts` e `shared/safety-check.ts`: regras puras reutilizadas;
- `server/src/config/env.ts`, `http/app.ts`, `index.ts` e `migrate-cli.ts`: ambiente,
  rotas, startup/shutdown e comando de migration;
- `server/src/application/garage-service.ts`: casos de uso e transações;
- `server/src/persistence/{pool,mappers,migrate,repositories}.ts`: conexão,
  mapeamento, runner e onze repositories específicos;
- `server/tests/config.spec.ts` e `server/tests/integration.spec.ts`;
- `tsconfig.server.json`, `.env.example` sem valores de segredo e este checkpoint.

## Arquivos alterados

- `package.json` e `package-lock.json`;
- dez modelos em `src/app/core/models/`, agora reexportados de `shared/garage.ts`;
- quatro regras em `src/app/core/domain/`, agora reexportadas de `shared/`;
- `README.md`, `docs/architecture.md` e `docs/roadmap.md`.

Nenhum componente, template, rota ou armazenamento Angular foi alterado.

## Migrations criadas

- `server/migrations/001_initial.sql` cria as 13 tabelas aprovadas: `garage`,
  `motorcycles`, `maintenance_plan_items`, `service_records`, `service_parts`,
  `odometer_records`, `fuel_records`, `expense_records`, `occurrence_records`,
  `procedure_executions`, `safety_check_records`, `safety_check_responses` e
  `write_operations`.
- O runner cria `schema_migrations` com ID, checksum e data de aplicação. Usa
  advisory lock, confirma que o histórico aplicado é prefixo das migrations
  disponíveis, detecta checksum alterado e não executa no startup.
- A migration foi aplicada somente no PostgreSQL descartável de teste. A migration
  de produção permanece **não aplicada**.

## Dependências adicionadas

Em produção: `express` 5 e `pg`. Em desenvolvimento/testes: `@types/express`,
`@types/pg`, `@types/node`, `tsx`, `esbuild`, `supertest` e
`@types/supertest`. O override local de `qs` para a linha corrigida 6.16 foi
adicionado após auditoria da árvore do Express.

Não foram adicionados ORM, NestJS, Redis, fila ou serviço externo.

## Testes adicionados

Dois arquivos e 15 testes, incluindo configuração sem vazamento de segredos,
JSON inválido, HTTP, DTO schema 4, banco vazio, primeira/segunda execução de
migration, checksum divergente, concorrência do runner, FK/UNIQUE/CHECK,
rollback, histórico cronológico, correção de odômetro, checklist, ciclo de
procedimento, vínculo serviço/execução, revisão otimista, idempotência e retry
após COMMIT. Um teste de conexão indisponível confirma erro sem fallback demo.

O banco de fixture foi um container PostgreSQL 17 temporário com usuário e
database próprios de teste, acessado por túnel SSH apenas em loopback. Ele
foi parado/removido ao terminar. Nenhum teste usou `garage_db` como fixture.

## Testes existentes preservados

`npm run test:ci`: 23 arquivos e 110 testes passaram. O validador de conteúdo
passou 3 testes (incluídos no conjunto existente). Nenhum teste anterior foi
removido ou reescrito.

## Resultado dos testes

Passaram `npm run format:check`, `npm run lint`, `npm run test:ci`,
`npm run validate:content`, `npm run build`, `npm run build:sites`,
`npm run server:typecheck`, `npm run server:build`,
`npx eslint server shared` e os 15 testes de `npm run server:test` em banco
isolado. `git diff --check` não apontou erros. O servidor via `tsx` iniciou
com `/health` 200 e `/ready` 200 no banco descartável. O bundle compilado
também iniciou: `/health` respondeu 200 e `/ready` respondeu 503 sem conexão,
como esperado.

## Estado do backend

`createApp()` pode ser testado sem abrir porta; startup e shutdown são
separados. A API usa pool pequeno, timeouts, validação de ambiente, queries
parametrizadas, logs sem payload/secrets e erros HTTP sanitizados. Implementa
`getGarage`, `setupGarage`, `updateMotorcycle`, `recordOdometer`,
`createService`, `createFuelRecord`, `createExpense`,
`createOccurrence`, `createSafetyCheck`, `startProcedureExecution`,
`updateProcedureExecution`, `finishProcedureExecution`,
`cancelProcedureExecution`, `restartProcedureExecution` e
`updateSettings`.

`GET /api/garage` monta o schema 4 relacionalmente e distingue
`not-configured`, `configured-empty` e `configured-with-history`.
`expectedRevision` e `Idempotency-Key` são obrigatórios em toda escrita;
recibo e incremento de revisão participam da mesma transação. Não há API
genérica de CRUD nem autenticação própria.

## Estado do PostgreSQL

Antes da implementação e após os testes, consultas somente leitura em
produção confirmaram `garage_user|garage_db` e **zero tabelas públicas**.
O PostgreSQL global, outros bancos, roles, grants e containers permanentes
não foram alterados. A API não foi conectada à rede BQTECH em produção.

## Privilégios utilizados

Em produção, `garage_user` foi usado apenas para consultas de identidade,
schema, privilégios e contagem de tabelas. CONNECT, USAGE e CREATE estavam
concedidos; CREATE não foi exercido em produção. No banco temporário de teste,
`garage_test_user` criou e removeu somente o schema de fixture. A aplicação
rejeita configuração com `bqtech_admin`.

## O que ainda NÃO foi feito

- Migration no `garage_db`, deploy, proxy, Caddy, Cloudflare ou exposição pública;
- autenticação/barreira de acesso e verificação real da rota `/api` no domínio;
- integração do Angular e remoção de LocalStorage/backup local;
- importação local → PostgreSQL e teste de IDs importados;
- teste DML de produção, impossível antes da primeira migration autorizada;
- commit e push.

## Riscos encontrados

- As rotas de dados ainda não têm barreira de acesso. A API não pode ser
  publicada até a proteção ser comprovada; a configuração efetiva de proxy e
  autenticação segue **não determinada pelo ambiente atual**.
- `npm audit --omit=dev` reporta quatro avisos na árvore Angular (um alto).
  A dependência `qs` trazida pelo Express foi corrigida com override local; os
  avisos Angular não foram tratados nesta fase do backend.
- A importação ainda não existe; diferenças em dados locais reais não podem
  ser validadas até a etapa de prévia/importação.
- O usuário de aplicação tem CREATE no schema, mas SELECT/INSERT/UPDATE/DELETE
  em tabelas futuras só poderão ser verificados depois de criadas.

## Próximo passo recomendado

Revisar este diff, em especial `001_initial.sql`, os contratos HTTP e a
estratégia de exposição. Após autorização específica, aplicar a migration
somente no `garage_db` com `garage_user` e verificar DML/round-trip, sem
publicar a API. A integração do frontend e a ativação da rota ficam para
decisão posterior.

## Declarações do checkpoint

- **Decisões Fase 2/2.1 alteradas:** nenhuma. A FK circular da projeção de
  última execução foi implementada como adiável, opção prevista na Fase 2.1.
- **Regras do GarageStore não preservadas:** nenhuma das regras críticas dos
  casos já implementados; a importação e o frontend remoto seguem pendentes.
  O backend exige motivo na redução de odômetro, conforme `AGENTS.md`.
- **Migration ainda não aplicada:** `001_initial.sql` em produção e, portanto,
  também o metadado `schema_migrations`.
- **Alterações fora do repositório Garage:** apenas o container PostgreSQL
  descartável e o túnel SSH temporários dos testes, ambos encerrados. Não há
  alteração externa persistente.
