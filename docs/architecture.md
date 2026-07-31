# Arquitetura

## Visão geral

Garage é uma aplicação Angular 22 standalone, estrita e sem backend. As rotas são carregadas
sob demanda dentro de um shell responsivo. Signals mantêm o estado local; formulários reativos
tratam cadastros e registros.

```text
UI / rotas
    ↓
GarageStore + NotificationService
    ↓
regras puras de domínio
    ↓
StoragePort
    ↓
LocalStorageAdapter (`garage_state`)
```

## Limites de pastas

- `core/models`: contratos do domínio e estado persistido.
- `core/domain`: cálculos puros, sem dependência de Angular ou navegador.
- `core/storage`: porta de armazenamento e implementação LocalStorage.
- `core/services`: coordenação de estado, persistência e alertas.
- `shared`: componentes pequenos reutilizados entre recursos.
- `features`: páginas standalone organizadas por fluxo.
- `data`: estado inicial, procedimentos e especificações demonstrativas.

## Estado e persistência

`GarageStore` possui um signal privado com `GarageState` versão 1 e expõe apenas leituras
derivadas. Toda mutação passa por métodos explícitos e é persistida pela `StoragePort`.

O adaptador atual serializa JSON em `garage_state`. A porta permite trocar a implementação por
IndexedDB ou uma fonte remota sem acoplar páginas à API do navegador. Migrações de esquema
devem usar o campo `version`.

Procedimentos e especificações são conteúdo de aplicação e não são persistidos. Dados da
motocicleta, plano, histórico e preferências são persistidos.

## Regra de manutenção

`calculateMaintenanceSchedule` recebe item, quilometragem atual e data de referência. A função
calcula próximas ocorrências e distâncias restantes separadamente para quilometragem e tempo.
Quando há dois gatilhos, prevalece o estado mais urgente:

```text
overdue > due > upcoming > ok > unknown
```

- `overdue`: data ou quilometragem foi ultrapassada;
- `due`: data ou quilometragem coincide com a referência;
- `upcoming`: dentro da antecedência configurada;
- `ok`: fora da janela de aviso;
- `unknown`: execução ou intervalo insuficiente para calcular.

Ao salvar um serviço com `maintenancePlanId`, o store substitui `lastExecution` do item. A
próxima ocorrência é derivada no próximo cálculo, evitando manter dados calculados duplicados.

## Alertas

`NotificationService` é uma interface fornecida por `NOTIFICATION_SERVICE`. A implementação
atual, `InAppNotificationService`, converte estados relevantes em alertas do dashboard. Uma
implementação futura poderá compor notificações push sem mudar o domínio ou as páginas.

## PWA

O Angular Service Worker é ativado apenas em produção por `app.config.ts`. `ngsw-config.json`
faz cache do shell e dos assets. O manifesto usa o nome **Garage**, inicia em `/dashboard` e
contém ícones maskable originais.

`npm run build:sites` preserva o bundle Angular e o organiza em `dist/client`, acompanhado de
um Worker mínimo em `dist/server/index.js`. O Worker entrega assets estáticos e faz fallback
para `index.html` somente em navegações de rotas, mantendo o Angular Router responsável pela
interface.

## Decisões e compromissos

- Um único agregado `GarageState` simplifica consistência offline no MVP.
- O conteúdo técnico não confirmado continua visível para demonstrar a estrutura, mas usa
  `A confirmar` e fonte pendente.
- Intervalos iniciais exercitam os cálculos, porém são rotulados como demonstrativos e não
  devem ser tratados como especificações Honda.
- Não há criptografia local; usuários devem considerar o armazenamento do navegador como dado
  do dispositivo.
