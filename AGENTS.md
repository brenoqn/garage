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
   exiba `A confirmar` e mantenha a fonte técnica esperada no modelo.
5. Mantenha cálculos e regras de domínio fora de templates e componentes de apresentação.
   Prefira funções puras ou serviços pequenos e sempre cubra mudanças de regra com testes.
6. Trate `LocalStorage` como detalhe de infraestrutura. Recursos devem depender da abstração
   de armazenamento ou do `GarageStore`, nunca chamar `localStorage` diretamente.
7. Preserve acessibilidade: HTML semântico, rótulos de formulário, foco visível, navegação por
   teclado, contraste, áreas de toque de pelo menos 44 px e suporte a movimento reduzido.
8. A interface é mobile-first. Confirme que novos fluxos funcionam com uma mão e não dependem
   de hover.
9. Não adicione bibliotecas visuais pesadas nem imagens ou logotipos protegidos da Honda.
10. Antes de concluir qualquer alteração, execute e corrija:

```bash
npm run lint
npm run test:ci
npm run build
```

## Conteúdo técnico

Siga `docs/content-guidelines.md`. Uma fonte deve identificar o documento, edição/ano
aplicável e, quando possível, seção ou página. Conteúdo demonstrativo deve ser rotulado como
tal e nunca parecer uma recomendação oficial.

## Alterações de arquitetura

Atualize `docs/architecture.md` quando mudar limites de camadas, estado, armazenamento, modelo
de dados ou estratégia PWA. Atualize `docs/roadmap.md` quando concluir ou replanejar um item.
