# AGENTS.md

Este repositório contém o **Garage**, uma PWA Angular para manutenção de motocicletas. O MVP
suporta somente a Honda NX200. Preserve o nome principal do produto como **Garage** em toda
interface, metadados e documentação.

## Regras obrigatórias

1. Mantenha TypeScript e templates Angular em modo estrito. Não enfraqueça as opções de
   compilação para contornar erros.
2. Use componentes standalone e preserve a divisão `core`, `shared`, `features` e `data`.
3. Não invente especificações mecânicas, torques, capacidades, folgas, pressões, códigos de
   peças ou intervalos oficiais.
4. Todo valor técnico precisa registrar uma fonte verificável. Uma transcrição ainda não revisada
   deve ser marcada explicitamente como `transcribed` e excluída de alertas e contagens
   operacionais. Se a informação não estiver na fonte, exiba `A confirmar` e mantenha a fonte
   esperada.
5. Mantenha cálculos, migrações e validações fora de templates e componentes de apresentação.
   Prefira funções puras ou serviços pequenos e cubra mudanças de regra com testes.
6. Trate `LocalStorage` como detalhe de infraestrutura. Recursos devem depender da abstração
   de armazenamento ou do `GarageStore`, nunca chamar `localStorage` diretamente.
7. Preserve a chave física `garage_state`. O estado atual usa somente `schemaVersion`; não
   reintroduza o antigo campo `version` nem crie envelopes adicionais no armazenamento local.
8. Toda mudança de schema exige migração idempotente, validação de runtime e testes. Estado
   inválido ou de versão futura nunca deve ser sobrescrito automaticamente.
9. Escreva o estado persistido antes de publicar a mudança nos Signals. Falhas de gravação não
   podem deixar a interface divergente do conteúdo durável.
10. Não reduza o odômetro sem confirmação explícita e motivo registrado. Serviços antigos não
    reduzem a leitura atual nem substituem uma execução mais recente do plano.
11. Preserve acessibilidade: HTML semântico, rótulos, foco visível, navegação por teclado,
    contraste, áreas de toque de pelo menos 44 px e suporte a movimento reduzido.
12. A interface é mobile-first. Novos fluxos devem funcionar com uma mão e não depender de
    hover.
13. Não adicione bibliotecas visuais pesadas nem imagens ou logotipos protegidos da Honda.
14. IDs de etapas, alertas, verificações, ferramentas e materiais são persistidos por
    referência. Não os altere sem migração explícita e teste de integridade.
15. Regras de criação, avanço, progresso, conclusão, cancelamento, reinício e vínculo de
    execuções pertencem à camada de domínio, não aos componentes.
16. Concluir um procedimento nunca cria serviço, atualiza plano ou altera odômetro
    automaticamente. O registro de manutenção exige uma ação posterior do usuário.
17. Nenhuma execução pode apontar para procedimento, etapa, alerta ou verificação inexistente.
18. Uma execução concluída pode ser vinculada a no máximo um serviço, e o vínculo deve ser
    bidirecional e persistido na mesma transação.
19. Conteúdo `needs-confirmation` permanece sem alerta ou afirmação operacional. A conclusão de
    checklist avançado não certifica segurança mecânica.
20. Wake Lock é um aprimoramento opcional: solicite após ação explícita, libere ao sair do modo
    oficina e nunca torne o procedimento dependente da API.
21. Nenhum valor recebe estado `confirmed` sem citação localizada, aplicabilidade confirmada e
    revisão aprovada vigente. Transcrição não equivale a confirmação.
22. Compatibilidade entre NX200 e outro modelo, ano, mercado, variante ou código de motor é uma
    afirmação técnica e também exige fonte e revisão.
23. IDs de fontes, claims e revisões são editoriais e estáveis. Mudanças exigem análise de
    referências; IDs de etapas persistidas continuam exigindo migração explícita.
24. Fontes, claims, revisões e procedimentos são conteúdo estático e não entram no `GarageState`
    ou no backup. O plano pode guardar somente referências estáveis necessárias à compatibilidade.
25. Não redistribua manuais, páginas escaneadas, URLs ilegais ou conteúdo protegido. Registre
    metadados e transcreva somente os dados necessários conforme a política editorial.
26. Alterar valor, unidade, aplicabilidade ou interpretação de uma claim confirmada exige nova
    revisão. A aprovação anterior não se transfere silenciosamente.
27. Conflitos e supersessões circulares bloqueiam uso operacional. O validador não decide qual
    fonte está correta; a resolução deve ser editorial e rastreável.
28. Reorganizar arquivos do catálogo não pode alterar slugs, IDs de etapas, warnings ou
    verificações finais usados por execuções existentes.
29. O Manual do Proprietário Honda NX200 `D2203-MAN-0181`, arquivo oficial
    `NX 200 1994.pdf`, tem aplicabilidade confirmada pelo proprietário do projeto para a NX200
    brasileira de 1997. O ano no nome do arquivo não é conflito automático. Essa decisão não
    aprova transcrições nem substitui revisão técnica.
30. Claims transcritas exigem página e seção. Não extrapole o manual do proprietário para
    desmontagem ou reparos ausentes; continue exigindo manual de serviço para torques,
    tolerâncias internas, diagramas completos e desmontagem avançada.
31. Antes de concluir qualquer alteração, execute e corrija:

```bash
npm run format:check
npm run lint
npm run test:ci
npm run validate:content
npm run build
npm run build:sites
```

## Conteúdo técnico

Siga `docs/content-guidelines.md`, `docs/technical-source-ingestion.md` e
`docs/technical-review-policy.md`. Uma fonte deve identificar documento, edição/ano aplicável e
localização precisa. Conteúdo demonstrativo deve ser rotulado e nunca parecer recomendação
oficial. O usuário local não pode aprovar conteúdo técnico.

## Alterações de arquitetura

Atualize `docs/architecture.md` quando mudar limites de camadas, estado, armazenamento, modelo
de dados, migração, backup ou estratégia PWA. Atualize `docs/roadmap.md` quando concluir ou
replanejar um item.
