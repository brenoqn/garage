# Garage

Garage é um aplicativo pessoal para proprietários de motocicletas que desejam realizar e
acompanhar manutenções básicas em casa. Este MVP atende exclusivamente à Honda NX200 e reúne
manutenção preventiva, procedimentos interativos, odômetro, abastecimentos, consumo, custos e
histórico local.

O Garage não substitui mecânicos nem oferece reparos profissionais. Os guias são voltados ao
proprietário hobbista, com linguagem direta, ferramentas acessíveis, alertas claros e indicação
explícita de quando parar e procurar um profissional.

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
- abastecimentos com custo, litros, tanque completo e cálculo auditável de km/L;
- bloqueio de consumo para sequências inválidas e confirmação para abastecimento histórico;
- histórico unificado de serviços, abastecimentos, gastos, ocorrências e inspeções;
- gastos básicos agregando combustível, manutenção e registros avulsos;
- checklist pré-rodagem persistido, com dez itens localizados na página 30 do manual aplicável;
- tela dedicada de próximas manutenções, sem ativar intervalos ainda não revisados;
- atualização da referência do plano somente quando o serviço vinculado é mais recente;
- biblioteca pesquisável com seis procedimentos básicos transcritos e IDs estáveis;
- preparação com confirmação de segurança, execução passo a passo e retomada local;
- histórico de procedimentos em andamento, concluídos e cancelados;
- modo oficina, Wake Lock opcional e temporizador manual por horário de término;
- registro opcional de manutenção após a conclusão, com vínculo individual à execução;
- especificações transcritas identificadas como revisão pendente e dados ausentes marcados como
  **A confirmar**;
- catálogo editorial com fontes, claims, citações, aplicabilidade e revisões;
- transparência em `/technical-sources`, filtros por sistema, estado e aplicabilidade;
- versionamento editorial e risco separados da dificuldade dos procedimentos;
- detecção automática de conflitos e validação bloqueante do conteúdo;
- tema escuro padrão, opções claro e sistema, tokens CSS e preferência persistida;
- navegação móvel priorizando Início, Manutenção, Fazer, Abastecer e Histórico;
- estado local no schema 4, migração encadeada dos formatos anteriores e recuperação segura;
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
npm run validate:content
npm run build
```

O build de produção é gerado em `dist/garage/browser`.

Para preparar o mesmo build como um site estático com fallback das rotas Angular:

```bash
npm run build:sites
```

## Persistência, migração e backup

O `LocalStorage` guarda diretamente um `GarageState` com `schemaVersion: 4` na chave física
`garage_state`. O schema 4 acrescenta abastecimentos, gastos, ocorrências, inspeções pré-rodagem
e preferência de tema. Estados do schema 3 recebem coleções vazias e tema escuro; o schema 2
recebe antes `procedureExecutions: []`. O formato `version: 1` percorre toda a cadeia
v1 → v2 → v3 → v4. Cada etapa é validada, idempotente e preserva o conteúdo anterior.

Se o valor local for inválido ou pertencer a uma versão futura, ele não é sobrescrito. O
Garage inicia um estado demonstrativo somente em memória, informa o problema e permite
exportar o conteúdo original em Ajustes. Somente uma restauração ou importação confirmada
substitui esse valor.

O backup usa um envelope separado:

```json
{
  "product": "garage",
  "schemaVersion": 4,
  "exportedAt": "2026-08-02T12:00:00.000Z",
  "state": {}
}
```

Procedimentos, itens estáticos do checklist e especificações não entram no backup. Execuções,
serviços, plano, odômetro, abastecimentos, gastos, ocorrências, inspeções e preferências entram.
Backups dos schemas 2 e 3 são aceitos e migrados; schema 4 é validado diretamente; versões
futuras são recusadas. Serviços demonstrativos reconstruíveis e suas referências são removidos.

O aplicativo não possui backend, conta de usuário, sincronização ou notificações push nesta
etapa. O backup é a forma disponível de transferir dados entre navegadores ou dispositivos.

## Dados técnicos

O catálogo técnico é estático e separado dos dados pessoais. Ele estrutura documentos,
citações localizadas, aplicabilidade por ano/mercado/variante, claims, revisões, conflitos e
revisões editoriais dos procedimentos. Nada disso entra no `GarageState` ou no backup.

O Manual do Proprietário Honda NX200, código `D2203-MAN-0181`, foi localizado no domínio oficial
da Honda. O proprietário do projeto confirmou sua aplicabilidade ao conjunto técnico da NX200
brasileira de 1997. O nome do arquivo oficial, `NX 200 1994.pdf`, não é tratado isoladamente como
divergência de aplicabilidade.

O catálogo possui 27 claims `transcribed`, todas com página e seção, e quatro claims
`demonstrative` com **A confirmar** porque o manual não fornece a informação necessária. Nenhuma
claim recebeu revisão técnica aprovada ou estado `confirmed`; por isso, valores e intervalos
continuam sem uso operacional e não ativam alertas. A decisão de aplicabilidade da fonte é um
registro diferente da revisão das transcrições.

O PDF não é incluído nem redistribuído pelo repositório. O catálogo guarda metadados, URL oficial,
citações e paráfrases mínimas. Manual de serviço continua necessário para desmontagem avançada,
diagramas completos, tolerâncias internas e validação de torques.

`npm run validate:content` verifica IDs, referências, páginas, aplicabilidade, revisões,
conflitos, supersessões e compatibilidade do catálogo. O comando não altera arquivos e falha se
encontrar uma violação bloqueante.

## Estrutura

```text
src/app/
├── core/      # modelos, domínio, serviços e armazenamento
├── data/      # catálogo editorial estático e dados demonstrativos da Honda NX200
├── features/  # páginas e shell de navegação
└── shared/    # componentes reutilizáveis
```

Consulte [docs/architecture.md](docs/architecture.md) para decisões técnicas,
[docs/product-vision.md](docs/product-vision.md) para o recorte do produto e
[docs/content-guidelines.md](docs/content-guidelines.md) antes de adicionar conteúdo mecânico.
O processo editorial está em [docs/technical-source-ingestion.md](docs/technical-source-ingestion.md),
a política de revisão em [docs/technical-review-policy.md](docs/technical-review-policy.md) e o
estado das variantes em [docs/nx200-supported-variants.md](docs/nx200-supported-variants.md).
