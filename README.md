# Garage

Garage é um aplicativo web progressivo, mobile-first e autodidático para proprietários de
motocicletas. Este MVP atende exclusivamente à Honda NX200 e oferece manutenção preventiva,
procedimentos interativos, histórico de serviços, histórico do odômetro e alertas internos.

O nome do produto é **Garage**. “Honda NX200” identifica somente a primeira motocicleta
suportada.

## O que está incluído

- dashboard da motocicleta com quilometragem, próxima prioridade e alertas detalhados;
- configuração inicial da Honda NX200 antes de ativar dados operacionais;
- edição dos dados da motocicleta e atualização rápida do odômetro;
- histórico de leituras com origem, data, observação e vínculo com serviços;
- confirmação explícita para correções regressivas e trocas de painel;
- plano preventivo com os estados `ok`, `upcoming`, `due`, `overdue` e `unknown`;
- intervalos sem fonte confirmada visíveis, porém inativos nas contagens e nos alertas;
- registro cronológico de serviços, peças, custos e observações;
- atualização da referência do plano somente quando o serviço vinculado é mais recente;
- biblioteca pesquisável com seis procedimentos demonstrativos e IDs estáveis;
- preparação com confirmação de segurança, execução passo a passo e retomada local;
- histórico de procedimentos em andamento, concluídos e cancelados;
- modo oficina, Wake Lock opcional e temporizador manual por horário de término;
- registro opcional de manutenção após a conclusão, com vínculo individual à execução;
- especificações não confirmadas marcadas como **A confirmar**;
- estado local no schema 3, migração encadeada dos formatos anteriores e recuperação segura;
- exportação e importação de backup JSON com validação, resumo e confirmação;
- navegação responsiva, PWA instalável e service worker de produção;
- testes de domínio, store, migração, backup, procedimentos, componentes e Wake Lock.

## Executar localmente

Requisitos: Node.js compatível com Angular 22 e npm.

```bash
npm install
npm start
```

Acesse o endereço informado pelo Angular CLI. O aplicativo redireciona a raiz para
`/dashboard`.

## Verificações

```bash
npm run lint
npm run test:ci
npm run build
```

O build de produção é gerado em `dist/garage/browser`.

Para preparar o mesmo build como um site estático com fallback das rotas Angular:

```bash
npm run build:sites
```

## Persistência, migração e backup

O `LocalStorage` guarda diretamente um `GarageState` com `schemaVersion: 3` na chave física
`garage_state`. Estados do schema 2 recebem `procedureExecutions: []` sem mudança nos demais
campos. O formato `version: 1` percorre a cadeia v1 → v2 → v3. Cada etapa é validada, a
migração é idempotente e o conteúdo anterior é preservado.

Se o valor local for inválido ou pertencer a uma versão futura, ele não é sobrescrito. O
Garage inicia um estado demonstrativo somente em memória, informa o problema e permite
exportar o conteúdo original em Ajustes. Somente uma restauração ou importação confirmada
substitui esse valor.

O backup usa um envelope separado:

```json
{
  "product": "garage",
  "schemaVersion": 3,
  "exportedAt": "2026-07-30T12:00:00.000Z",
  "state": {}
}
```

Procedimentos e especificações são conteúdo estático e não entram no backup. Execuções de
procedimentos, seus vínculos com serviços, plano, odômetro e demais dados do usuário entram.
Backups do schema 2 são aceitos e migrados; schema 3 é validado diretamente; versões futuras
são recusadas. Serviços demonstrativos reconstruíveis e suas referências são removidos.

O aplicativo não possui backend, conta de usuário, sincronização ou notificações push nesta
etapa. O backup é a forma disponível de transferir dados entre navegadores ou dispositivos.

## Dados técnicos

Os intervalos do plano inicial são demonstrativos. Itens com fonte `needs-confirmation`
permanecem visíveis para orientar a estrutura, mas não geram prioridades operacionais.
Nenhum valor mecânico específico não confirmado é apresentado como fato. Valores técnicos
sem documentação confiável aparecem como **A confirmar** e mantêm o campo de fonte técnica.
Os checklists continuam utilizáveis, mas sua conclusão não afirma que a motocicleta está segura
nem transforma conteúdo pendente em recomendação operacional.

## Estrutura

```text
src/app/
├── core/      # modelos, domínio, serviços e armazenamento
├── data/      # conteúdo demonstrativo da Honda NX200
├── features/  # páginas e shell de navegação
└── shared/    # componentes reutilizáveis
```

Consulte [docs/architecture.md](docs/architecture.md) para decisões técnicas,
[docs/product-vision.md](docs/product-vision.md) para o recorte do produto e
[docs/content-guidelines.md](docs/content-guidelines.md) antes de adicionar conteúdo mecânico.
