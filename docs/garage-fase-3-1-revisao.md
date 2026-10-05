# Garage — Fase 3.1: revisão técnica do backend

Data: 4 de outubro de 2026. Escopo: revisão da implementação local da Fase 3 contra
`outputs/garage-fase-2-proposta-arquitetural.md`, especialmente a seção 19, o checkpoint da
Fase 3, `AGENTS.md` e o código. A migration **não foi aplicada** a `garage_db`; a API não foi
conectada a produção, publicada ou integrada ao Angular. Nenhum commit ou push foi feito.

## 1. Divergências encontradas

- A escrita usava somente advisory lock. A Fase 2.1 exige bloqueio da linha singleton:
  corrigido com `SELECT ... FOR UPDATE`, mantendo o advisory lock para a primeira escrita,
  quando a linha ainda não existe.
- O mapper de `date` convertia meia-noite local para UTC e podia retornar o dia anterior em
  fuso positivo; corrigido. O mapper de `numeric` arredondava valores de precisão maior que a
  representável em `number`; agora recusa a conversão silenciosa.
- O snapshot de garagem sem moto omitia as preferências já persistidas ou os defaults. Agora
  retorna `settings` fora de `state`, sem criar moto ou dados de demonstração.
- O vínculo posterior de serviço com execução concluída não atualizava o `updated_at` da
  execução, exigido pelo domínio/proposta. Corrigido na mesma transação do serviço.
- O HTTP respondia 503 para corpo acima do limite e 400 para precondições ausentes. Agora
  responde 413 e 428, respectivamente.
- O contexto Docker excluía `.env`, mas não diretórios `.secrets` ou chaves em subpastas.
  Os ignores locais foram reforçados.
- Restam diferenças **não corrigidas nesta revisão**: a API implementada usa comandos POST
  próprios, enquanto a tabela de endpoints da Fase 2 era ilustrativa e incluía PATCHs; o
  cadastro da moto exige `mileage`/`source` mesmo quando só se deseja editar apelido/ano,
  embora a proposta tratasse a leitura como opcional; o
  `updateSettings` atual exige ambos os campos, embora a proposta admita alteração parcial;
  erros de regra de negócio normalmente usam 400, não 422; replay não indica `replayed` nem
  devolve snapshot; não há consulta de recibo, importação ou verificação de versão do catálogo
  em cada comando. Não alterei esses contratos sem decisão de escopo. A barreira de acesso
  para publicação continua **não determinada pelo ambiente atual**.

## 2. Correções realizadas e arquivos alterados nesta revisão

`server/src/persistence/repositories.ts` (lock da linha), `server/src/persistence/pool.ts`,
`server/src/persistence/migrate.ts` e `server/src/application/garage-service.ts` (search path
transacional; snapshot e `updated_at`), `server/src/persistence/mappers.ts` (data e precisão),
`server/src/http/app.ts` (413/428), `shared/garage.ts` (preferências do snapshot sem moto),
`.dockerignore` e `.gitignore` (proteção de secrets), `server/tests/integration.spec.ts` e
`server/tests/mappers.spec.ts` (cobertura), e este relatório. Não houve mudança no modelo
relacional ou no conteúdo de `001_initial.sql`.

## 3. Novos testes e lacunas de cobertura

Foram acrescentados testes de fuso positivo, precisão numérica, 413/428, snapshot com
preferências antes da moto, proprietário das tabelas, ausência de triggers, duas requisições
simultâneas com a mesma chave, revisão sem salto, recibo único e constraints adicionais.
Os testes anteriores já exercitavam replay, hash conflitante, resposta perdida após COMMIT,
revisão concorrente, rollback de serviço, ordem cronológica, vínculos, checklist e lifecycle.

Cobertura ainda insuficiente para importação, pois não há importador. Não existe teste de
round-trip para todos os campos opcionais, todas as condições de rollback ou todos os CHECKs
e FKs; esses casos não foram apresentados como comprovados. A consistência multiquery do
snapshot é garantida por transação `REPEATABLE READ READ ONLY` com um único client; não há um
teste de corrida de snapshot com escrita intercalada. IDs importados cabem nos `text` PKs e os
repositories aceitam IDs fornecidos, mas preservação ponta a ponta não pode ser comprovada
sem o fluxo de importação.

## 4. Resultado dos 110 testes existentes

`npm run test:ci`: **23 arquivos, 110 testes aprovados**. `npm run validate:content`: **3
testes aprovados** (subconjunto dos 110). Nenhum teste anterior foi removido.

## 5. Resultado dos testes do servidor

`npm run server:test`: **3 arquivos, 19 testes aprovados**, incluindo os quatro testes novos.
`npm run server:typecheck`, `npm run server:build` e `npx eslint server shared` passaram.
`npm run format:check`, `npm run lint`, `npm run build`, `npm run build:sites` e
`git diff --check` também passaram.

