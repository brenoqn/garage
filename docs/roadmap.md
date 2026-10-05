# Roadmap

## MVP — Sprint 1

- [x] Angular standalone, TypeScript estrito e rotas lazy;
- [x] dashboard e cadastro da Honda NX200;
- [x] plano preventivo e histórico de serviços;
- [x] alertas internos desacoplados;
- [x] seis procedimentos demonstrativos, busca e filtros;
- [x] especificações com fontes pendentes;
- [x] PWA e interface responsiva.

## Sprint 2 — persistência confiável

- [x] schema local 2 sem envelope adicional;
- [x] migração idempotente do estado `version: 1`;
- [x] validação de runtime e recuperação de estado inválido ou futuro;
- [x] persistência transacional antes da atualização dos Signals;
- [x] configuração inicial e identificação explícita de dados demonstrativos;
- [x] histórico do odômetro com origem e observação;
- [x] confirmação de regressão e registro de correção ou troca de painel;
- [x] integração de serviços com o histórico do odômetro;
- [x] cronologia segura para a última execução do plano;
- [x] intervalos sem fonte confirmada inativos operacionalmente;
- [x] alertas detalhados, ordenados e atualizados na mudança do dia;
- [x] exportação e importação de backup JSON validado;
- [x] resumo e confirmação antes da substituição de dados;
- [x] testes de migração, backup, odômetro, cronologia e alertas.

## Sprint 3 — execução guiada

- [x] schema 3 e migração idempotente v2 → v3, mantendo a cadeia v1 → v2 → v3;
- [x] IDs estáveis e validação do catálogo dos seis procedimentos;
- [x] preparação com confirmação dos alertas de segurança;
- [x] execução persistente, progresso obrigatório, pausa, cancelamento e reinício;
- [x] verificações finais, conclusão e histórico de atividades em modo somente leitura;
- [x] registro opcional de manutenção após concluir, sem criação automática;
- [x] vínculo transacional e individual entre execução e serviço;
- [x] dashboard com atividade ativa e recente;
- [x] modo oficina, Wake Lock opcional e temporizador manual;
- [x] backup schema 3 com importação compatível do schema 2;
- [x] testes de domínio, store, migração, catálogo, componentes e Wake Lock.

## Sprint 4 — base técnica verificável

- [x] fontes documentais estruturadas por tipo, disponibilidade e metadados;
- [x] citações localizadas, aplicabilidade e revisão técnica versionada;
- [x] claims com valores estruturados e estados editoriais explícitos;
- [x] detecção de conflitos, supersessão inválida e confirmação indevida;
- [x] catálogo NX200 dividido em fontes, claims, especificações, plano e procedimentos;
- [x] preservação dos slugs e IDs usados por execuções do schema 3;
- [x] versionamento editorial e risco dos seis procedimentos;
- [x] transparência de fontes e filtros nas especificações;
- [x] validador executável por `npm run validate:content`;
- [x] documentação de ingestão, revisão e variantes;
- [x] nenhum valor confirmado sem documentação suficiente.
- [x] manual do proprietário oficial identificado por código e URL;
- [x] aplicabilidade documental confirmada separadamente da revisão técnica;
- [x] 27 claims transcritas com página e seção e quatro ausências mantidas como `A confirmar`;
- [x] procedimentos básicos e seed do plano alinhados ao conteúdo coberto pelo manual;
- [x] manual de serviço mantido como requisito para torques, tolerâncias e reparos avançados.

## Sprint 5 — uso cotidiano da NX200

- [x] schema 4 e migração idempotente v3 → v4, preservando a cadeia anterior;
- [x] abastecimentos locais com litros, custo, tanque completo e histórico do odômetro;
- [x] consumo por intervalo válido, média ponderada e exclusão de sequências regressivas;
- [x] confirmação explícita para abastecimento histórico sem reduzir o odômetro atual;
- [x] tela dedicada de próximas manutenções e cronograma honesto para conteúdo pendente;
- [x] procedimentos em linguagem simplificada, com limites de parada explícitos e IDs preservados;
- [x] registro opcional e pré-preenchido após concluir um procedimento;
- [x] checklist pré-rodagem persistido, citado e sem alegação de certificação mecânica;
- [x] gastos básicos de combustível, serviços e lançamentos avulsos;
- [x] ocorrências rápidas e histórico cotidiano unificado;
- [x] tema escuro padrão, opções claro/sistema e preferência persistida;
- [x] navegação mobile-first com ação central e bottom sheet;
- [x] layout adaptativo, tokens visuais e suporte a movimento reduzido;
- [x] backup schema 4 e importação compatível com schemas 2 e 3;
- [x] testes de consumo, migração, abastecimento histórico, checklist, store e componentes.

## Próximas iterações

### Fase 3 — backend isolado (código implementado, sem ativação)

- [x] contratos schema 4 e regras puras necessários ao backend compartilhados sem Angular;
- [x] API mínima com startup separado, health, readiness e erros seguros;
- [x] migration relacional versionada e runner com checksum, lock e reexecução segura;
- [x] repositories específicos, transações, revisão e idempotência;
- [x] casos de uso iniciais e snapshot remoto sem seed demonstrativo;
- [x] testes em PostgreSQL descartável para migration, rollback, constraints, API e concorrência;
- [ ] aplicar migration no `garage_db` somente após checkpoint e autorização;
- [ ] comprovar barreira de acesso e rota do domínio antes de publicar a API;
- [ ] integrar o Angular à API depois de estabilizar os contratos;
- [ ] implementar e validar importação explícita do backup local para destino vazio.

### Sprint 6 recomendada — revisão das primeiras transcrições

- revisar tecnicamente as transcrições de bateria ou vela como primeiro domínio de menor risco;
- obter legalmente manual de serviço e catálogo de peças aplicáveis;
- identificar variante e código do motor da moto alvo;
- conferir cada claim transcrita contra página e seção;
- registrar revisão profissional e resolver divergências;
- publicar o primeiro procedimento confirmado somente quando todos os critérios passarem;
- produzir imagens próprias ou licenciadas após a revisão do conteúdo.

### Experiência

- editor de intervalos do plano com trilha da fonte;
- tratamento de instalação e atualização da PWA;
- auditoria automatizada de contraste e smoke test E2E em breakpoints adicionais;
- importação de backups legados adicionais somente com migração explícita.

### Plataforma

- IndexedDB para anexos e volume maior de histórico;
- sincronização opcional com backend e autenticação;
- múltiplas motocicletas e, somente depois, novos modelos;
- notificações push por implementação da interface existente;
- testes end-to-end, auditoria de acessibilidade e telemetria consentida.

## Fora de escopo até validação

Diagnóstico automático, recomendação de peças, valores mecânicos gerados por IA e publicação
de conteúdo sem fonte técnica verificável.
