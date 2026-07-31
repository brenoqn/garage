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
4. Todo valor técnico precisa registrar uma fonte verificável. Se não estiver confirmado,
   exiba `A confirmar`, mantenha a fonte esperada e exclua o item de alertas e contagens
   operacionais.
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
14. Antes de concluir qualquer alteração, execute e corrija:

```bash
npm run lint
npm run test:ci
npm run build
```

## Conteúdo técnico

Siga `docs/content-guidelines.md`. Uma fonte deve identificar o documento, edição/ano aplicável
e, quando possível, seção ou página. Conteúdo demonstrativo deve ser rotulado e nunca parecer
uma recomendação oficial.

## Alterações de arquitetura

Atualize `docs/architecture.md` quando mudar limites de camadas, estado, armazenamento, modelo
de dados, migração, backup ou estratégia PWA. Atualize `docs/roadmap.md` quando concluir ou
replanejar um item.
