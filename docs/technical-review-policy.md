# Política de revisão técnica

## Princípio

Revisão técnica é conteúdo editorial versionado no repositório. Não é uma permissão de usuário,
um checkbox local ou uma área administrativa sem autenticação. O Garage não afirma credenciais
que não possa verificar.

## Decisões

- `approved`: a evidência, transcrição, unidade e aplicabilidade foram aceitas;
- `changes-requested`: correção ou evidência adicional é necessária;
- `rejected`: a claim ou sua aplicação não deve ser publicada.

A decisão mais recente é a vigente. Somente `approved` permite considerar a revisão cumprida.

## Aplicabilidade não é aprovação

Uma `TechnicalSourceApplicabilityDecision` responde se o documento pode ser usado para um escopo
de motocicleta. Uma `TechnicalReview` verifica a fidelidade e a segurança de uma claim
transcrita. A primeira não cria, substitui nem implica a segunda.

O proprietário confirmou a aplicabilidade do manual `D2203-MAN-0181` à NX200 brasileira de 1997.
As transcrições permanecem sem aprovação enquanto não houver revisão técnica registrada. O ano no
nome do arquivo não é divergência por si só; divergências devem apontar diferenças reais de
conteúdo.

## Requisitos para confirmação

Uma claim recebe `confirmed` apenas quando possui:

- fonte identificada e disponível para auditoria editorial;
- ao menos uma citação localizada válida;
- aplicabilidade confirmada para o escopo declarado;
- revisão vigente aprovada, com revisor e data;
- nenhuma divergência aberta ou supersessão circular;
- valor e unidade coerentes com a evidência.

O registro deve identificar o nome do revisor, função quando relevante, instante da revisão,
decisão, notas e referência de evidência quando aplicável. A presença desses campos não prova uma
credencial profissional; essa limitação deve permanecer explícita.

## Alterações após aprovação

Mudanças em valor, unidade, condição, citação, interpretação, ano, mercado, variante ou código do
motor invalidam a aprovação anterior para a nova versão. Registre nova revisão e incremente a
versão editorial dos procedimentos afetados. Correções somente textuais que não mudam o sentido
podem manter a decisão, mas devem permanecer rastreáveis no Git.

## Conflitos e obsolescência

Quando fontes divergem, use `conflicting` e bloqueie uso operacional. Resolva por análise de
edição, aplicabilidade e contexto; nunca por ordem arbitrária. Uma claim substituída aponta para
a anterior por `supersedesClaimId`, sem apagar a trilha. Conteúdo invalidado usa `deprecated`.

## Verificações automatizadas

`npm run validate:content` impede confirmação sem evidência e revisão, referências quebradas,
páginas inválidas, conflitos confirmados e ciclos de supersessão. A automação auxilia a
consistência, mas não substitui leitura do documento nem julgamento técnico qualificado.
