# Garage

Garage é um aplicativo web progressivo, mobile-first e autodidático para proprietários de
motocicletas. Este MVP atende exclusivamente à Honda NX200 e oferece manutenção preventiva,
procedimentos guiados, histórico de serviços, histórico do odômetro e alertas internos.

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
- biblioteca pesquisável com seis procedimentos demonstrativos;
- especificações não confirmadas marcadas como **A confirmar**;
- estado local no schema 2, migração do formato anterior e recuperação segura de estado inválido;
- exportação e importação de backup JSON com validação, resumo e confirmação;
- navegação responsiva, PWA instalável e service worker de produção;
- testes unitários das regras de domínio, migração, backup, odômetro e cronologia.

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

O `LocalStorage` guarda diretamente um `GarageState` com `schemaVersion: 2` na chave física
`garage_state`. O formato anterior, identificado por `version: 1`, é validado e migrado de
forma idempotente. A migração preserva motocicleta, plano, serviços e preferências e cria a
primeira referência do histórico do odômetro.

Se o valor local for inválido ou pertencer a uma versão futura, ele não é sobrescrito. O
Garage inicia um estado demonstrativo somente em memória, informa o problema e permite
exportar o conteúdo original em Ajustes. Somente uma restauração ou importação confirmada
substitui esse valor.

O backup usa um envelope separado:

```json
{
  "product": "garage",
  "schemaVersion": 2,
  "exportedAt": "2026-07-30T12:00:00.000Z",
  "state": {}
}
```

Procedimentos e especificações são conteúdo estático da aplicação e não são acrescentados ao
backup. O plano preventivo permanece no estado porque contém referências de execução criadas
pelos registros do usuário. Serviços marcados como demonstração e suas referências também são
removidos da cópia exportada.

O aplicativo não possui backend, conta de usuário, sincronização ou notificações push nesta
etapa. O backup é a forma disponível de transferir dados entre navegadores ou dispositivos.

## Dados técnicos

Os intervalos do plano inicial são demonstrativos. Itens com fonte `needs-confirmation`
permanecem visíveis para orientar a estrutura, mas não geram prioridades operacionais.
Nenhum valor mecânico específico não confirmado é apresentado como fato. Valores técnicos
sem documentação confiável aparecem como **A confirmar** e mantêm o campo de fonte técnica.

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
