# Arquitetura

## Visão geral

Garage é uma aplicação Angular 22 standalone, estrita e sem backend. As rotas são carregadas
sob demanda dentro de um shell responsivo. Signals mantêm o estado local; formulários reativos
tratam configuração, registros e confirmações.

```text
UI / rotas
    ↓
GarageStore + NotificationService + CurrentDateService
    ↓
regras puras: migração, backup, odômetro, cronologia e manutenção
    ↓
StoragePort
    ↓
LocalStorageAdapter (`garage_state`)
```

## Limites de pastas

- `core/models`: contratos do domínio, estado persistido e backup.
- `core/domain`: cálculos, validações e migrações puras, sem Angular ou navegador.
- `core/storage`: porta de armazenamento e implementação LocalStorage.
- `core/services`: coordenação de estado, persistência, data atual e alertas.
- `shared`: componentes pequenos reutilizados entre recursos.
- `features`: páginas standalone organizadas por fluxo.
- `data`: estado inicial, procedimentos e especificações demonstrativas.

## Estado persistido

O `GarageStore` possui um Signal privado com `GarageState`. O `LocalStorage` guarda diretamente
o schema atual, sem envelope e sem duplicidade de campos de versão:

```typescript
interface GarageState {
  schemaVersion: 2;
  motorcycle: Motorcycle;
  maintenancePlan: readonly MaintenancePlanItem[];
  serviceHistory: readonly ServiceRecord[];
  odometerHistory: readonly OdometerRecord[];
  settings: GarageSettings;
  setup: GarageSetup;
}
```

`setup.completed` separa dados operacionais de uma demonstração ainda não confirmada.
`setup.demoData` permite que a interface explique a origem do estado. O seed usa Honda NX200
ano 1997 e não ativa alertas antes da configuração.

Procedimentos e especificações continuam como conteúdo estático da aplicação e não são
persistidos. O plano é persistido porque `lastExecution` contém referências produzidas pelo
histórico do usuário. Os serviços do seed são marcados como demonstração, permanecem
identificados na interface e não entram no backup; registros não demonstrativos são preservados.

## Carregamento, migração e recuperação

`decodeStoredGarageState` recebe o texto bruto e produz um dos resultados:

- `empty`: usa o seed do schema 2;
- `current`: aceita um estado 2 validado;
- `migrated`: valida o formato `version: 1` e produz diretamente `GarageState` 2;
- `invalid-state`: preserva o valor bruto e usa o seed apenas em memória;
- `future-version`: preserva dados que esta versão não sabe interpretar.

A migração é idempotente: um estado já migrado é validado e devolvido sem nova transformação.
O formato legado mantém motocicleta, plano, serviços e preferências. Uma leitura de odômetro
com origem `migration` registra a quilometragem encontrada, enquanto o setup permanece
pendente para o usuário confirmá-la.

Estados inválidos ou futuros colocam o store em modo de recuperação. Alterações comuns ficam
bloqueadas, o conteúdo bruto pode ser exportado, e somente importação ou restauração
explicitamente confirmada substitui `garage_state`.

## Persistência transacional

Mutações constroem o próximo estado, serializam-no pela `StoragePort` e apenas depois atualizam
o Signal. Se a gravação falhar, a interface continua com o estado anterior e o store expõe um
problema de persistência. Essa ordem evita apresentar como salvo algo que o navegador recusou.

`LocalStorageAdapter` continua sendo a única implementação. IndexedDB, backend e sincronização
permanecem fora desta etapa.

## Backup

O envelope existe somente no arquivo exportado:

```typescript
interface GarageBackup {
  product: 'garage';
  schemaVersion: 2;
  exportedAt: string;
  state: GarageState;
}
```

`parseGarageBackup` analisa o JSON, verifica produto, versão, data e todos os campos do estado,
e então produz um resumo. A seleção do arquivo não altera o store. A UI exige uma segunda ação
para confirmar a substituição. Arquivos malformados, de outro produto ou schema incompatível
são recusados.

## Odômetro

Cada atualização cria um `OdometerRecord` com motocicleta, quilometragem, instante, origem e
observação opcional. Uma leitura inferior retorna `confirmation-required` sem efeitos. Depois
da confirmação, a origem deve ser `correction` ou `panel-replacement`; o novo registro é
acrescentado e históricos antigos permanecem imutáveis.

Todo serviço cria uma leitura com origem `service`. Serviços com quilometragem menor continuam
no histórico, mas não reduzem a leitura atual da motocicleta.

## Cronologia de serviços

`shouldReplaceMaintenanceExecution` decide se um serviço vinculado passa a ser
`lastExecution`:

1. data posterior vence;
2. em datas iguais, maior quilometragem vence;
3. data e quilometragem iguais preservam a execução atual.

O histórico visível usa a mesma ordem, com `createdAt` apenas como desempate final.

## Regra de manutenção

`calculateMaintenanceSchedule` recebe item, quilometragem atual e data de referência. Um item
com fonte `needs-confirmation` retorna `unknown` antes de qualquer cálculo. Para fontes
confirmadas, quilometragem e tempo são calculados separadamente e prevalece o estado mais
urgente:

```text
overdue > due > upcoming > ok > unknown
```

Enquanto o setup estiver incompleto, todas as linhas são apresentadas como pendentes e as
contagens operacionais permanecem zeradas.

## Alertas

`InAppNotificationService` converte somente itens operacionais em alertas, acrescenta razão,
previsões, dias/quilômetros restantes ou em atraso e a ação principal. Alertas são ordenados
por urgência. `CurrentDateService` atualiza o dia de referência após a meia-noite, permitindo
que estados por calendário mudem sem outra ação do usuário.

Notificações push continuam atrás da interface `NotificationService` e fora do escopo.

## PWA

O Angular Service Worker é ativado apenas em produção por `app.config.ts`. `ngsw-config.json`
faz cache do shell e dos assets. O manifesto usa o nome **Garage**, inicia em `/dashboard` e
contém ícones maskable originais.

`npm run build:sites` organiza o bundle em `dist/client` e gera o Worker estático em
`dist/server/index.js`, com fallback para `index.html` nas rotas do Angular.

## Decisões e compromissos

- Um agregado `GarageState` mantém consistência offline no escopo de uma motocicleta.
- O schema local e o envelope de backup têm papéis diferentes e não são aninhados.
- O conteúdo técnico não confirmado continua visível, mas é inativo operacionalmente.
- O armazenamento não é criptografado e pertence ao dispositivo/navegador.
- Checklists de procedimentos foram adiados para a Sprint 3, sobre a persistência estabilizada.
