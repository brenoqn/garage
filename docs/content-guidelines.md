# Diretrizes de conteúdo

## Regra principal

Nunca inferir, completar ou “aproximar” valores mecânicos da Honda NX200. Se uma informação
não estiver confirmada em documentação confiável e aplicável, publique `A confirmar`.

## Fonte técnica

Cada valor técnico deve possuir:

- estado `confirmed` ou `needs-confirmation`;
- nome claro da fonte;
- referência de edição/ano quando aplicável;
- seção ou página, quando disponível;
- observação sobre variantes de mercado ou ano-modelo.

Fontes preferidas, em ordem:

1. manual de serviço oficial aplicável;
2. manual do proprietário oficial aplicável;
3. boletim técnico oficial;
4. catálogo técnico do fabricante do componente, quando pertinente.

Fóruns, vídeos, lojas e conteúdo sem autoria técnica podem inspirar tópicos, mas não confirmam
valores.

## Estrutura de procedimentos

Todo procedimento deve conter:

1. título e categoria;
2. descrição e dificuldade;
3. tempo estimado;
4. ferramentas e materiais;
5. alertas de segurança;
6. etapas curtas, em ordem;
7. imagens opcionais com direitos de uso;
8. valores técnicos e fontes;
9. erros comuns;
10. verificações finais.

Etapas, alertas, verificações, ferramentas e materiais possuem IDs estáveis usados pelo estado
persistido. Alterar texto ou tradução não deve alterar o ID. Remover ou trocar um ID exige uma
migração capaz de preservar execuções existentes.

Use verbos de ação e uma tarefa por etapa. Explique quando parar e procurar um profissional.
Não diga que um procedimento é seguro sem apresentar condições e riscos.
Um checklist pode ser concluído com valores `needs-confirmation`, mas a interface deve informar
que a validação técnica permanece pendente. Para sistemas críticos, use linguagem de inspeção e
nunca frases como “moto segura”, “freio aprovado” ou equivalentes.

A conclusão do procedimento registra apenas que o usuário percorreu o checklist. Ela não cria
um serviço, não confirma a execução mecânica e não substitui avaliação profissional. Imagens
futuras precisam de licença e referência; nenhuma imagem mecânica faz parte da Sprint 3.

## Linguagem

- Escreva em português do Brasil, com frases diretas.
- Diferencie inspeção, ajuste, substituição e confirmação.
- Não transforme observação visual em diagnóstico definitivo.
- Evite termos como “sempre” e “nunca”, exceto em alertas universais de segurança.
- Mostre unidades junto dos valores e preserve o sistema usado pela fonte.

## Imagens e marcas

Não usar logotipos Honda, fotografias protegidas, páginas escaneadas de manuais ou ilustrações
sem licença. Imagens próprias devem mostrar somente o necessário e não ocultar equipamento de
proteção ou riscos.

## Revisão

Antes de publicar conteúdo novo, um revisor deve conferir estrutura, segurança, aplicabilidade
ao ano/modelo, fonte e consistência das unidades. Mudanças em valores confirmados exigem teste
de regressão dos dados apresentados.
