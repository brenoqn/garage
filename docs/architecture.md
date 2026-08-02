# Arquitetura

## Visão geral

Garage é uma PWA Angular 22 standalone, estrita e sem backend. Rotas lazy são exibidas em um
shell responsivo. Signals representam o estado local e formulários reativos tratam entradas e
confirmações.

```text
UI / rotas
    ↓
GarageStore + serviços de navegador
    ↓
regras puras: execução, migração, backup, odômetro, cronologia e manutenção
    ↓
StoragePort
    ↓
LocalStorageAdapter (`garage_state`)
```

`core/models` define contratos; `core/domain` contém regras e validações sem Angular;
`core/services` coordena estado e APIs opcionais; `core/storage` isola o LocalStorage;
`features` contém páginas standalone; `data` mantém o catálogo estático da Honda NX200; e
`shared` abriga componentes reutilizáveis.

## Estado persistido

O valor em `garage_state` é diretamente o agregado, sem envelope adicional:

```typescript
interface GarageState {
  schemaVersion: 3;
  motorcycle: Motorcycle;
  maintenancePlan: readonly MaintenancePlanItem[];
  serviceHistory: readonly ServiceRecord[];
  odometerHistory: readonly OdometerRecord[];
  procedureExecutions: readonly ProcedureExecution[];
  settings: GarageSettings;
  setup: GarageSetup;
}
```

O catálogo de procedimentos e as especificações continuam estáticos e reconstruíveis. O estado
persiste apenas dados do usuário e referências a IDs estáveis do catálogo. A validação de runtime
recusa IDs desconhecidos, duplicados, vínculos quebrados e mais de uma execução ativa do mesmo
procedimento para a mesma motocicleta.

## Migração e recuperação

`decodeStoredGarageState` diferencia:

- `empty`: usa o seed do schema 3;
- `current`: aceita um schema 3 validado;
- `migrated`: valida v2 e acrescenta somente `procedureExecutions: []`, ou percorre v1 → v2 → v3;
- `invalid-state`: preserva o valor bruto e usa o seed somente em memória;
- `future-version`: preserva uma versão que o aplicativo atual não conhece.

A transformação v2 → v3 preserva motocicleta, plano, serviços, odômetro, preferências e setup.
Depois da primeira gravação, decodificar o resultado não aplica outra transformação. Estado
inválido ou futuro nunca é substituído automaticamente; somente importação ou restauração
confirmada libera o modo de recuperação.

## Execuções de procedimentos

`ProcedureExecution` registra `in-progress`, `completed` ou `cancelled`, timestamps, IDs de
etapas concluídas, verificações finais, alertas reconhecidos, etapa atual, observação e serviço
resultante opcional.

O ciclo de vida é:

```text
preparação → in-progress ── concluir requisitos ──→ completed ── ação do usuário ──→ serviço
                 │
                 ├── pausar → permanece in-progress
                 ├── cancelar → cancelled
                 └── reiniciar → cancelled + nova in-progress com outro ID
```

Existe no máximo uma execução `in-progress` por motocicleta e slug. O percentual principal usa
somente etapas obrigatórias. Etapas opcionais têm contagem separada e não bloqueiam a conclusão.
Finalizar exige todas as etapas e verificações finais obrigatórias. Desmarcar uma etapa não apaga
etapas posteriores.

As funções em `core/domain/procedure-execution.ts` criam, avançam, desmarcam, calculam progresso,
concluem, cancelam, reiniciam, selecionam a ativa e vinculam serviços. Componentes apenas
coordenam interação e apresentação.

## Persistência transacional e vínculo com serviços

Cada mutação constrói e valida o próximo `GarageState`, grava pela `StoragePort` e somente depois
publica o novo Signal. Falha de gravação preserva a interface anterior e bloqueia novas mudanças
até recuperação.

Concluir um procedimento não altera plano, odômetro nem histórico de serviços. A tela concluída
oferece abrir o formulário. Ao salvar, `ServiceRecord.procedureExecutionId` e
`ProcedureExecution.resultingServiceRecordId` são escritos na mesma transação. A validação exige
relação bidirecional, slug compatível, execução concluída e cardinalidade um-para-um. Plano e
odômetro seguem as regras cronológicas da Sprint 2.

## Backup

O envelope existe somente no arquivo:

```typescript
interface GarageBackup {
  product: 'garage';
  schemaVersion: 3;
  exportedAt: string;
  state: GarageState;
}
```

O backup inclui execuções e vínculos, mas não o catálogo estático. A importação aceita schema 2,
migra-o para 3, aceita schema 3 validado e recusa versões futuras. O resumo inclui quantidade de
execuções. Selecionar o arquivo não muda o store; uma confirmação separada substitui os dados.

## Catálogo e integridade

Etapas, alertas, verificações, ferramentas e materiais são estruturados e possuem IDs explícitos
que não dependem de posição ou texto. Testes garantem slugs e IDs únicos, não vazios e referências
válidas. Campos para imagens futuras existem, mas nenhuma imagem mecânica foi adicionada.

Todo valor técnico atual permanece `needs-confirmation` e `A confirmar`. Checklists avançados
podem ser concluídos, mas a interface não afirma segurança ou aprovação mecânica.

## Modo oficina, temporizador e Wake Lock

O modo oficina cobre o shell com uma interface vertical simplificada e controles maiores. A
preferência não é persistida. `ScreenWakeLockService` isola a API Wake Lock: solicita após a ação
explícita, trata ausência ou recusa sem bloquear o fluxo, libera ao sair e tenta readquirir quando
a aba volta visível enquanto a solicitação continua ativa.

O temporizador é manual, opcional e não contém durações técnicas no catálogo. O usuário informa
minutos; o restante deriva de um timestamp de término, suporta pausa e cancelamento e não precisa
sobreviver ao fechamento completo do navegador.

## Odômetro, plano e alertas

Leituras regressivas continuam exigindo confirmação e motivo; serviços antigos não reduzem o
odômetro atual. `shouldReplaceMaintenanceExecution` mantém a referência cronologicamente mais
recente do plano. Itens `needs-confirmation` retornam `unknown` e não entram em alertas ou
contagens. Notificações push continuam fora do escopo.

## PWA e hospedagem estática

O Angular Service Worker é ativado em produção, guarda shell e assets, e sustenta a navegação
básica offline. O manifesto usa **Garage** e inicia em `/dashboard`. `npm run build:sites` prepara
`dist/client` e um Worker estático com fallback para as rotas Angular.

## Limitações atuais

- um navegador, uma Honda NX200 e LocalStorage sem criptografia ou sincronização;
- conteúdo mecânico demonstrativo ainda sem validação documental;
- temporizadores não persistem após fechar completamente o navegador;
- Wake Lock depende de suporte e permissão do navegador;
- sem imagens, anexos, exclusão de execuções, push, backend ou autenticação.