## 6. PostgreSQL descartável

Os testes SQL e HTTP usaram PostgreSQL 17 em container temporário na VM, com banco/usuário
`garage_test_db`/`garage_test_user` e túnel SSH em loopback. A fixture apagou/recriou somente
o schema desse banco de teste. Confirmou criação de 13 tabelas de negócio mais
`schema_migrations`, ownership pelo usuário de teste, reaplicação sem mudanças, checksum
divergente rejeitado, runners simultâneos, constraints, rollback e operações concorrentes.
Container e túnel foram encerrados. Nenhuma migration foi executada em `garage_db`.

## 7. Auditoria da migration 001

Há exatamente as 13 tabelas aprovadas, com singleton `garage(id=1)` e `motorcycles.garage_id`
único. PKs, FKs simples e compostas, UNIQUEs, índices de histórico, checks de valores,
status e timestamps estão presentes. `last_service_same_plan` é FK composta
`DEFERRABLE INITIALLY DEFERRED`. A última execução pode não ter serviço; quando aponta para
um serviço, a FK exige mesma moto e item do plano. A relação serviço/execução usa uma FK
UNIQUE; o DTO inverso é derivado. Leituras de odômetro impedem simultaneamente serviço e
combustível e usam FKs compostas para a moto. `numeric` recusa negativos e valores especiais;
`bigint` de km tem limite seguro para JavaScript. `write_operations` usa chave composta,
revisão única, hash e índice parcial de importação; `schema_migrations` é criada pelo runner
com checksum e data. O runner fixa `search_path` em `public` durante sua transação.

Não há `garage_settings`, JSONB do estado, usuários, tenants, eventos, grants, mudanças de
roles, triggers ou funções SQL na migration. As únicas triggers observadas no teste eram
temporárias da fixture de rollback, removidas após o teste. Colunas `text[]` não têm validação
SQL completa de dimensão, duplicidade, NULL interno ou IDs de catálogo: a API valida os
comandos atuais; uma importação futura terá de fazer o mesmo antes do COMMIT. A FK do serviço
não prova por si só que a execução esteja concluída, nem a FK da última execução prova a
correspondência de data/km; esses invariantes dependem dos casos de uso, conforme a proposta.

## 8. Transações

`setupGarage` grava linha `garage`, moto, plano, leitura, revisão e recibo em uma transação;
não cria seed demo. `updateMotorcycle` aplica política de regressão, exige confirmação e
motivo, e grava leitura quando há mudança de km. `recordOdometer` faz o mesmo; leitura igual
não cria histórico. Serviço grava partes, leitura, eventual avanço do odômetro, projeção
cronológica e vínculo de execução na mesma transação; serviço antigo não substitui última
execução. Abastecimento grava evento/leitura e avança km somente quando superior ao atual.
Gasto e ocorrência não alteram km. Inspeção exige o checklist completo e grava cabeçalho e
respostas juntos. Start/step/skip/final check/finish/cancel/restart executam regras de domínio;
restart cancela a anterior e cria outra com ID novo; finish não cria serviço nem altera km.
Todas as queries dos repositories recebem o mesmo `PoolClient` transacional. O snapshot usa
um único client de leitura `REPEATABLE READ`. A API só responde após COMMIT.

## 9. Idempotência

Casos A/B/C/D: mesma chave e intenção reproduz IDs/revisão; mesma chave com payload diferente
retorna 409; retry após COMMIT não duplica; duas requisições simultâneas com a mesma chave
produziram um único registro, recibo e incremento de revisão. O hash é SHA-256 da intenção
canônica incluindo operação, payload e revisão esperada. Recibo e alteração pertencem à mesma
transação. A unicidade parcial para importação existe, mas o importador não existe: a detecção
de mesma importação com nova chave/revisão **não foi comprovada**. O futuro hash de importação
terá de ser estável em relação à revisão para que esse índice cumpra a decisão da Fase 2.1.

## 10. Concorrência

Ordem efetiva: advisory lock de inicialização → lock `FOR UPDATE` da linha existente → busca
de recibo → comparação da revisão → revalidação de domínio → escrita → incremento → recibo →
COMMIT. O advisory lock protege o período em que ainda não há linha para bloquear. Dois
comandos diferentes com a mesma revisão geraram um 200 e um 409, sem salto de revisão ou
segundo recibo. Índices UNIQUE reforçam uma execução ativa por moto/procedimento e vínculo
1:1 entre execução e serviço.

## 11. Segurança

