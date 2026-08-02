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

## Próximas iterações

### Sprint 4 recomendada — conteúdo técnico validado

- obter documentação técnica licenciada e confiável;
- associar valores confirmados por ano-modelo e mercado;
- revisar procedimentos com profissional qualificado;
- produzir o primeiro procedimento tecnicamente completo;
- adicionar imagens próprias ou licenciadas somente após revisão.

### Experiência

- editor de intervalos do plano com trilha da fonte;
- tratamento de instalação e atualização da PWA;
- modo escuro e preferências de acessibilidade;
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
