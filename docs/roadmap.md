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

- [ ] checklists locais persistentes para procedimentos;
- [ ] continuar, reiniciar e concluir uma execução;
- [ ] oferecer registro de manutenção após concluir, sem criação automática;
- [ ] definir migração do schema antes de acrescentar o novo estado;
- [ ] ampliar testes de interação e acessibilidade.

## Próximas iterações

### Conteúdo validado

- obter documentação técnica licenciada e confiável;
- associar valores confirmados por ano-modelo e mercado;
- revisar procedimentos com profissional qualificado;
- adicionar imagens próprias ou licenciadas.

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