Credenciais vêm somente do ambiente; `.env.example` tem placeholders vazios. O código rejeita
explicitamente `bqtech_admin`. Os arquivos `.env`, `.secrets`, `.pem` e `.key` estão protegidos
pelos ignores; `Dockerfile` contém `COPY . .`, de modo que `.dockerignore` é essencial. O
build Angular foi inspecionado em código: não importa configuração do servidor ou secrets.
Queries de negócio são parametrizadas; não há concatenação de input, SQL nos controllers,
stack trace, conexão ou senha em respostas de erro. Logs HTTP registram método, caminho,
status e duração; não registram corpo ou headers. O pool tem máximo 5 conexões e timeouts.

O runtime aceita qualquer usuário não administrativo configurado no ambiente; a configuração
de implantação precisa fornecer `garage_user`, e `/ready` verifica a identidade real contra
essa configuração. O código, sozinho, não prova que a futura implantação usará `garage_user`.
Não há autenticação própria. A API **não pode ser publicada** antes de comprovar barreira de
acesso no proxy; rota e barreira continuam não determinadas pelo ambiente atual. O processo
escuta `0.0.0.0` por padrão, exigindo rede privada na implantação.

## 12. Dependências

`npm audit --omit=dev`: **4 pacotes sinalizados** (`@angular/common`, `forms`,
`platform-browser`, `router`; três moderados e um alto), vinculados a advisories de
transfer cache/SSR. O Garage atual é uma PWA estática sem SSR, e a API não usa esses pacotes
em execução; a explorabilidade pelos fluxos atuais não foi demonstrada. Registrar correção
Angular separadamente, sem upgrade geral nesta migration. `npm audit` completo sinalizou
**14 pacotes** (7 moderados, 5 altos, 2 críticos), incluindo ferramentas de build/teste e
transitivos como `piscina`, `vitest`, `undici`, `hono`, `fast-uri` e `nanoid`.
Esses avisos requerem triagem de tooling em tarefa própria; não são dependências carregadas
pela API em produção. `express` e `pg` não foram sinalizados, e `npm ls qs` confirmou
`qs@6.16.0` sob Express e Supertest após o override. Nenhuma dependência foi alterada aqui.

## 13. Comparação Fase 2.1 × implementação

| Decisão Fase 2.1                                                 | Implementação                                                                                    | Status                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------- |
| Same-origin `/api` somente após barreira comprovada              | Rotas `/api` existem localmente; proxy/barreira não configurados nem comprovados                 | parcialmente conforme |
| Singleton `garage(id=1)` com revisão/settings e moto opcional    | Tabela, FK/UNIQUE, snapshot sem moto e lock de linha implementados                               | conforme              |
| Recibo mínimo de `write_operations`, replay e hash de importação | Recibo/replay de operações atuais funcionam; importação e hash independente da revisão pendentes | parcialmente conforme |
| Projeção `lastExecution` com `last_service_record_id` nullable   | Data/km, FK composta adiável, regra cronológica e leitura inversa implementadas                  | conforme              |
| `garage_user` em `garage_db`, sem admin                          | Admin rejeitado; usuário real será definido por ambiente; DML de produção ainda não verificável  | parcialmente conforme |
| Concorrência com lock, revisão global e 409                      | Lock de linha após advisory, recibo antes da revisão, transação e teste simultâneo               | conforme              |
| Importação explícita em destino vazio, sem seed                  | Ainda não implementada, conforme checkpoint da Fase 3                                            | parcialmente conforme |

## 14. Riscos restantes

API pública anônima exporia dados; não há barreira comprovada. A futura importação exige
validação de arrays/referências, preservação de IDs e timestamps, hash estável entre revisões,
prévia e rollback integral. As rotas e os contratos de cadastro/settings/replay diferem da proposta
ilustrativa e devem ser fechados antes da integração Angular. Casos de negócio inválidos
normalmente retornam 400 em vez de 422, com código `VALIDATION`; a distinção de cliente
fica menos precisa. A identidade `garage_user` depende da configuração de implantação.
`garage_db` ainda não tem tabelas, portanto SELECT/INSERT/UPDATE/DELETE em produção não
foram testados. Não há evidência nova da configuração efetiva do proxy.

## 15. Recomendação objetiva

**A migration 001 está tecnicamente pronta para aplicação no PostgreSQL de produção? SIM.**
Ela corresponde ao modelo aprovado, foi aplicada/reaplicada com sucesso em PostgreSQL 17
descartável, tem constraints e ownership verificados, runner transacional com checksum/lock e
schema `public` explícito, sem SQL que altere infraestrutura global. Isso é uma avaliação
**técnica da migration**, não autorização para executá-la nem aprovação para publicar a API.
Antes de qualquer ativação, confirmar configuração de `garage_user`, executar a migration
somente com autorização específica e verificar DML no banco criado; exposição HTTP, contratos
pendentes e importação continuam decisões/etapas separadas.
