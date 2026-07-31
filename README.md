# Garage

Garage é um aplicativo web progressivo, mobile-first e autodidático para proprietários de
motocicletas. Este MVP atende exclusivamente à Honda NX200 e oferece manutenção preventiva,
procedimentos guiados, histórico de serviços e alertas internos.

O nome do produto é **Garage**. “Honda NX200” identifica somente a primeira motocicleta
suportada.

## O que está incluído

- dashboard da motocicleta com quilometragem, próxima prioridade e alertas;
- edição dos dados da Honda NX200 e atualização rápida do odômetro;
- plano preventivo com os estados `ok`, `upcoming`, `due`, `overdue` e `unknown`;
- cálculo puro por quilometragem e/ou calendário;
- registro de serviços, peças, custos e observações;
- atualização automática da referência do plano quando um serviço é vinculado;
- biblioteca pesquisável com seis procedimentos demonstrativos;
- página de especificações com valores não confirmados marcados como **A confirmar**;
- armazenamento local por uma abstração baseada em `LocalStorage`;
- navegação responsiva, PWA instalável e service worker de produção;
- testes unitários das regras de domínio e do fluxo de atualização do plano.

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

## Dados e segurança técnica

Os dados do usuário ficam no navegador sob a chave `garage_state`. O aplicativo não possui
backend, conta de usuário, sincronização ou notificações push nesta etapa.

Os intervalos do plano inicial são explicitamente demonstrativos. Nenhum valor mecânico
específico não confirmado é apresentado como fato. Valores técnicos sem documentação
confiável aparecem como **A confirmar**, sempre acompanhados de um campo de fonte técnica.

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
